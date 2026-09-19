from fastapi import APIRouter, HTTPException, status
from web3 import Web3

from app.core.config import settings
from app.models.schemas import ListingSyncRequest, MarketplaceListingResponse, SaleSyncRequest
from app.services.supabase_client import (
    get_event,
    get_marketplace_listings,
    sync_listing,
    sync_sale,
)

router = APIRouter()

TICKET_NFT_ABI = [
    {"name": "ownerOf", "inputs": [{"name": "tokenId", "type": "uint256"}], "outputs": [{"type": "address"}], "stateMutability": "view", "type": "function"},
    {"name": "getTicketEvent", "inputs": [{"name": "tokenId", "type": "uint256"}], "outputs": [{"type": "uint256"}], "stateMutability": "view", "type": "function"},
    {"name": "resaleListings", "inputs": [{"name": "tokenId", "type": "uint256"}], "outputs": [{"name": "isListed", "type": "bool"}, {"name": "askPrice", "type": "uint256"}], "stateMutability": "view", "type": "function"},
    {"anonymous": False, "name": "TicketResold", "inputs": [{"indexed": True, "name": "tokenId", "type": "uint256"}, {"indexed": True, "name": "seller", "type": "address"}, {"indexed": True, "name": "buyer", "type": "address"}, {"indexed": False, "name": "price", "type": "uint256"}, {"indexed": False, "name": "royalty", "type": "uint256"}], "type": "event"},
]


def _contract():
    web3 = Web3(Web3.HTTPProvider(settings.POLYGON_AMOY_RPC_URL))
    return web3, web3.eth.contract(
        address=Web3.to_checksum_address(settings.TICKET_NFT_ADDRESS),
        abi=TICKET_NFT_ABI,
    )


@router.get("", response_model=list[MarketplaceListingResponse])
async def list_marketplace() -> list[MarketplaceListingResponse]:
    return [MarketplaceListingResponse(**listing) for listing in get_marketplace_listings()]


@router.post("/listings/sync", status_code=status.HTTP_204_NO_CONTENT)
async def sync_listing_endpoint(request: ListingSyncRequest) -> None:
    event = get_event(request.event_id)
    if not event:
        raise HTTPException(status_code=404, detail="Event not found")
    try:
        _, contract = _contract()
        owner = contract.functions.ownerOf(request.token_id).call()
        chain_event_id = contract.functions.getTicketEvent(request.token_id).call()
        is_listed, ask_price = contract.functions.resaleListings(request.token_id).call()
    except Exception as exc:
        raise HTTPException(status_code=502, detail="Unable to verify listing on blockchain") from exc
    if owner.lower() != request.seller.lower() or int(chain_event_id) != int(event["blockchain_event_id"]):
        raise HTTPException(status_code=403, detail="Listing owner or event does not match blockchain")
    if not is_listed or int(ask_price) != request.price_wei:
        raise HTTPException(status_code=409, detail="Listing is not active on blockchain")
    sync_listing(request.event_id, request.token_id, request.seller, request.price_wei, request.listing_tx_hash)


@router.post("/sales/sync", status_code=status.HTTP_204_NO_CONTENT)
async def sync_sale_endpoint(request: SaleSyncRequest) -> None:
    event = get_event(request.event_id)
    if not event:
        raise HTTPException(status_code=404, detail="Event not found")
    try:
        web3, contract = _contract()
        receipt = web3.eth.get_transaction_receipt(request.sale_tx_hash)
        if receipt["status"] != 1:
            raise HTTPException(status_code=409, detail="Sale transaction failed")
        logs = contract.events.TicketResold().process_receipt(receipt)
        matching = next((log["args"] for log in logs if int(log["args"]["tokenId"]) == request.token_id), None)
        owner = contract.functions.ownerOf(request.token_id).call()
    except HTTPException:
        raise
    except Exception as exc:
        raise HTTPException(status_code=502, detail="Unable to verify sale on blockchain") from exc
    if not matching or owner.lower() != request.buyer.lower():
        raise HTTPException(status_code=409, detail="Sale is not confirmed on blockchain")
    sync_sale(
        request.event_id,
        request.token_id,
        request.buyer,
        request.sale_tx_hash,
        matching["seller"],
        int(matching["price"]),
        int(matching["royalty"]),
    )
