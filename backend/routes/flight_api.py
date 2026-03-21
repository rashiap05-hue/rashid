from fastapi import APIRouter
from typing import Optional
from db import db, logger
import os

flight_api_router = APIRouter(tags=["Flight API"])


@flight_api_router.get("/flights/search")
async def search_flight(flight_number: str, date: Optional[str] = None):
    """Search for flight details using Aviationstack API"""
    import httpx

    api_key = os.environ.get('AVIATIONSTACK_API_KEY')

    if not api_key:
        return {"success": False, "error": "Flight API not configured", "flights": []}

    try:
        clean_flight_number = flight_number.replace(" ", "").replace("-", "").upper()
        api_url = "http://api.aviationstack.com/v1/flights"

        params = {
            "access_key": api_key,
            "flight_iata": clean_flight_number
        }
        if date:
            params["flight_date"] = date

        async with httpx.AsyncClient(timeout=30.0) as client:
            response = await client.get(api_url, params=params)

            if response.status_code == 200:
                data = response.json()

                if data.get("error"):
                    return {
                        "success": False,
                        "error": data["error"].get("message", "API error"),
                        "flights": []
                    }

                flights = data.get("data", [])

                if not flights:
                    return {"success": True, "message": "No flights found", "flights": []}

                formatted_flights = []
                for flight in flights[:5]:
                    if flight is None:
                        continue

                    flight_info = flight.get("flight") or {}
                    airline_info = flight.get("airline") or {}
                    departure_info = flight.get("departure") or {}
                    arrival_info = flight.get("arrival") or {}
                    aircraft_info = flight.get("aircraft") or {}

                    dep_scheduled = departure_info.get("scheduled") or ""
                    arr_scheduled = arrival_info.get("scheduled") or ""
                    flight_status = flight.get("flight_status") or "scheduled"

                    dep_time_str = ""
                    if dep_scheduled:
                        if "T" in dep_scheduled:
                            dep_time_str = dep_scheduled.split("T")[1][:5]
                        else:
                            dep_time_str = dep_scheduled[:5] if len(dep_scheduled) >= 5 else dep_scheduled

                    arr_time_str = ""
                    if arr_scheduled:
                        if "T" in arr_scheduled:
                            arr_time_str = arr_scheduled.split("T")[1][:5]
                        else:
                            arr_time_str = arr_scheduled[:5] if len(arr_scheduled) >= 5 else arr_scheduled

                    formatted_flight = {
                        "flight_number": flight_info.get("iata") or flight_number,
                        "airline": airline_info.get("iata") or "",
                        "airline_name": airline_info.get("name") or "Unknown Airline",
                        "departure": departure_info.get("airport") or "",
                        "dep_iata": departure_info.get("iata") or "",
                        "dep_terminal": departure_info.get("terminal") or "",
                        "dep_gate": departure_info.get("gate") or "",
                        "dep_time": dep_time_str,
                        "dep_timezone": departure_info.get("timezone") or "",
                        "arrival": arrival_info.get("airport") or "",
                        "arr_iata": arrival_info.get("iata") or "",
                        "arr_terminal": arrival_info.get("terminal") or "",
                        "arr_gate": arrival_info.get("gate") or "",
                        "arr_time": arr_time_str,
                        "arr_timezone": arrival_info.get("timezone") or "",
                        "status": flight_status.capitalize() if flight_status else "Scheduled",
                        "flight_date": flight.get("flight_date") or date or "",
                        "aircraft": aircraft_info.get("registration") or "",
                        "aircraft_type": aircraft_info.get("iata") or ""
                    }
                    formatted_flights.append(formatted_flight)

                return {
                    "success": True,
                    "flights": formatted_flights,
                    "total": len(formatted_flights)
                }
            else:
                return {
                    "success": False,
                    "error": f"API request failed with status {response.status_code}",
                    "flights": []
                }

    except Exception as e:
        logger.error(f"Error fetching flight details: {str(e)}")
        return {"success": False, "error": str(e), "flights": []}
