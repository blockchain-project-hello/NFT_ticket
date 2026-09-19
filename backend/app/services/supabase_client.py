import logging
from supabase import create_client, Client
from app.core.config import settings
from typing import Optional, List, Dict, Any

logger = logging.getLogger(__name__)

_client: Optional[Client] = None


def _normalize_event(event: Dict[str, Any]) -> Dict[str, Any]:
    """Expose the API's price name while retaining the shared DB column name."""
    normalized = dict(event)
    if "base_price_wei" not in normalized and "base_price" in normalized:
        normalized["base_price_wei"] = normalized.pop("base_price")
    return normalized


def _event_for_database(event: Dict[str, Any]) -> Dict[str, Any]:
    payload = dict(event)
    if "base_price_wei" in payload:
        payload["base_price"] = payload.pop("base_price_wei")
    return payload


def _has_blockchain_metadata(event: Dict[str, Any]) -> bool:
    return all(
        event.get(field) is not None
        for field in ("blockchain_event_id", "contract_address", "creation_tx_hash")
    )

def get_supabase() -> Client:
    """Returns the Supabase client singleton."""
    global _client
    if _client is None:
        try:
            _client = create_client(settings.SUPABASE_URL, settings.SUPABASE_KEY)
            logger.info("Supabase client initialized successfully.")
        except Exception as e:
            logger.error(f"Failed to initialize Supabase client: {e}")
            raise
    return _client

def get_event(event_id: str) -> Optional[Dict[str, Any]]:
    """Fetches an event by ID."""
    supabase = get_supabase()
    try:
        response = supabase.table("events").select("*").eq("id", event_id).execute()
        data = response.data
        return _normalize_event(data[0]) if data and _has_blockchain_metadata(data[0]) else None
    except Exception as e:
        logger.error(f"Error fetching event {event_id}: {e}")
        return None


def get_events() -> List[Dict[str, Any]]:
    """Fetches all persisted events for public browsing."""
    response = get_supabase().table("events").select("*").order("event_date").execute()
    return [
        _normalize_event(event)
        for event in (response.data or [])
        if _has_blockchain_metadata(event)
    ]


def create_event(event: Dict[str, Any]) -> Dict[str, Any]:
    """Persists metadata after the corresponding blockchain transaction is confirmed."""
    if not _has_blockchain_metadata(event):
        raise ValueError("Blockchain event metadata is required")
    response = get_supabase().table("events").insert(_event_for_database(event)).execute()
    if not response.data:
        raise RuntimeError("Event was not persisted")
    return _normalize_event(response.data[0])


def update_event(event_id: str, changes: Dict[str, Any]) -> Dict[str, Any]:
    response = get_supabase().table("events").update(_event_for_database(changes)).eq("id", event_id).execute()
    if not response.data:
        raise RuntimeError("Event was not updated")
    return _normalize_event(response.data[0])


def is_organizer_wallet(wallet: str) -> bool:
    response = (
        get_supabase()
        .table("organizer_wallets")
        .select("wallet")
        .eq("wallet", wallet.lower())
        .eq("active", True)
        .limit(1)
        .execute()
    )
    return bool(response.data)

def get_sales_for_event(event_id: str, hours: int = 24) -> List[Dict[str, Any]]:
    """Fetches sales for an event within the last `hours`."""
    supabase = get_supabase()
    # In a real scenario, implement time filtering based on `hours`
    # For now, fetching all related sales as a simplified example.
    try:
        response = supabase.table("sales_history").select("*").eq("event_id", event_id).execute()
        return response.data or []
    except Exception as e:
        logger.error(f"Error fetching sales for event {event_id}: {e}")
        return []

def get_event_demand_metrics(event_id: str) -> Dict[str, Any]:
    """Calculates demand metrics for an event."""
    event = get_event(event_id)
    if not event:
        return {"recent_sales_count": 0, "total_sales": 0, "avg_price": 0.0, "base_price": 0.0}

    sales = get_sales_for_event(event_id)
    total_sales = len(sales)
    
    # Dummy average calculation
    avg_price = 0.0
    if total_sales > 0:
        total_price = sum(float(s.get("price", 0)) for s in sales)
        avg_price = total_price / total_sales

    return {
        "recent_sales_count": total_sales, # Simplifying recent as all for now
        "total_sales": total_sales,
        "avg_price": avg_price,
        "base_price": float(event.get("base_price_wei", event.get("base_price", 0)))
    }

def upsert_ticket(token_id: int, event_id: str, owner: str, status: str) -> None:
    """Upserts a ticket record."""
    supabase = get_supabase()
    try:
        data = {
            "token_id": token_id,
            "event_id": event_id,
            "current_owner": owner,
            "status": status
        }
        supabase.table("tickets").upsert(data).execute()
    except Exception as e:
        logger.error(f"Error upserting ticket {token_id}: {e}")

