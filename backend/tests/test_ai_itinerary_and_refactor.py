"""
Test AI Itinerary Generator and Backend Refactoring Regression Tests
=====================================================================
Tests:
1. POST /api/ai/itinerary - AI itinerary generation with Gemini
2. Auth endpoints regression (login, signup, me)
3. Hotels CRUD regression
4. Insurance settings regression
5. Proposals CRUD regression
6. Activities, Transfers, Cities, Airports CRUD regression
"""
import pytest
import requests
import os
import time
from tests.test_helpers import (
    TEST_ADMIN_EMAIL,
    TEST_AGENT_EMAIL,
    TEST_STAFF_EMAIL,
    TEST_SUPPLIER_EMAIL,
    DEFAULT_PASSWORD,
)

BASE_URL = os.environ.get('REACT_APP_BACKEND_URL', 'https://agent-payment.preview.emergentagent.com').rstrip('/')

# Test credentials from main agent

@pytest.fixture(scope="module")
def auth_token():
    """Get authentication token"""
    response = requests.post(f"{BASE_URL}/api/auth/login", json={
        "email": TEST_ADMIN_EMAIL,
        "password": DEFAULT_PASSWORD
    })
    if response.status_code == 200:
        return response.json().get("access_token")
    pytest.skip("Authentication failed - skipping authenticated tests")

@pytest.fixture
def api_client():
    """Shared requests session"""
    session = requests.Session()
    session.headers.update({"Content-Type": "application/json"})
    return session

@pytest.fixture
def authenticated_client(api_client, auth_token):
    """Session with auth header"""
    api_client.headers.update({"Authorization": f"Bearer {auth_token}"})
    return api_client

# ===================== AUTH REGRESSION TESTS =====================

class TestAuthEndpointsRegression:
    """Verify auth endpoints still work after backend refactoring"""
    
    def test_login_success(self, api_client):
        """POST /api/auth/login - login with valid credentials"""
        response = api_client.post(f"{BASE_URL}/api/auth/login", json={
            "email": TEST_ADMIN_EMAIL,
            "password": DEFAULT_PASSWORD
        })
        assert response.status_code == 200, f"Login failed: {response.text}"
        data = response.json()
        assert "access_token" in data, "access_token not in response"
        assert "user" in data, "user not in response"
        assert data["user"]["email"] == TEST_ADMIN_EMAIL
        print(f"Login successful for {TEST_ADMIN_EMAIL}")
    
    def test_login_invalid_credentials(self, api_client):
        """POST /api/auth/login - should return 401 for invalid credentials"""
        response = api_client.post(f"{BASE_URL}/api/auth/login", json={
            "email": "invalid@example.com",
            "password": "wrongpassword"
        })
        assert response.status_code == 401
        print("Invalid login correctly rejected with 401")
    
    def test_signup_duplicate_email(self, api_client):
        """POST /api/auth/signup - should return 400 for duplicate email"""
        response = api_client.post(f"{BASE_URL}/api/auth/signup", json={
            "email": TEST_ADMIN_EMAIL,
            "password": "testpass",
            "full_name": "Test User",
            "company_name": "Test Company"
        })
        assert response.status_code == 400, "Duplicate email should return 400"
        print("Duplicate email correctly rejected with 400")
    
    def test_me_endpoint(self, authenticated_client):
        """GET /api/auth/me - should return user info"""
        response = authenticated_client.get(f"{BASE_URL}/api/auth/me")
        assert response.status_code == 200
        data = response.json()
        assert "email" in data
        assert data["email"] == TEST_ADMIN_EMAIL
        print(f"GET /api/auth/me returned user: {data['email']}")

# ===================== AI ITINERARY TESTS =====================

