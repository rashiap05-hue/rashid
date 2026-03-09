from fastapi import FastAPI, APIRouter, HTTPException, Request, Depends, Query, UploadFile, File, Form, Body
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
(UPLOADS_DIR / "activities").mkdir(exist_ok=True)

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
activities_router = APIRouter(prefix="/activities", tags=["Activities"])
ai_router = APIRouter(prefix="/ai", tags=["AI Features"])
payments_router = APIRouter(prefix="/payments", tags=["Payments"])
sheets_router = APIRouter(prefix="/sheets", tags=["Google Sheets"])
admin_router = APIRouter(prefix="/admin", tags=["Admin"])
uploads_router = APIRouter(prefix="/uploads", tags=["File Uploads"])
terms_router = APIRouter(prefix="/terms-policies", tags=["Terms and Policies"])

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
    # New fields for activity details
    selected_activities: Optional[Dict] = None
    selected_hotels: Optional[Dict] = None
    selected_flight: Optional[Dict] = None
    vehicle_type: Optional[str] = None
    vehicle_label: Optional[str] = None
    total_pax: Optional[int] = None
    customer_name: Optional[str] = None
    customer_email: Optional[str] = None
    customer_mobile: Optional[str] = None
    whatsapp_number: Optional[str] = None
    updated_at: Optional[str] = None

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
    available: bool = True  # Room availability status
    total_inventory: int = 10  # Total number of rooms available

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
    transfer_direction: str = "arrival"  # 'arrival' (Airport → Hotel) or 'departure' (Hotel → Airport)
    city: str
    extras: Optional[List[TransferExtra]] = []
    is_available: bool = True
    # New fields
    vehicle_type: str = "Sedan"  # Sedan, SUV, Van, Minibus, Luxury Car, Coach
    pickup_times: Optional[List[str]] = []  # e.g., ["06:00", "09:00", "12:00", "15:00", "18:00", "21:00"]
    max_bags: int = 2  # Number of bags allowed
    supplier_name: Optional[str] = None  # For supplier dashboard
    supplier_cost: Optional[float] = None  # Cost from supplier (for margin calculation)
    video: Optional[str] = None  # Video URL
    # Vehicle-based pricing
    vehicle_pricing: Optional[dict] = None  # { "sedan_4": { "selling_price": 100, "supplier_cost": 80 }, ... }

# Activity/Excursion Model
class ActivityCreate(BaseModel):
    name: str
    description: str = ""  # Detailed description/itinerary
    city: str
    country: str = ""
    category: str = "City Tours"  # City Tours, Sightseeing, Adventure, Cultural, Food & Drink, Nature, Water Sports, etc.
    duration: str = "5 hrs"  # e.g., "5 hrs", "Full Day", "Half Day"
    price: float = 0
    currency: str = "AED"
    images: List[str] = []
    video: Optional[str] = None  # Video URL (YouTube or direct)
    highlights: List[str] = []  # Key highlights/features
    inclusions: List[str] = []  # What's included (e.g., "Driver cum Guide", "Cable Car")
    exclusions: List[str] = []  # What's not included
    useful_information: List[str] = []  # Useful info bullet points
    meeting_point: str = ""
    start_times: List[str] = []  # Available start times e.g., ["10:00", "15:00", "15:30"]
    languages: List[str] = ["English"]  # Tour languages
    transfer_type: str = "Private"  # Private, Shared, Luxury
    operating_days: List[str] = ["Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday", "Sunday"]  # Days activity operates
    closed_days: List[str] = []  # Days activity is closed (e.g., ["Monday"])
    age_restriction: str = "All ages"  # "All ages", "18+", "12+", etc.
    cancellation_policy: str = "Free cancellation up to 24 hours"
    supplier_name: Optional[str] = None
    supplier_cost: Optional[float] = None
    available: bool = True
    rating: float = 4.5
    review_count: int = 0
    # Vehicle-based pricing
    vehicle_pricing: Optional[dict] = None  # { "sedan_4": { "selling_price": 100, "supplier_cost": 80 }, ... }

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

# Terms and Policies Model
class TermsPolicyCreate(BaseModel):
    title: str  # e.g., "Important Notes", "Hotel Cancellation Policy"
    category: str  # e.g., "General", "Hotel", "Tours and Transfers", "Europe", "Cancellation"
    content: List[str] = []  # List of bullet points/items
    sub_sections: List[Dict[str, Any]] = []  # For nested sections like "General", "Hotel", "Europe" under "Important Notes"
    country: Optional[str] = None  # Country-specific policy (e.g., "Georgia", "UAE")
    city: Optional[str] = None  # City-specific policy (e.g., "Tbilisi", "Dubai")
    applies_to: str = "all"  # "all", "country", "city"
    order: int = 0  # Display order
    is_expanded_default: bool = False  # Whether to show expanded by default
    is_active: bool = True
    icon: str = "info"  # Icon name: info, shield, hotel, creditCard, check, etc.

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

