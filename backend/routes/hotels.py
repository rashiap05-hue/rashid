from fastapi import APIRouter, HTTPException
from typing import Optional
from db import db
from models.schemas import HotelCreate
from routes.hotel_api import fetch_external_hotels, is_configured as hotel_api_configured
import uuid

hotels_router = APIRouter(prefix="/hotels", tags=["Hotels"])


@hotels_router.get("")
async def get_hotels(city: Optional[str] = None, country: Optional[str] = None, search: Optional[str] = None):
    query = {}
    if city:
        query["city"] = {"$regex": city, "$options": "i"}
    if country:
        query["country"] = {"$regex": country, "$options": "i"}
    if search:
        query["$or"] = [
            {"name": {"$regex": search, "$options": "i"}},
            {"city": {"$regex": search, "$options": "i"}},
            {"country": {"$regex": search, "$options": "i"}}
        ]
    hotels = await db.hotels.find(query, {"_id": 0}).sort([("recommended", -1), ("rating_score", -1)]).to_list(1000)

    source = "local"
    # When an external hotel provider is connected, merge its live inventory in
    # (deduped by name+city). Falls back silently to the local catalog when the
    # integration is unconfigured or the provider is unreachable.
    if hotel_api_configured():
        external = await fetch_external_hotels(city=city, country=country, search=search)
        if external:
            seen = {(h.get("name", "").strip().lower(), (h.get("city") or "").strip().lower()) for h in hotels}
            for h in external:
                key = (h.get("name", "").strip().lower(), (h.get("city") or "").strip().lower())
                if key not in seen:
                    hotels.append(h)
                    seen.add(key)
            source = "local+api"

    return {"success": True, "source": source, "hotels": hotels}


@hotels_router.get("/{hotel_id}")
async def get_hotel(hotel_id: str):
    hotel = await db.hotels.find_one({"id": hotel_id}, {"_id": 0})
    if not hotel:
        raise HTTPException(status_code=404, detail="Hotel not found")
    return {"success": True, "hotel": hotel}


@hotels_router.post("")
async def create_hotel(hotel: HotelCreate):
    hotel_id = str(uuid.uuid4())
    doc = {"id": hotel_id, **hotel.model_dump()}
    await db.hotels.insert_one(doc)
    return {"success": True, "id": hotel_id}


@hotels_router.put("/{hotel_id}")
async def update_hotel(hotel_id: str, hotel: HotelCreate):
    result = await db.hotels.update_one({"id": hotel_id}, {"$set": hotel.model_dump()})
    if result.matched_count == 0:
        raise HTTPException(status_code=404, detail="Hotel not found")
    return {"success": True}


@hotels_router.delete("/{hotel_id}")
async def delete_hotel(hotel_id: str):
    result = await db.hotels.delete_one({"id": hotel_id})
    if result.deleted_count == 0:
        raise HTTPException(status_code=404, detail="Hotel not found")
    return {"success": True}
