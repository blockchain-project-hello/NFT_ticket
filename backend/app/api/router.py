from fastapi import APIRouter
from app.api.endpoints import pricing, chat

api_router = APIRouter()

api_router.include_router(pricing.router, prefix="/pricing", tags=["Pricing"])
api_router.include_router(chat.router, prefix="/assistant", tags=["Assistant"])