@proposals_router.patch("/{proposal_id}")
async def partial_update_proposal(proposal_id: str, update_data: dict = Body(...)):
    """Partial update for proposal - only updates provided fields"""
    update_data["updated_at"] = datetime.now(timezone.utc).isoformat()
    update_data = {k: v for k, v in update_data.items() if v is not None}
    
    result = await db.proposals.update_one({"id": proposal_id}, {"$set": update_data})
    if result.matched_count == 0:
        raise HTTPException(status_code=404, detail="Proposal not found")
    
    updated = await db.proposals.find_one({"id": proposal_id}, {"_id": 0})
    return {"success": True, "proposal": updated}

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

@transfers_router.patch("/{transfer_id}")
async def partial_update_transfer(transfer_id: str, update_data: dict = Body(...)):
    """Partial update for transfer - only updates provided fields"""
    update_data["updated_at"] = datetime.now(timezone.utc).isoformat()
    update_data = {k: v for k, v in update_data.items() if v is not None}
    
    result = await db.transfers.update_one({"id": transfer_id}, {"$set": update_data})
    if result.matched_count == 0:
        raise HTTPException(status_code=404, detail="Transfer not found")
    
    updated = await db.transfers.find_one({"id": transfer_id}, {"_id": 0})
    return {"success": True, "transfer": updated}

@transfers_router.delete("/{transfer_id}")
async def delete_transfer(transfer_id: str):
    result = await db.transfers.delete_one({"id": transfer_id})
    if result.deleted_count == 0:
        raise HTTPException(status_code=404, detail="Transfer not found")
    return {"success": True}

# ============= ACTIVITIES ROUTES =============

@activities_router.get("")
async def get_activities(city: Optional[str] = None, category: Optional[str] = None):
    query = {}
    if city:
        query["city"] = {"$regex": city, "$options": "i"}
    if category:
        query["category"] = {"$regex": category, "$options": "i"}
    
    activities = await db.activities.find(query, {"_id": 0}).to_list(length=100)
    return {"success": True, "activities": activities}

@activities_router.get("/{activity_id}")
async def get_activity(activity_id: str):
    activity = await db.activities.find_one({"id": activity_id}, {"_id": 0})
    if not activity:
        raise HTTPException(status_code=404, detail="Activity not found")
    return {"success": True, "activity": activity}

@activities_router.post("")
async def create_activity(activity: ActivityCreate):
    activity_dict = activity.dict()
    activity_dict["id"] = str(uuid.uuid4())
    activity_dict["created_at"] = datetime.now(timezone.utc).isoformat()
    await db.activities.insert_one(activity_dict)
    return {"success": True, "id": activity_dict["id"], "activity": {k: v for k, v in activity_dict.items() if k != "_id"}}

@activities_router.put("/{activity_id}")
async def update_activity(activity_id: str, activity: ActivityCreate):
    activity_dict = activity.dict()
    activity_dict["updated_at"] = datetime.now(timezone.utc).isoformat()
    result = await db.activities.update_one({"id": activity_id}, {"$set": activity_dict})
    if result.matched_count == 0:
        raise HTTPException(status_code=404, detail="Activity not found")
    return {"success": True, "activity": activity_dict}

@activities_router.patch("/{activity_id}")
async def partial_update_activity(activity_id: str, update_data: dict = Body(...)):
    """Partial update for activity - only updates provided fields"""
    # Add updated timestamp
    update_data["updated_at"] = datetime.now(timezone.utc).isoformat()
    
    # Remove any None values
    update_data = {k: v for k, v in update_data.items() if v is not None}
    
    result = await db.activities.update_one({"id": activity_id}, {"$set": update_data})
    if result.matched_count == 0:
        raise HTTPException(status_code=404, detail="Activity not found")
    
    # Get updated activity
    updated = await db.activities.find_one({"id": activity_id}, {"_id": 0})
    return {"success": True, "activity": updated}

@activities_router.delete("/{activity_id}")
async def delete_activity(activity_id: str):
    result = await db.activities.delete_one({"id": activity_id})
    if result.deleted_count == 0:
        raise HTTPException(status_code=404, detail="Activity not found")
    return {"success": True}

# ============= TERMS AND POLICIES ROUTES =============

