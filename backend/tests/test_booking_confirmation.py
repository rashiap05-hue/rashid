"""
Test Booking Confirmation API endpoints
Tests POST /api/bookings and GET /api/bookings endpoints
"""
import pytest
import requests
import os

BASE_URL = os.environ.get('REACT_APP_BACKEND_URL', '').rstrip('/')

# Test credentials
AGENT_EMAIL = "rashid@travotours.ae"
AGENT_PASSWORD = "password123"


@pytest.fixture(scope="module")
def auth_token():
    """Get authentication token for agent user"""
    response = requests.post(f"{BASE_URL}/api/auth/login", json={
        "email": AGENT_EMAIL,
        "password": AGENT_PASSWORD
    })
    if response.status_code != 200:
        pytest.skip(f"Authentication failed: {response.status_code} - {response.text}")
    return response.json().get("access_token")


@pytest.fixture(scope="module")
def auth_headers(auth_token):
    """Get headers with auth token"""
    return {
        "Authorization": f"Bearer {auth_token}",
        "Content-Type": "application/json"
    }


@pytest.fixture(scope="module")
def test_proposal_id(auth_headers):
    """Get a valid proposal ID for testing"""
    response = requests.get(f"{BASE_URL}/api/proposals", headers=auth_headers)
    if response.status_code != 200:
        pytest.skip("Could not fetch proposals")
    proposals = response.json()
    if not proposals:
        pytest.skip("No proposals available for testing")
    # Return first proposal ID
    return proposals[0].get("id")


