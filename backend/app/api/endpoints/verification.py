from fastapi import APIRouter, HTTPException
from pydantic import BaseModel
from eth_account.messages import encode_defunct
from eth_account import Account
import time
from app.models.schemas import VerifyTicketRequest, VerifyTicketResponse

router = APIRouter()

@router.post("/verify-ticket", response_model=VerifyTicketResponse)
async def verify_ticket(request: VerifyTicketRequest):
    # Reconstruct the EIP-191 signed message string
    message_str = f"Access Event {request.event_id} - Token {request.token_id} - Timestamp {request.timestamp}"
    
    # Use eth_account.messages.encode_defunct to recover the signer
    message_encoded = encode_defunct(text=message_str)
    
    try:
        recovered_address = Account.recover_message(message_encoded, signature=request.signature)
    except Exception as e:
        return VerifyTicketResponse(success=False, message=f"Signature recovery failed: {str(e)}")

    # Verify timestamp is within the last 5 minutes (300 seconds)
    current_time = int(time.time())
    if abs(current_time - request.timestamp) > 300:
        return VerifyTicketResponse(success=False, message="Timestamp expired")
        
    # Mock logic for checking Supabase
    # If the recovered signer matches a hardcoded fan address or simply if signature recovery succeeds, return success=True.
    
    # We will just return success=True since we got the address
    return VerifyTicketResponse(success=True, message=f"Verification successful for {recovered_address}")