@terms_router.get("")
async def get_terms_policies(
    country: Optional[str] = None,
    city: Optional[str] = None,
    category: Optional[str] = None,
    active_only: bool = True
):
    """Get all terms and policies, optionally filtered by country, city, or category.
    
    Logic:
    - Always returns policies with applies_to='all'
    - If city is provided, also returns city-specific policies AND looks up the country
    - If country is provided, also returns country-specific policies
    - Country-specific policies apply to ALL cities within that country
    """
    # If city is provided but country is not, look up the country from cities DB
    looked_up_country = None
    if city and not country:
        city_doc = await db.cities.find_one(
            {"name": {"$regex": f"^{city}$", "$options": "i"}},
            {"country": 1, "_id": 0}
        )
        if city_doc:
            looked_up_country = city_doc.get("country")
    
    effective_country = country or looked_up_country
    
    # Build the query
    query = {}
    if active_only:
        query["is_active"] = True
    
    # Build OR conditions for matching policies
    or_conditions = [{"applies_to": "all"}]  # Always include global policies
    
    if city:
        or_conditions.append({"city": city, "applies_to": "city"})
    
    if effective_country:
        or_conditions.append({"country": effective_country, "applies_to": "country"})
    
    if category:
        query["category"] = category
    
    query["$or"] = or_conditions
    
    terms = await db.terms_policies.find(query, {"_id": 0}).sort("order", 1).to_list(100)
    return terms

@terms_router.get("/all")
async def get_all_terms_policies():
    """Get all terms and policies for admin management"""
    terms = await db.terms_policies.find({}, {"_id": 0}).sort("order", 1).to_list(100)
    return terms

@terms_router.get("/{term_id}")
async def get_term_policy(term_id: str):
    """Get a specific term/policy by ID"""
    term = await db.terms_policies.find_one({"id": term_id}, {"_id": 0})
    if not term:
        raise HTTPException(status_code=404, detail="Term/Policy not found")
    return term

@terms_router.post("")
async def create_term_policy(term: TermsPolicyCreate, credentials: HTTPAuthorizationCredentials = Depends(security)):
    """Create a new term/policy (Admin only)"""
    if not credentials:
        raise HTTPException(status_code=401, detail="Not authenticated")
    
    user = await get_current_user(credentials)
    if user.get("role") != "admin":
        raise HTTPException(status_code=403, detail="Admin access required")
    
    term_dict = term.dict()
    term_dict["id"] = str(uuid.uuid4())
    term_dict["created_at"] = datetime.now(timezone.utc).isoformat()
    term_dict["updated_at"] = datetime.now(timezone.utc).isoformat()
    term_dict["created_by"] = user.get("id")
    
    await db.terms_policies.insert_one(term_dict)
    term_dict.pop("_id", None)
    return term_dict

@terms_router.put("/{term_id}")
async def update_term_policy(term_id: str, term: TermsPolicyCreate, credentials: HTTPAuthorizationCredentials = Depends(security)):
    """Update an existing term/policy (Admin only)"""
    if not credentials:
        raise HTTPException(status_code=401, detail="Not authenticated")
    
    user = await get_current_user(credentials)
    if user.get("role") != "admin":
        raise HTTPException(status_code=403, detail="Admin access required")
    
    term_dict = term.dict()
    term_dict["updated_at"] = datetime.now(timezone.utc).isoformat()
    
    result = await db.terms_policies.update_one(
        {"id": term_id},
        {"$set": term_dict}
    )
    if result.matched_count == 0:
        raise HTTPException(status_code=404, detail="Term/Policy not found")
    
    updated_term = await db.terms_policies.find_one({"id": term_id}, {"_id": 0})
    return updated_term

@terms_router.delete("/{term_id}")
async def delete_term_policy(term_id: str, credentials: HTTPAuthorizationCredentials = Depends(security)):
    """Delete a term/policy (Admin only)"""
    if not credentials:
        raise HTTPException(status_code=401, detail="Not authenticated")
    
    user = await get_current_user(credentials)
    if user.get("role") != "admin":
        raise HTTPException(status_code=403, detail="Admin access required")
    
    result = await db.terms_policies.delete_one({"id": term_id})
    if result.deleted_count == 0:
        raise HTTPException(status_code=404, detail="Term/Policy not found")
    return {"success": True}

@terms_router.get("/categories/list")
async def get_terms_categories():
    """Get all unique categories"""
    categories = await db.terms_policies.distinct("category")
    return categories

@terms_router.get("/countries/list")
async def get_terms_countries():
    """Get all countries with specific terms"""
    countries = await db.terms_policies.distinct("country")
    return [c for c in countries if c]

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
    
    # Return the URL path - use /api/static so it goes through the proxy
    image_url = f"/api/static/hotels/{filename}"
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
    
    # Return the URL path - use /api/static so it goes through the proxy
    image_url = f"/api/static/rooms/{filename}"
    return {"success": True, "url": image_url, "filename": filename}

