from pydantic import BaseModel, Field, EmailStr
from typing import List, Optional, Dict, Any


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
    role: Optional[str] = None

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
    leaving_from_code: Optional[str] = None
    selected_flight: Optional[Dict] = None
    arrival_flight_info: Optional[Dict] = None
    departure_flight_info: Optional[Dict] = None
    selected_hotels: Optional[Dict] = None
    selected_activities: Optional[Dict] = None
    selected_extras: Optional[Dict] = None
    inter_city_transfers: Optional[Dict] = None
    arrival_transfer: Optional[Dict] = None
    departure_transfer: Optional[Dict] = None
    pricing_breakdown: Optional[Dict] = None
    total_price: Optional[float] = None
    vehicle_type: Optional[str] = None
    vehicle_label: Optional[str] = None
    total_pax: Optional[int] = None
    itinerary: Optional[List] = None
    total_nights: Optional[int] = None
    start_date: Optional[str] = None
    customer_name: Optional[str] = None
    customer_email: Optional[str] = None
    customer_phone: Optional[str] = None
    proposal_name: Optional[str] = None
    expected_booking_date: Optional[str] = None
    flights_booked: Optional[bool] = None
    markup_value: Optional[float] = None
    markup_type: Optional[str] = None
    markup_land: Optional[float] = None
    discount_amount: Optional[float] = None
    travel_insurance: Optional[bool] = None
    travel_insurance_price: Optional[float] = None
    status: Optional[str] = None

class ProposalResponse(BaseModel):
    id: str
    user_id: Optional[str] = None
    leaving_from: str
    leaving_from_code: Optional[str] = None
    nationality: str
    leaving_on: str
    star_rating: str
    add_transfers: bool
    room_data: List[Dict]
    cities: List[Dict]
    status: str = "pending"
    total_price: Optional[float] = None
    created_at: str
    updated_at: Optional[str] = None
    selected_flight: Optional[Dict] = None
    arrival_flight_info: Optional[Dict] = None
    departure_flight_info: Optional[Dict] = None
    selected_hotels: Optional[Dict] = None
    selected_activities: Optional[Dict] = None
    selected_extras: Optional[Dict] = None
    inter_city_transfers: Optional[Dict] = None
    arrival_transfer: Optional[Dict] = None
    departure_transfer: Optional[Dict] = None
    pricing_breakdown: Optional[Dict] = None
    vehicle_type: Optional[str] = None
    vehicle_label: Optional[str] = None
    total_pax: Optional[int] = None
    itinerary: Optional[List] = None
    total_nights: Optional[int] = None
    start_date: Optional[str] = None
    customer_name: Optional[str] = None
    customer_email: Optional[str] = None
    customer_phone: Optional[str] = None
    customer_mobile: Optional[str] = None
    whatsapp_number: Optional[str] = None
    proposal_name: Optional[str] = None
    expected_booking_date: Optional[str] = None
    flights_booked: Optional[bool] = None
    markup_value: Optional[float] = None
    markup_type: Optional[str] = None
    markup_land: Optional[float] = None
    discount_amount: Optional[float] = None
    travel_insurance: Optional[bool] = None
    travel_insurance_price: Optional[float] = None
    accepted_at: Optional[str] = None
    hold_until: Optional[str] = None
    assigned_expert_id: Optional[str] = None
    # Booking linkage (stamped after hold / booking creation so ProposalView can
    # render the locked "<TBM-ref> - BOOKING DETAILS" sidebar)
    booking_id: Optional[str] = None
    booking_ref: Optional[str] = None
    booking_number: Optional[int] = None
    # Group-tour proposals carry the full structured flights array so the
    # ProposalView can render the rich brochure-style flight cards.
    flights: Optional[List[Dict]] = None
    group_tour_id: Optional[str] = None
    group_tour_title: Optional[str] = None

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

class RatePlan(BaseModel):
    id: str = ""
    name: str
    price: float
    original_price: Optional[float] = None
    currency: str = "AED"
    meal_plan: str = "Room Only"
    meal_details: Optional[str] = None
    refund_policy: str = "Refundable"
    refund_deadline: Optional[str] = None
    inclusions: List[str] = []
    taxes: List[str] = []
    available: bool = True

class RoomType(BaseModel):
    id: str = ""
    name: str
    category: str = "Standard"
    bed_configuration: List[str] = []
    view_type: str = ""
    room_size: Optional[float] = None
    size_unit: str = "sqm"
    max_adults: int = 2
    max_children: int = 1
    smoking: bool = False
    amenities: List[str] = []
    images: List[str] = []
    description: str = ""
    rate_plans: List[Dict] = []
    available: bool = True
    total_inventory: int = 10

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
    rooms: List[Dict] = []
    room_types: List[Dict] = []
    recommended: bool = False
    check_in_time: str = "14:00"
    check_out_time: str = "12:00"
    year_built: Optional[int] = None
    total_rooms: Optional[int] = None
    highlights: List[str] = []
    board_types: List[str] = ["RO", "BB"]
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
    from_location: str = ""
    to_location: str = ""
    price: float = 0
    description: str = ""
    duration: str = "1 hrs"
    confirmation_time: str = "4 hrs"
    transfer_type: str = "Private"
    transfer_direction: str = "arrival"
    city: str
    extras: Optional[List[TransferExtra]] = []
    is_available: bool = True
    vehicle_type: str = "Sedan"
    pickup_times: Optional[List[str]] = []
    max_bags: int = 0
    supplier_name: Optional[str] = None
    supplier_cost: Optional[float] = None
    video: Optional[str] = None
    vehicle_pricing: Optional[dict] = None
    images: Optional[List[str]] = []
    highlights: Optional[List[str]] = []
    inclusions: Optional[List[str]] = []
    exclusions: Optional[List[str]] = []
    notes: Optional[str] = None

class ActivityExtra(BaseModel):
    id: Optional[str] = None
    name: str
    description: Optional[str] = None
    price: float = 0
    vehicle_pricing: Optional[dict] = None

class ActivityCreate(BaseModel):
    name: str
    description: str = ""
    city: str
    country: str = ""
    category: str = "City Tours"
    duration: str = "5 hrs"
    price: float = 0
    currency: str = "AED"
    images: List[str] = []
    video: Optional[str] = None
    highlights: List[str] = []
    inclusions: List[str] = []
    exclusions: List[str] = []
    useful_information: List[str] = []
    meeting_point: str = ""
    start_times: List[str] = []
    languages: List[str] = ["English"]
    transfer_type: str = "Private"
    operating_days: List[str] = ["Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday", "Sunday"]
    closed_days: List[str] = []
    age_restriction: str = "All ages"
    cancellation_policy: str = "Free cancellation up to 24 hours"
    supplier_name: Optional[str] = None
    supplier_cost: Optional[float] = None
    available: bool = True
    rating: float = 4.5
    review_count: int = 0
    vehicle_pricing: Optional[dict] = None
    extras: Optional[List[ActivityExtra]] = []
    meals_included: Optional[Dict[str, bool]] = None  # {breakfast: bool, lunch: bool, dinner: bool}

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
    interests: Optional[str] = None
    travelers: int = 2

class PaymentCreate(BaseModel):
    proposal_id: str
    amount: float
    currency: str = "AED"
    payment_method: str = "stripe"

class TermsPolicyCreate(BaseModel):
    title: str
    category: str
    content: List[str] = []
    sub_sections: List[Dict[str, Any]] = []
    country: Optional[str] = None
    city: Optional[str] = None
    applies_to: str = "all"
    order: int = 0
    is_expanded_default: bool = False
    is_active: bool = True
    icon: str = "info"

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
