from fastapi import APIRouter, HTTPException, Query
from db import db
from models.schemas import AirportCreate
import uuid

airports_router = APIRouter(prefix="/airports", tags=["Airports"])


@airports_router.get("")
async def get_airports(
    page: int = Query(1, ge=1, description="Page number"),
    limit: int = Query(50, ge=1, le=100, description="Items per page"),
    search: str = Query("", description="Search term for airport name, code, city or country")
):
    skip = (page - 1) * limit
    query = {}
    if search:
        search_regex = {"$regex": search, "$options": "i"}
        query = {
            "$or": [
                {"name": search_regex},
                {"code": search_regex},
                {"city": search_regex},
                {"country": search_regex}
            ]
        }
    total = await db.airports.count_documents(query)
    airports = await db.airports.find(query, {"_id": 0}).skip(skip).limit(limit).to_list(limit)
    return {
        "success": True,
        "airports": airports,
        "pagination": {
            "page": page,
            "limit": limit,
            "total": total,
            "pages": (total + limit - 1) // limit
        }
    }


@airports_router.post("")
async def create_airport(airport: AirportCreate):
    airport_id = str(uuid.uuid4())
    doc = {"id": airport_id, **airport.model_dump()}
    await db.airports.insert_one(doc)
    return {"success": True, "id": airport_id}


@airports_router.put("/{airport_id}")
async def update_airport(airport_id: str, airport: AirportCreate):
    result = await db.airports.update_one({"id": airport_id}, {"$set": airport.model_dump()})
    if result.matched_count == 0:
        raise HTTPException(status_code=404, detail="Airport not found")
    return {"success": True}


@airports_router.delete("/{airport_id}")
async def delete_airport(airport_id: str):
    result = await db.airports.delete_one({"id": airport_id})
    if result.deleted_count == 0:
        raise HTTPException(status_code=404, detail="Airport not found")
    return {"success": True}
