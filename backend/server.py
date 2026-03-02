from fastapi import FastAPI, APIRouter, HTTPException, Request, Depends, Query
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials
from dotenv import load_dotenv
from starlette.middleware.cors import CORSMiddleware
from motor.motor_asyncio import AsyncIOMotorClient
import os
import logging
from pathlib import Path
from pydantic import BaseModel, Field, EmailStr
from typing import List, Optional, Dict, Any
import uuid
from datetime import datetime, timezone, timedelta
import jwt
import bcrypt
from emergentintegrations.llm.chat import LlmChat, UserMessage
from emergentintegrations.payments.stripe.checkout import StripeCheckout, CheckoutSessionResponse, CheckoutStatusResponse, CheckoutSessionRequest

ROOT_DIR = Path(__file__).parent
load_dotenv(ROOT_DIR / '.env')

# MongoDB connection
mongo_url = os.environ['MONGO_URL']
client = AsyncIOMotorClient(mongo_url)
db = client[os.environ['DB_NAME']]

# JWT Configuration
JWT_SECRET = os.environ.get('JWT_SECRET', 'travo-dmc-secret-key-2026')
JWT_ALGORITHM = 'HS256'
JWT_EXPIRATION_HOURS = 24

# API Keys
EMERGENT_LLM_KEY = os.environ.get('EMERGENT_LLM_KEY', '')
STRIPE_API_KEY = os.environ.get('STRIPE_API_KEY', '')

# Import airports data
from airports_data import AIRPORTS_DATA

# Create the main app - disable redirect_slashes for consistent routing
app = FastAPI(title="Travo DMC B2B Travel Platform API", redirect_slashes=False)

# Create routers
api_router = APIRouter(prefix="/api")
auth_router = APIRouter(prefix="/auth", tags=["Authentication"])
proposals_router = APIRouter(prefix="/proposals", tags=["Proposals"])
flights_router = APIRouter(prefix="/flights", tags=["Flights"])
hotels_router = APIRouter(prefix="/hotels", tags=["Hotels"])
airports_router = APIRouter(prefix="/airports", tags=["Airports"])
cities_router = APIRouter(prefix="/cities", tags=["Cities"])
transfers_router = APIRouter(prefix="/transfers", tags=["Transfers"])
ai_router = APIRouter(prefix="/ai", tags=["AI Features"])
payments_router = APIRouter(prefix="/payments", tags=["Payments"])
sheets_router = APIRouter(prefix="/sheets", tags=["Google Sheets"])
admin_router = APIRouter(prefix="/admin", tags=["Admin"])

security = HTTPBearer(auto_error=False)

# Configure logging
logging.basicConfig(level=logging.INFO, format='%(asctime)s - %(name)s - %(levelname)s - %(message)s')
logger = logging.getLogger(__name__)

# ============= MODELS =============

class UserCreate(BaseModel):
    email: EmailStr
    password: str
    full_name: str
    company_name: str
    mobile: Optional[str] = None

class UserLogin(BaseModel):
    email: EmailStr
    password: str

class UserResponse(BaseModel):
    id: str
    email: str
    full_name: str
    company_name: str
    mobile: Optional[str] = None

class TokenResponse(BaseModel):
    access_token: str
    token_type: str = "bearer"
    user: UserResponse

class RoomData(BaseModel):
    adults: int = 2
    children: List[Dict[str, str]] = []

class CityStop(BaseModel):
    name: str
    nights: int

class ProposalCreate(BaseModel):
    leaving_from: str
    nationality: str
    leaving_on: str
    star_rating: str
    add_transfers: bool = True
    room_data: List[RoomData]
    cities: List[CityStop]

class ProposalResponse(BaseModel):
    id: str
    user_id: Optional[str]
    leaving_from: str
    nationality: str
    leaving_on: str
    star_rating: str
    add_transfers: bool
    room_data: List[Dict]
    cities: List[Dict]
    status: str = "pending"
    total_price: Optional[float]
    created_at: str

class FlightCreate(BaseModel):
    airline: str
    flight_number: str
    departure_airport: str
    arrival_airport: str
    departure_time: str
    arrival_time: str
    departure_date: str
    arrival_day_offset: str = "0"
    price: str
    cabin_class: str = "Economy"
    duration: str
    logo: Optional[str]

class FlightSearch(BaseModel):
    from_airport: Optional[str]
    to_airport: Optional[str]
    depart_date: Optional[str]
    return_date: Optional[str]
    trip_type: str = "One-way"
    cabin_class: str = "Economy"

class HotelRoom(BaseModel):
    id: str
    name: str
    type: str
    bed_type: str
    view: str
    size: str
    price: float
    original_price: float
    currency: str = "AED"
    amenities: List[str]
    refundable: bool
    refundable_until: Optional[str]
    meals: str
    images: List[str]

class HotelCreate(BaseModel):
    name: str
    city: str
    country: str
    address: str
    description: str
    star_rating: int
    rating_score: float
    rating_text: str
    review_count: int
    images: List[str]
    amenities: List[str]
    detailed_ratings: Dict[str, float]
    what_to_know: List[Dict]
    rooms: List[Dict]

class AirportCreate(BaseModel):
    name: str
    code: str
    city: str
    country: str

class CityCreate(BaseModel):
    name: str
    country: str
    image: Optional[str] = None