def get_ticket(token_id: int) -> Optional[Dict[str, Any]]:
    """Fetches a ticket by token_id."""
    supabase = get_supabase()
    try:
        response = supabase.table("tickets").select("*").eq("token_id", token_id).execute()
        data = response.data
        return data[0] if data else None
    except Exception as e:
        logger.error(f"Error fetching ticket {token_id}: {e}")
        return None

def update_ticket_status(token_id: int, status: str) -> bool:
    """Updates the status of a ticket."""
    supabase = get_supabase()
    try:
        supabase.table("tickets").update({"status": status}).eq("token_id", token_id).execute()
        return True
    except Exception as e:
        logger.error(f"Error updating ticket {token_id} status: {e}")
        return False

def insert_sale(event_id: str, token_id: int, seller: str, buyer: str, price: str, royalty_paid: str, tx_hash: str, block_number: int) -> None:
    """Inserts a new sale record."""
    supabase = get_supabase()
    try:
        data = {
            "event_id": event_id,
            "token_id": token_id,
            "seller": seller,
            "buyer": buyer,
            "price": price,
            "royalty_paid": royalty_paid,
            "tx_hash": tx_hash,
            "block_number": block_number
        }
        supabase.table("sales_history").insert(data).execute()
    except Exception as e:
        logger.error(f"Error inserting sale for tx {tx_hash}: {e}")

def get_organizer_events(wallet: str) -> List[Dict[str, Any]]:
    """Fetches all events created by a specific organizer wallet."""
    supabase = get_supabase()
    try:
        response = supabase.table("events").select("*").eq("organizer_wallet", wallet).execute()
        return [
            _normalize_event(event)
            for event in (response.data or [])
            if _has_blockchain_metadata(event)
        ]
    except Exception as e:
        logger.error(f"Error fetching events for organizer {wallet}: {e}")
        return []

def get_marketplace_listings() -> List[Dict[str, Any]]:
    response = get_supabase().table("tickets").select("*").eq("status", "listed").execute()
    listings = []
    for ticket in response.data or []:
        event = get_event(str(ticket["event_id"]))
        if not event:
            continue
        listings.append({
            "token_id": ticket["token_id"],
            "event_id": str(event["id"]),
            "blockchain_event_id": event["blockchain_event_id"],
            "event_name": event["name"],
            "event_image_url": event.get("image_url"),
            "event_date": event["event_date"],
            "venue": event.get("venue"),
            "base_price_wei": event["base_price_wei"],
            "resale_price_wei": ticket["list_price"],
            "seller": ticket["current_owner"],
            "listing_tx_hash": ticket.get("listing_tx_hash"),
        })
    return listings

def sync_listing(event_id: str, token_id: int, seller: str, price_wei: int, listing_tx_hash: str) -> None:
    get_supabase().table("tickets").upsert({
        "token_id": token_id,
        "event_id": event_id,
        "current_owner": seller.lower(),
        "status": "listed",
        "list_price": price_wei,
        "listing_tx_hash": listing_tx_hash,
    }).execute()

def sync_sale(event_id: str, token_id: int, buyer: str, sale_tx_hash: str, seller: str, price_wei: int, royalty_wei: int) -> None:
    get_supabase().table("tickets").update({
        "current_owner": buyer.lower(),
        "status": "held",
        "list_price": None,
    }).eq("token_id", token_id).execute()
    get_supabase().table("sales_history").insert({
        "event_id": event_id,
        "token_id": token_id,
        "seller": seller.lower(),
        "buyer": buyer.lower(),
        "price": price_wei,
        "royalty_paid": royalty_wei,
        "tx_hash": sale_tx_hash,
    }).execute()

def get_analytics_for_organizer(wallet: str) -> Dict[str, Any]:
    """Generates basic analytics for an organizer."""
    events = get_organizer_events(wallet)
    if not events:
        return {"total_volume": 0, "royalties_earned": 0, "tickets_sold": 0, "resale_count": 0}
    
    # Stubbed aggregation logic
    return {
        "total_volume": 5000,
        "royalties_earned": 250,
        "tickets_sold": 150,
        "resale_count": 45
    }

def search_documents(event_id: str, embedding: List[float], limit: int = 5) -> List[Dict[str, Any]]:
    """Searches for documents related to an event using vector embeddings."""
    supabase = get_supabase()
    try:
        # Assuming an RPC function 'match_documents' exists in Supabase for pgvector
        response = supabase.rpc(
            "match_documents",
            {"query_embedding": embedding, "match_threshold": 0.7, "match_count": limit}
        ).execute()
        return response.data or []
    except Exception as e:
        logger.error(f"Error searching documents: {e}")
        return []
