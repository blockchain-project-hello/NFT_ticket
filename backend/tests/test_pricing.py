import pytest
from app.models.schemas import ResaleQuoteRequest, ResaleQuoteResponse
from app.core.config import settings

def test_pricing_formula():
    """Tests the basic pricing formula logic."""
    base_price = 100
    recent_sales = 5
    demand_factor = recent_sales / max(1, 10) # 0.5
    multiplier = min(settings.MAX_PRICE_MULTIPLIER, demand_factor * 1.0) # 0.5
    
    max_price = base_price * (1 + multiplier)
    assert max_price == 150

def test_price_ceiling_cap():
    """Tests that the price ceiling is capped by max_multiplier."""
    base_price = 100
    recent_sales = 50 # High demand
    demand_factor = recent_sales / max(1, 10) # 5.0
    multiplier = min(settings.MAX_PRICE_MULTIPLIER, demand_factor * 1.0) # Capped at 3.0
    
    max_price = base_price * (1 + multiplier)
    assert max_price == 100 * (1 + settings.MAX_PRICE_MULTIPLIER)

def test_response_format():
    """Tests the response model format."""
    response = ResaleQuoteResponse(
        max_price="1500000000000000000",
        deadline=1234567890,
        nonce=123,
        signature="0xabcdef"
    )
    assert response.max_price == "1500000000000000000"
    assert response.nonce == 123