@uploads_router.post("/activity-image")
async def upload_activity_image(
    file: UploadFile = File(...),
    activity_id: str = Form(default=""),
    credentials: HTTPAuthorizationCredentials = Depends(security)
):
    """Upload an activity/attraction image"""
    # Validate file extension
    file_ext = Path(file.filename).suffix.lower()
    if file_ext not in ALLOWED_EXTENSIONS:
        raise HTTPException(status_code=400, detail=f"Invalid file type. Allowed: {', '.join(ALLOWED_EXTENSIONS)}")
    
    # Generate unique filename
    unique_id = str(uuid.uuid4())[:8]
    filename = f"{activity_id}_{unique_id}{file_ext}" if activity_id else f"activity_{unique_id}{file_ext}"
    file_path = UPLOADS_DIR / "activities" / filename
    
    # Save file
    try:
        with open(file_path, "wb") as buffer:
            shutil.copyfileobj(file.file, buffer)
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to save file: {str(e)}")
    
    # Return the URL path - use /api/static so it goes through the proxy
    image_url = f"/api/static/activities/{filename}"
    return {"success": True, "url": image_url, "filename": filename}

# Video upload allowed extensions
ALLOWED_VIDEO_EXTENSIONS = {".mp4", ".webm", ".mov", ".avi", ".mkv"}

@uploads_router.post("/activity-video")
async def upload_activity_video(
    file: UploadFile = File(...),
    activity_id: str = Form(default=""),
    credentials: HTTPAuthorizationCredentials = Depends(security)
):
    """Upload an activity/attraction video"""
    # Validate file extension
    file_ext = Path(file.filename).suffix.lower()
    if file_ext not in ALLOWED_VIDEO_EXTENSIONS:
        raise HTTPException(status_code=400, detail=f"Invalid video type. Allowed: {', '.join(ALLOWED_VIDEO_EXTENSIONS)}")
    
    # Create videos directory if it doesn't exist
    videos_dir = UPLOADS_DIR / "videos"
    videos_dir.mkdir(exist_ok=True)
    
    # Generate unique filename
    unique_id = str(uuid.uuid4())[:8]
    filename = f"{activity_id}_{unique_id}{file_ext}" if activity_id else f"video_{unique_id}{file_ext}"
    file_path = videos_dir / filename
    
    # Save file
    try:
        with open(file_path, "wb") as buffer:
            shutil.copyfileobj(file.file, buffer)
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to save video: {str(e)}")
    
    # Return the URL path
    video_url = f"/api/static/videos/{filename}"
    return {"success": True, "url": video_url, "filename": filename}

@uploads_router.post("/transfer-video")
async def upload_transfer_video(
    file: UploadFile = File(...),
    transfer_id: str = Form(default=""),
    credentials: HTTPAuthorizationCredentials = Depends(security)
):
    """Upload a transfer video"""
    # Validate file extension
    file_ext = Path(file.filename).suffix.lower()
    if file_ext not in ALLOWED_VIDEO_EXTENSIONS:
        raise HTTPException(status_code=400, detail=f"Invalid video type. Allowed: {', '.join(ALLOWED_VIDEO_EXTENSIONS)}")
    
    # Create videos directory if it doesn't exist
    videos_dir = UPLOADS_DIR / "videos"
    videos_dir.mkdir(exist_ok=True)
    
    # Generate unique filename
    unique_id = str(uuid.uuid4())[:8]
    filename = f"transfer_{transfer_id}_{unique_id}{file_ext}" if transfer_id else f"transfer_{unique_id}{file_ext}"
    file_path = videos_dir / filename
    
    # Save file
    try:
        with open(file_path, "wb") as buffer:
            shutil.copyfileobj(file.file, buffer)
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to save video: {str(e)}")
    
    # Return the URL path
    video_url = f"/api/static/videos/{filename}"
    return {"success": True, "url": video_url, "filename": filename}

@uploads_router.delete("/video")
async def delete_uploaded_video(
    filename: str = Query(...),
    credentials: HTTPAuthorizationCredentials = Depends(security)
):
    """Delete an uploaded video"""
    file_path = UPLOADS_DIR / "videos" / filename
    
    if not file_path.exists():
        raise HTTPException(status_code=404, detail="Video not found")
    
    try:
        os.remove(file_path)
        return {"success": True, "message": "Video deleted"}
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to delete video: {str(e)}")

