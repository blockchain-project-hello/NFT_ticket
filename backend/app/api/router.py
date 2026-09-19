from fastapi import APIRouter
from app.api.endpoints import pricing, chat, verification, events, marketplace

api_router = APIRouter()

api_router.include_router(pricing.router, prefix="/pricing", tags=["Pricing"])
api_router.include_router(chat.router, prefix="/assistant", tags=["Assistant"])
api_router.include_router(verification.router, prefix="/verification", tags=["Verification"])
api_router.include_router(events.router, prefix="/events", tags=["Events"])
api_router.include_router(marketplace.router, prefix="/marketplace", tags=["Marketplace"])
