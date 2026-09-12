from fastapi import APIRouter

router = APIRouter()

@router.get("/quote")
async def get_dynamic_price(event_id: str, buyer: str):
    return {
        "event_id": event_id,
        "buyer": buyer,
        "price": "10000000000000000",
        "signature": "0x..."
    }
