from fastapi import FastAPI, APIRouter, HTTPException, Request, Depends, Query, UploadFile, File, Form
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials
from fastapi.staticfiles import StaticFiles
from dotenv import load_dotenv
from starlette.middleware.cors import CORSMiddleware
from motor.motor_asyncio import AsyncIOMotorClient
import os
import logging
import shutil
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

# Setup uploads directory
UPLOADS_DIR = ROOT_DIR / "uploads"
UPLOADS_DIR.mkdir(exist_ok=True)
(UPLOADS_DIR / "hotels").mkdir(exist_ok=True)
(UPLOADS_DIR / "rooms").mkdir(exist_ok=True)

# Create the main app - disable redirect_slashes for consistent routing
app = FastAPI(title="Travo DMC B2B Travel Platform API", redirect_slashes=False)

# Mount static files for uploads
app.mount("/uploads", StaticFiles(directory=str(UPLOADS_DIR)), name="uploads")

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
uploads_router = APIRouter(prefix="/uploads", tags=["File Uploads"])

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

# Rate Plan model for room pricing
class RatePlan(BaseModel):
    id: str = ""
    name: str  # e.g., "Room Only", "Breakfast Included"
    price: float
    original_price: Optional[float] = None
    currency: str = "AED"
    meal_plan: str = "Room Only"  # Room Only, Breakfast, Half Board, Full Board
    meal_details: Optional[str] = None  # e.g., "Breakfast buffet", "Breakfast for 2"
    refund_policy: str = "Refundable"  # Refundable, Non-refundable
    refund_deadline: Optional[str] = None  # e.g., "11 Mar 2026"
    inclusions: List[str] = []  # e.g., ["Free WiFi", "Free parking", "Breakfast for 2"]
    taxes: List[str] = []  # e.g., ["Tourism Tax", "City Tax", "Sales Tax"]
    available: bool = True

# Enhanced Room Type model
class RoomType(BaseModel):
    id: str = ""
    name: str  # e.g., "Superior Room, 1 King, City View"
    category: str = "Standard"  # Superior, Deluxe, Junior Suite, Suite, etc.
    bed_configuration: List[str] = []  # e.g., ["1 King"] or ["2 Twin", "Sofa Bed"]
    view_type: str = ""  # City View, Garden View, Sea View, Pool View
    room_size: Optional[float] = None  # Size in sqm or sqft
    size_unit: str = "sqm"  # sqm or sqft
    max_adults: int = 2
    max_children: int = 1
    smoking: bool = False
    amenities: List[str] = []  # Room-specific amenities
    images: List[str] = []
    description: str = ""
    rate_plans: List[Dict] = []  # List of rate plans for this room

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
    address: str = ""
    description: str = ""
    star_rating: int = 4
    rating_score: float = 8.0
    rating_text: str = "Very Good"
    review_count: int = 0
    images: List[str] = []
    amenities: List[str] = []
    detailed_ratings: Dict[str, float] = {}
    what_to_know: List[Dict] = []
    rooms: List[Dict] = []  # Legacy support
    room_types: List[Dict] = []  # New enhanced room types with rate plans
    # New fields based on PDF analysis
    check_in_time: str = "14:00"
    check_out_time: str = "12:00"
    year_built: Optional[int] = None
    total_rooms: Optional[int] = None
    highlights: List[str] = []  # e.g., "Walking distance to metro", "Free WiFi"
    board_types: List[str] = ["RO", "BB"]  # RO=Room Only, BB=Bed&Breakfast, HB=Half Board, FB=Full Board
    cancellation_policy: str = "Flexible"
    supplier_name: Optional[str] = None
    supplier_cost_per_night: Optional[float] = None

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
    
    hotels = await db.hotels.find(query, {"_id": 0}).to_list(1000)
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
    """Update user role (admin/agent/manager/supplier)"""
    if role not in ["admin", "agent", "manager", "supplier"]:
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

# ============= SUPPLIER ROUTES =============

supplier_router = APIRouter(prefix="/supplier", tags=["Supplier"])

class BookingCreate(BaseModel):
    transfer_id: str
    customer_name: str
    customer_email: str
    customer_phone: str
    pickup_date: str
    pickup_time: str
    passengers: int = 1
    notes: Optional[str] = None

