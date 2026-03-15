from fastapi import APIRouter, HTTPException, Depends, Query
from db import db, get_current_user, get_optional_user, UPLOADS_DIR, logger
from models.schemas import FlightCreate, FlightSearch
from datetime import datetime, timezone
import uuid

flights_router = APIRouter(prefix="/flights", tags=["Flights"])

@flights_router.get("")
async def get_flights(
    from_airport: str = None,
    to_airport: str = None,
    date: str = None
):
    query = {}
    if from_airport:
        query["departure_airport"] = {"$regex": from_airport, "$options": "i"}
    if to_airport:
        query["arrival_airport"] = {"$regex": to_airport, "$options": "i"}
    if date:
        query["departure_date"] = date
    
    flights = await db.flights.find(query, {"_id": 0}).to_list(100)
    return {"success": True, "flights": flights}

@flights_router.post("")
async def create_flight(flight: FlightCreate, user: dict = Depends(get_current_user)):
    flight_doc = flight.dict()
    flight_doc["id"] = str(uuid.uuid4())
    flight_doc["created_at"] = datetime.now(timezone.utc).isoformat()
    await db.flights.insert_one(flight_doc)
    flight_doc.pop("_id", None)
    return {"success": True, "flight": flight_doc}

@flights_router.post("/search")
async def search_flights(search: FlightSearch):
    query = {}
    if search.from_airport:
        query["departure_airport"] = {"$regex": search.from_airport, "$options": "i"}
    if search.to_airport:
        query["arrival_airport"] = {"$regex": search.to_airport, "$options": "i"}
    if search.depart_date:
        query["departure_date"] = search.depart_date
    
    flights = await db.flights.find(query, {"_id": 0}).to_list(100)
    
    if not flights:
        flights = [
            {
                "id": str(uuid.uuid4()),
                "airline": "Emirates",
                "flight_number": "EK384",
                "departure_airport": search.from_airport or "Dubai",
                "arrival_airport": search.to_airport or "Destination",
                "departure_time": "08:15",
                "arrival_time": "12:30",
                "departure_date": search.depart_date or "2026-04-01",
                "arrival_day_offset": "0",
                "price": "850",
                "duration": "4h 15m",
                "cabin_class": search.cabin_class or "Economy"
            }
        ]
    
    return {"success": True, "flights": flights}
