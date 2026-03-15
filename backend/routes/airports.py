from fastapi import APIRouter, HTTPException, Depends, Query
from db import db, get_current_user, logger
from models.schemas import AirportCreate
from airports_data import AIRPORTS_DATA
from datetime import datetime, timezone
import uuid

airports_router = APIRouter(prefix="/airports", tags=["Airports"])

@airports_router.get("")
async def get_airports(search: str = None, limit: int = 20):
    if search:
        search_lower = search.lower()
        results = [
            a for a in AIRPORTS_DATA
            if search_lower in a.get("name", "").lower()
            or search_lower in a.get("code", "").lower()
            or search_lower in a.get("city", "").lower()
            or search_lower in a.get("country", "").lower()
        ][:limit]
        return {"success": True, "airports": results}
    
    db_airports = await db.airports.find({}, {"_id": 0}).to_list(limit)
    if db_airports:
        return {"success": True, "airports": db_airports}
    return {"success": True, "airports": AIRPORTS_DATA[:limit]}

@airports_router.post("")
async def create_airport(airport: AirportCreate, user: dict = Depends(get_current_user)):
    airport_doc = airport.dict()
    airport_doc["id"] = str(uuid.uuid4())
    airport_doc["created_at"] = datetime.now(timezone.utc).isoformat()
    await db.airports.insert_one(airport_doc)
    airport_doc.pop("_id", None)
    return {"success": True, "airport": airport_doc}

@airports_router.put("/{airport_id}")
async def update_airport(airport_id: str, airport: AirportCreate, user: dict = Depends(get_current_user)):
    airport_data = airport.dict()
    airport_data["updated_at"] = datetime.now(timezone.utc).isoformat()
    result = await db.airports.update_one({"id": airport_id}, {"$set": airport_data})
    if result.matched_count == 0:
        raise HTTPException(status_code=404, detail="Airport not found")
    updated = await db.airports.find_one({"id": airport_id}, {"_id": 0})
    return {"success": True, "airport": updated}

@airports_router.delete("/{airport_id}")
async def delete_airport(airport_id: str, user: dict = Depends(get_current_user)):
    result = await db.airports.delete_one({"id": airport_id})
    if result.deleted_count == 0:
        raise HTTPException(status_code=404, detail="Airport not found")
    return {"success": True}

@airports_router.get("/database/count")
async def get_airports_count():
    return {"success": True, "count": len(AIRPORTS_DATA), "source": "airports_data.py"}