@supplier_router.get("/dashboard")
async def get_supplier_dashboard(supplier_name: str):
    """Get supplier dashboard stats"""
    # Get transfers for this supplier
    transfers = await db.transfers.find({"supplier_name": supplier_name}, {"_id": 0}).to_list(100)
    
    # Get bookings for supplier's transfers
    transfer_ids = [t["id"] for t in transfers]
    bookings = await db.bookings.find({"transfer_id": {"$in": transfer_ids}}, {"_id": 0}).to_list(500)
    
    # Calculate stats
    total_transfers = len(transfers)
    total_bookings = len(bookings)
    pending_bookings = len([b for b in bookings if b.get("status") == "pending"])
    confirmed_bookings = len([b for b in bookings if b.get("status") == "confirmed"])
    completed_bookings = len([b for b in bookings if b.get("status") == "completed"])
    
    # Calculate earnings
    total_earnings = sum(b.get("supplier_earnings", 0) for b in bookings if b.get("status") in ["confirmed", "completed"])
    pending_earnings = sum(b.get("supplier_earnings", 0) for b in bookings if b.get("status") == "pending")
    
    return {
        "success": True,
        "stats": {
            "total_transfers": total_transfers,
            "total_bookings": total_bookings,
            "pending_bookings": pending_bookings,
            "confirmed_bookings": confirmed_bookings,
            "completed_bookings": completed_bookings,
            "total_earnings": total_earnings,
            "pending_earnings": pending_earnings
        },
        "transfers": transfers,
        "recent_bookings": bookings[:20]  # Most recent 20 bookings
    }

@supplier_router.get("/transfers")
async def get_supplier_transfers(supplier_name: str):
    """Get all transfers for a supplier"""
    transfers = await db.transfers.find({"supplier_name": supplier_name}, {"_id": 0}).to_list(100)
    return {"success": True, "transfers": transfers}

@supplier_router.put("/transfers/{transfer_id}")
async def update_supplier_transfer(transfer_id: str, supplier_name: str, transfer_data: dict):
    """Update a transfer (supplier can only update their own)"""
    # Verify transfer belongs to supplier
    existing = await db.transfers.find_one({"id": transfer_id, "supplier_name": supplier_name})
    if not existing:
        raise HTTPException(status_code=404, detail="Transfer not found or not owned by supplier")
    
    # Suppliers can update limited fields
    allowed_fields = ["is_available", "pickup_times", "description", "duration", "confirmation_time"]
    update_data = {k: v for k, v in transfer_data.items() if k in allowed_fields}
    
    if update_data:
        await db.transfers.update_one({"id": transfer_id}, {"$set": update_data})
    
    updated = await db.transfers.find_one({"id": transfer_id}, {"_id": 0})
    return {"success": True, "transfer": updated}

@supplier_router.get("/bookings")
async def get_supplier_bookings(supplier_name: str, status: Optional[str] = None):
    """Get all bookings for a supplier's transfers"""
    # Get supplier's transfer IDs
    transfers = await db.transfers.find({"supplier_name": supplier_name}, {"id": 1, "_id": 0}).to_list(100)
    transfer_ids = [t["id"] for t in transfers]
    
    # Query bookings
    query = {"transfer_id": {"$in": transfer_ids}}
    if status:
        query["status"] = status
    
    bookings = await db.bookings.find(query, {"_id": 0}).sort("created_at", -1).to_list(500)
    
    # Enrich with transfer details
    transfer_map = {t["id"]: t for t in await db.transfers.find({"supplier_name": supplier_name}, {"_id": 0}).to_list(100)}
    for booking in bookings:
        booking["transfer"] = transfer_map.get(booking["transfer_id"], {})
    
    return {"success": True, "bookings": bookings}

