import time
import secrets
from eth_account import Account
from eth_account.messages import encode_typed_data
from app.core.config import settings

def _get_domain() -> dict:
    """Returns the EIP-712 domain dictionary."""
    return {
        "name": "TicketNFT",
        "version": "1",
        "chainId": settings.CHAIN_ID,
        "verifyingContract": settings.TICKET_NFT_ADDRESS,
    }

def _get_types() -> dict:
    """Returns the EIP-712 types dictionary for ResaleAuth."""
    return {
        "ResaleAuth": [
            {"name": "seller", "type": "address"},
            {"name": "buyer", "type": "address"},
            {"name": "tokenId", "type": "uint256"},
            {"name": "maxPrice", "type": "uint256"},
            {"name": "nonce", "type": "uint256"},
            {"name": "deadline", "type": "uint256"},
        ]
    }

def sign_resale_auth(seller: str, buyer: str, token_id: int, max_price: int, nonce: int, deadline: int) -> str:
    """
    Signs a resale authorization message using EIP-712.
    """
    message = {
        "seller": seller,
        "buyer": buyer,
        "tokenId": token_id,
        "maxPrice": max_price,
        "nonce": nonce,
        "deadline": deadline,
    }
    
    typed_data = {
        "types": {
            "EIP712Domain": [
                {"name": "name", "type": "string"},
                {"name": "version", "type": "string"},
                {"name": "chainId", "type": "uint256"},
                {"name": "verifyingContract", "type": "address"},
            ],
            **_get_types()
        },
        "primaryType": "ResaleAuth",
        "domain": _get_domain(),
        "message": message,
    }

    signable_message = encode_typed_data(full_message=typed_data)
    signed_message = Account.sign_message(signable_message, private_key=settings.SIGNER_PRIVATE_KEY)
    
    return signed_message.signature.hex()

def recover_signer(seller: str, buyer: str, token_id: int, max_price: int, nonce: int, deadline: int, signature: str) -> str:
    """
    Recovers the signer address from an EIP-712 signature.
    """
    message = {
        "seller": seller,
        "buyer": buyer,
        "tokenId": token_id,
        "maxPrice": max_price,
        "nonce": nonce,
        "deadline": deadline,
    }

    typed_data = {
        "types": {
            "EIP712Domain": [
                {"name": "name", "type": "string"},
                {"name": "version", "type": "string"},
                {"name": "chainId", "type": "uint256"},
                {"name": "verifyingContract", "type": "address"},
            ],
            **_get_types()
        },
        "primaryType": "ResaleAuth",
        "domain": _get_domain(),
        "message": message,
    }

    signable_message = encode_typed_data(full_message=typed_data)
    recovered_address = Account.recover_message(signable_message, signature=signature)
    
    return recovered_address
