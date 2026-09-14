from pydantic import BaseModel, Field
from typing import Optional, List

class ResaleQuoteRequest(BaseModel):
    """Request schema for obtaining a resale quote."""
    event_id: str
    token_id: int
    seller_address: str
    buyer_address: str

class ResaleQuoteResponse(BaseModel):
    """Response schema containing the authorized resale quote."""
    max_price: str = Field(..., description="Maximum price in wei as a string")
    deadline: int
    nonce: int
    signature: str

class ChatRequest(BaseModel):
    """Request schema for the AI assistant chat."""
    organizer_wallet: str
    message: str

class ChatResponse(BaseModel):
    """Response schema for the AI assistant chat."""
    reply: str
    context_used: List[str] = Field(default_factory=list)

class EventSchema(BaseModel):
    """Schema representing an Event."""
    id: str
    name: str
    description: Optional[str] = None
    organizer_wallet: str
    base_price: float
    total_supply: int
    tickets_minted: int = 0
    event_date: str
    image_url: Optional[str] = None

class TicketSchema(BaseModel):
    """Schema representing a Ticket."""
    token_id: int
    event_id: str
    current_owner: str
    status: str
    list_price: Optional[str] = None

class SaleRecord(BaseModel):
    """Schema representing a sale transaction."""
    id: str
    event_id: str
    token_id: int
    seller: str
    buyer: str
    price: str
    royalty_paid: str
    tx_hash: str
    timestamp: str

class VerifyTicketRequest(BaseModel):
    event_id: str
    token_id: int
    timestamp: int
    signature: str

class VerifyTicketResponse(BaseModel):
    success: bool
    message: str