@supplier_router.post("/bookings/{booking_id}/status")
async def update_booking_status(booking_id: str, supplier_name: str, status: str):
    """Update booking status (accept/reject/complete)"""
    if status not in ["confirmed", "rejected", "completed", "cancelled"]:
        raise HTTPException(status_code=400, detail="Invalid status")
    
    # Verify booking belongs to supplier's transfer
    booking = await db.bookings.find_one({"id": booking_id})
    if not booking:
        raise HTTPException(status_code=404, detail="Booking not found")
    
    transfer = await db.transfers.find_one({"id": booking["transfer_id"], "supplier_name": supplier_name})
    if not transfer:
        raise HTTPException(status_code=403, detail="Not authorized to update this booking")
    
    await db.bookings.update_one(
        {"id": booking_id},
        {"$set": {"status": status, "updated_at": datetime.now(timezone.utc).isoformat()}}
    )
    
    return {"success": True, "message": f"Booking status updated to {status}"}

@supplier_router.get("/earnings")
async def get_supplier_earnings(supplier_name: str, period: str = "all"):
    """Get supplier earnings summary"""
    # Get supplier's transfer IDs
    transfers = await db.transfers.find({"supplier_name": supplier_name}, {"_id": 0}).to_list(100)
    transfer_ids = [t["id"] for t in transfers]
    
    # Get completed/confirmed bookings
    bookings = await db.bookings.find({
        "transfer_id": {"$in": transfer_ids},
        "status": {"$in": ["confirmed", "completed"]}
    }, {"_id": 0}).to_list(1000)
    
    # Calculate earnings by transfer
    earnings_by_transfer = {}
    for booking in bookings:
        tid = booking["transfer_id"]
        if tid not in earnings_by_transfer:
            earnings_by_transfer[tid] = {"count": 0, "total": 0}
        earnings_by_transfer[tid]["count"] += 1
        earnings_by_transfer[tid]["total"] += booking.get("supplier_earnings", 0)
    
    # Build earnings report
    transfer_map = {t["id"]: t for t in transfers}
    earnings_report = []
    for tid, data in earnings_by_transfer.items():
        transfer = transfer_map.get(tid, {})
        earnings_report.append({
            "transfer_id": tid,
            "transfer_title": transfer.get("title", "Unknown"),
            "booking_count": data["count"],
            "total_earnings": data["total"]
        })
    
    total_earnings = sum(e["total_earnings"] for e in earnings_report)
    total_bookings = sum(e["booking_count"] for e in earnings_report)
    
    return {
        "success": True,
        "summary": {
            "total_earnings": total_earnings,
            "total_bookings": total_bookings,
            "transfer_count": len(earnings_report)
        },
        "by_transfer": earnings_report
    }

# Create sample bookings for testing
@supplier_router.post("/bookings/create-sample")
async def create_sample_bookings(supplier_name: str):
    """Create sample bookings for testing (dev only)"""
    transfers = await db.transfers.find({"supplier_name": supplier_name}, {"_id": 0}).to_list(10)
    
    if not transfers:
        return {"success": False, "message": "No transfers found for supplier"}
    
    sample_bookings = []
    statuses = ["pending", "confirmed", "completed", "pending", "confirmed"]
    
    for i, transfer in enumerate(transfers[:5]):
        # Safely get pickup_time
        pickup_times = transfer.get("pickup_times")
        pickup_time = "09:00"
        if isinstance(pickup_times, list) and len(pickup_times) > 0:
            pickup_time = pickup_times[0]
        
        booking = {
            "id": str(uuid.uuid4()),
            "transfer_id": str(transfer["id"]),
            "customer_name": f"Test Customer {i+1}",
            "customer_email": f"customer{i+1}@test.com",
            "customer_phone": f"+971 50 123 456{i}",
            "pickup_date": (datetime.now(timezone.utc) + timedelta(days=i+1)).strftime("%Y-%m-%d"),
            "pickup_time": str(pickup_time),
            "passengers": (i % 4) + 1,
            "status": statuses[i % len(statuses)],
            "supplier_earnings": float(transfer.get("supplier_cost", 50)),
            "total_price": float(transfer.get("price", 100)),
            "notes": f"Test booking for {transfer.get('title', 'transfer')}",
            "created_at": datetime.now(timezone.utc).isoformat()
        }
        sample_bookings.append(booking)
    
    if sample_bookings:
        # Insert and ignore the returned InsertManyResult
        await db.bookings.insert_many(sample_bookings)
    
    # Create a clean copy for response (ensuring no MongoDB artifacts)
    response_bookings = []
    for b in sample_bookings:
        clean_booking = {k: v for k, v in b.items() if k != "_id"}
        response_bookings.append(clean_booking)
    
    return {"success": True, "created": len(response_bookings), "bookings": response_bookings}

