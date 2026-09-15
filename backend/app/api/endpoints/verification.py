from fastapi import APIRouter, HTTPException
from pydantic import BaseModel
from eth_account.messages import encode_defunct
from eth_account import Account
import time
from app.models.schemas import VerifyTicketRequest, VerifyTicketResponse
from app.services.supabase_client import get_ticket, update_ticket_status

router = APIRouter()

# In-memory set for local testing to track scanned tokens and avoid Supabase schema errors
scanned_tokens = set()

@router.post("/verify-ticket", response_model=VerifyTicketResponse)
async def verify_ticket(request: VerifyTicketRequest):
    print(f"\n--- NEW SCAN REQUEST ---")
    print(f"Payload received: {request.dict()}")
    
    # Reconstruct the EIP-191 signed message string exactly as frontend creates it
    message_str = f"Access Event {request.event_id} - Token {request.token_id} - Timestamp {request.timestamp}"
    print(f"Reconstructed message string: '{message_str}'")
    
    # Use eth_account.messages.encode_defunct to recover the signer
    message_encoded = encode_defunct(text=message_str)
    
    try:
        recovered_address = Account.recover_message(message_encoded, signature=request.signature)
        print(f"Recovered address from signature: {recovered_address}")
    except Exception as e:
        print(f"Signature recovery failed: {str(e)}")
        return VerifyTicketResponse(success=False, message=f"Signature recovery failed: {str(e)}")

    # Verify timestamp is within the last 5 minutes (300 seconds)
    current_time = int(time.time())
    time_diff = abs(current_time - request.timestamp)
    print(f"Current server time: {current_time}, QR timestamp: {request.timestamp}, Diff: {time_diff}s")
    
    if time_diff > 300:
        print("QR Code expired!")
        return VerifyTicketResponse(success=False, message="QR Code has expired! Please generate a new one.")
        
    # Check for Double Entry
    if request.token_id in scanned_tokens:
        print(f"Token {request.token_id} already in scanned_tokens set!")
        return VerifyTicketResponse(success=False, message="Double Entry Blocked: This ticket has already been scanned at the gate!")

    # Mark as scanned!
    scanned_tokens.add(request.token_id)
    print(f"Successfully marked Token {request.token_id} as scanned.")
    
    return VerifyTicketResponse(success=True, message=f"Access Granted! Ticket #{request.token_id} marked as scanned.")
    
    return VerifyTicketResponse(success=True, message=f"Access Granted! Ticket #{request.token_id} marked as scanned.")
