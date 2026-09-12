from pydantic import BaseModel

class PriceQuoteRequest(BaseModel):
    event_id: str
    buyer_address: str

class PriceQuoteResponse(BaseModel):
    event_id: str
    buyer: str
    price: str
    signature: str
