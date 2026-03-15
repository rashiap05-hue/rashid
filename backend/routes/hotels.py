from fastapi import APIRouter, HTTPException, Depends, Query
from db import db, get_current_user, logger
from models.schemas import HotelCreate
from datetime import datetime, timezone
import uuid

hotels_router = APIRouter(prefix="/hotels", tags=["Hotels"])

@hotels_router.get("")
async def get_hotels(city: str = None, country: str = None, search: str = None):
    query = {}
    if city:
        query["city"] = {"$regex": city, "$options": "i"}
    if country:
        query["country"] = {"$regex": country, "$options": "i"}
    if search:
        query["$or"] = [
            {"name": {"$regex": search, "$options": "i"}},
            {"city": {"$regex": search, "$options": "i"}}
        ]
    
    hotels = await db.hotels.find(query, {"_id": 0}).sort([("recommended", -1), ("rating_score", -1)]).to_list(1000)
    return {"success": True, "hotels": hotels}

@hotels_router.post("")
async def create_hotel(hotel: HotelCreate, user: dict = Depends(get_current_user)):
    hotel_doc = hotel.dict()
    hotel_doc["id"] = str(uuid.uuid4())
    hotel_doc["created_at"] = datetime.now(timezone.utc).isoformat()
    await db.hotels.insert_one(hotel_doc)
    hotel_doc.pop("_id", None)
    return {"success": True, "hotel": hotel_doc}

@hotels_router.get("/{hotel_id}")
async def get_hotel(hotel_id: str):
    hotel = await db.hotels.find_one({"id": hotel_id}, {"_id": 0})
    if not hotel:
        raise HTTPException(status_code=404, detail="Hotel not found")
    return hotel

@hotels_router.put("/{hotel_id}")
async def update_hotel(hotel_id: str, hotel: HotelCreate, user: dict = Depends(get_current_user)):
    hotel_data = hotel.dict()
    hotel_data["updated_at"] = datetime.now(timezone.utc).isoformat()
    result = await db.hotels.update_one({"id": hotel_id}, {"$set": hotel_data})
    if result.matched_count == 0:
        raise HTTPException(status_code=404, detail="Hotel not found")
    updated = await db.hotels.find_one({"id": hotel_id}, {"_id": 0})
    return {"success": True, "hotel": updated}

@hotels_router.delete("/{hotel_id}")
async def delete_hotel(hotel_id: str, user: dict = Depends(get_current_user)):
    result = await db.hotels.delete_one({"id": hotel_id})
    if result.deleted_count == 0:
        raise HTTPException(status_code=404, detail="Hotel not found")
    return {"success": True}