# ============= FILE UPLOAD ROUTES =============

ALLOWED_EXTENSIONS = {'.jpg', '.jpeg', '.png', '.gif', '.webp'}
MAX_FILE_SIZE = 10 * 1024 * 1024  # 10MB

@uploads_router.post("/hotel-image")
async def upload_hotel_image(
    file: UploadFile = File(...),
    hotel_id: str = Form(default=""),
    credentials: HTTPAuthorizationCredentials = Depends(security)
):
    """Upload a hotel image"""
    # Validate file extension
    file_ext = Path(file.filename).suffix.lower()
    if file_ext not in ALLOWED_EXTENSIONS:
        raise HTTPException(status_code=400, detail=f"Invalid file type. Allowed: {', '.join(ALLOWED_EXTENSIONS)}")
    
    # Generate unique filename
    unique_id = str(uuid.uuid4())[:8]
    filename = f"{hotel_id}_{unique_id}{file_ext}" if hotel_id else f"hotel_{unique_id}{file_ext}"
    file_path = UPLOADS_DIR / "hotels" / filename
    
    # Save file
    try:
        with open(file_path, "wb") as buffer:
            shutil.copyfileobj(file.file, buffer)
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to save file: {str(e)}")
    
    # Return the URL path
    image_url = f"/uploads/hotels/{filename}"
    return {"success": True, "url": image_url, "filename": filename}

@uploads_router.post("/room-image")
async def upload_room_image(
    file: UploadFile = File(...),
    room_id: str = Form(default=""),
    credentials: HTTPAuthorizationCredentials = Depends(security)
):
    """Upload a room image"""
    # Validate file extension
    file_ext = Path(file.filename).suffix.lower()
    if file_ext not in ALLOWED_EXTENSIONS:
        raise HTTPException(status_code=400, detail=f"Invalid file type. Allowed: {', '.join(ALLOWED_EXTENSIONS)}")
    
    # Generate unique filename
    unique_id = str(uuid.uuid4())[:8]
    filename = f"{room_id}_{unique_id}{file_ext}" if room_id else f"room_{unique_id}{file_ext}"
    file_path = UPLOADS_DIR / "rooms" / filename
    
    # Save file
    try:
        with open(file_path, "wb") as buffer:
            shutil.copyfileobj(file.file, buffer)
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to save file: {str(e)}")
    
    # Return the URL path
    image_url = f"/uploads/rooms/{filename}"
    return {"success": True, "url": image_url, "filename": filename}