class TransferExtra(BaseModel):
    name: str
    description: Optional[str] = None
    price: float
    duration: Optional[str] = None

class TransferCreate(BaseModel):
    title: str
    from_location: str
    to_location: str
    price: float
    description: str
    duration: str = "1 hrs"
    confirmation_time: str = "4 hrs"
    transfer_type: str = "Private"  # Private, Shared, Luxury
    city: str
    extras: Optional[List[TransferExtra]] = []
    is_available: bool = True
    # New fields
    vehicle_type: str = "Sedan"  # Sedan, SUV, Van, Minibus, Luxury Car, Coach
    pickup_times: Optional[List[str]] = []  # e.g., ["06:00", "09:00", "12:00", "15:00", "18:00", "21:00"]
    max_bags: int = 2  # Number of bags allowed
    supplier_name: Optional[str] = None  # For supplier dashboard
    supplier_cost: Optional[float] = None  # Cost from supplier (for margin calculation)

class ChatMessage(BaseModel):
    message: str
    session_id: Optional[str]

class TripRecommendationRequest(BaseModel):
    preferences: str
    budget: Optional[str]
    duration: Optional[str]
    travelers: Optional[int]

class ItineraryRequest(BaseModel):
    cities: List[CityStop]
    interests: Optional[str]
    travelers: int = 2

class PaymentCreate(BaseModel):
    proposal_id: str
    amount: float
    currency: str = "AED"
    payment_method: str = "stripe"

# ============= HELPERS =============

def hash_password(password: str) -> str:
    return bcrypt.hashpw(password.encode('utf-8'), bcrypt.gensalt()).decode('utf-8')

def verify_password(password: str, hashed: str) -> bool:
    return bcrypt.checkpw(password.encode('utf-8'), hashed.encode('utf-8'))

def create_token(user_id: str) -> str:
    payload = {
        "sub": user_id,
        "exp": datetime.now(timezone.utc) + timedelta(hours=JWT_EXPIRATION_HOURS),
        "iat": datetime.now(timezone.utc)
    }
    return jwt.encode(payload, JWT_SECRET, algorithm=JWT_ALGORITHM)

async def get_current_user(credentials: HTTPAuthorizationCredentials = Depends(security)):
    if not credentials:
        raise HTTPException(status_code=401, detail="Not authenticated")
    try:
        payload = jwt.decode(credentials.credentials, JWT_SECRET, algorithms=[JWT_ALGORITHM])
        user_id = payload.get("sub")
        if not user_id:
            raise HTTPException(status_code=401, detail="Invalid token")
        user = await db.users.find_one({"id": user_id}, {"_id": 0, "password": 0})
        if not user:
            raise HTTPException(status_code=401, detail="User not found")
        return user
    except jwt.ExpiredSignatureError:
        raise HTTPException(status_code=401, detail="Token expired")
    except jwt.JWTError:
        raise HTTPException(status_code=401, detail="Invalid token")

async def get_optional_user(credentials: HTTPAuthorizationCredentials = Depends(security)):
    if not credentials:
        return None
    try:
        return await get_current_user(credentials)
    except:
        return None

# ============= AUTH ROUTES =============

@auth_router.post("/signup", response_model=TokenResponse)
async def signup(user_data: UserCreate):
    existing = await db.users.find_one({"email": user_data.email})
    if existing:
        raise HTTPException(status_code=400, detail="Email already registered")
    
    user_id = str(uuid.uuid4())
    user_doc = {
        "id": user_id,
        "email": user_data.email,
        "password": hash_password(user_data.password),
        "full_name": user_data.full_name,
        "company_name": user_data.company_name,
        "mobile": user_data.mobile,
        "created_at": datetime.now(timezone.utc).isoformat()
    }
    await db.users.insert_one(user_doc)
    
    token = create_token(user_id)
    return TokenResponse(
        access_token=token,
        user=UserResponse(id=user_id, email=user_data.email, full_name=user_data.full_name, company_name=user_data.company_name, mobile=user_data.mobile)
    )

@auth_router.post("/login", response_model=TokenResponse)
async def login(credentials: UserLogin):
    user = await db.users.find_one({"email": credentials.email})
    if not user or not verify_password(credentials.password, user["password"]):
        raise HTTPException(status_code=401, detail="Invalid credentials")
    
    token = create_token(user["id"])
    return TokenResponse(
        access_token=token,
        user=UserResponse(id=user["id"], email=user["email"], full_name=user["full_name"], company_name=user["company_name"], mobile=user.get("mobile"))
    )

@auth_router.get("/me", response_model=UserResponse)
async def get_me(user: dict = Depends(get_current_user)):
    return UserResponse(**user)

# ============= PROPOSALS ROUTES =============

@proposals_router.post("", response_model=ProposalResponse)
async def create_proposal(proposal: ProposalCreate, user: dict = Depends(get_optional_user)):
    proposal_id = str(uuid.uuid4())
    
    # Calculate mock price
    total_nights = sum(c.nights for c in proposal.cities)
    base_price = 500 * total_nights
    room_count = len(proposal.room_data)
    total_price = base_price * room_count
    
    doc = {
        "id": proposal_id,
        "user_id": user["id"] if user else None,
        "leaving_from": proposal.leaving_from,
        "nationality": proposal.nationality,
        "leaving_on": proposal.leaving_on,
        "star_rating": proposal.star_rating,
        "add_transfers": proposal.add_transfers,
        "room_data": [r.model_dump() for r in proposal.room_data],
        "cities": [c.model_dump() for c in proposal.cities],
        "status": "pending",
        "total_price": total_price,
        "created_at": datetime.now(timezone.utc).isoformat()
    }
    await db.proposals.insert_one(doc)
    return ProposalResponse(**doc)

