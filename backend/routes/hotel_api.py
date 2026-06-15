"""External Hotel API connector.

Connects the platform to a third-party hotel content/availability provider so
hotel inventory can come from a live source in addition to the local catalog.

The connector is intentionally provider-agnostic and fully configuration
driven (no vendor lock-in): point it at any REST endpoint that returns JSON and
map the response fields with environment variables. When no provider is
configured (or a request fails), it degrades gracefully by returning an empty
list so the rest of the system keeps working off the local hotel catalog.

Environment variables
---------------------
HOTEL_API_URL          Base URL of the provider's hotel search endpoint.
HOTEL_API_KEY          API key / token (omit to disable the integration).
HOTEL_API_AUTH         How to send the key: "query" (default), "bearer", or "header".
HOTEL_API_KEY_PARAM    Query/header name for the key (default: "api_key").
HOTEL_API_CITY_PARAM   Query param name for the city filter (default: "city").
HOTEL_API_COUNTRY_PARAM Query param name for the country filter (default: "country").
HOTEL_API_SEARCH_PARAM Query param name for free-text search (default: "search").
HOTEL_API_RESULTS_PATH Dotted path to the hotels array in the response
                       (default: tries "hotels", "data", "results").
HOTEL_API_CURRENCY     Currency code applied to mapped rooms (default: "AED").
"""
import os
from typing import Optional

from fastapi import APIRouter

from db import logger

hotel_api_router = APIRouter(tags=["Hotel API"])


def is_configured() -> bool:
    """True when an external hotel provider is configured via env vars."""
    return bool(os.environ.get("HOTEL_API_URL") and os.environ.get("HOTEL_API_KEY"))


def _dig(data, path):
    """Walk a dotted path into nested dicts, returning None if missing."""
    cur = data
    for part in path.split("."):
        if isinstance(cur, dict) and part in cur:
            cur = cur[part]
        else:
            return None
    return cur


def _extract_results(payload):
    """Locate the list of hotels inside an arbitrary provider response."""
    if isinstance(payload, list):
        return payload
    if not isinstance(payload, dict):
        return []
    configured_path = os.environ.get("HOTEL_API_RESULTS_PATH")
    candidates = [configured_path] if configured_path else ["hotels", "data", "results", "items"]
    for path in candidates:
        if not path:
            continue
        found = _dig(payload, path)
        if isinstance(found, list):
            return found
    return []


def _first(item: dict, *keys, default=None):
    for k in keys:
        if k in item and item[k] not in (None, ""):
            return item[k]
    return default


def _normalize_rooms(item: dict, currency: str):
    """Map a provider hotel's rooms into the app room shape (needs `price`)."""
    raw_rooms = _first(item, "rooms", "room_types", "roomTypes", "rates", default=[]) or []
    rooms = []
    for idx, r in enumerate(raw_rooms):
        if not isinstance(r, dict):
            continue
        price = _first(r, "price", "rate", "amount", "total_price", "nightly_rate", default=0)
        try:
            price = float(price)
        except (TypeError, ValueError):
            price = 0.0
        rooms.append({
            "id": str(_first(r, "id", "room_id", "code", default=f"ext-room-{idx}")),
            "name": _first(r, "name", "room_name", "title", default="Standard Room"),
            "type": _first(r, "type", "category", default="Standard"),
            "bed_type": _first(r, "bed_type", "bedType", "beds", default=""),
            "view": _first(r, "view", "view_type", default=""),
            "size": str(_first(r, "size", "room_size", default="")),
            "price": price,
            "original_price": float(_first(r, "original_price", "originalPrice", default=price) or price),
            "currency": _first(r, "currency", default=currency),
            "amenities": _first(r, "amenities", default=[]) or [],
            "refundable": bool(_first(r, "refundable", default=True)),
            "refundable_until": _first(r, "refundable_until", default=None),
            "meals": _first(r, "meals", "meal_plan", "board", default="Room Only"),
            "images": _first(r, "images", default=[]) or [],
        })
    return rooms