@uploads_router.delete("/image")
async def delete_uploaded_image(
    filename: str = Query(...),
    image_type: str = Query(..., regex="^(hotels|rooms)$"),
    credentials: HTTPAuthorizationCredentials = Depends(security)
):
    """Delete an uploaded image"""
    file_path = UPLOADS_DIR / image_type / filename
    
    if not file_path.exists():
        raise HTTPException(status_code=404, detail="Image not found")
    
    try:
        os.remove(file_path)
        return {"success": True, "message": "Image deleted"}
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to delete image: {str(e)}")

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
                "description": "A stay at Courtyard by Marriott Baku places you in the heart of Baku, within a 15-minute walk of Heydar Aliyev Palace and 28 Mall. This upscale hotel is 1.6 mi from Sabir Park.",
                "star_rating": 4,
                "rating_score": 9.2,
                "rating_text": "Wonderful",
                "review_count": 107,
                "images": ["https://picsum.photos/seed/baku1/1200/800"],
                "amenities": ["Free WiFi", "Fitness Center", "Business Center", "Concierge", "Laundry", "Free Parking", "Restaurant"],
                "detailed_ratings": {"cleanliness": 4.7, "service": 4.6, "comfort": 4.7, "condition": 4.7, "amenities": 4.6},
                "what_to_know": [],
                "check_in_time": "15:00",
                "check_out_time": "12:00",
                "year_built": 2015,
                "total_rooms": 365,
                "highlights": ["Walking distance to 28 May metro station", "Free self parking", "24-hour fitness center", "11 meeting rooms"],
                "board_types": ["RO", "BB"],
                "cancellation_policy": "Free cancellation until 2 days before check-in",
                "supplier_name": "Marriott Hotels",
                "supplier_cost_per_night": 120,
                "rooms": [
                    {
                        "id": "R001",
                        "name": "Superior Room - City View",
                        "type": "Superior",
                        "bed_type": "1 King",
                        "view": "City View",
                        "size": "30 sqm",
                        "price": 465,
                        "original_price": 480,
                        "currency": "AED",
                        "amenities": ["Free WiFi", "LED TV", "Minibar", "Work Desk", "Hair Dryer"],
                        "refundable": True,
                        "refundable_until": "2 days before",
                        "meals": "Room Only",
                        "images": []
                    },
                    {
                        "id": "R002",
                        "name": "Superior Room - Garden View",
                        "type": "Superior",
                        "bed_type": "2 Twin",
                        "view": "Garden View",
                        "size": "30 sqm",
                        "price": 495,
                        "original_price": 510,
                        "currency": "AED",
                        "amenities": ["Free WiFi", "LED TV", "Minibar", "Work Desk"],
                        "refundable": True,
                        "refundable_until": "2 days before",
                        "meals": "Breakfast Included",
                        "images": []
                    },
                    {
                        "id": "R003",
                        "name": "Junior Suite - Garden View",
                        "type": "Suite",
                        "bed_type": "1 King + Sofa",
                        "view": "Garden View",
                        "size": "52 sqm",
                        "price": 750,
                        "original_price": 800,
                        "currency": "AED",
                        "amenities": ["Free WiFi", "LED TV", "Minibar", "Living Area", "Bathrobes"],
                        "refundable": True,
                        "refundable_until": "3 days before",
                        "meals": "Breakfast Included",
                        "images": []
                    }
                ]
            },
            {
                "id": str(uuid.uuid4()),
                "name": "Burj Al Arab Jumeirah",
                "city": "Dubai",
                "country": "United Arab Emirates",
                "address": "Jumeirah Beach Road, Dubai",
                "description": "The distinctive sail-shaped silhouette of Burj Al Arab Jumeirah is more than just a stunning hotel, it is a symbol of modern Dubai. Rising on its own island, the architectural marvel features luxurious suites with panoramic views.",
                "star_rating": 7,
                "rating_score": 9.8,
                "rating_text": "Exceptional",
                "review_count": 2540,
                "images": ["https://picsum.photos/seed/burj1/1200/800"],
                "amenities": ["Private Beach", "9 Restaurants", "Spa", "Pool", "Butler Service", "Helipad", "Rolls-Royce Fleet"],
                "detailed_ratings": {"cleanliness": 5.0, "service": 5.0, "comfort": 4.9, "location": 4.9, "amenities": 5.0},
                "what_to_know": [],
                "check_in_time": "15:00",
                "check_out_time": "12:00",
                "year_built": 1999,
                "total_rooms": 202,
                "highlights": ["Private beach", "Personal butler", "Rolls-Royce transfer available", "Located on private island"],
                "board_types": ["RO", "BB", "HB", "FB"],
                "cancellation_policy": "Non-refundable - contact hotel for special requests",
                "supplier_name": "Jumeirah Hotels",
                "supplier_cost_per_night": 4500,
                "rooms": [
                    {
                        "id": "R004",
                        "name": "Deluxe One Bedroom Suite",
                        "type": "Suite",
                        "bed_type": "1 King",
                        "view": "Arabian Gulf View",
                        "size": "170 sqm",
                        "price": 5500,
                        "original_price": 6000,
                        "currency": "AED",
                        "amenities": ["Butler Service", "Hermes Amenities", "Jacuzzi", "Private Cinema"],
                        "refundable": False,
                        "meals": "Breakfast Included",
                        "images": []
                    },
                    {
                        "id": "R005",
                        "name": "Panoramic Suite",
                        "type": "Suite",
                        "bed_type": "1 King",
                        "view": "Panoramic Arabian Gulf",
                        "size": "330 sqm",
                        "price": 12000,
                        "original_price": 13500,
                        "currency": "AED",
                        "amenities": ["2 Floors", "Butler Service", "In-suite Dining", "Private Bar"],
                        "refundable": False,
                        "meals": "Full Board",
                        "images": []
                    }
                ]
            },
            {
                "id": str(uuid.uuid4()),
                "name": "JW Marriott Marquis Dubai",
                "city": "Dubai",
                "country": "United Arab Emirates",
                "address": "Business Bay, Sheikh Zayed Road, Dubai",
                "description": "JW Marriott Marquis Hotel Dubai is one of the world's tallest hotels, featuring 1,608 spacious rooms and suites with stunning views of the Dubai skyline, Creek, and Arabian Gulf.",
                "star_rating": 5,
                "rating_score": 9.1,
                "rating_text": "Wonderful",
                "review_count": 4250,
                "images": ["https://picsum.photos/seed/jwmarriott/1200/800"],
                "amenities": ["Pool", "Spa", "Fitness Center", "14 Restaurants", "Free WiFi", "Business Center"],
                "detailed_ratings": {"cleanliness": 4.8, "service": 4.7, "comfort": 4.8, "location": 4.6, "amenities": 4.8},
                "what_to_know": [],
                "check_in_time": "15:00",
                "check_out_time": "12:00",
                "year_built": 2012,
                "total_rooms": 1608,
                "highlights": ["World's tallest hotel", "Direct metro access", "14 dining venues", "Saray Spa"],
                "board_types": ["RO", "BB", "HB"],
                "cancellation_policy": "Free cancellation until 24 hours before check-in",
                "supplier_name": "Marriott Hotels",
                "supplier_cost_per_night": 350,
                "rooms": [
                    {
                        "id": "R006",
                        "name": "Deluxe Room - City View",
                        "type": "Deluxe",
                        "bed_type": "1 King or 2 Twin",
                        "view": "City View",
                        "size": "42 sqm",
                        "price": 650,
                        "original_price": 720,
                        "currency": "AED",
                        "amenities": ["Free WiFi", "Nespresso Machine", "Rain Shower", "Marble Bathroom"],
                        "refundable": True,
                        "refundable_until": "24 hours before",
                        "meals": "Room Only",
                        "images": []
                    },
                    {
                        "id": "R007",
                        "name": "Executive Room - Gulf View",
                        "type": "Executive",
                        "bed_type": "1 King",
                        "view": "Arabian Gulf",
                        "size": "42 sqm",
                        "price": 850,
                        "original_price": 950,
                        "currency": "AED",
                        "amenities": ["Lounge Access", "Free WiFi", "Complimentary Breakfast", "Evening Cocktails"],
                        "refundable": True,
                        "refundable_until": "24 hours before",
                        "meals": "Breakfast Included",
                        "images": []
                    }
                ]
            },
            {
                "id": str(uuid.uuid4()),
                "name": "Atlantis The Palm",
                "city": "Dubai",
                "country": "United Arab Emirates",
                "address": "Crescent Road, The Palm, Dubai",
                "description": "Atlantis, The Palm is a majestic 5-star resort located at the apex of the Palm Jumeirah, with stunning views of the Arabian Gulf. Home to one of the world's largest waterparks.",
                "star_rating": 5,
                "rating_score": 9.0,
                "rating_text": "Superb",
                "review_count": 8750,
                "images": ["https://picsum.photos/seed/atlantis/1200/800"],
                "amenities": ["Aquaventure Waterpark", "Lost Chambers Aquarium", "23 Restaurants", "Private Beach", "Spa", "Dolphin Bay"],
                "detailed_ratings": {"cleanliness": 4.7, "service": 4.6, "comfort": 4.8, "location": 4.9, "amenities": 4.9},
                "what_to_know": [],
                "check_in_time": "15:00",
                "check_out_time": "11:00",
                "year_built": 2008,
                "total_rooms": 1548,
                "highlights": ["Free Aquaventure access", "Lost Chambers Aquarium", "Celebrity chef restaurants", "Private beach"],
                "board_types": ["RO", "BB", "HB", "FB"],
                "cancellation_policy": "Free cancellation until 3 days before check-in",
                "supplier_name": "Atlantis Resorts",
                "supplier_cost_per_night": 800,
                "rooms": [
                    {
                        "id": "R008",
                        "name": "Palm King Room",
                        "type": "Deluxe",
                        "bed_type": "1 King",
                        "view": "Palm View",
                        "size": "45 sqm",
                        "price": 1200,
                        "original_price": 1400,
                        "currency": "AED",
                        "amenities": ["Free Aquaventure", "Free WiFi", "Minibar", "Balcony"],
                        "refundable": True,
                        "refundable_until": "3 days before",
                        "meals": "Room Only",
                        "images": []
                    },
                    {
                        "id": "R009",
                        "name": "Ocean King Room",
                        "type": "Deluxe",
                        "bed_type": "1 King",
                        "view": "Ocean View",
                        "size": "45 sqm",
                        "price": 1500,
                        "original_price": 1700,
                        "currency": "AED",
                        "amenities": ["Free Aquaventure", "Free WiFi", "Ocean View Balcony"],
                        "refundable": True,
                        "refundable_until": "3 days before",
                        "meals": "Breakfast Included",
                        "images": []
                    },
                    {
                        "id": "R010",
                        "name": "Underwater Suite",
                        "type": "Suite",
                        "bed_type": "1 King",
                        "view": "Ambassador Lagoon",
                        "size": "165 sqm",
                        "price": 8500,
                        "original_price": 9500,
                        "currency": "AED",
                        "amenities": ["Floor-to-ceiling aquarium", "Butler Service", "Private Beach Cabana"],
                        "refundable": False,
                        "meals": "Full Board",
                        "images": []
                    }
                ]
            },
            {
                "id": str(uuid.uuid4()),
                "name": "Iveria Inn Hotel",
                "city": "Tbilisi",
                "country": "Georgia",
                "address": "Rose Revolution Square, Tbilisi",
                "description": "Iveria Inn Hotel is located in the heart of Tbilisi, offering comfortable accommodations with views of the historic old town and the Mtkvari River.",
                "star_rating": 4,
                "rating_score": 8.5,
                "rating_text": "Very Good",
                "review_count": 320,
                "images": ["https://picsum.photos/seed/iveria/1200/800"],
                "amenities": ["Free WiFi", "Restaurant", "Bar", "Fitness Center", "Concierge"],
                "detailed_ratings": {"cleanliness": 4.4, "service": 4.5, "comfort": 4.3, "location": 4.8, "amenities": 4.2},
                "what_to_know": [],
                "check_in_time": "14:00",
                "check_out_time": "12:00",
                "year_built": 2010,
                "total_rooms": 120,
                "highlights": ["City center location", "Walking distance to old town", "Rooftop bar", "River views"],
                "board_types": ["RO", "BB"],
                "cancellation_policy": "Free cancellation until 2 days before check-in",
                "supplier_name": "Georgian Hotels Group",
                "supplier_cost_per_night": 80,
                "rooms": [
                    {
                        "id": "R011",
                        "name": "Standard Room - City View",
                        "type": "Standard",
                        "bed_type": "1 Queen",
                        "view": "City View",
                        "size": "25 sqm",
                        "price": 180,
                        "original_price": 200,
                        "currency": "AED",
                        "amenities": ["Free WiFi", "TV", "Minibar", "Safe"],
                        "refundable": True,
                        "refundable_until": "2 days before",
                        "meals": "Room Only",
                        "images": []
                    },
                    {
                        "id": "R012",
                        "name": "Deluxe Room - River View",
                        "type": "Deluxe",
                        "bed_type": "1 King",
                        "view": "River View",
                        "size": "32 sqm",
                        "price": 250,
                        "original_price": 280,
                        "currency": "AED",
                        "amenities": ["Free WiFi", "TV", "Minibar", "Bathrobe", "Slippers"],
                        "refundable": True,
                        "refundable_until": "2 days before",
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
api_router.include_router(supplier_router)
api_router.include_router(uploads_router)

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
