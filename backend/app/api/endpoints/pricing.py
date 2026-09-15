import time
import secrets
import logging
from fastapi import APIRouter, HTTPException, status
from app.models.schemas import ResaleQuoteRequest, ResaleQuoteResponse
from app.services.supabase_client import get_event, get_event_demand_metrics
from app.core.security import sign_resale_auth
from app.core.config import settings

logger = logging.getLogger(__name__)
router = APIRouter()

@router.post("/resale-quote", response_model=ResaleQuoteResponse)
async def get_resale_quote(request: ResaleQuoteRequest):
    """
    Generates a dynamic price ceiling quote and signs it for the smart contract.
    """
    print(f"\n--- NEW RESALE QUOTE REQUEST ---")
    print(f"Token: {request.token_id}, Seller: {request.seller_address}, Buyer: {request.buyer_address}")
    
    try:
        # For local testing, bypass Supabase and mock the event metrics
        base_price = 12000000000000000 # 0.012 ETH in wei (matching the listing price)
        recent_sales = 2
        print(f"Base price: {base_price} wei, Recent sales: {recent_sales}")
        
        # Calculate dynamic ceiling
        demand_factor = recent_sales / max(1, 10)
        time_decay = 1.0
        
        max_multiplier = settings.MAX_PRICE_MULTIPLIER
        multiplier = min(max_multiplier, demand_factor * time_decay)
        
        max_price_float = base_price * (1 + multiplier)
        max_price_wei = int(max_price_float) # Assuming base_price is already in wei or needs proper conversion
        print(f"Calculated Dynamic Ceiling (maxPrice): {max_price_wei} wei")
        
        # Security params
        nonce = secrets.randbits(128)
        deadline = int(time.time()) + settings.SIGNATURE_EXPIRY_SECONDS
        
        signature = sign_resale_auth(
            seller=request.seller_address,
            buyer=request.buyer_address,
            token_id=request.token_id,
            max_price=max_price_wei,
            nonce=nonce,
            deadline=deadline
        )
        print(f"Successfully generated EIP-712 Signature: {signature[:10]}...{signature[-4:]}")
        
        return ResaleQuoteResponse(
            max_price=str(max_price_wei),
            deadline=deadline,
            nonce=str(nonce),
            signature=signature
        )
        
    except HTTPException as he:
        print(f"HTTPException: {he.detail}")
        raise he
    except Exception as e:
        print(f"Exception: {e}")
        logger.error(f"Error generating resale quote: {e}")
        raise HTTPException(status_code=status.HTTP_500_INTERNAL_SERVER_ERROR, detail="Internal server error")
