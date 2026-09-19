import time
import asyncio

from eth_account import Account
from eth_account.messages import encode_defunct

from app.api.endpoints import verification
from app.models.schemas import VerifyTicketRequest


def signed_request(account, event_id="7", token_id=42, timestamp=None):
    timestamp = timestamp or int(time.time())
    message = f"Access Event {event_id} - Token {token_id} - Timestamp {timestamp}"
    signature = Account.sign_message(encode_defunct(text=message), account.key).signature.hex()
    return VerifyTicketRequest(
        event_id=event_id,
        token_id=token_id,
        timestamp=timestamp,
        signature=signature,
    )


def setup_function():
    verification.scanned_tokens.clear()


def test_valid_ticket_grants_access(monkeypatch):
    account = Account.create()
    monkeypatch.setattr(verification, "_get_ticket_owner", lambda event_id, token_id: account.address)
    monkeypatch.setattr(verification, "update_ticket_status", lambda token_id, status: True)

    result = asyncio.run(verification.verify_ticket(signed_request(account)))

    assert result.success is True
    assert result.message == "Access Granted! Ticket #42 marked as scanned."


def test_same_qr_is_blocked(monkeypatch):
    account = Account.create()
    request = signed_request(account)
    monkeypatch.setattr(verification, "_get_ticket_owner", lambda event_id, token_id: account.address)
    monkeypatch.setattr(verification, "update_ticket_status", lambda token_id, status: True)

    first = asyncio.run(verification.verify_ticket(request))
    second = asyncio.run(verification.verify_ticket(request))

    assert first.success is True
    assert second.success is False
    assert second.message.startswith("Double Entry Blocked")


def test_modified_token_id_is_rejected(monkeypatch):
    account = Account.create()
    original = signed_request(account, token_id=42)
    tampered = original.model_copy(update={"token_id": 999})
    monkeypatch.setattr(verification, "_get_ticket_owner", lambda event_id, token_id: account.address)

    result = asyncio.run(verification.verify_ticket(tampered))

    assert result.success is False
    assert result.message == "Invalid ticket ownership/signature"


def test_modified_event_id_is_rejected(monkeypatch):
    account = Account.create()
    original = signed_request(account, event_id="7")
    tampered = original.model_copy(update={"event_id": "8"})
    monkeypatch.setattr(verification, "_get_ticket_owner", lambda event_id, token_id: account.address)

    result = asyncio.run(verification.verify_ticket(tampered))

    assert result.success is False
    assert result.message == "Invalid ticket ownership/signature"


def test_invalid_signature_is_rejected(monkeypatch):
    account = Account.create()
    other = Account.create()
    request = signed_request(account).model_copy(
        update={"signature": signed_request(other).signature}
    )
    monkeypatch.setattr(verification, "_get_ticket_owner", lambda event_id, token_id: account.address)

    result = asyncio.run(verification.verify_ticket(request))

    assert result.success is False
    assert result.message == "Invalid ticket ownership/signature"


def test_expired_qr_is_rejected(monkeypatch):
    account = Account.create()
    request = signed_request(account, timestamp=int(time.time()) - 301)
    on_chain_called = False

    def fail_if_called(event_id, token_id):
        nonlocal on_chain_called
        on_chain_called = True
        return account.address

    monkeypatch.setattr(verification, "_get_ticket_owner", fail_if_called)
    result = asyncio.run(verification.verify_ticket(request))

    assert result.success is False
    assert result.message.startswith("QR Code has expired")
    assert on_chain_called is False


def test_valid_signature_but_wrong_owner_is_rejected(monkeypatch):
    account = Account.create()
    other_owner = Account.create()
    monkeypatch.setattr(verification, "_get_ticket_owner", lambda event_id, token_id: other_owner.address)

    result = asyncio.run(verification.verify_ticket(signed_request(account)))

    assert result.success is False
    assert result.message == "Invalid ticket ownership/signature"


def test_nonexistent_token_is_rejected(monkeypatch):
    account = Account.create()
    monkeypatch.setattr(verification, "_get_ticket_owner", lambda event_id, token_id: None)

    result = asyncio.run(verification.verify_ticket(signed_request(account, token_id=999)))

    assert result.success is False
    assert result.message == "Invalid ticket ownership/signature"