from eth_account import Account
from eth_account.messages import encode_defunct
from fastapi import APIRouter
import logging
from web3 import Web3

import time

from app.core.config import settings
from app.models.schemas import VerifyTicketRequest, VerifyTicketResponse
from app.services.supabase_client import update_ticket_status

router = APIRouter()
logger = logging.getLogger(__name__)

scanned_tokens: set[tuple[int, int]] = set()

TICKET_NFT_ABI = [
    {
        "inputs": [{"name": "eventId", "type": "uint256"}],
        "name": "events",
        "outputs": [
            {"name": "name", "type": "string"},
            {"name": "basePrice", "type": "uint256"},
            {"name": "totalSupply", "type": "uint256"},
            {"name": "ticketsMinted", "type": "uint256"},
            {"name": "organizer", "type": "address"},
            {"name": "eventDate", "type": "uint256"},
            {"name": "exists", "type": "bool"},
        ],
        "stateMutability": "view",
        "type": "function",
    },
    {
        "inputs": [{"name": "tokenId", "type": "uint256"}],
        "name": "getTicketEvent",
        "outputs": [{"name": "", "type": "uint256"}],
        "stateMutability": "view",
        "type": "function",
    },
    {
        "inputs": [{"name": "tokenId", "type": "uint256"}],
        "name": "ownerOf",
        "outputs": [{"name": "", "type": "address"}],
        "stateMutability": "view",
        "type": "function",
    },
]


def _get_ticket_owner(event_id: int, token_id: int) -> str | None:
    web3 = Web3(Web3.HTTPProvider(settings.POLYGON_AMOY_RPC_URL))
    contract = web3.eth.contract(
        address=Web3.to_checksum_address(settings.TICKET_NFT_ADDRESS),
        abi=TICKET_NFT_ABI,
    )

    try:
        event_info = contract.functions.events(event_id).call()
        token_event_id = None
        if event_info[-1]:
            token_event_id = contract.functions.getTicketEvent(token_id).call()
        logger.info(
            "Ticket verification chain state: On-chain event: %s, exists: %s, token event: %s",
            event_id,
            event_info[-1],
            token_event_id if token_event_id is not None else "<not queried>",
        )
        if not event_info[-1]:
            return None

        if int(token_event_id) != event_id:
            return None

        return contract.functions.ownerOf(token_id).call()
    except Exception:
        return None

@router.post("/verify-ticket", response_model=VerifyTicketResponse)
async def verify_ticket(request: VerifyTicketRequest):
    message_str = f"Access Event {request.event_id} - Token {request.token_id} - Timestamp {request.timestamp}"

    try:
        recovered_address = Account.recover_message(
            encode_defunct(text=message_str),
            signature=request.signature,
        )
    except Exception:
        return VerifyTicketResponse(success=False, message="Invalid ticket ownership/signature")

    current_time = int(time.time())
    time_diff = abs(current_time - request.timestamp)
    if time_diff > 300:
        return VerifyTicketResponse(success=False, message="QR Code has expired! Please generate a new one.")

    try:
        event_id = int(request.event_id)
        if event_id <= 0 or request.token_id <= 0:
            raise ValueError
    except (TypeError, ValueError):
        return VerifyTicketResponse(success=False, message="Invalid ticket ownership/signature")

    current_owner = _get_ticket_owner(event_id, request.token_id)
    logger.info(
        "Ticket verification: Recovered signer: %s, On-chain owner: %s, Contract: %s, "
        "RPC: %s, Token: %s, QR event: %s",
        recovered_address[:10] + "...",
        (current_owner[:10] + "...") if current_owner else "<none>",
        settings.TICKET_NFT_ADDRESS,
        settings.POLYGON_AMOY_RPC_URL,
        request.token_id,
        event_id,
    )
    if not current_owner or recovered_address.lower() != current_owner.lower():
        return VerifyTicketResponse(success=False, message="Invalid ticket ownership/signature")

    scan_key = (event_id, request.token_id)
    if scan_key in scanned_tokens:
        return VerifyTicketResponse(success=False, message="Double Entry Blocked: This ticket has already been scanned at the gate!")

    scanned_tokens.add(scan_key)
    update_ticket_status(request.token_id, "used")
    return VerifyTicketResponse(success=True, message=f"Access Granted! Ticket #{request.token_id} marked as scanned.")
