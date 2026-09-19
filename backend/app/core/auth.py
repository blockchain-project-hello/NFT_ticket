from fastapi import Header, HTTPException, status
from eth_account import Account
from eth_account.messages import encode_defunct

from app.services.supabase_client import is_organizer_wallet


def wallet_authorization_message(wallet: str) -> str:
    return f"NFT Ticketing organizer authorization: {wallet.lower()}"


def require_wallet(
    x_wallet_address: str | None = Header(default=None),
    x_wallet_signature: str | None = Header(default=None),
) -> str:
    if not x_wallet_address or not x_wallet_signature:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Wallet address and signature are required",
        )

    try:
        recovered = Account.recover_message(
            encode_defunct(text=wallet_authorization_message(x_wallet_address)),
            signature=x_wallet_signature,
        )
    except Exception as exc:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid wallet signature",
        ) from exc

    if recovered.lower() != x_wallet_address.lower():
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Wallet signature does not match address",
        )

    return recovered


def require_organizer(wallet: str) -> str:
    if not is_organizer_wallet(wallet):
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Organizer role required",
        )
    return wallet