class TestBookingsAPI:
    """Test Bookings API endpoints"""

    def test_health_check(self):
        """Test API health endpoint"""
        response = requests.get(f"{BASE_URL}/api/health")
        assert response.status_code == 200
        data = response.json()
        assert data.get("status") == "healthy"
        print("PASSED: Health check endpoint working")

    def test_create_booking_success(self, auth_headers, test_proposal_id):
        """Test creating a booking with valid data"""
        booking_data = {
            "proposal_id": test_proposal_id,
            "travelers": [
                {
                    "roomIndex": 0,
                    "type": "adult",
                    "title": "Mr",
                    "firstName": "Test",
                    "lastName": "Traveler1",
                    "dobDay": "15",
                    "dobMonth": "6",
                    "dobYear": "1990",
                    "bedPreference": "double"
                },
                {
                    "roomIndex": 0,
                    "type": "adult",
                    "title": "Mrs",
                    "firstName": "Test",
                    "lastName": "Traveler2",
                    "dobDay": "20",
                    "dobMonth": "8",
                    "dobYear": "1992",
                    "bedPreference": "double"
                }
            ],
            "contactInfo": {
                "email": "test@example.com",
                "phone": "+971501234567",
                "city": "Dubai",
                "clientProfile": "VIP",
                "agentReference": "TEST-REF-001"
            },
            "specialOccasion": "honeymoon",
            "paymentOption": "full",
            "confirmationTime": "2026-01-15T10:30:00.000Z",
            "attachments": []
        }
        
        response = requests.post(
            f"{BASE_URL}/api/bookings",
            json=booking_data,
            headers=auth_headers
        )
        
        assert response.status_code == 200, f"Expected 200, got {response.status_code}: {response.text}"
        data = response.json()
        
        # Verify response structure
        assert "id" in data, "Response should contain booking ID"
        assert data.get("status") == "confirmed", "Booking status should be 'confirmed'"
        assert "message" in data, "Response should contain success message"
        
        print(f"PASSED: Created booking with ID: {data.get('id')}")
        return data.get("id")

    def test_create_booking_invalid_proposal(self, auth_headers):
        """Test creating a booking with invalid proposal ID"""
        booking_data = {
            "proposal_id": "invalid-proposal-id-12345",
            "travelers": [],
            "contactInfo": {},
            "specialOccasion": "none",
            "paymentOption": "full"
        }
        
        response = requests.post(
            f"{BASE_URL}/api/bookings",
            json=booking_data,
            headers=auth_headers
        )
        
        assert response.status_code == 404, f"Expected 404 for invalid proposal, got {response.status_code}"
        print("PASSED: Invalid proposal returns 404")

    def test_create_booking_unauthorized(self, test_proposal_id):
        """Test creating a booking without authentication"""
        booking_data = {
            "proposal_id": test_proposal_id,
            "travelers": [],
            "contactInfo": {},
            "specialOccasion": "none",
            "paymentOption": "full"
        }
        
        response = requests.post(
            f"{BASE_URL}/api/bookings",
            json=booking_data,
            headers={"Content-Type": "application/json"}
        )
        
        # Should return 401 or 403 for unauthorized
        assert response.status_code in [401, 403], f"Expected 401/403, got {response.status_code}"
        print("PASSED: Unauthorized request rejected")

    def test_list_bookings(self, auth_headers):
        """Test listing bookings for authenticated user"""
        response = requests.get(
            f"{BASE_URL}/api/bookings",
            headers=auth_headers
        )
        
        assert response.status_code == 200, f"Expected 200, got {response.status_code}"
        data = response.json()
        assert isinstance(data, list), "Response should be a list"
        print(f"PASSED: Listed {len(data)} bookings")

    def test_get_booking_by_id(self, auth_headers, test_proposal_id):
        """Test getting a specific booking by ID"""
        # First create a booking
        booking_data = {
            "proposal_id": test_proposal_id,
            "travelers": [
                {
                    "roomIndex": 0,
                    "type": "adult",
                    "title": "Mr",
                    "firstName": "GetTest",
                    "lastName": "User",
                    "dobDay": "1",
                    "dobMonth": "1",
                    "dobYear": "1985",
                    "bedPreference": "single"
                }
            ],
            "contactInfo": {
                "email": "gettest@example.com",
                "phone": "+971509999999",
                "city": "Dubai"
            },
            "specialOccasion": "none",
            "paymentOption": "partial"
        }
        
        create_response = requests.post(
            f"{BASE_URL}/api/bookings",
            json=booking_data,
            headers=auth_headers
        )
        
        if create_response.status_code != 200:
            pytest.skip(f"Could not create booking for test: {create_response.text}")
        
        booking_id = create_response.json().get("id")
        
        # Now get the booking
        get_response = requests.get(
            f"{BASE_URL}/api/bookings/{booking_id}",
            headers=auth_headers
        )
        
        assert get_response.status_code == 200, f"Expected 200, got {get_response.status_code}"
        data = get_response.json()
        
        assert data.get("id") == booking_id, "Booking ID should match"
        assert data.get("proposal_id") == test_proposal_id, "Proposal ID should match"
        assert data.get("status") == "confirmed", "Status should be confirmed"
        
        print(f"PASSED: Retrieved booking {booking_id}")

    def test_get_booking_not_found(self, auth_headers):
        """Test getting a non-existent booking"""
        response = requests.get(
            f"{BASE_URL}/api/bookings/non-existent-booking-id",
            headers=auth_headers
        )
        
        assert response.status_code == 404, f"Expected 404, got {response.status_code}"
        print("PASSED: Non-existent booking returns 404")