class TestAIItineraryGenerator:
    """Test AI Itinerary Generator endpoint"""
    
    def test_ai_itinerary_basic(self, api_client):
        """POST /api/ai/itinerary - generate itinerary for single city"""
        response = api_client.post(f"{BASE_URL}/api/ai/itinerary", json={
            "cities": [{"name": "Tbilisi", "nights": 3}],
            "travelers": 2,
            "interests": None
        }, timeout=30)  # AI can take time
        
        assert response.status_code == 200, f"AI itinerary failed: {response.text}"
        data = response.json()
        assert data.get("success") == True, "Response should have success=True"
        
        # Either itinerary or raw should be present
        if data.get("itinerary"):
            assert "days" in data["itinerary"], "Itinerary should have 'days' array"
            print(f"AI generated structured itinerary with {len(data['itinerary']['days'])} days")
        elif data.get("raw"):
            print(f"AI returned raw text response (JSON parsing failed)")
            assert len(data["raw"]) > 50, "Raw response should have content"
        else:
            pytest.fail("Neither itinerary nor raw response present")
    
    def test_ai_itinerary_multi_city(self, api_client):
        """POST /api/ai/itinerary - generate itinerary for multiple cities"""
        response = api_client.post(f"{BASE_URL}/api/ai/itinerary", json={
            "cities": [
                {"name": "Tbilisi", "nights": 2},
                {"name": "Baku", "nights": 2}
            ],
            "travelers": 4,
            "interests": "History, food, culture"
        }, timeout=30)
        
        assert response.status_code == 200, f"AI itinerary failed: {response.text}"
        data = response.json()
        assert data.get("success") == True
        print(f"Multi-city AI itinerary generated successfully")
    
    def test_ai_itinerary_optional_interests(self, api_client):
        """POST /api/ai/itinerary - interests field is optional"""
        response = api_client.post(f"{BASE_URL}/api/ai/itinerary", json={
            "cities": [{"name": "Dubai", "nights": 2}],
            "travelers": 2
            # interests not provided - should be optional
        }, timeout=30)
        
        assert response.status_code == 200, f"Failed without interests: {response.text}"
        data = response.json()
        assert data.get("success") == True
        print("AI itinerary works without interests field")
    
    def test_ai_itinerary_response_structure(self, api_client):
        """POST /api/ai/itinerary - verify response structure"""
        response = api_client.post(f"{BASE_URL}/api/ai/itinerary", json={
            "cities": [{"name": "Tbilisi", "nights": 2}],
            "travelers": 2,
            "interests": "Sightseeing"
        }, timeout=30)
        
        assert response.status_code == 200
        data = response.json()
        
        # Check response has expected keys
        assert "success" in data
        assert "itinerary" in data or "raw" in data
        
        if data.get("itinerary"):
            itinerary = data["itinerary"]
            if "days" in itinerary:
                for day in itinerary["days"]:
                    # Each day should have basic structure
                    assert "day" in day, "Day should have day number"
                    assert "city" in day, "Day should have city"
                    print(f"Day {day['day']} structure verified")
        print("AI itinerary response structure valid")

# ===================== HOTELS CRUD REGRESSION =====================

class TestHotelsCRUDRegression:
    """Verify Hotels CRUD still works after refactoring"""
    
    def test_get_hotels_list(self, api_client):
        """GET /api/hotels - list hotels"""
        response = api_client.get(f"{BASE_URL}/api/hotels")
        assert response.status_code == 200
        data = response.json()
        assert "success" in data
        assert "hotels" in data
        assert isinstance(data["hotels"], list)
        print(f"GET /api/hotels returned {len(data['hotels'])} hotels")
    
    def test_get_hotels_by_city(self, api_client):
        """GET /api/hotels?city=Tbilisi - filter by city"""
        response = api_client.get(f"{BASE_URL}/api/hotels?city=Tbilisi")
        assert response.status_code == 200
        data = response.json()
        assert "hotels" in data
        # All returned hotels should match city filter
        for hotel in data["hotels"]:
            assert "tbilisi" in hotel.get("city", "").lower()
        print(f"City filter returned {len(data['hotels'])} hotels in Tbilisi")
    
    def test_create_hotel(self, authenticated_client):
        """POST /api/hotels - create new hotel"""
        hotel_data = {
            "name": "TEST_AI_Test_Hotel",
            "city": "Test City",
            "country": "Test Country",
            "address": "123 Test Street",
            "description": "A test hotel for AI itinerary testing",
            "star_rating": 4,
            "rating_score": 8.0,
            "rating_text": "Very Good",
            "review_count": 100,
            "images": ["https://example.com/hotel.jpg"],
            "amenities": ["WiFi", "Pool", "Gym"]
        }
        response = authenticated_client.post(f"{BASE_URL}/api/hotels", json=hotel_data)
        assert response.status_code == 200, f"Create hotel failed: {response.text}"
        data = response.json()
        assert data.get("success") == True
        assert "id" in data or "hotel" in data
        
        # Store ID for cleanup
        hotel_id = data.get("id") or data.get("hotel", {}).get("id")
        print(f"Created test hotel with ID: {hotel_id}")
        
        # Cleanup - delete the test hotel
        if hotel_id:
            delete_response = authenticated_client.delete(f"{BASE_URL}/api/hotels/{hotel_id}")
            assert delete_response.status_code == 200
            print("Test hotel cleaned up")
    
    def test_get_hotel_by_id(self, api_client):
        """GET /api/hotels/{id} - get single hotel"""
        # First get a list to find an ID
        list_response = api_client.get(f"{BASE_URL}/api/hotels?limit=1")
        assert list_response.status_code == 200
        hotels = list_response.json().get("hotels", [])
        
        if hotels:
            hotel_id = hotels[0].get("id")
            response = api_client.get(f"{BASE_URL}/api/hotels/{hotel_id}")
            assert response.status_code == 200
            data = response.json()
            # Response could be wrapped or direct
            hotel = data.get("hotel") or data
            assert hotel.get("id") == hotel_id or hotel.get("name")
            print(f"GET /api/hotels/{hotel_id} returned hotel data")