@proposals_router.get("", response_model=List[ProposalResponse])
async def get_proposals(user: dict = Depends(get_optional_user)):
    query = {} if not user else {"user_id": user["id"]}
    proposals = await db.proposals.find(query, {"_id": 0}).sort("created_at", -1).to_list(100)
    return [ProposalResponse(**p) for p in proposals]

@proposals_router.get("/{proposal_id}", response_model=ProposalResponse)
async def get_proposal(proposal_id: str):
    proposal = await db.proposals.find_one({"id": proposal_id}, {"_id": 0})
    if not proposal:
        raise HTTPException(status_code=404, detail="Proposal not found")
    return ProposalResponse(**proposal)

@proposals_router.put("/{proposal_id}")
async def update_proposal(proposal_id: str, proposal: ProposalCreate):
    update_data = proposal.model_dump(exclude_unset=True)
    result = await db.proposals.update_one({"id": proposal_id}, {"$set": update_data})
    if result.matched_count == 0:
        raise HTTPException(status_code=404, detail="Proposal not found")
    return {"success": True}

@proposals_router.put("/{proposal_id}/status")
async def update_proposal_status(proposal_id: str, status: str):
    result = await db.proposals.update_one({"id": proposal_id}, {"$set": {"status": status}})
    if result.matched_count == 0:
        raise HTTPException(status_code=404, detail="Proposal not found")
    return {"success": True}

@proposals_router.delete("/{proposal_id}")
async def delete_proposal(proposal_id: str, user: dict = Depends(get_current_user)):
    result = await db.proposals.delete_one({"id": proposal_id})
    if result.deleted_count == 0:
        raise HTTPException(status_code=404, detail="Proposal not found")
    return {"success": True}

# ============= FLIGHTS ROUTES =============

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
    
    # Return mock data if no flights found
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

# ============= HOTELS ROUTES =============

@hotels_router.get("")
async def get_hotels():
    hotels = await db.hotels.find({}, {"_id": 0}).to_list(1000)
    return {"success": True, "hotels": hotels}

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

# ============= AIRPORTS ROUTES =============

@airports_router.get("")
async def get_airports(
    page: int = Query(1, ge=1, description="Page number"),
    limit: int = Query(50, ge=1, le=100, description="Items per page"),
    search: str = Query("", description="Search term for airport name, code, city or country")
):
    """Get airports with pagination and search"""
    skip = (page - 1) * limit
    
    # Build search query
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
    
    # Get total count for pagination
    total = await db.airports.count_documents(query)
    
    # Get paginated results
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

# ============= CITIES ROUTES =============

@cities_router.get("")
async def get_cities(
    search: str = Query("", description="Search term for city name or country"),
    limit: int = Query(500, ge=1, le=500, description="Max items to return")
):
    """Get cities with optional search"""
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

# ============= TRANSFERS ROUTES =============

@transfers_router.get("")
async def get_transfers(
    city: str = Query("", description="Filter by city"),
    search: str = Query("", description="Search term"),
    limit: int = Query(100, ge=1, le=500)
):
    """Get transfers with optional filters"""
    query = {}
    if city:
        query["city"] = {"$regex": city, "$options": "i"}
    if search:
        search_regex = {"$regex": search, "$options": "i"}
        query["$or"] = [
            {"title": search_regex},
            {"from_location": search_regex},
            {"to_location": search_regex}
        ]
    
    transfers = await db.transfers.find(query, {"_id": 0}).limit(limit).to_list(limit)
    return {"success": True, "transfers": transfers}

@transfers_router.get("/{transfer_id}")
async def get_transfer(transfer_id: str):
    transfer = await db.transfers.find_one({"id": transfer_id}, {"_id": 0})
    if not transfer:
        raise HTTPException(status_code=404, detail="Transfer not found")
    return {"success": True, "transfer": transfer}

@transfers_router.post("")
async def create_transfer(transfer: TransferCreate):
    transfer_id = str(uuid.uuid4())
    doc = {"id": transfer_id, **transfer.model_dump(), "created_at": datetime.now(timezone.utc).isoformat()}
    await db.transfers.insert_one(doc)
    return {"success": True, "id": transfer_id}

@transfers_router.put("/{transfer_id}")
async def update_transfer(transfer_id: str, transfer: TransferCreate):
    result = await db.transfers.update_one({"id": transfer_id}, {"$set": transfer.model_dump()})
    if result.matched_count == 0:
        raise HTTPException(status_code=404, detail="Transfer not found")
    return {"success": True}

@transfers_router.delete("/{transfer_id}")
async def delete_transfer(transfer_id: str):
    result = await db.transfers.delete_one({"id": transfer_id})
    if result.deleted_count == 0:
        raise HTTPException(status_code=404, detail="Transfer not found")
    return {"success": True}

# ============= AI ROUTES =============

