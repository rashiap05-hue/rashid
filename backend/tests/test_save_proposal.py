"""
Tests for Save Proposal functionality
- Tests proposal creation with customer details (customer_name, expected_booking_date, flights_booked)
- Verifies that all proposal fields are stored correctly in database
"""
import pytest
import requests
import os
from datetime import datetime, timedelta

BASE_URL = os.environ.get('REACT_APP_BACKEND_URL', '').rstrip('/')

class TestSaveProposalAPI:
    """Tests for the Save Proposal endpoint"""
    
    @pytest.fixture
    def auth_token(self):
        """Get auth token for test user"""
        login_data = {
            "email": "testadmin@example.com",
            "password": "password123"
        }
        response = requests.post(f"{BASE_URL}/api/auth/login", json=login_data)
        if response.status_code == 200:
            return response.json().get("access_token")
        
        # If login fails, try signup
        signup_data = {
            "email": "testadmin@example.com",
            "password": "password123",
            "full_name": "Test Admin",
            "company_name": "Test Company"
        }
        response = requests.post(f"{BASE_URL}/api/auth/signup", json=signup_data)
        if response.status_code == 200:
            return response.json().get("access_token")
        
        pytest.skip("Could not authenticate")
    
    def test_create_proposal_with_customer_details(self, auth_token):
        """Test that proposal with all customer details is saved correctly"""
        # Create proposal with all required fields from SaveProposalModal
        proposal_data = {
            "leaving_from": "Dubai International Airport (DXB)",
            "leaving_from_code": "DXB",
            "nationality": "India",
            "leaving_on": "2026-02-15",
            "star_rating": "4",
            "add_transfers": True,
            "room_data": [{"adults": 2, "children": []}],
            "cities": [{"name": "Dubai", "nights": 3}],
            # Customer details - the key fields being tested
            "customer_name": "TEST_John Smith",
            "customer_email": "john.smith@test.com",
            "customer_phone": "+1234567890",
            "proposal_name": "TEST_Trip to Dubai",
            "expected_booking_date": "2026-02-01",
            "flights_booked": False,
            "markup_value": 10,
            "markup_type": "percentage",
            "discount_amount": 50,
            "status": "pending",
            # Pricing
            "total_price": 1500,
            "pricing_breakdown": {
                "hotels": 1000,
                "activities": 300,
                "transfers": 200,
                "subtotal": 1500,
                "markup": 150,
                "discount": 50,
                "total": 1600
            },
            # Itinerary
            "itinerary": [
                {"day": 1, "date": "2026-02-15", "activities": ["Arrival", "Hotel Check-in"]},
                {"day": 2, "date": "2026-02-16", "activities": ["City Tour"]},
                {"day": 3, "date": "2026-02-17", "activities": ["Desert Safari"]},
                {"day": 4, "date": "2026-02-18", "activities": ["Departure"]}
            ],
            "total_nights": 3,
            "total_pax": 2,
            "vehicle_type": "sedan_4",
            "vehicle_label": "4 Seater Sedan"
        }
        
        headers = {"Authorization": f"Bearer {auth_token}"}
        response = requests.post(f"{BASE_URL}/api/proposals", json=proposal_data, headers=headers)
        
        # Assert status code
        assert response.status_code == 200, f"Expected 200, got {response.status_code}: {response.text}"
        
        data = response.json()
        proposal_id = data.get("id")
        assert proposal_id is not None, "Proposal ID should be returned"
        
        # Verify all customer fields are saved
        assert data.get("customer_name") == "TEST_John Smith", f"customer_name mismatch: {data.get('customer_name')}"
        assert data.get("customer_email") == "john.smith@test.com", f"customer_email mismatch"
        assert data.get("customer_phone") == "+1234567890", f"customer_phone mismatch"
        assert data.get("proposal_name") == "TEST_Trip to Dubai", f"proposal_name mismatch"
        assert data.get("expected_booking_date") == "2026-02-01", f"expected_booking_date mismatch"
        assert data.get("flights_booked") == False, f"flights_booked mismatch"
        assert data.get("markup_value") == 10, f"markup_value mismatch"
        assert data.get("markup_type") == "percentage", f"markup_type mismatch"
        assert data.get("discount_amount") == 50, f"discount_amount mismatch"
        
        # Verify pricing breakdown is saved
        pricing = data.get("pricing_breakdown")
        assert pricing is not None, "pricing_breakdown should be saved"
        assert pricing.get("hotels") == 1000
        
        # Verify itinerary is saved
        itinerary = data.get("itinerary")
        assert itinerary is not None, "itinerary should be saved"
        assert len(itinerary) == 4, f"Expected 4 days in itinerary, got {len(itinerary)}"
        
        # Clean up - delete the test proposal
        requests.delete(f"{BASE_URL}/api/proposals/{proposal_id}", headers=headers)
        
        print(f"✓ Proposal created with ID: {proposal_id}")
        print(f"✓ customer_name: {data.get('customer_name')}")
        print(f"✓ expected_booking_date: {data.get('expected_booking_date')}")
        print(f"✓ flights_booked: {data.get('flights_booked')}")
        print(f"✓ pricing_breakdown saved correctly")
        print(f"✓ itinerary saved with {len(itinerary)} days")
    
    def test_get_proposal_includes_customer_details(self, auth_token):
        """Test that GET proposal returns all customer details"""
        # First create a proposal
        proposal_data = {
            "leaving_from": "Dubai International Airport (DXB)",
            "nationality": "India",
            "leaving_on": "2026-03-01",
            "star_rating": "5",
            "add_transfers": True,
            "room_data": [{"adults": 2, "children": []}],
            "cities": [{"name": "Dubai", "nights": 2}],
            "customer_name": "TEST_Jane Doe",
            "customer_email": "jane@test.com",
            "customer_phone": "+9876543210",
            "proposal_name": "TEST_Luxury Dubai Trip",
            "expected_booking_date": "2026-02-20",
            "flights_booked": True,
            "total_price": 2500,
            "pricing_breakdown": {"total": 2500, "hotels": 2000, "activities": 500}
        }
        
        headers = {"Authorization": f"Bearer {auth_token}"}
        create_response = requests.post(f"{BASE_URL}/api/proposals", json=proposal_data, headers=headers)
        assert create_response.status_code == 200
        
        proposal_id = create_response.json().get("id")
        
        # Now GET the proposal and verify all fields
        get_response = requests.get(f"{BASE_URL}/api/proposals/{proposal_id}")
        assert get_response.status_code == 200
        
        fetched = get_response.json()
        
        # Verify customer details are returned
        assert fetched.get("customer_name") == "TEST_Jane Doe", "customer_name should be fetched"
        assert fetched.get("customer_email") == "jane@test.com", "customer_email should be fetched"
        assert fetched.get("customer_phone") == "+9876543210", "customer_phone should be fetched"
        assert fetched.get("proposal_name") == "TEST_Luxury Dubai Trip", "proposal_name should be fetched"
        assert fetched.get("expected_booking_date") == "2026-02-20", "expected_booking_date should be fetched"
        assert fetched.get("flights_booked") == True, "flights_booked should be fetched"
        assert fetched.get("pricing_breakdown") is not None, "pricing_breakdown should be fetched"
        
        # Clean up
        requests.delete(f"{BASE_URL}/api/proposals/{proposal_id}", headers=headers)
        
        print(f"✓ GET proposal {proposal_id} returns all customer details correctly")
    
    def test_proposal_required_fields_validation(self):
        """Test that basic proposal fields work correctly"""
        # Minimal proposal (just required fields)
        minimal_proposal = {
            "leaving_from": "Test Airport",
            "nationality": "USA",
            "leaving_on": "2026-04-01",
            "star_rating": "3",
            "add_transfers": False,
            "room_data": [{"adults": 1, "children": []}],
            "cities": [{"name": "Test City", "nights": 1}]
        }
        
        response = requests.post(f"{BASE_URL}/api/proposals", json=minimal_proposal)
        assert response.status_code == 200, f"Minimal proposal should work: {response.text}"
        
        data = response.json()
        proposal_id = data.get("id")
        assert proposal_id is not None
        
        # Customer fields should be None for minimal proposal
        assert data.get("customer_name") is None, "customer_name should be None for minimal proposal"
        assert data.get("expected_booking_date") is None
        assert data.get("flights_booked") is None
        
        # Clean up
        requests.delete(f"{BASE_URL}/api/proposals/{proposal_id}")
        
        print(f"✓ Minimal proposal works correctly (optional customer fields are None)")
    
    def test_proposal_with_hotels_and_activities(self, auth_token):
        """Test proposal with selected hotels and activities"""
        proposal_data = {
            "leaving_from": "DXB",
            "nationality": "UK",
            "leaving_on": "2026-05-01",
            "star_rating": "4",
            "add_transfers": True,
            "room_data": [{"adults": 2, "children": []}],
            "cities": [{"name": "Dubai", "nights": 2}],
            "customer_name": "TEST_Hotel Test User",
            "proposal_name": "TEST_Hotel Activity Proposal",
            "expected_booking_date": "2026-04-15",
            "flights_booked": False,
            "selected_hotels": {
                "Dubai": {
                    "id": "test-hotel-1",
                    "name": "Test Luxury Hotel",
                    "star_rating": 5,
                    "selectedRoom": {"name": "Deluxe Suite", "price": 500}
                }
            },
            "selected_activities": {
                "0": [
                    {
                        "id": "test-activity-1",
                        "name": "Desert Safari",
                        "price": 200,
                        "duration": "6 hours"
                    }
                ]
            },
            "arrival_transfer": {
                "id": "test-transfer-1",
                "title": "Airport to Hotel",
                "price": 100
            },
            "total_price": 1800,
            "pricing_breakdown": {
                "hotels": 1000,
                "activities": 200,
                "transfers": 100,
                "total": 1800
            }
        }
        
        headers = {"Authorization": f"Bearer {auth_token}"}
        response = requests.post(f"{BASE_URL}/api/proposals", json=proposal_data, headers=headers)
        
        assert response.status_code == 200
        data = response.json()
        proposal_id = data.get("id")
        
        # Verify hotels are saved
        assert data.get("selected_hotels") is not None, "selected_hotels should be saved"
        dubai_hotel = data.get("selected_hotels", {}).get("Dubai")
        assert dubai_hotel is not None, "Dubai hotel should be in selected_hotels"
        assert dubai_hotel.get("name") == "Test Luxury Hotel"
        
        # Verify activities are saved
        assert data.get("selected_activities") is not None, "selected_activities should be saved"
        
        # Verify transfers are saved
        assert data.get("arrival_transfer") is not None, "arrival_transfer should be saved"
        
        # Clean up
        requests.delete(f"{BASE_URL}/api/proposals/{proposal_id}", headers=headers)
        
        print(f"✓ Proposal with hotels, activities, and transfers saved correctly")


class TestAirportsAPI:
    """Tests for airport search - needed for TripBuilder dropdown"""
    
    def test_airport_search_dxb(self):
        """Test that airport search works for DXB"""
        response = requests.get(f"{BASE_URL}/api/airports?search=DXB")
        assert response.status_code == 200
        
        data = response.json()
        assert data.get("success") == True
        airports = data.get("airports", [])
        assert len(airports) > 0, "Should find DXB airport"
        
        # Check that DXB is in results
        dxb_found = any(a.get("code") == "DXB" for a in airports)
        assert dxb_found, "DXB airport should be found"
        
        print(f"✓ Airport search for DXB returns {len(airports)} results")
    
    def test_airport_search_dubai(self):
        """Test airport search by city name"""
        response = requests.get(f"{BASE_URL}/api/airports?search=Dubai")
        assert response.status_code == 200
        
        data = response.json()
        assert data.get("success") == True
        airports = data.get("airports", [])
        
        print(f"✓ Airport search for 'Dubai' returns {len(airports)} results")


if __name__ == "__main__":
    pytest.main([__file__, "-v"])
