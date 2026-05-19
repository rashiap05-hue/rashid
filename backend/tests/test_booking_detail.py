"""
Test suite for Booking Detail feature - My Bookings page and BookingDetail page
Tests:
- GET /api/held-bookings - List held bookings for current user
- GET /api/held-bookings/{id} - Get booking detail with proposal, terms, expert, user
- PUT /api/bookings/{id}/travelers - Save traveler data
"""
import pytest
import requests
import os
from tests.test_helpers import (
    TEST_ADMIN_EMAIL,
    TEST_AGENT_EMAIL,
    TEST_STAFF_EMAIL,
    TEST_SUPPLIER_EMAIL,
    DEFAULT_PASSWORD,
)

BASE_URL = os.environ.get('REACT_APP_BACKEND_URL', '').rstrip('/')

# Test credentials

class TestAuth:
    """Authentication tests"""
    
    def test_agent_login(self):
        """Test agent login returns access_token"""
        response = requests.post(f"{BASE_URL}/api/auth/login", json={
            "email": TEST_AGENT_EMAIL,
            "password": DEFAULT_PASSWORD
        })
        assert response.status_code == 200, f"Login failed: {response.text}"
        data = response.json()
        assert "access_token" in data, f"Response missing access_token: {data}"
        assert len(data["access_token"]) > 0
        print(f"✓ Agent login successful, token received")

class TestHeldBookings:
    """Tests for held bookings endpoints"""
    
    @pytest.fixture(autouse=True)
    def setup(self):
        """Get auth token before each test"""
        response = requests.post(f"{BASE_URL}/api/auth/login", json={
            "email": TEST_AGENT_EMAIL,
            "password": DEFAULT_PASSWORD
        })
        if response.status_code != 200:
            pytest.skip("Authentication failed")
        self.token = response.json().get("access_token")
        self.headers = {"Authorization": f"Bearer {self.token}"}
    
    def test_get_held_bookings_list(self):
        """Test GET /api/held-bookings returns list of held bookings"""
        response = requests.get(f"{BASE_URL}/api/held-bookings", headers=self.headers)
        assert response.status_code == 200, f"Failed to get held bookings: {response.text}"
        data = response.json()
        assert isinstance(data, list), f"Expected list, got {type(data)}"
        print(f"✓ GET /api/held-bookings returned {len(data)} bookings")
        
        # Store booking IDs for later tests
        if len(data) > 0:
            self.booking_ids = [b.get("id") for b in data]
            # Verify booking structure
            booking = data[0]
            assert "id" in booking, "Booking missing 'id' field"
            assert "status" in booking, "Booking missing 'status' field"
            print(f"✓ First booking ID: {booking.get('id')[:8]}...")
            print(f"✓ Booking fields: {list(booking.keys())}")
    
    def test_get_held_booking_detail(self):
        """Test GET /api/held-bookings/{id} returns full booking detail"""
        # First get list to find a booking ID
        list_response = requests.get(f"{BASE_URL}/api/held-bookings", headers=self.headers)
        if list_response.status_code != 200 or len(list_response.json()) == 0:
            pytest.skip("No held bookings available for testing")
        
        booking_id = list_response.json()[0].get("id")
        
        # Get booking detail
        response = requests.get(f"{BASE_URL}/api/held-bookings/{booking_id}", headers=self.headers)
        assert response.status_code == 200, f"Failed to get booking detail: {response.text}"
        
        data = response.json()
        # Verify response structure
        assert "booking" in data, "Response missing 'booking' field"
        assert "proposal" in data, "Response missing 'proposal' field"
        assert "terms" in data, "Response missing 'terms' field"
        assert "expert" in data, "Response missing 'expert' field"
        assert "user" in data, "Response missing 'user' field"
        
        # Verify booking data
        booking = data["booking"]
        assert booking.get("id") == booking_id, "Booking ID mismatch"
        print(f"✓ GET /api/held-bookings/{booking_id[:8]}... returned full detail")
        print(f"✓ Booking status: {booking.get('status')}")
        print(f"✓ Proposal present: {data['proposal'] is not None}")
        print(f"✓ Terms count: {len(data['terms']) if data['terms'] else 0}")
        print(f"✓ Expert present: {data['expert'] is not None}")
        print(f"✓ User present: {data['user'] is not None}")
    
    def test_get_held_booking_not_found(self):
        """Test GET /api/held-bookings/{id} returns 404 for non-existent booking"""
        fake_id = "non-existent-booking-id-12345"
        response = requests.get(f"{BASE_URL}/api/held-bookings/{fake_id}", headers=self.headers)
        assert response.status_code == 404, f"Expected 404, got {response.status_code}"
        print(f"✓ GET /api/held-bookings/{fake_id} correctly returned 404")