def normalize_hotel(item: dict, currency: str) -> dict:
    """Map an arbitrary provider hotel object into the app's hotel shape."""
    images = _first(item, "images", "photos", "gallery", default=[]) or []
    if isinstance(images, str):
        images = [images]
    main_image = _first(item, "image", "thumbnail", "main_image", default=(images[0] if images else ""))
    try:
        star_rating = int(_first(item, "star_rating", "stars", "category", "rating", default=4))
    except (TypeError, ValueError):
        star_rating = 4
    try:
        rating_score = float(_first(item, "rating_score", "review_score", "score", default=8.0))
    except (TypeError, ValueError):
        rating_score = 8.0
    return {
        "id": f"ext-{_first(item, 'id', 'hotel_id', 'code', default='hotel')}",
        "name": _first(item, "name", "hotel_name", "title", default="Hotel"),
        "city": _first(item, "city", "city_name", default=""),
        "country": _first(item, "country", "country_name", default=""),
        "address": _first(item, "address", "location", default=""),
        "description": _first(item, "description", "summary", default=""),
        "star_rating": star_rating,
        "rating_score": rating_score,
        "rating_text": _first(item, "rating_text", default="Very Good"),
        "review_count": int(_first(item, "review_count", "reviews", default=0) or 0),
        "image": main_image,
        "images": images,
        "amenities": _first(item, "amenities", "facilities", default=[]) or [],
        "rooms": _normalize_rooms(item, currency),
        "recommended": bool(_first(item, "recommended", default=False)),
        "source": "api",
    }


async def fetch_external_hotels(city: Optional[str] = None, country: Optional[str] = None,
                                search: Optional[str] = None):
    """Query the configured external hotel provider. Returns a normalized list.

    Returns [] when the integration is not configured or the request fails, so
    callers can safely merge with the local catalog.
    """
    if not is_configured():
        return []

    import httpx

    base_url = os.environ["HOTEL_API_URL"]
    api_key = os.environ["HOTEL_API_KEY"]
    auth_mode = (os.environ.get("HOTEL_API_AUTH") or "query").lower()
    key_param = os.environ.get("HOTEL_API_KEY_PARAM", "api_key")
    currency = os.environ.get("HOTEL_API_CURRENCY", "AED")

    params = {}
    headers = {}
    if auth_mode == "bearer":
        headers["Authorization"] = f"Bearer {api_key}"
    elif auth_mode == "header":
        headers[key_param] = api_key
    else:  # query (default)
        params[key_param] = api_key

    if city:
        params[os.environ.get("HOTEL_API_CITY_PARAM", "city")] = city
    if country:
        params[os.environ.get("HOTEL_API_COUNTRY_PARAM", "country")] = country
    if search:
        params[os.environ.get("HOTEL_API_SEARCH_PARAM", "search")] = search

    try:
        async with httpx.AsyncClient(timeout=30.0) as client:
            response = await client.get(base_url, params=params, headers=headers)
        if response.status_code != 200:
            logger.warning("Hotel API request failed (status %s)", response.status_code)
            return []
        results = _extract_results(response.json())
        return [normalize_hotel(h, currency) for h in results if isinstance(h, dict)]
    except Exception as e:  # noqa: BLE001 - degrade gracefully on any provider error
        logger.error("Error fetching external hotels: %s", str(e))
        return []


@hotel_api_router.get("/hotels/api/status")
async def hotel_api_status():
    """Report whether the external hotel provider is connected/configured."""
    return {"success": True, "connected": is_configured()}


@hotel_api_router.get("/hotels/api/search")
async def search_external_hotels(city: Optional[str] = None, country: Optional[str] = None,
                                 search: Optional[str] = None):
    """Search hotels directly from the external provider (no local catalog)."""
    if not is_configured():
        return {"success": False, "connected": False,
                "error": "Hotel API not configured", "hotels": []}
    hotels = await fetch_external_hotels(city=city, country=country, search=search)
    return {"success": True, "connected": True, "source": "api",
            "hotels": hotels, "total": len(hotels)}