@ai_router.post("/chat")
async def ai_chat(message: ChatMessage):
    if not EMERGENT_LLM_KEY:
        raise HTTPException(status_code=500, detail="AI service not configured")
    
    session_id = message.session_id or str(uuid.uuid4())
    
    # Get chat history from DB
    history = await db.chat_history.find({"session_id": session_id}, {"_id": 0}).sort("created_at", 1).to_list(50)
    
    chat = LlmChat(
        api_key=EMERGENT_LLM_KEY,
        session_id=session_id,
        system_message="""You are Travo AI, an intelligent travel assistant for Travo DMC B2B Travel Platform. 
You help travel agents with:
- Travel recommendations and destination information
- Package suggestions based on preferences
- Answering questions about hotels, flights, and activities
- Providing local insights and travel tips
Be professional, helpful, and knowledgeable about global destinations."""
    ).with_model("gemini", "gemini-3-flash-preview")
    
    user_msg = UserMessage(text=message.message)
    response = await chat.send_message(user_msg)
    
    # Save to history
    await db.chat_history.insert_one({
        "session_id": session_id,
        "role": "user",
        "content": message.message,
        "created_at": datetime.now(timezone.utc).isoformat()
    })
    await db.chat_history.insert_one({
        "session_id": session_id,
        "role": "assistant",
        "content": response,
        "created_at": datetime.now(timezone.utc).isoformat()
    })
    
    return {"success": True, "response": response, "session_id": session_id}

@ai_router.post("/recommendations")
async def get_recommendations(request: TripRecommendationRequest):
    if not EMERGENT_LLM_KEY:
        raise HTTPException(status_code=500, detail="AI service not configured")
    
    chat = LlmChat(
        api_key=EMERGENT_LLM_KEY,
        session_id=str(uuid.uuid4()),
        system_message="""You are a travel recommendation expert. Provide detailed, personalized travel recommendations.
Format your response as JSON with this structure:
{
  "destinations": [
    {
      "name": "City, Country",
      "description": "Brief description",
      "highlights": ["highlight1", "highlight2"],
      "best_time": "Best time to visit",
      "estimated_budget": "Budget range"
    }
  ],
  "tips": ["tip1", "tip2"]
}"""
    ).with_model("gemini", "gemini-3-flash-preview")
    
    prompt = f"""Based on these preferences, suggest travel destinations:
Preferences: {request.preferences}
Budget: {request.budget or 'Flexible'}
Duration: {request.duration or 'Any'}
Travelers: {request.travelers or 2}

Provide 3-5 destination recommendations."""

    user_msg = UserMessage(text=prompt)
    response = await chat.send_message(user_msg)
    
    return {"success": True, "recommendations": response}

@ai_router.post("/itinerary")
async def generate_itinerary(request: ItineraryRequest):
    if not EMERGENT_LLM_KEY:
        raise HTTPException(status_code=500, detail="AI service not configured")
    
    chat = LlmChat(
        api_key=EMERGENT_LLM_KEY,
        session_id=str(uuid.uuid4()),
        system_message="""You are a professional travel itinerary planner. Create detailed day-by-day itineraries.
Format your response as a structured itinerary with:
- Day-by-day activities
- Recommended hotels
- Local restaurants
- Travel tips
- Estimated costs"""
    ).with_model("gemini", "gemini-3-flash-preview")
    
    cities_info = "\n".join([f"- {c.name}: {c.nights} nights" for c in request.cities])
    prompt = f"""Create a detailed travel itinerary for:
Cities & Duration:
{cities_info}

Interests: {request.interests or 'General sightseeing, culture, food'}
Number of travelers: {request.travelers}

Provide a comprehensive day-by-day itinerary."""

    user_msg = UserMessage(text=prompt)
    response = await chat.send_message(user_msg)
    
    return {"success": True, "itinerary": response}

@ai_router.get("/chat/history/{session_id}")
async def get_chat_history(session_id: str):
    history = await db.chat_history.find({"session_id": session_id}, {"_id": 0}).sort("created_at", 1).to_list(100)
    return {"success": True, "history": history}

# ============= PAYMENTS ROUTES =============

@payments_router.post("/stripe/checkout")
async def create_stripe_checkout(request: Request, proposal_id: str, origin_url: str):
    if not STRIPE_API_KEY:
        raise HTTPException(status_code=500, detail="Stripe not configured")
    
    # Get proposal
    proposal = await db.proposals.find_one({"id": proposal_id}, {"_id": 0})
    if not proposal:
        raise HTTPException(status_code=404, detail="Proposal not found")
    
    amount = float(proposal.get("total_price", 0))
    if amount <= 0:
        raise HTTPException(status_code=400, detail="Invalid amount")
    
    host_url = str(request.base_url).rstrip('/')
    webhook_url = f"{host_url}/api/payments/webhook/stripe"
    
    stripe_checkout = StripeCheckout(api_key=STRIPE_API_KEY, webhook_url=webhook_url)
    
    success_url = f"{origin_url}/payment/success?session_id={{CHECKOUT_SESSION_ID}}"
    cancel_url = f"{origin_url}/payment/cancel"
    
    checkout_request = CheckoutSessionRequest(
        amount=amount,
        currency="aed",
        success_url=success_url,
        cancel_url=cancel_url,
        metadata={"proposal_id": proposal_id}
    )
    
    session = await stripe_checkout.create_checkout_session(checkout_request)
    
    # Create payment transaction record
    await db.payment_transactions.insert_one({
        "id": str(uuid.uuid4()),
        "session_id": session.session_id,
        "proposal_id": proposal_id,
        "amount": amount,
        "currency": "AED",
        "payment_method": "stripe",
        "status": "pending",
        "created_at": datetime.now(timezone.utc).isoformat()
    })
    
    return {"success": True, "url": session.url, "session_id": session.session_id}

