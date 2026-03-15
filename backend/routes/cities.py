from fastapi import APIRouter, HTTPException, Depends, Query
from db import db, get_current_user, logger
from models.schemas import CityCreate
from datetime import datetime, timezone
import uuid

cities_router = APIRouter(prefix="/cities", tags=["Cities"])

@cities_router.get("")
async def get_cities(search: str = None):
    query = {}
    if search:
        query["$or"] = [
            {"name": {"$regex": search, "$options": "i"}},
            {"country": {"$regex": search, "$options": "i"}}
        ]
    cities = await db.cities.find(query, {"_id": 0}).to_list(500)
    return {"success": True, "cities": cities}

@cities_router.post("")
async def create_city(city: CityCreate, user: dict = Depends(get_current_user)):
    city_doc = city.dict()
    city_doc["id"] = str(uuid.uuid4())
    city_doc["created_at"] = datetime.now(timezone.utc).isoformat()
    await db.cities.insert_one(city_doc)
    city_doc.pop("_id", None)
    return {"success": True, "city": city_doc}

@cities_router.put("/{city_id}")
async def update_city(city_id: str, city: CityCreate, user: dict = Depends(get_current_user)):
    city_data = city.dict()
    city_data["updated_at"] = datetime.now(timezone.utc).isoformat()
    result = await db.cities.update_one({"id": city_id}, {"$set": city_data})
    if result.matched_count == 0:
        raise HTTPException(status_code=404, detail="City not found")
    updated = await db.cities.find_one({"id": city_id}, {"_id": 0})
    return {"success": True, "city": updated}

@cities_router.delete("/{city_id}")
async def delete_city(city_id: str, user: dict = Depends(get_current_user)):
    result = await db.cities.delete_one({"id": city_id})
    if result.deleted_count == 0:
        raise HTTPException(status_code=404, detail="City not found")
    return {"success": True}