# ===================== INSURANCE SETTINGS REGRESSION =====================

class TestInsuranceSettingsRegression:
    """Verify Insurance settings endpoints after refactoring"""
    
    def test_get_insurance_settings(self, api_client):
        """GET /api/settings/insurance - list insurance prices"""
        response = api_client.get(f"{BASE_URL}/api/settings/insurance")
        assert response.status_code == 200
        data = response.json()
        # Response can be a list or have insurance_prices key
        if "insurance_prices" in data:
            assert isinstance(data["insurance_prices"], list)
            print(f"Insurance prices list: {len(data['insurance_prices'])} entries")
        else:
            # Could be a single entry
            assert "price_per_person" in data or "country" in data
            print("Insurance settings returned")
    
    def test_get_insurance_by_country(self, api_client):
        """GET /api/settings/insurance?country=Georgia - get by country"""
        response = api_client.get(f"{BASE_URL}/api/settings/insurance?country=Georgia")
        assert response.status_code == 200
        data = response.json()
        assert "price_per_person" in data or "country" in data
        print(f"Insurance for Georgia: {data}")
    
    def test_create_insurance_price(self, authenticated_client):
        """POST /api/settings/insurance - create insurance price"""
        unique_country = f"TEST_Country_{int(time.time())}"
        response = authenticated_client.post(f"{BASE_URL}/api/settings/insurance", json={
            "country": unique_country,
            "price_per_person": 75,
            "currency": "AED",
            "min_coverage": 50000,
            "max_age": 60
        })
        assert response.status_code == 200, f"Create insurance failed: {response.text}"
        data = response.json()
        assert data.get("country") == unique_country
        print(f"Created insurance price for {unique_country}")
        
        # Cleanup
        if data.get("id"):
            del_response = authenticated_client.delete(f"{BASE_URL}/api/settings/insurance/{data['id']}")
            assert del_response.status_code == 200
            print("Test insurance entry cleaned up")

# ===================== PROPOSALS CRUD REGRESSION =====================

class TestProposalsCRUDRegression:
    """Verify Proposals CRUD still works"""
    
    def test_get_proposals_list(self, authenticated_client):
        """GET /api/proposals - list proposals"""
        response = authenticated_client.get(f"{BASE_URL}/api/proposals")
        assert response.status_code == 200
        data = response.json()
        assert isinstance(data, list)
        print(f"GET /api/proposals returned {len(data)} proposals")
    
    def test_create_proposal(self, authenticated_client):
        """POST /api/proposals - create new proposal"""
        proposal_data = {
            "leaving_from": "Dubai",
            "nationality": "UAE",
            "leaving_on": "2026-02-01",
            "star_rating": "4",
            "add_transfers": True,
            "room_data": [{"adults": 2, "children": []}],
            "cities": [{"name": "Tbilisi", "nights": 3}],
            "total_price": 1500
        }
        response = authenticated_client.post(f"{BASE_URL}/api/proposals", json=proposal_data)
        assert response.status_code == 200, f"Create proposal failed: {response.text}"
        data = response.json()
        assert "id" in data
        proposal_id = data["id"]
        print(f"Created proposal with ID: {proposal_id}")
        
        # Cleanup
        del_response = authenticated_client.delete(f"{BASE_URL}/api/proposals/{proposal_id}")
        assert del_response.status_code == 200
        print("Test proposal cleaned up")