@payments_router.get("/stripe/status/{session_id}")
async def get_stripe_status(session_id: str):
    if not STRIPE_API_KEY:
        raise HTTPException(status_code=500, detail="Stripe not configured")
    
    stripe_checkout = StripeCheckout(api_key=STRIPE_API_KEY, webhook_url="")
    status = await stripe_checkout.get_checkout_status(session_id)
    
    # Update transaction status
    await db.payment_transactions.update_one(
        {"session_id": session_id},
        {"$set": {"status": status.payment_status, "updated_at": datetime.now(timezone.utc).isoformat()}}
    )
    
    # Update proposal status if paid
    if status.payment_status == "paid":
        transaction = await db.payment_transactions.find_one({"session_id": session_id})
        if transaction:
            await db.proposals.update_one(
                {"id": transaction["proposal_id"]},
                {"$set": {"status": "confirmed", "payment_status": "paid"}}
            )
    
    return {
        "success": True,
        "status": status.status,
        "payment_status": status.payment_status,
        "amount_total": status.amount_total,
        "currency": status.currency
    }

@payments_router.post("/webhook/stripe")
async def stripe_webhook(request: Request):
    if not STRIPE_API_KEY:
        return {"status": "not configured"}
    
    body = await request.body()
    signature = request.headers.get("Stripe-Signature")
    
    stripe_checkout = StripeCheckout(api_key=STRIPE_API_KEY, webhook_url="")
    
    try:
        webhook_response = await stripe_checkout.handle_webhook(body, signature)
        
        if webhook_response.payment_status == "paid":
            await db.payment_transactions.update_one(
                {"session_id": webhook_response.session_id},
                {"$set": {"status": "paid", "updated_at": datetime.now(timezone.utc).isoformat()}}
            )
            
            transaction = await db.payment_transactions.find_one({"session_id": webhook_response.session_id})
            if transaction:
                await db.proposals.update_one(
                    {"id": transaction["proposal_id"]},
                    {"$set": {"status": "confirmed", "payment_status": "paid"}}
                )
        
        return {"status": "processed"}
    except Exception as e:
        logger.error(f"Webhook error: {e}")
        return {"status": "error"}

# PayPal endpoints (mocked - requires user to provide credentials)
@payments_router.post("/paypal/checkout")
async def create_paypal_checkout(proposal_id: str, origin_url: str):
    # This is a placeholder - needs PayPal credentials
    proposal = await db.proposals.find_one({"id": proposal_id}, {"_id": 0})
    if not proposal:
        raise HTTPException(status_code=404, detail="Proposal not found")
    
    return {
        "success": False, 
        "message": "PayPal integration requires PAYPAL_CLIENT_ID and PAYPAL_SECRET in environment variables",
        "setup_instructions": "Please provide your PayPal sandbox/live credentials"
    }

# ============= GOOGLE SHEETS ROUTES (MOCKED) =============

@sheets_router.get("/status")
async def sheets_status():
    """Check if Google Sheets is configured"""
    google_client_id = os.environ.get('GOOGLE_CLIENT_ID')
    if not google_client_id:
        return {
            "configured": False,
            "message": "Google Sheets sync requires Google OAuth credentials",
            "instructions": "Please set GOOGLE_CLIENT_ID and GOOGLE_CLIENT_SECRET in environment"
        }
    return {"configured": True}

@sheets_router.post("/sync/proposals")
async def sync_proposals_to_sheets():
    """Sync proposals to Google Sheets (mocked)"""
    proposals = await db.proposals.find({}, {"_id": 0}).to_list(1000)
    return {
        "success": True,
        "message": "Google Sheets sync requires OAuth setup. Data prepared for sync.",
        "data_count": len(proposals),
        "sample_data": proposals[:5] if proposals else []
    }

@sheets_router.post("/sync/all")
async def sync_all_to_sheets():
    """Sync all data to Google Sheets (mocked)"""
    proposals = await db.proposals.find({}, {"_id": 0}).to_list(1000)
    users = await db.users.find({}, {"_id": 0, "password": 0}).to_list(1000)
    flights = await db.flights.find({}, {"_id": 0}).to_list(1000)
    
    return {
        "success": True,
        "message": "Google Sheets sync requires OAuth setup. Data prepared for sync.",
        "summary": {
            "proposals": len(proposals),
            "users": len(users),
            "flights": len(flights)
        }
    }

# ============= ADMIN ROUTES =============

class UserUpdate(BaseModel):
    full_name: Optional[str] = None
    email: Optional[EmailStr] = None
    mobile: Optional[str] = None
    company_name: Optional[str] = None
    role: Optional[str] = None
    status: Optional[str] = None

class AdminUserResponse(BaseModel):
    id: str
    email: str
    full_name: str
    company_name: str
    mobile: Optional[str]
    role: str
    status: str
    created_at: str
    proposals_count: int
    total_bookings_value: float

