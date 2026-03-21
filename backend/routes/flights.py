from fastapi import APIRouter, HTTPException
from db import db
from models.schemas import FlightCreate, FlightSearch
from datetime import datetime, timezone
import uuid

flights_router = APIRouter(prefix="/flights", tags=["Flights"])


@flights_router.get("")
async def get_flights():
    flights = await db.flights.find({}, {"_id": 0}).to_list(1000)
    return {"success": True, "flights": flights}


@flights_router.post("")
async def create_flight(flight: FlightCreate):
    flight_id = str(uuid.uuid4())
    doc = {"id": flight_id, **flight.model_dump()}
    await db.flights.insert_one(doc)
    return {"success": True, "id": flight_id}


@flights_router.post("/search")
async def search_flights(search: FlightSearch):
    query = {}
    if search.from_airport:
        from_code = search.from_airport.split('(')[1].split(')')[0] if '(' in search.from_airport else search.from_airport
        query["departure_airport"] = from_code
    if search.to_airport:
        to_code = search.to_airport.split('(')[1].split(')')[0] if '(' in search.to_airport else search.to_airport
        query["arrival_airport"] = to_code
    if search.cabin_class:
        query["cabin_class"] = search.cabin_class

    flights = await db.flights.find(query, {"_id": 0}).to_list(100)

    if not flights:
        airlines = ["Emirates", "FlyDubai", "Qatar Airways", "Turkish Airlines", "Air India"]
        flights = []
        for i, airline in enumerate(airlines):
            base_price = 800 + (i * 150)
            flights.append({
                "id": f"mock-{i}-{datetime.now().timestamp()}",
                "airline": airline,
                "logo": airline[:2].upper(),
                "departure_airport": search.from_airport.split('(')[1].split(')')[0] if search.from_airport and '(' in search.from_airport else "DXB",
                "arrival_airport": search.to_airport.split('(')[1].split(')')[0] if search.to_airport and '(' in search.to_airport else "TBS",
                "departure_time": f"{8 + i:02d}:30",
                "arrival_time": f"{11 + i:02d}:45",
                "duration": "3h 15m",
                "price": str(base_price),
                "type": "Non-stop",
                "cabin_class": search.cabin_class or "Economy"
            })

    return {"success": True, "flights": flights}


@flights_router.put("/{flight_id}")
async def update_flight(flight_id: str, flight: FlightCreate):
    result = await db.flights.update_one({"id": flight_id}, {"$set": flight.model_dump()})
    if result.matched_count == 0:
        raise HTTPException(status_code=404, detail="Flight not found")
    return {"success": True}


@flights_router.delete("/{flight_id}")
async def delete_flight(flight_id: str):
    result = await db.flights.delete_one({"id": flight_id})
    if result.deleted_count == 0:
        raise HTTPException(status_code=404, detail="Flight not found")
    return {"success": True}