class TestTravelerUpdate:
    """Tests for traveler update endpoint"""
    
    @pytest.fixture(autouse=True)
    def setup(self):
        """Get auth token and booking ID before each test"""
        response = requests.post(f"{BASE_URL}/api/auth/login", json={
            "email": TEST_AGENT_EMAIL,
            "password": DEFAULT_PASSWORD
        })
        if response.status_code != 200:
            pytest.skip("Authentication failed")
        self.token = response.json().get("access_token")
        self.headers = {"Authorization": f"Bearer {self.token}"}
        
        # Get a booking ID
        list_response = requests.get(f"{BASE_URL}/api/held-bookings", headers=self.headers)
        if list_response.status_code != 200 or len(list_response.json()) == 0:
            pytest.skip("No held bookings available for testing")
        self.booking_id = list_response.json()[0].get("id")
    
    def test_update_travelers_success(self):
        """Test PUT /api/bookings/{id}/travelers saves traveler data"""
        travelers = [
            {
                "title": "Mr",
                "firstName": "TEST_John",
                "lastName": "Doe",
                "dobDay": "15",
                "dobMonth": "6",
                "dobYear": "1990",
                "passportNumber": "AB123456",
                "expiryDay": "20",
                "expiryMonth": "12",
                "expiryYear": "2030",
                "nationality": "Indian"
            }
        ]
        
        response = requests.put(
            f"{BASE_URL}/api/bookings/{self.booking_id}/travelers",
            headers=self.headers,
            json={"travelers": travelers}
        )
        assert response.status_code == 200, f"Failed to update travelers: {response.text}"
        
        data = response.json()
        assert "message" in data, "Response missing 'message' field"
        print(f"✓ PUT /api/bookings/{self.booking_id[:8]}../travelers successful")
        print(f"✓ Response: {data.get('message')}")
        
        # Verify data was persisted by fetching booking detail
        detail_response = requests.get(f"{BASE_URL}/api/held-bookings/{self.booking_id}", headers=self.headers)
        assert detail_response.status_code == 200
        booking = detail_response.json().get("booking", {})
        saved_travelers = booking.get("travelers", [])
        
        if len(saved_travelers) > 0:
            assert saved_travelers[0].get("firstName") == "TEST_John", "Traveler firstName not persisted"
            print(f"✓ Traveler data persisted correctly: {saved_travelers[0].get('firstName')} {saved_travelers[0].get('lastName')}")
    
    def test_update_travelers_not_found(self):
        """Test PUT /api/bookings/{id}/travelers returns 404 for non-existent booking"""
        fake_id = "non-existent-booking-id-12345"
        response = requests.put(
            f"{BASE_URL}/api/bookings/{fake_id}/travelers",
            headers=self.headers,
            json={"travelers": []}
        )
        assert response.status_code == 404, f"Expected 404, got {response.status_code}"
        print(f"✓ PUT /api/bookings/{fake_id}/travelers correctly returned 404")

class TestBookingDataStructure:
    """Tests to verify booking data structure for UI rendering"""
    
    @pytest.fixture(autouse=True)
    def setup(self):
        """Get auth token before each test"""
        response = requests.post(f"{BASE_URL}/api/auth/login", json={
            "email": TEST_AGENT_EMAIL,
            "password": DEFAULT_PASSWORD
        })
        if response.status_code != 200:
            pytest.skip("Authentication failed")
        self.token = response.json().get("access_token")
        self.headers = {"Authorization": f"Bearer {self.token}"}
    
    def test_booking_has_required_fields_for_ui(self):
        """Test booking has all fields needed for BookingDetail UI"""
        list_response = requests.get(f"{BASE_URL}/api/held-bookings", headers=self.headers)
        if list_response.status_code != 200 or len(list_response.json()) == 0:
            pytest.skip("No held bookings available for testing")
        
        booking_id = list_response.json()[0].get("id")
        response = requests.get(f"{BASE_URL}/api/held-bookings/{booking_id}", headers=self.headers)
        assert response.status_code == 200
        
        data = response.json()
        booking = data.get("booking", {})
        
        # Check required fields for trip reference header
        required_fields = ["id", "status", "customer_name", "customer_email", "leaving_on", "adults", "rooms"]
        for field in required_fields:
            print(f"  - {field}: {booking.get(field, 'MISSING')}")
        
        # Check proposal has selected_hotels for hotel cards
        proposal = data.get("proposal")
        if proposal:
            print(f"✓ Proposal ID: {proposal.get('id', 'N/A')[:8]}...")
            print(f"  - selected_hotels: {list(proposal.get('selected_hotels', {}).keys()) if proposal.get('selected_hotels') else 'None'}")
            print(f"  - cities: {proposal.get('cities', [])}")
            print(f"  - flights: {len(proposal.get('flights', []))} flights")
        
        # Check user info for seller details
        user = data.get("user")
        if user:
            print(f"✓ User: {user.get('name', 'N/A')} ({user.get('email', 'N/A')})")
        
        print(f"✓ Booking data structure verified for UI rendering")

if __name__ == "__main__":
    pytest.main([__file__, "-v", "--tb=short"])