@admin_router.get("/users")
async def get_all_users():
    """Get all users with their statistics"""
    users = await db.users.find({}, {"_id": 0, "password": 0}).to_list(1000)
    
    # Enrich with stats
    enriched_users = []
    for user in users:
        proposals = await db.proposals.find({"user_id": user["id"]}, {"_id": 0}).to_list(1000)
        proposals_count = len(proposals)
        total_value = sum(p.get("total_price", 0) for p in proposals)
        
        enriched_users.append({
            **user,
            "role": user.get("role", "agent"),
            "status": user.get("status", "active"),
            "proposals_count": proposals_count,
            "total_bookings_value": total_value
        })
    
    return {"success": True, "users": enriched_users}

@admin_router.get("/users/{user_id}")
async def get_user_details(user_id: str):
    """Get detailed user information"""
    user = await db.users.find_one({"id": user_id}, {"_id": 0, "password": 0})
    if not user:
        raise HTTPException(status_code=404, detail="User not found")
    
    proposals = await db.proposals.find({"user_id": user_id}, {"_id": 0}).to_list(1000)
    payments = await db.payment_transactions.find({"user_id": user_id}, {"_id": 0}).to_list(100)
    
    return {
        "success": True,
        "user": {
            **user,
            "role": user.get("role", "agent"),
            "status": user.get("status", "active")
        },
        "proposals": proposals,
        "payments": payments,
        "stats": {
            "proposals_count": len(proposals),
            "confirmed_count": len([p for p in proposals if p.get("status") == "confirmed"]),
            "pending_count": len([p for p in proposals if p.get("status") == "pending"]),
            "total_value": sum(p.get("total_price", 0) for p in proposals)
        }
    }

@admin_router.put("/users/{user_id}")
async def update_user(user_id: str, update_data: UserUpdate):
    """Update user details"""
    update_dict = {k: v for k, v in update_data.model_dump().items() if v is not None}
    if not update_dict:
        raise HTTPException(status_code=400, detail="No update data provided")
    
    result = await db.users.update_one({"id": user_id}, {"$set": update_dict})
    if result.matched_count == 0:
        raise HTTPException(status_code=404, detail="User not found")
    
    return {"success": True, "message": "User updated successfully"}

@admin_router.delete("/users/{user_id}")
async def delete_user(user_id: str):
    """Delete a user"""
    result = await db.users.delete_one({"id": user_id})
    if result.deleted_count == 0:
        raise HTTPException(status_code=404, detail="User not found")
    
    # Optionally delete user's proposals
    await db.proposals.delete_many({"user_id": user_id})
    
    return {"success": True, "message": "User deleted successfully"}

@admin_router.get("/stats")
async def get_admin_stats():
    """Get overall platform statistics"""
    users_count = await db.users.count_documents({})
    proposals_count = await db.proposals.count_documents({})
    confirmed_count = await db.proposals.count_documents({"status": "confirmed"})
    pending_count = await db.proposals.count_documents({"status": "pending"})
    
    # Get total revenue
    proposals = await db.proposals.find({"status": "confirmed"}, {"_id": 0, "total_price": 1}).to_list(10000)
    total_revenue = sum(p.get("total_price", 0) for p in proposals)
    
    # Get recent users (last 30 days)
    thirty_days_ago = (datetime.now(timezone.utc) - timedelta(days=30)).isoformat()
    recent_users = await db.users.count_documents({"created_at": {"$gte": thirty_days_ago}})
    
    return {
        "success": True,
        "stats": {
            "total_users": users_count,
            "total_proposals": proposals_count,
            "confirmed_proposals": confirmed_count,
            "pending_proposals": pending_count,
            "total_revenue": total_revenue,
            "recent_signups": recent_users
        }
    }

@admin_router.post("/users/{user_id}/role")
async def update_user_role(user_id: str, role: str):
    """Update user role (admin/agent)"""
    if role not in ["admin", "agent", "manager"]:
        raise HTTPException(status_code=400, detail="Invalid role")
    
    result = await db.users.update_one({"id": user_id}, {"$set": {"role": role}})
    if result.matched_count == 0:
        raise HTTPException(status_code=404, detail="User not found")
    
    return {"success": True, "message": f"User role updated to {role}"}

@admin_router.post("/users/{user_id}/status")
async def update_user_status(user_id: str, status: str):
    """Update user status (active/suspended/inactive)"""
    if status not in ["active", "suspended", "inactive"]:
        raise HTTPException(status_code=400, detail="Invalid status")
    
    result = await db.users.update_one({"id": user_id}, {"$set": {"status": status}})
    if result.matched_count == 0:
        raise HTTPException(status_code=404, detail="User not found")
    
    return {"success": True, "message": f"User status updated to {status}"}

# ============= ROOT ROUTES =============

@api_router.get("")
async def root():
    return {"message": "Travo DMC B2B Travel Platform API", "version": "2.0.0"}

@api_router.get("/health")
async def health_check():
    return {"status": "healthy", "timestamp": datetime.now(timezone.utc).isoformat()}

# ============= SEED DATA FUNCTION =============