class TestBookingDataValidation:
    """Test booking data validation and structure"""

    def test_booking_with_all_traveler_fields(self, auth_headers, test_proposal_id):
        """Test booking with complete traveler information"""
        booking_data = {
            "proposal_id": test_proposal_id,
            "travelers": [
                {
                    "roomIndex": 0,
                    "type": "adult",
                    "title": "Dr",
                    "firstName": "Complete",
                    "lastName": "Traveler",
                    "dobDay": "25",
                    "dobMonth": "12",
                    "dobYear": "1980",
                    "bedPreference": "king"
                }
            ],
            "contactInfo": {
                "email": "complete@example.com",
                "phone": "+971501111111",
                "city": "Abu Dhabi",
                "clientProfile": "CEO",
                "agentReference": "COMPLETE-001"
            },
            "specialOccasion": "anniversary",
            "paymentOption": "full",
            "confirmationTime": "2026-01-15T14:00:00.000Z",
            "attachments": ["passport.pdf", "visa.pdf"]
        }
        
        response = requests.post(
            f"{BASE_URL}/api/bookings",
            json=booking_data,
            headers=auth_headers
        )
        
        assert response.status_code == 200, f"Expected 200, got {response.status_code}: {response.text}"
        data = response.json()
        assert data.get("status") == "confirmed"
        print("PASSED: Booking with all fields created successfully")

    def test_booking_with_multiple_rooms(self, auth_headers, test_proposal_id):
        """Test booking with travelers in multiple rooms"""
        booking_data = {
            "proposal_id": test_proposal_id,
            "travelers": [
                {
                    "roomIndex": 0,
                    "type": "adult",
                    "title": "Mr",
                    "firstName": "Room1",
                    "lastName": "Adult1",
                    "dobDay": "1",
                    "dobMonth": "1",
                    "dobYear": "1985",
                    "bedPreference": "double"
                },
                {
                    "roomIndex": 0,
                    "type": "adult",
                    "title": "Mrs",
                    "firstName": "Room1",
                    "lastName": "Adult2",
                    "dobDay": "2",
                    "dobMonth": "2",
                    "dobYear": "1987",
                    "bedPreference": "double"
                },
                {
                    "roomIndex": 1,
                    "type": "adult",
                    "title": "Mr",
                    "firstName": "Room2",
                    "lastName": "Adult1",
                    "dobDay": "3",
                    "dobMonth": "3",
                    "dobYear": "1990",
                    "bedPreference": "twin"
                }
            ],
            "contactInfo": {
                "email": "multiroom@example.com",
                "phone": "+971502222222",
                "city": "Dubai"
            },
            "specialOccasion": "none",
            "paymentOption": "partial"
        }
        
        response = requests.post(
            f"{BASE_URL}/api/bookings",
            json=booking_data,
            headers=auth_headers
        )
        
        assert response.status_code == 200, f"Expected 200, got {response.status_code}: {response.text}"
        print("PASSED: Multi-room booking created successfully")

    def test_booking_special_occasions(self, auth_headers, test_proposal_id):
        """Test all special occasion options"""
        occasions = ["none", "birthday", "honeymoon", "anniversary"]
        
        for occasion in occasions:
            booking_data = {
                "proposal_id": test_proposal_id,
                "travelers": [
                    {
                        "roomIndex": 0,
                        "type": "adult",
                        "title": "Mr",
                        "firstName": f"Occasion{occasion}",
                        "lastName": "Test",
                        "dobDay": "10",
                        "dobMonth": "5",
                        "dobYear": "1988",
                        "bedPreference": "single"
                    }
                ],
                "contactInfo": {
                    "email": f"{occasion}@example.com",
                    "phone": "+971503333333",
                    "city": "Dubai"
                },
                "specialOccasion": occasion,
                "paymentOption": "full"
            }
            
            response = requests.post(
                f"{BASE_URL}/api/bookings",
                json=booking_data,
                headers=auth_headers
            )
            
            assert response.status_code == 200, f"Failed for occasion '{occasion}': {response.text}"
        
        print("PASSED: All special occasion options work correctly")

    def test_booking_payment_options(self, auth_headers, test_proposal_id):
        """Test both payment options (partial and full)"""
        for payment_option in ["partial", "full"]:
            booking_data = {
                "proposal_id": test_proposal_id,
                "travelers": [
                    {
                        "roomIndex": 0,
                        "type": "adult",
                        "title": "Mr",
                        "firstName": f"Payment{payment_option}",
                        "lastName": "Test",
                        "dobDay": "15",
                        "dobMonth": "7",
                        "dobYear": "1995",
                        "bedPreference": "queen"
                    }
                ],
                "contactInfo": {
                    "email": f"{payment_option}@example.com",
                    "phone": "+971504444444",
                    "city": "Dubai"
                },
                "specialOccasion": "none",
                "paymentOption": payment_option
            }
            
            response = requests.post(
                f"{BASE_URL}/api/bookings",
                json=booking_data,
                headers=auth_headers
            )
            
            assert response.status_code == 200, f"Failed for payment option '{payment_option}': {response.text}"
        
        print("PASSED: Both payment options work correctly")


if __name__ == "__main__":
    pytest.main([__file__, "-v", "--tb=short"])
