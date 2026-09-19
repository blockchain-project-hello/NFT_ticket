import asyncio
from datetime import datetime, timezone

import pytest
from eth_account import Account
from eth_account.messages import encode_defunct
from fastapi import HTTPException

from app.api.endpoints import events
from app.core.auth import require_wallet, wallet_authorization_message
from app.models.schemas import EventCreateRequest, EventUpdateRequest


@pytest.fixture
def organizer_account():
    return Account.create()


def event_row(organizer: str):
    return {
        "id": "event-1",
        "name": "TechFest",
        "description": "A developer event",
        "organizer_wallet": organizer,
        "venue": "Hall A",
        "base_price": 10**16,
        "total_supply": 100,
        "tickets_minted": 0,
        "event_date": datetime(2026, 10, 31, tzinfo=timezone.utc),
        "image_url": None,
        "blockchain_event_id": 7,
        "contract_address": "0x0000000000000000000000000000000000000001",
        "creation_tx_hash": "0xabc",
    }


def test_valid_wallet_signature_is_accepted(organizer_account):
    message = wallet_authorization_message(organizer_account.address)
    signed = Account.sign_message(
        encode_defunct(text=message), organizer_account.key
    ).signature.hex()

    recovered = require_wallet(organizer_account.address, signed)

    assert recovered.lower() == organizer_account.address.lower()


def test_invalid_wallet_signature_is_rejected(organizer_account):
    other = Account.create()
    signed = Account.sign_message(
        encode_defunct(text=wallet_authorization_message(organizer_account.address)),
        other.key,
    ).signature.hex()

    with pytest.raises(HTTPException) as error:
        require_wallet(organizer_account.address, signed)

    assert error.value.status_code == 401


def test_organizer_can_create_event(monkeypatch, organizer_account):
    stored = {}
    row = event_row(organizer_account.address)

    monkeypatch.setattr(events, "require_organizer", lambda wallet: wallet)
    monkeypatch.setattr(events, "create_event", lambda payload: stored.update(payload) or row)

    request = EventCreateRequest(
        name="TechFest",
        description="A developer event",
        organizer_wallet=organizer_account.address,
        venue="Hall A",
        event_date="2026-10-31T10:00:00Z",
        base_price_wei=10**16,
        total_supply=100,
        blockchain_event_id=7,
        contract_address="0x0000000000000000000000000000000000000001",
        creation_tx_hash="0xabc",
    )

    result = asyncio.run(events.create_event_endpoint(request, organizer_account.address))

    assert result.blockchain_event_id == 7
    assert stored["organizer_wallet"] == organizer_account.address
    assert stored["creation_tx_hash"] == "0xabc"


def test_create_event_request_requires_blockchain_metadata(organizer_account):
    with pytest.raises(ValueError):
        EventCreateRequest(
            name="Missing chain data",
            organizer_wallet=organizer_account.address,
            event_date="2026-10-31T10:00:00Z",
            base_price_wei=10**16,
            total_supply=100,
        )


def test_attendee_cannot_create_event(monkeypatch, organizer_account):
    def reject(_wallet):
        raise HTTPException(status_code=403, detail="Organizer role required")

    monkeypatch.setattr(events, "require_organizer", reject)
    request = EventCreateRequest(
        name="Blocked",
        organizer_wallet=organizer_account.address,
        event_date="2026-10-31T10:00:00Z",
        base_price_wei=1,
        total_supply=1,
        blockchain_event_id=8,
        contract_address="0x0000000000000000000000000000000000000001",
        creation_tx_hash="0xdef",
    )

    with pytest.raises(HTTPException) as error:
        asyncio.run(events.create_event_endpoint(request, organizer_account.address))

    assert error.value.status_code == 403


def test_organizer_retrieves_only_their_events(monkeypatch, organizer_account):
    monkeypatch.setattr(events, "require_organizer", lambda wallet: wallet)
    monkeypatch.setattr(
        events,
        "get_organizer_events",
        lambda wallet: [event_row(wallet)],
    )

    result = asyncio.run(events.list_organizer_events(organizer_account.address))

    assert len(result) == 1
    assert result[0].organizer_wallet == organizer_account.address


def test_organizer_cannot_update_another_organizers_event(monkeypatch, organizer_account):
    other = Account.create()
    monkeypatch.setattr(events, "require_organizer", lambda wallet: wallet)
    monkeypatch.setattr(events, "get_event", lambda _event_id: event_row(other.address))

    with pytest.raises(HTTPException) as error:
        asyncio.run(
            events.update_event_endpoint(
                "event-1",
                EventUpdateRequest(name="Changed"),
                organizer_account.address,
            )
        )

    assert error.value.status_code == 403