@uploads_router.delete("/image")
async def delete_uploaded_image(
    filename: str = Query(...),
    image_type: str = Query(..., regex="^(hotels|rooms|activities)$"),
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
    
    # Check if activities data needs seeding
    activities_count = await db.activities.count_documents({})
    if activities_count == 0:
        logger.info("Seeding activities...")
        activities = [
            {
                "id": str(uuid.uuid4()),
                "name": "Desert Safari with BBQ Dinner",
                "description": "Experience the thrilling desert safari with dune bashing, camel riding, sandboarding, and a delicious BBQ dinner under the stars with live entertainment.",
                "city": "Dubai",
                "country": "United Arab Emirates",
                "category": "Adventure",
                "duration": "6 hours",
                "price": 250,
                "currency": "AED",
                "images": ["https://images.unsplash.com/photo-1451337516015-6b6e9a44a8a3?w=800"],
                "highlights": ["Dune Bashing", "Camel Riding", "BBQ Dinner", "Live Entertainment", "Henna Painting"],
                "inclusions": ["Hotel pickup and drop-off", "4x4 Land Cruiser", "BBQ dinner", "Soft drinks", "Sandboarding"],
                "exclusions": ["Alcoholic beverages", "Quad biking", "Photography"],
                "meeting_point": "Hotel Lobby",
                "start_times": ["14:30", "15:00"],
                "languages": ["English", "Arabic"],
                "min_participants": 2,
                "max_participants": 6,
                "age_restriction": "All ages",
                "cancellation_policy": "Free cancellation up to 24 hours before",
                "supplier_name": "Desert Adventures LLC",
                "supplier_cost": 150,
                "available": True,
                "rating": 4.8,
                "review_count": 1250
            },
            {
                "id": str(uuid.uuid4()),
                "name": "Burj Khalifa At The Top",
                "description": "Visit the observation deck of the world's tallest building. Enjoy breathtaking 360-degree views of Dubai from levels 124 and 125.",
                "city": "Dubai",
                "country": "United Arab Emirates",
                "category": "Sightseeing",
                "duration": "2 hours",
                "price": 180,
                "currency": "AED",
                "images": ["https://images.unsplash.com/photo-1512453979798-5ea266f8880c?w=800"],
                "highlights": ["124th & 125th Floor Access", "360° Views", "Multimedia Presentation", "Photo Opportunities"],
                "inclusions": ["Skip-the-line tickets", "Access to observation decks", "Multimedia presentation"],
                "exclusions": ["Hotel transfers", "Food and beverages", "At The Top SKY (148th floor)"],
                "meeting_point": "Burj Khalifa Ticket Counter, Dubai Mall",
                "start_times": ["09:00", "10:00", "11:00", "14:00", "15:00", "16:00", "17:00", "18:00"],
                "languages": ["English", "Arabic", "Chinese"],
                "min_participants": 1,
                "max_participants": 20,
                "age_restriction": "All ages",
                "cancellation_policy": "Non-refundable",
                "supplier_name": "Emaar Entertainment",
                "supplier_cost": 140,
                "available": True,
                "rating": 4.7,
                "review_count": 3420
            },
            {
                "id": str(uuid.uuid4()),
                "name": "Dubai City Tour",
                "description": "Discover the old and new Dubai on this comprehensive city tour. Visit historic sites, modern landmarks, and experience local culture.",
                "city": "Dubai",
                "country": "United Arab Emirates",
                "category": "Sightseeing",
                "duration": "4 hours",
                "price": 120,
                "currency": "AED",
                "images": ["https://images.unsplash.com/photo-1518684079-3c830dcef090?w=800"],
                "highlights": ["Dubai Museum", "Gold Souk", "Spice Souk", "Jumeirah Mosque", "Photo Stop at Burj Al Arab"],
                "inclusions": ["Air-conditioned vehicle", "Professional guide", "Hotel pickup and drop-off", "Water bottle"],
                "exclusions": ["Entry tickets to attractions", "Lunch", "Gratuities"],
                "meeting_point": "Hotel Lobby",
                "start_times": ["08:30", "14:00"],
                "languages": ["English", "Arabic", "Russian"],
                "min_participants": 2,
                "max_participants": 12,
                "age_restriction": "All ages",
                "cancellation_policy": "Free cancellation up to 24 hours before",
                "supplier_name": "Arabian Adventures",
                "supplier_cost": 80,
                "available": True,
                "rating": 4.5,
                "review_count": 890
            },
            {
                "id": str(uuid.uuid4()),
                "name": "Tbilisi Walking Tour",
                "description": "Explore the charming streets of Tbilisi's Old Town with a local guide. Discover hidden gems, historic churches, and traditional Georgian culture.",
                "city": "Tbilisi",
                "country": "Georgia",
                "category": "Cultural",
                "duration": "3 hours",
                "price": 45,
                "currency": "USD",
                "images": ["https://images.unsplash.com/photo-1565008576549-57569a49371d?w=800"],
                "highlights": ["Narikala Fortress Views", "Sulfur Baths District", "Sioni Cathedral", "Wine Tasting"],
                "inclusions": ["Local guide", "Wine tasting", "Traditional snacks"],
                "exclusions": ["Hotel transfers", "Additional food and drinks", "Entry fees"],
                "meeting_point": "Freedom Square",
                "start_times": ["10:00", "15:00"],
                "languages": ["English", "Georgian", "Russian"],
                "min_participants": 2,
                "max_participants": 10,
                "age_restriction": "All ages",
                "cancellation_policy": "Free cancellation up to 12 hours before",
                "supplier_name": "Tbilisi Free Walking Tours",
                "supplier_cost": 25,
                "available": True,
                "rating": 4.9,
                "review_count": 567
            },
            {
                "id": str(uuid.uuid4()),
                "name": "Georgian Wine Tour - Kakheti",
                "description": "Full day tour to Georgia's premier wine region. Visit traditional wineries, learn about qvevri winemaking, and taste authentic Georgian wines.",
                "city": "Tbilisi",
                "country": "Georgia",
                "category": "Food & Drink",
                "duration": "Full Day",
                "price": 85,
                "currency": "USD",
                "images": ["https://images.unsplash.com/photo-1506377247377-2a5b3b417ebb?w=800"],
                "highlights": ["3 Winery Visits", "Qvevri Wine Tasting", "Traditional Lunch", "Sighnaghi Town Visit"],
                "inclusions": ["Transportation", "Professional guide", "Lunch", "Wine tastings at 3 wineries", "Entrance fees"],
                "exclusions": ["Additional wine purchases", "Gratuities"],
                "meeting_point": "Hotel Lobby or Freedom Square",
                "start_times": ["09:00"],
                "languages": ["English", "Russian"],
                "min_participants": 2,
                "max_participants": 8,
                "age_restriction": "18+",
                "cancellation_policy": "Free cancellation up to 48 hours before",
                "supplier_name": "Georgia Wine Tours",
                "supplier_cost": 55,
                "available": True,
                "rating": 4.8,
                "review_count": 423
            },
            {
                "id": str(uuid.uuid4()),
                "name": "Baku Old City Walking Tour",
                "description": "Discover the UNESCO World Heritage Old City (Icherisheher) of Baku. Explore ancient streets, palaces, and the iconic Maiden Tower.",
                "city": "Baku",
                "country": "Azerbaijan",
                "category": "Cultural",
                "duration": "3 hours",
                "price": 35,
                "currency": "USD",
                "images": ["https://images.unsplash.com/photo-1603027937430-8f873c92e5f0?w=800"],
                "highlights": ["Maiden Tower", "Palace of the Shirvanshahs", "Carpet Museum", "Local Tea House"],
                "inclusions": ["Professional guide", "Traditional tea", "Entry to Maiden Tower"],
                "exclusions": ["Hotel transfers", "Lunch", "Other entry fees"],
                "meeting_point": "Fountain Square",
                "start_times": ["10:00", "16:00"],
                "languages": ["English", "Azerbaijani", "Russian"],
                "min_participants": 2,
                "max_participants": 12,
                "age_restriction": "All ages",
                "cancellation_policy": "Free cancellation up to 24 hours before",
                "supplier_name": "Baku Tours",
                "supplier_cost": 20,
                "available": True,
                "rating": 4.6,
                "review_count": 312
            }
        ]
        
        await db.activities.insert_many(activities)
        logger.info(f"Seeded {len(activities)} activities")
    
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
api_router.include_router(activities_router)
api_router.include_router(ai_router)
api_router.include_router(payments_router)
api_router.include_router(sheets_router)
api_router.include_router(admin_router)
api_router.include_router(supplier_router)
api_router.include_router(uploads_router)
api_router.include_router(terms_router)

app.include_router(api_router)

# Mount static files for uploads - support both /api/static (for proxy) and direct paths
app.mount("/api/static", StaticFiles(directory=str(UPLOADS_DIR)), name="static_uploads")
# Also mount at /uploads for backwards compatibility with existing URLs
app.mount("/uploads", StaticFiles(directory=str(UPLOADS_DIR)), name="uploads_compat")

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
    await migrate_image_urls()
    await migrate_activities_fields()
    await seed_terms_policies()

async def seed_terms_policies():
    """Seed default terms and policies"""
    terms_collection = db.terms_policies
    
    # Check if any terms exist
    existing = await terms_collection.count_documents({})
    if existing > 0:
        logger.info("Terms and policies already seeded")
        return
    
    default_terms = [
        {
            "id": str(uuid.uuid4()),
            "title": "Any Other Commitments",
            "category": "Commitments",
            "content": ["If any other service or commitments have been made apart from the inclusions in the proposal, then please make sure they are mentioned in this section."],
            "sub_sections": [],
            "country": None,
            "city": None,
            "applies_to": "all",
            "order": 1,
            "is_expanded_default": False,
            "is_active": True,
            "icon": "check",
            "created_at": datetime.now(timezone.utc).isoformat()
        },
        {
            "id": str(uuid.uuid4()),
            "title": "Important Notes",
            "category": "General",
            "content": [],
            "sub_sections": [
                {
                    "title": "General",
                    "items": [
                        "Any ticket to attractions, museums, train, cable car, ferries, rides, safari, etc. are not included unless explicitly mentioned as an inclusion.",
                        "For queries regarding cancellations and refunds, please refer to our Cancellation Policy.",
                        "We reserve the right to issue a full refund in case we believe we are unable to fulfil the services for any technical reasons.",
                        "Please make sure that the passport of all guests travelling is valid for at least 6 months from the date of travel.",
                        "We can only facilitate the visa application for the travelling passengers. Granting of visa is solely at the discretion of Embassy."
                    ]
                },
                {
                    "title": "Hotel",
                    "items": [
                        "At the time of check-in to your hotel, hotel may ask you to make an advance/security deposit (amount depends upon hotel policy). This amount is refunded at the time of check-out, minus the cost of any items taken from the mini-bar or other charges."
                    ]
                },
                {
                    "title": "Tours and Transfers",
                    "items": [
                        "The cost and ticket issued for various attractions with regards to any children travelling are based on the age provided at the time of creating the package quote."
                    ]
                }
            ],
            "country": None,
            "city": None,
            "applies_to": "all",
            "order": 2,
            "is_expanded_default": True,
            "is_active": True,
            "icon": "info",
            "created_at": datetime.now(timezone.utc).isoformat()
        },
        {
            "id": str(uuid.uuid4()),
            "title": "Important Notes - Europe",
            "category": "Regional",
            "content": [],
            "sub_sections": [
                {
                    "title": "Europe",
                    "items": [
                        "Please make sure to download the telegram app before your travel starts, where driver details for all tours and transfers shall be shared.",
                        "The driver details for private airport transfers or train station transfers or tours shall be shared within 24 hours of scheduled time only on the telegram app.",
                        "On arrival in case you cannot locate your driver please call the service provider and give your complete name and confirmation number for them to guide you.",
                        "Any changes in pickup times in Europe for airport or train station transfers (private only) can be done only 24 hours before the scheduled pickup time.",
                        "Most tours on sharing basis in Europe start from a common point in the city. Please make sure you reach the shared common point mentioned in the activity voucher at least 15 mins before the scheduled time.",
                        "In case you are delayed in reaching the common point, and the bus leaves for the tour, the tour is considered a no show and no refund shall be provided.",
                        "For tours and activities booked on private basis, the drivers arrive at specified time only and the maximum waiting time is only 10-15 mins.",
                        "Please note that we are not responsible for any delays (if any) in the vehicle for pick-ups or drops due to any un-avoidable conditions, like traffic, accidents, vehicle breakdown etc.",
                        "Please note that any trains confirmed as part of journeys exclude seat reservations and seat reservation charges.",
                        "In Europe you are required to manage and handle your luggage on your own. No porterage services are provided by us."
                    ]
                }
            ],
            "country": "Europe",
            "city": None,
            "applies_to": "country",
            "order": 3,
            "is_expanded_default": False,
            "is_active": True,
            "icon": "info",
            "created_at": datetime.now(timezone.utc).isoformat()
        },
        {
            "id": str(uuid.uuid4()),
            "title": "Terms and Conditions",
            "category": "Legal",
            "content": [
                "Airline seats and hotel rooms are subject to availability at the time of confirmation.",
                "In case of unavailability in the listed hotels, arrangement for an alternate accommodation will be made in a hotel of similar standard.",
                "There will be no refund for unused nights or early check-out (in case of Medical condition it completely depends on hotel policy).",
                "There will be no refund for any unutilized services (meals, entrance fees, optional tours, hotels, transport and sightseeing etc) for any reason whatsoever.",
                "Check-in and check-out times at hotels would be as per Hotel policies. Early check-in or late check-out is subject to availability and may be chargeable by the hotel.",
                "The price does not include expenses of personal nature, such as laundry, telephone calls, room service, alcoholic beverages, mini bar charges, tips, portage, camera fees etc.",
                "We reserves the right to modify the itinerary at any point, due to reasons including but not limited to: Force Majeure events, strikes, fairs, festivals, weather conditions, traffic problems, overbooking of hotels / flights, cancellation / re-routing of flights, closure of / entry restrictions at a place of visit, etc.",
                "In case a flight gets cancelled, we will not be liable to provide any alternate flights within the same cost, any additional cost incurred for the same shall be borne by the traveler.",
                "If your stay falls on special dates (like 24th December, 31st December, 14th February, etc.) when hotel organize gala dinner, then there may be mandatory Gala Dinner Charges additional that you need to pay at the hotel directly.",
                "Country guidelines may change without notice, hence do check travel rules and your eligibility for travel on the regulatory website of the respective country/state, before booking your travel."
            ],
            "sub_sections": [],
            "country": None,
            "city": None,
            "applies_to": "all",
            "order": 4,
            "is_expanded_default": False,
            "is_active": True,
            "icon": "shield",
            "created_at": datetime.now(timezone.utc).isoformat()
        },
        {
            "id": str(uuid.uuid4()),
            "title": "Our Scope of Services",
            "category": "Legal",
            "content": [
                "We are holiday organizers only. We inspect and select the services to be provided to you. However, we do not own, operate or control any airline, shipping company, coach or coach company, hotel, transport, restaurant, kitchen caravan or any other facility or provider etc.",
                "You will need to adhere to the conditions, rules and regulations of each service provider.",
                "If you cause any injury or damage affecting the service provider, then you may be liable to the service provider and if the service provider recovers any monies from us for such injury or damages, we shall separately charge you for the same.",
                "We cannot be held responsible / liable for any delay, deficiency, injury, death, loss or damage etc. occasioned due to act or default of such service providers, their employees or agents."
            ],
            "sub_sections": [],
            "country": None,
            "city": None,
            "applies_to": "all",
            "order": 5,
            "is_expanded_default": False,
            "is_active": True,
            "icon": "briefcase",
            "created_at": datetime.now(timezone.utc).isoformat()
        },
        {
            "id": str(uuid.uuid4()),
            "title": "Hotel Cancellation Policy",
            "category": "Cancellation",
            "content": [
                "Hotel cancellation will be as per the hotel cancellation policy. If the hotels are non-refundable, you will not get any refund for hotels in the event of cancellation.",
                "Any transfers or activities included in the trip will be non-refundable if cancelled within 3 days of the travel start date, unless otherwise specified during the quotation stage.",
                "Entrance tickets of any kind are non-refundable from the moment of booking, unless specified otherwise.",
                "There will also a service charge of 5% on total value in case of cancellation of Land and 5% on total value for any amendments.",
                "Hotel room allocation will be subject to availability and will be on a first come first serve basis.",
                "Any transfers or activities included in the trip will be non-refundable if cancelled within 3 days of the travel start date."
            ],
            "sub_sections": [],
            "country": None,
            "city": None,
            "applies_to": "all",
            "order": 6,
            "is_expanded_default": False,
            "is_active": True,
            "icon": "hotel",
            "created_at": datetime.now(timezone.utc).isoformat()
        },
        {
            "id": str(uuid.uuid4()),
            "title": "Payment Policies",
            "category": "Payment",
            "content": [
                "There might be an increase in total package cost offered at the time of bookings in case the payments are not received by us as per the terms mentioned and the extra cost need to be borne by the guest.",
                "We will never ask you to pay in a personal account. Please always pay using our website or in our company bank account."
            ],
            "sub_sections": [],
            "country": None,
            "city": None,
            "applies_to": "all",
            "order": 7,
            "is_expanded_default": False,
            "is_active": True,
            "icon": "creditCard",
            "created_at": datetime.now(timezone.utc).isoformat()
        },
        {
            "id": str(uuid.uuid4()),
            "title": "Amendment of Booking by Guest",
            "category": "Booking",
            "content": [
                "If you wish to amend or change your booking, you have to communicate your request to us in writing. Such requests for change or amendment will be accepted subject to availability.",
                "Please note that the amended or changed booking will be regarded as a new booking. In case the amendment is carried out within the cancellation period, then a cancellation charge shall apply as if a cancellation was made on the date the request for amendment or change is made."
            ],
            "sub_sections": [],
            "country": None,
            "city": None,
            "applies_to": "all",
            "order": 8,
            "is_expanded_default": False,
            "is_active": True,
            "icon": "edit",
            "created_at": datetime.now(timezone.utc).isoformat()
        }
    ]
    
    await terms_collection.insert_many(default_terms)
    logger.info(f"Seeded {len(default_terms)} default terms and policies")

async def migrate_image_urls():
    """Migrate old /uploads/ URLs to /api/static/ URLs"""
    hotels_collection = db.hotels
    
    # Find all hotels with old URL format
    hotels = await hotels_collection.find({}).to_list(length=1000)
    
    for hotel in hotels:
        updated = False
        new_images = []
        
        for img in hotel.get('images', []):
            if '/uploads/' in img and '/api/static/' not in img:
                # Replace /uploads/ with /api/static/
                new_img = img.replace('/uploads/', '/api/static/')
                new_images.append(new_img)
                updated = True
            else:
                new_images.append(img)
        
        if updated:
            await hotels_collection.update_one(
                {"_id": hotel["_id"]},
                {"$set": {"images": new_images}}
            )
            logger.info(f"Migrated image URLs for hotel: {hotel.get('name', 'unknown')}")

async def migrate_activities_fields():
    """Add new fields to existing activities"""
    activities_collection = db.activities
    
    # Default values for new fields
    default_fields = {
        "useful_information": [],
        "transfer_type": "Private",
        "operating_days": ["Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday", "Sunday"],
        "closed_days": []
    }
    
    # Find activities missing the new fields
    activities = await activities_collection.find({}).to_list(length=1000)
    
    for activity in activities:
        updates = {}
        for field, default_value in default_fields.items():
            if field not in activity:
                updates[field] = default_value
        
        if updates:
            await activities_collection.update_one(
                {"_id": activity["_id"]},
                {"$set": updates}
            )
            logger.info(f"Migrated activity fields for: {activity.get('name', 'unknown')}")

@app.on_event("shutdown")
async def shutdown_db_client():
    client.close()
