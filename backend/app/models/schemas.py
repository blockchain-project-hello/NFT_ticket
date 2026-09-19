from pydantic import BaseModel, Field
from datetime import datetime
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

class MarketplaceListingResponse(BaseModel):
    token_id: int
    event_id: str
    blockchain_event_id: int
    event_name: str
    event_image_url: Optional[str] = None
    event_date: datetime
    venue: Optional[str] = None
    base_price_wei: int
    resale_price_wei: int
    seller: str
    listing_tx_hash: Optional[str] = None

class ListingSyncRequest(BaseModel):
    event_id: str
    token_id: int = Field(gt=0)
    seller: str
    price_wei: int = Field(gt=0)
    listing_tx_hash: str

class SaleSyncRequest(BaseModel):
    event_id: str
    token_id: int = Field(gt=0)
    buyer: str
    sale_tx_hash: str

class ChatRequest(BaseModel):
    """Request schema for the AI assistant chat."""
    organizer_wallet: str
    message: str

class ChatResponse(BaseModel):
    """Response schema for the AI assistant chat."""
    reply: str
    context_used: List[str] = Field(default_factory=list)

class EventCreateRequest(BaseModel):
    name: str = Field(min_length=1, max_length=200)
    description: Optional[str] = None
    organizer_wallet: str
    venue: Optional[str] = None
    event_date: datetime
    base_price_wei: int = Field(gt=0)
    total_supply: int = Field(gt=0)
    image_url: Optional[str] = None
    blockchain_event_id: int = Field(gt=0)
    contract_address: str
    creation_tx_hash: str


class EventUpdateRequest(BaseModel):
    name: Optional[str] = Field(default=None, min_length=1, max_length=200)
    description: Optional[str] = None
    venue: Optional[str] = None
    event_date: Optional[datetime] = None
    image_url: Optional[str] = None


class EventResponse(BaseModel):
    id: str
    name: str
    description: Optional[str] = None
    organizer_wallet: str
    venue: Optional[str] = None
    base_price_wei: int
    total_supply: int
    tickets_minted: int = 0
    event_date: datetime
    image_url: Optional[str] = None
    blockchain_event_id: int
    contract_address: str
    creation_tx_hash: str

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