# ===================== ACTIVITIES CRUD REGRESSION =====================

class TestActivitiesCRUDRegression:
    """Verify Activities CRUD still works"""
    
    def test_get_activities_list(self, api_client):
        """GET /api/activities - list activities"""
        response = api_client.get(f"{BASE_URL}/api/activities")
        assert response.status_code == 200
        data = response.json()
        assert "success" in data
        assert "activities" in data
        print(f"GET /api/activities returned {len(data['activities'])} activities")
    
    def test_get_activities_by_city(self, api_client):
        """GET /api/activities?city=Tbilisi - filter by city"""
        response = api_client.get(f"{BASE_URL}/api/activities?city=Tbilisi")
        assert response.status_code == 200
        data = response.json()
        assert "activities" in data
        print(f"Activities in Tbilisi: {len(data['activities'])}")

# ===================== TRANSFERS CRUD REGRESSION =====================

class TestTransfersCRUDRegression:
    """Verify Transfers CRUD still works"""
    
    def test_get_transfers_list(self, api_client):
        """GET /api/transfers - list transfers"""
        response = api_client.get(f"{BASE_URL}/api/transfers")
        assert response.status_code == 200
        data = response.json()
        assert "success" in data
        assert "transfers" in data
        print(f"GET /api/transfers returned {len(data['transfers'])} transfers")
    
    def test_get_transfers_by_city(self, api_client):
        """GET /api/transfers?city=Tbilisi - filter by city"""
        response = api_client.get(f"{BASE_URL}/api/transfers?city=Tbilisi")
        assert response.status_code == 200
        data = response.json()
        assert "transfers" in data
        print(f"Transfers in Tbilisi: {len(data['transfers'])}")

# ===================== CITIES CRUD REGRESSION =====================

class TestCitiesCRUDRegression:
    """Verify Cities CRUD still works"""
    
    def test_get_cities_list(self, api_client):
        """GET /api/cities - list cities"""
        response = api_client.get(f"{BASE_URL}/api/cities")
        assert response.status_code == 200
        data = response.json()
        assert "success" in data
        assert "cities" in data
        print(f"GET /api/cities returned {len(data['cities'])} cities")
    
    def test_get_cities_by_search(self, api_client):
        """GET /api/cities?search=Georgia - search cities"""
        response = api_client.get(f"{BASE_URL}/api/cities?search=Georgia")
        assert response.status_code == 200
        data = response.json()
        assert "cities" in data
        print(f"Cities search 'Georgia': {len(data['cities'])} results")

# ===================== AIRPORTS CRUD REGRESSION =====================

class TestAirportsCRUDRegression:
    """Verify Airports CRUD still works"""
    
    def test_get_airports_list(self, api_client):
        """GET /api/airports - list airports"""
        response = api_client.get(f"{BASE_URL}/api/airports")
        assert response.status_code == 200
        data = response.json()
        assert "success" in data
        assert "airports" in data
        print(f"GET /api/airports returned {len(data['airports'])} airports")
    
    def test_get_airports_paginated(self, api_client):
        """GET /api/airports?page=1&limit=10 - paginated airports"""
        response = api_client.get(f"{BASE_URL}/api/airports?page=1&limit=10")
        assert response.status_code == 200
        data = response.json()
        assert "airports" in data
        assert "pagination" in data
        print(f"Airports pagination: page {data['pagination']['page']}, total {data['pagination']['total']}")

if __name__ == "__main__":
    pytest.main([__file__, "-v", "--tb=short"])
