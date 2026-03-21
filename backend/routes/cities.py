from fastapi import APIRouter, HTTPException, Query
from db import db
from models.schemas import CityCreate
import uuid

cities_router = APIRouter(prefix="/cities", tags=["Cities"])


@cities_router.get("")
async def get_cities(
    search: str = Query("", description="Search term for city name or country"),
    limit: int = Query(500, ge=1, le=500, description="Max items to return")
):
    query = {}
    if search:
        search_regex = {"$regex": search, "$options": "i"}
        query = {
            "$or": [
                {"name": search_regex},
                {"country": search_regex}
            ]
        }
    cities = await db.cities.find(query, {"_id": 0}).limit(limit).to_list(limit)
    return {"success": True, "cities": cities}


@cities_router.post("")
async def create_city(city: CityCreate):
    city_id = str(uuid.uuid4())
    doc = {"id": city_id, **city.model_dump()}
    await db.cities.insert_one(doc)
    return {"success": True, "id": city_id}


@cities_router.put("/{city_id}")
async def update_city(city_id: str, city: CityCreate):
    result = await db.cities.update_one({"id": city_id}, {"$set": city.model_dump()})
    if result.matched_count == 0:
        raise HTTPException(status_code=404, detail="City not found")
    return {"success": True}


@cities_router.delete("/{city_id}")
async def delete_city(city_id: str):
    result = await db.cities.delete_one({"id": city_id})
    if result.deleted_count == 0:
        raise HTTPException(status_code=404, detail="City not found")
    return {"success": True}
