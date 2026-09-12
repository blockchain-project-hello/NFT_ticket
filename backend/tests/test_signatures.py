import time
import pytest
import secrets
from eth_account import Account
from app.core.security import sign_resale_auth, recover_signer
from app.core.config import settings

@pytest.fixture
def test_accounts():
    """Provides test accounts."""
    seller = Account.create()
    buyer = Account.create()
    return seller.address, buyer.address

def test_sign_and_recover(test_accounts):
    """Tests signing a message and correctly recovering the signer."""
    seller, buyer = test_accounts
    token_id = 1
    max_price = 1000
    nonce = secrets.randbits(128)
    deadline = int(time.time()) + 900
    
    # In a real environment, we'd ensure SIGNER_PRIVATE_KEY is a valid key for testing
    # Here we temporarily override settings for the test if it's a dummy value
    dummy_key = Account.create().key.hex()
    original_key = settings.SIGNER_PRIVATE_KEY
    settings.SIGNER_PRIVATE_KEY = dummy_key
    
    try:
        signature = sign_resale_auth(seller, buyer, token_id, max_price, nonce, deadline)
        expected_signer = Account.from_key(dummy_key).address
        recovered = recover_signer(seller, buyer, token_id, max_price, nonce, deadline, signature)
        assert recovered == expected_signer
    finally:
        settings.SIGNER_PRIVATE_KEY = original_key

def test_nonce_uniqueness():
    """Tests that generating random nonces likely results in unique values."""
    nonce1 = secrets.randbits(128)
    nonce2 = secrets.randbits(128)
    assert nonce1 != nonce2

def test_deadline_bounds():
    """Tests deadline logic."""
    now = int(time.time())
    expiry = 900
    deadline = now + expiry
    
    assert deadline > now
    assert deadline <= now + expiry + 10 # Allow slight buffer for execution time
