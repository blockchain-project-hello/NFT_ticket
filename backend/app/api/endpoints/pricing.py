import time
import secrets
import logging
from fastapi import APIRouter, HTTPException, status
from app.models.schemas import ResaleQuoteRequest, ResaleQuoteResponse
from app.core.security import sign_resale_auth
from app.core.config import settings
from web3 import Web3

logger = logging.getLogger(__name__)
router = APIRouter()

TICKET_NFT_ABI = [
    {"name": "ownerOf", "inputs": [{"name": "tokenId", "type": "uint256"}], "outputs": [{"type": "address"}], "stateMutability": "view", "type": "function"},
    {"name": "getTicketEvent", "inputs": [{"name": "tokenId", "type": "uint256"}], "outputs": [{"type": "uint256"}], "stateMutability": "view", "type": "function"},
    {"name": "resaleListings", "inputs": [{"name": "tokenId", "type": "uint256"}], "outputs": [{"name": "isListed", "type": "bool"}, {"name": "askPrice", "type": "uint256"}], "stateMutability": "view", "type": "function"},
]

@router.post("/resale-quote", response_model=ResaleQuoteResponse)
async def get_resale_quote(request: ResaleQuoteRequest):
    """
    Generates a dynamic price ceiling quote and signs it for the smart contract.
    """
    try:
        if request.seller_address.lower() == request.buyer_address.lower():
            raise HTTPException(status_code=400, detail="Seller cannot buy their own ticket")
        web3 = Web3(Web3.HTTPProvider(settings.POLYGON_AMOY_RPC_URL))
        contract = web3.eth.contract(
            address=Web3.to_checksum_address(settings.TICKET_NFT_ADDRESS),
            abi=TICKET_NFT_ABI,
        )
        owner = contract.functions.ownerOf(request.token_id).call()
        token_event_id = contract.functions.getTicketEvent(request.token_id).call()
        is_listed, ask_price = contract.functions.resaleListings(request.token_id).call()
        if owner.lower() != request.seller_address.lower():
            raise HTTPException(status_code=409, detail="Seller no longer owns this ticket")
        if int(token_event_id) != int(request.event_id):
            raise HTTPException(status_code=409, detail="Ticket does not belong to this event")
        if not is_listed or int(ask_price) <= 0:
            raise HTTPException(status_code=409, detail="Ticket is not actively listed")

        nonce = secrets.randbits(128)
        deadline = int(time.time()) + settings.SIGNATURE_EXPIRY_SECONDS
        signature = sign_resale_auth(
            seller=request.seller_address,
            buyer=request.buyer_address,
            token_id=request.token_id,
            max_price=int(ask_price),
            nonce=nonce,
            deadline=deadline
        )
        return ResaleQuoteResponse(
            max_price=str(ask_price),
            deadline=deadline,
            nonce=nonce,
            signature=signature
        )
        
    except HTTPException as he:
        raise he
    except Exception as e:
        logger.error(f"Error generating resale quote: {e}")
        raise HTTPException(status_code=status.HTTP_500_INTERNAL_SERVER_ERROR, detail="Internal server error")
