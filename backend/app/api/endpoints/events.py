from typing import Any

from fastapi import APIRouter, Depends, HTTPException, status

from app.core.auth import require_organizer, require_wallet
from app.models.schemas import EventCreateRequest, EventResponse, EventUpdateRequest
from app.services.supabase_client import (
    create_event,
    get_event,
    get_events,
    get_organizer_events,
    update_event,
)

router = APIRouter()


def _event_response(event: dict[str, Any]) -> EventResponse:
    response_event = dict(event)
    if "base_price_wei" not in response_event and "base_price" in response_event:
        response_event["base_price_wei"] = response_event.pop("base_price")
    return EventResponse(**response_event)


@router.get("", response_model=list[EventResponse])
async def list_events() -> list[EventResponse]:
    return [_event_response(event) for event in get_events()]


@router.get("/organizer", response_model=list[EventResponse])
async def list_organizer_events(wallet: str = Depends(require_wallet)) -> list[EventResponse]:
    require_organizer(wallet)
    return [_event_response(event) for event in get_organizer_events(wallet)]


@router.get("/{event_id}", response_model=EventResponse)
async def read_event(event_id: str) -> EventResponse:
    event = get_event(event_id)
    if not event:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Event not found")
    return _event_response(event)


@router.post("", response_model=EventResponse, status_code=status.HTTP_201_CREATED)
async def create_event_endpoint(
    request: EventCreateRequest,
    wallet: str = Depends(require_wallet),
) -> EventResponse:
    require_organizer(wallet)
    if request.organizer_wallet.lower() != wallet.lower():
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Cannot create for another wallet")
    event = create_event(request.model_dump(mode="json"))
    return _event_response(event)


@router.patch("/{event_id}", response_model=EventResponse)
async def update_event_endpoint(
    event_id: str,
    request: EventUpdateRequest,
    wallet: str = Depends(require_wallet),
) -> EventResponse:
    require_organizer(wallet)
    current = get_event(event_id)
    if not current:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Event not found")
    if current["organizer_wallet"].lower() != wallet.lower():
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Cannot modify another organizer's event")
    event = update_event(event_id, request.model_dump(mode="json", exclude_unset=True))
    return _event_response(event)