async def seed_initial_data():
    """Seed initial airports, cities, and hotels"""
    
    # Check if airports data needs updating - AIRPORTS_DATA has 1543 entries
    airports_count = await db.airports.count_documents({})
    expected_airports = len(AIRPORTS_DATA)
    
    # If we have significantly fewer airports than expected, reseed
    if airports_count < expected_airports - 50:
        logger.info(f"Found {airports_count} airports, expected {expected_airports}. Reseeding airport database...")
        
        # Clear existing airports and reseed with comprehensive data
        await db.airports.delete_many({})
        
        # Add IDs to each airport from the comprehensive AIRPORTS_DATA
        airports_to_insert = []
        for airport in AIRPORTS_DATA:
            airport_doc = {
                "id": str(uuid.uuid4()),
                "code": airport["code"],
                "name": airport["name"],
                "city": airport["city"],
                "country": airport["country"]
            }
            airports_to_insert.append(airport_doc)
        
        if airports_to_insert:
            await db.airports.insert_many(airports_to_insert)
            logger.info(f"Seeded {len(airports_to_insert)} airports successfully")
    else:
        logger.info(f"Airports database has {airports_count} entries (expected: {expected_airports})")
    
    # Check if cities data needs seeding
    cities_count = await db.cities.count_documents({})
    if cities_count == 0:
        logger.info("Seeding cities...")
        # Seed major cities
        cities = [
            {"name": "Dubai", "country": "United Arab Emirates"},
            {"name": "Abu Dhabi", "country": "United Arab Emirates"},
            {"name": "Tbilisi", "country": "Georgia"},
            {"name": "Batumi", "country": "Georgia"},
            {"name": "London", "country": "United Kingdom"},
            {"name": "Paris", "country": "France"},
            {"name": "New York", "country": "USA"},
            {"name": "Tokyo", "country": "Japan"},
            {"name": "Singapore", "country": "Singapore"},
            {"name": "Istanbul", "country": "Turkey"},
            {"name": "Mumbai", "country": "India"},
            {"name": "Delhi", "country": "India"},
            {"name": "Bangkok", "country": "Thailand"},
            {"name": "Bali", "country": "Indonesia"},
        ]
        
        for city in cities:
            city["id"] = str(uuid.uuid4())
        await db.cities.insert_many(cities)
        logger.info(f"Seeded {len(cities)} cities")
    
    # Check if hotels data needs seeding
    hotels_count = await db.hotels.count_documents({})
    if hotels_count == 0:
        logger.info("Seeding hotels...")
        # Seed sample hotels
        hotels = [
            {
                "id": str(uuid.uuid4()),
                "name": "Courtyard by Marriott Baku",
                "city": "Baku",
                "country": "Azerbaijan",
                "address": "300-303 Quarter, Nasimi District, Baku",
                "description": "A stay at Courtyard by Marriott Baku places you in the heart of Baku.",
                "star_rating": 4,
                "rating_score": 9.2,
                "rating_text": "Wonderful",
                "review_count": 107,
                "images": ["https://picsum.photos/seed/baku1/1200/800"],
                "amenities": ["Pool", "Spa", "Beach Access", "Free WiFi", "Fitness Center"],
                "detailed_ratings": {"cleanliness": 4.7, "service": 4.6, "comfort": 4.7},
                "what_to_know": [],
                "rooms": [
                    {
                        "id": "R001",
                        "name": "Superior Room",
                        "type": "Superior",
                        "bed_type": "1 King",
                        "view": "City View",
                        "size": "30 sqm",
                        "price": 1861,
                        "original_price": 1918,
                        "currency": "AED",
                        "amenities": ["Free WiFi", "TV", "Minibar"],
                        "refundable": True,
                        "meals": "No meals included",
                        "images": []
                    }
                ]
            },
            {
                "id": str(uuid.uuid4()),
                "name": "Burj Al Arab Jumeirah",
                "city": "Dubai",
                "country": "United Arab Emirates",
                "address": "Jumeirah St, Dubai",
                "description": "The distinctive sail-shaped silhouette of Burj Al Arab Jumeirah.",
                "star_rating": 7,
                "rating_score": 9.8,
                "rating_text": "Exceptional",
                "review_count": 2540,
                "images": ["https://picsum.photos/seed/burj1/1200/800"],
                "amenities": ["Pool", "Spa", "Beach Access", "Free WiFi", "Butler Service"],
                "detailed_ratings": {"cleanliness": 4.9, "service": 5.0, "comfort": 4.9},
                "what_to_know": [],
                "rooms": [
                    {
                        "id": "R002",
                        "name": "Deluxe Marina Suite",
                        "type": "Suite",
                        "bed_type": "1 King",
                        "view": "Marina View",
                        "size": "170 sqm",
                        "price": 5500,
                        "original_price": 6000,
                        "currency": "AED",
                        "amenities": ["Butler Service", "Hermes Amenities"],
                        "refundable": False,
                        "meals": "Breakfast Included",
                        "images": []
                    }
                ]
            }
        ]
        
        await db.hotels.insert_many(hotels)
        logger.info(f"Seeded {len(hotels)} hotels")
    
    # Check if transfers data needs seeding
    transfers_count = await db.transfers.count_documents({})
    if transfers_count == 0:
        logger.info("Seeding transfers...")
        transfers = [
            {
                "id": str(uuid.uuid4()),
                "title": "Private from Dubai International Airport",
                "from_location": "Dubai International Airport (DXB)",
                "to_location": "Admiral Plaza Hotel, Dubai",
                "price": 88,
                "description": "You will be met by our representative at the Airport Arrival Terminal. Look for a name board with your name on it. Our representative will assist you with your luggage and escort you to your private vehicle.",
                "duration": "1 hrs",
                "confirmation_time": "4 hrs",
                "transfer_type": "Private",
                "city": "Dubai",
                "vehicle_type": "Sedan",
                "pickup_times": ["06:00", "09:00", "12:00", "15:00", "18:00", "21:00"],
                "max_bags": 3,
                "supplier_name": "Emirates Transfers LLC",
                "supplier_cost": 65,
                "extras": [
                    {"name": "Half Day English Speaking Guide (4 hours)", "price": 330, "duration": "4 hrs"},
                    {"name": "Full Day English Speaking Guide (8 hours)", "price": 550, "duration": "8 hrs"}
                ],
                "is_available": True
            },
            {
                "id": str(uuid.uuid4()),
                "title": "Private from Tbilisi International Airport",
                "from_location": "Tbilisi International Airport (TBS)",
                "to_location": "Iveria Inn Hotel, Tbilisi",
                "price": 45,
                "description": "Meet and greet service at Tbilisi Airport. Our professional driver will hold a name board and escort you to a comfortable private vehicle for transfer to your hotel.",
                "duration": "45 mins",
                "confirmation_time": "4 hrs",
                "transfer_type": "Private",
                "city": "Tbilisi",
                "vehicle_type": "Sedan",
                "pickup_times": ["08:00", "12:00", "16:00", "20:00"],
                "max_bags": 2,
                "supplier_name": "Georgia Tours Co.",
                "supplier_cost": 30,
                "extras": [
                    {"name": "English Speaking Guide (4 hours)", "price": 120, "duration": "4 hrs"}
                ],
                "is_available": True
            },
            {
                "id": str(uuid.uuid4()),
                "title": "Luxury Transfer from Dubai Airport",
                "from_location": "Dubai International Airport (DXB)",
                "to_location": "Burj Al Arab Hotel, Dubai",
                "price": 250,
                "description": "Premium luxury transfer service with a Mercedes S-Class or similar. Includes complimentary water and WiFi. Our chauffeur will meet you at arrivals.",
                "duration": "1 hrs",
                "confirmation_time": "2 hrs",
                "transfer_type": "Luxury",
                "city": "Dubai",
                "vehicle_type": "Luxury Car",
                "pickup_times": ["00:00", "03:00", "06:00", "09:00", "12:00", "15:00", "18:00", "21:00"],
                "max_bags": 4,
                "supplier_name": "VIP Cars Dubai",
                "supplier_cost": 180,
                "extras": [
                    {"name": "VIP Meet & Greet with Porter", "price": 75, "duration": "30 mins"},
                    {"name": "Full Day Chauffeur Service", "price": 800, "duration": "8 hrs"}
                ],
                "is_available": True
            },
            {
                "id": str(uuid.uuid4()),
                "title": "Shared Airport Transfer - Dubai",
                "from_location": "Dubai International Airport (DXB)",
                "to_location": "Downtown Dubai Hotels",
                "price": 35,
                "description": "Economical shared shuttle service from Dubai Airport to major downtown hotels. Air-conditioned vehicle with professional driver.",
                "duration": "1.5 hrs",
                "confirmation_time": "6 hrs",
                "transfer_type": "Shared",
                "city": "Dubai",
                "vehicle_type": "Minibus",
                "pickup_times": ["07:00", "10:00", "13:00", "16:00", "19:00", "22:00"],
                "max_bags": 2,
                "supplier_name": "Budget Shuttles LLC",
                "supplier_cost": 20,
                "extras": [],
                "is_available": True
            },
            {
                "id": str(uuid.uuid4()),
                "title": "Private Transfer to Abu Dhabi",
                "from_location": "Dubai City Hotels",
                "to_location": "Abu Dhabi City Hotels",
                "price": 180,
                "description": "Comfortable inter-city transfer from Dubai to Abu Dhabi. Private vehicle with English-speaking driver. Highway tolls included.",
                "duration": "1.5 hrs",
                "confirmation_time": "4 hrs",
                "transfer_type": "Private",
                "city": "Dubai",
                "vehicle_type": "SUV",
                "pickup_times": ["06:00", "08:00", "10:00", "14:00", "18:00"],
                "max_bags": 5,
                "supplier_name": "Emirates Transfers LLC",
                "supplier_cost": 130,
                "extras": [
                    {"name": "Abu Dhabi City Tour Add-on", "price": 150, "duration": "3 hrs"}
                ],
                "is_available": True
            }
        ]
        
        await db.transfers.insert_many(transfers)
        logger.info(f"Seeded {len(transfers)} transfers")
    
    logger.info("Data seeding check complete")

# ============= APP SETUP =============

# Include all routers
api_router.include_router(auth_router)
api_router.include_router(proposals_router)
api_router.include_router(flights_router)
api_router.include_router(hotels_router)
api_router.include_router(airports_router)
api_router.include_router(cities_router)
api_router.include_router(transfers_router)
api_router.include_router(ai_router)
api_router.include_router(payments_router)
api_router.include_router(sheets_router)
api_router.include_router(admin_router)

app.include_router(api_router)

app.add_middleware(
    CORSMiddleware,
    allow_credentials=True,
    allow_origins=["*"],
    allow_methods=["*"],
    allow_headers=["*"],
)

@app.on_event("startup")
async def startup_event():
    await seed_initial_data()

@app.on_event("shutdown")
async def shutdown_db_client():
    client.close()
