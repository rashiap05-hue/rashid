"""
Test suite for Admin CRUD Operations in Travo DMC B2B Travel Platform
Tests: CRUD operations for Cities, Hotels, Airports, and Proposals management
"""
import pytest
import requests
import os
import uuid

BASE_URL = os.environ.get('REACT_APP_BACKEND_URL', '').rstrip('/')

# ============= FIXTURES =============

@pytest.fixture(scope="module")
def auth_token():
    """Get authentication token for tests that require it"""
    response = requests.post(f"{BASE_URL}/api/auth/login", json={
        "email": "testuser@demo.com",
        "password": "Test123!"
    })
    if response.status_code == 200:
        return response.json().get("access_token")
    pytest.skip("Authentication failed - skipping authenticated tests")

@pytest.fixture
def auth_headers(auth_token):
    """Return headers with auth token"""
    return {
        "Authorization": f"Bearer {auth_token}",
        "Content-Type": "application/json"
    }

# ============= CITY CRUD TESTS =============

class TestCityCRUD:
    """Test CRUD operations for Cities"""
    
    def test_get_cities(self):
        """GET /api/cities - List all cities"""
        response = requests.get(f"{BASE_URL}/api/cities")
        assert response.status_code == 200, f"Expected 200, got {response.status_code}"
        
        data = response.json()
        assert data["success"] is True
        assert "cities" in data
        assert isinstance(data["cities"], list)
        print(f"✓ GET /api/cities returned {len(data['cities'])} cities")
    
    def test_create_city(self):
        """POST /api/cities - Create a new city"""
        test_city = {
            "name": f"TEST_City_{uuid.uuid4().hex[:8]}",
            "country": "TEST_Country"
        }
        response = requests.post(f"{BASE_URL}/api/cities", json=test_city)
        assert response.status_code == 200, f"Expected 200, got {response.status_code}: {response.text}"
        
        data = response.json()
        assert data["success"] is True
        assert "id" in data
        city_id = data["id"]
        print(f"✓ POST /api/cities created city with id: {city_id}")
        
        # Store for cleanup and verification
        TestCityCRUD.created_city_id = city_id
        TestCityCRUD.created_city_name = test_city["name"]
        return city_id
    
    def test_verify_city_created(self):
        """Verify the created city exists in the database"""
        if not hasattr(TestCityCRUD, 'created_city_id'):
            pytest.skip("No city created to verify")
        
        response = requests.get(f"{BASE_URL}/api/cities")
        assert response.status_code == 200
        
        data = response.json()
        city_found = any(c["id"] == TestCityCRUD.created_city_id for c in data["cities"])
        assert city_found, f"City {TestCityCRUD.created_city_id} not found in database"
        print(f"✓ City {TestCityCRUD.created_city_id} verified in database")
    
    def test_update_city(self):
        """PUT /api/cities/{city_id} - Update a city"""
        if not hasattr(TestCityCRUD, 'created_city_id'):
            pytest.skip("No city created to update")
        
        update_data = {
            "name": f"UPDATED_City_{uuid.uuid4().hex[:8]}",
            "country": "UPDATED_Country"
        }
        response = requests.put(
            f"{BASE_URL}/api/cities/{TestCityCRUD.created_city_id}", 
            json=update_data
        )
        assert response.status_code == 200, f"Expected 200, got {response.status_code}: {response.text}"
        
        data = response.json()
        assert data["success"] is True
        print(f"✓ PUT /api/cities/{TestCityCRUD.created_city_id} updated successfully")
        
        # Verify update persisted
        response = requests.get(f"{BASE_URL}/api/cities")
        cities = response.json()["cities"]
        updated_city = next((c for c in cities if c["id"] == TestCityCRUD.created_city_id), None)
        assert updated_city is not None
        assert updated_city["name"] == update_data["name"]
        assert updated_city["country"] == update_data["country"]
        print(f"✓ City update verified: {updated_city['name']}, {updated_city['country']}")
    
    def test_update_nonexistent_city(self):
        """PUT /api/cities/{invalid_id} - Should return 404"""
        update_data = {"name": "Test", "country": "Test"}
        response = requests.put(f"{BASE_URL}/api/cities/nonexistent-id", json=update_data)
        assert response.status_code == 404, f"Expected 404, got {response.status_code}"
        print("✓ PUT nonexistent city returns 404")
    
    def test_delete_city(self):
        """DELETE /api/cities/{city_id} - Delete a city"""
        if not hasattr(TestCityCRUD, 'created_city_id'):
            pytest.skip("No city created to delete")
        
        response = requests.delete(f"{BASE_URL}/api/cities/{TestCityCRUD.created_city_id}")
        assert response.status_code == 200, f"Expected 200, got {response.status_code}"
        
        data = response.json()
        assert data["success"] is True
        print(f"✓ DELETE /api/cities/{TestCityCRUD.created_city_id} successful")
        
        # Verify deletion
        response = requests.get(f"{BASE_URL}/api/cities")
        cities = response.json()["cities"]
        city_found = any(c["id"] == TestCityCRUD.created_city_id for c in cities)
        assert not city_found, "City should not exist after deletion"
        print(f"✓ City deletion verified - city no longer in database")
    
    def test_delete_nonexistent_city(self):
        """DELETE /api/cities/{invalid_id} - Should return 404"""
        response = requests.delete(f"{BASE_URL}/api/cities/nonexistent-id")
        assert response.status_code == 404, f"Expected 404, got {response.status_code}"
        print("✓ DELETE nonexistent city returns 404")

# ============= HOTEL CRUD TESTS =============

class TestHotelCRUD:
    """Test CRUD operations for Hotels"""
    
    def test_get_hotels(self):
        """GET /api/hotels - List all hotels"""
        response = requests.get(f"{BASE_URL}/api/hotels")
        assert response.status_code == 200, f"Expected 200, got {response.status_code}"
        
        data = response.json()
        assert data["success"] is True
        assert "hotels" in data
        assert isinstance(data["hotels"], list)
        print(f"✓ GET /api/hotels returned {len(data['hotels'])} hotels")
    
    def test_create_hotel(self):
        """POST /api/hotels - Create a new hotel"""
        test_hotel = {
            "name": f"TEST_Hotel_{uuid.uuid4().hex[:8]}",
            "city": "TEST_Dubai",
            "country": "TEST_UAE",
            "address": "123 Test Street",
            "description": "A test hotel for automated testing",
            "star_rating": 4,
            "rating_score": 8.5,
            "rating_text": "Excellent",
            "review_count": 100,
            "images": ["https://example.com/test.jpg"],
            "amenities": ["WiFi", "Pool", "Gym"],
            "detailed_ratings": {"cleanliness": 4.5, "service": 4.2},
            "what_to_know": [],
            "rooms": []
        }
        response = requests.post(f"{BASE_URL}/api/hotels", json=test_hotel)
        assert response.status_code == 200, f"Expected 200, got {response.status_code}: {response.text}"
        
        data = response.json()
        assert data["success"] is True
        assert "id" in data
        hotel_id = data["id"]
        print(f"✓ POST /api/hotels created hotel with id: {hotel_id}")
        
        TestHotelCRUD.created_hotel_id = hotel_id
        TestHotelCRUD.created_hotel_name = test_hotel["name"]
        return hotel_id
    
    def test_get_hotel_by_id(self):
        """GET /api/hotels/{hotel_id} - Get a specific hotel"""
        if not hasattr(TestHotelCRUD, 'created_hotel_id'):
            pytest.skip("No hotel created to get")
        
        response = requests.get(f"{BASE_URL}/api/hotels/{TestHotelCRUD.created_hotel_id}")
        assert response.status_code == 200, f"Expected 200, got {response.status_code}"
        
        data = response.json()
        assert data["success"] is True
        assert "hotel" in data
        assert data["hotel"]["id"] == TestHotelCRUD.created_hotel_id
        print(f"✓ GET /api/hotels/{TestHotelCRUD.created_hotel_id} returned hotel data")
    
    def test_update_hotel(self):
        """PUT /api/hotels/{hotel_id} - Update a hotel"""
        if not hasattr(TestHotelCRUD, 'created_hotel_id'):
            pytest.skip("No hotel created to update")
        
        update_data = {
            "name": f"UPDATED_Hotel_{uuid.uuid4().hex[:8]}",
            "city": "UPDATED_City",
            "country": "UPDATED_Country",
            "address": "456 Updated Street",
            "description": "Updated description",
            "star_rating": 5,
            "rating_score": 9.2,
            "rating_text": "Outstanding",
            "review_count": 200,
            "images": ["https://example.com/updated.jpg"],
            "amenities": ["WiFi", "Pool", "Spa"],
            "detailed_ratings": {"cleanliness": 4.8, "service": 4.9},
            "what_to_know": [],
            "rooms": []
        }
        response = requests.put(
            f"{BASE_URL}/api/hotels/{TestHotelCRUD.created_hotel_id}", 
            json=update_data
        )
        assert response.status_code == 200, f"Expected 200, got {response.status_code}: {response.text}"
        
        data = response.json()
        assert data["success"] is True
        print(f"✓ PUT /api/hotels/{TestHotelCRUD.created_hotel_id} updated successfully")
        
        # Verify update
        response = requests.get(f"{BASE_URL}/api/hotels/{TestHotelCRUD.created_hotel_id}")
        updated_hotel = response.json()["hotel"]
        assert updated_hotel["name"] == update_data["name"]
        assert updated_hotel["star_rating"] == update_data["star_rating"]
        print(f"✓ Hotel update verified: {updated_hotel['name']}, {updated_hotel['star_rating']} stars")
    
    def test_update_nonexistent_hotel(self):
        """PUT /api/hotels/{invalid_id} - Should return 404"""
        update_data = {
            "name": "Test", "city": "Test", "country": "Test",
            "address": "Test", "description": "Test", "star_rating": 3,
            "rating_score": 7.0, "rating_text": "Good", "review_count": 10,
            "images": [], "amenities": [], "detailed_ratings": {},
            "what_to_know": [], "rooms": []
        }
        response = requests.put(f"{BASE_URL}/api/hotels/nonexistent-id", json=update_data)
        assert response.status_code == 404, f"Expected 404, got {response.status_code}"
        print("✓ PUT nonexistent hotel returns 404")
    
    def test_delete_hotel(self):
        """DELETE /api/hotels/{hotel_id} - Delete a hotel"""
        if not hasattr(TestHotelCRUD, 'created_hotel_id'):
            pytest.skip("No hotel created to delete")
        
        response = requests.delete(f"{BASE_URL}/api/hotels/{TestHotelCRUD.created_hotel_id}")
        assert response.status_code == 200, f"Expected 200, got {response.status_code}"
        
        data = response.json()
        assert data["success"] is True
        print(f"✓ DELETE /api/hotels/{TestHotelCRUD.created_hotel_id} successful")
        
        # Verify deletion
        response = requests.get(f"{BASE_URL}/api/hotels/{TestHotelCRUD.created_hotel_id}")
        assert response.status_code == 404, "Hotel should return 404 after deletion"
        print(f"✓ Hotel deletion verified - returns 404")

# ============= AIRPORT CRUD TESTS =============

class TestAirportCRUD:
    """Test CRUD operations for Airports"""
    
    def test_get_airports(self):
        """GET /api/airports - List airports with pagination"""
        response = requests.get(f"{BASE_URL}/api/airports?page=1&limit=10")
        assert response.status_code == 200, f"Expected 200, got {response.status_code}"
        
        data = response.json()
        assert data["success"] is True
        assert "airports" in data
        assert "pagination" in data
        print(f"✓ GET /api/airports returned {len(data['airports'])} airports")
    
    def test_create_airport(self):
        """POST /api/airports - Create a new airport"""
        test_code = f"T{uuid.uuid4().hex[:2].upper()}"
        test_airport = {
            "name": f"TEST_Airport_{uuid.uuid4().hex[:8]}",
            "code": test_code,
            "city": "TEST_City",
            "country": "TEST_Country"
        }
        response = requests.post(f"{BASE_URL}/api/airports", json=test_airport)
        assert response.status_code == 200, f"Expected 200, got {response.status_code}: {response.text}"
        
        data = response.json()
        assert data["success"] is True
        assert "id" in data
        airport_id = data["id"]
        print(f"✓ POST /api/airports created airport with id: {airport_id}, code: {test_code}")
        
        TestAirportCRUD.created_airport_id = airport_id
        TestAirportCRUD.created_airport_code = test_code
        return airport_id
    
    def test_search_created_airport(self):
        """Verify the created airport can be found via search"""
        if not hasattr(TestAirportCRUD, 'created_airport_code'):
            pytest.skip("No airport created to search")
        
        response = requests.get(f"{BASE_URL}/api/airports?search={TestAirportCRUD.created_airport_code}")
        assert response.status_code == 200
        
        data = response.json()
        airport_found = any(a["code"] == TestAirportCRUD.created_airport_code for a in data["airports"])
        assert airport_found, f"Airport with code {TestAirportCRUD.created_airport_code} not found"
        print(f"✓ Airport {TestAirportCRUD.created_airport_code} found via search")
    
    def test_update_airport(self):
        """PUT /api/airports/{airport_id} - Update an airport"""
        if not hasattr(TestAirportCRUD, 'created_airport_id'):
            pytest.skip("No airport created to update")
        
        updated_code = f"U{uuid.uuid4().hex[:2].upper()}"
        update_data = {
            "name": f"UPDATED_Airport_{uuid.uuid4().hex[:8]}",
            "code": updated_code,
            "city": "UPDATED_City",
            "country": "UPDATED_Country"
        }
        response = requests.put(
            f"{BASE_URL}/api/airports/{TestAirportCRUD.created_airport_id}", 
            json=update_data
        )
        assert response.status_code == 200, f"Expected 200, got {response.status_code}: {response.text}"
        
        data = response.json()
        assert data["success"] is True
        print(f"✓ PUT /api/airports/{TestAirportCRUD.created_airport_id} updated successfully")
        
        # Verify update via search
        response = requests.get(f"{BASE_URL}/api/airports?search={updated_code}")
        airports = response.json()["airports"]
        updated_airport = next((a for a in airports if a["id"] == TestAirportCRUD.created_airport_id), None)
        assert updated_airport is not None, "Updated airport not found"
        assert updated_airport["code"] == updated_code
        print(f"✓ Airport update verified: code={updated_airport['code']}")
        
        TestAirportCRUD.created_airport_code = updated_code
    
    def test_update_nonexistent_airport(self):
        """PUT /api/airports/{invalid_id} - Should return 404"""
        update_data = {"name": "Test", "code": "TST", "city": "Test", "country": "Test"}
        response = requests.put(f"{BASE_URL}/api/airports/nonexistent-id", json=update_data)
        assert response.status_code == 404, f"Expected 404, got {response.status_code}"
        print("✓ PUT nonexistent airport returns 404")
    
    def test_delete_airport(self):
        """DELETE /api/airports/{airport_id} - Delete an airport"""
        if not hasattr(TestAirportCRUD, 'created_airport_id'):
            pytest.skip("No airport created to delete")
        
        response = requests.delete(f"{BASE_URL}/api/airports/{TestAirportCRUD.created_airport_id}")
        assert response.status_code == 200, f"Expected 200, got {response.status_code}"
        
        data = response.json()
        assert data["success"] is True
        print(f"✓ DELETE /api/airports/{TestAirportCRUD.created_airport_id} successful")
        
        # Verify deletion
        response = requests.get(f"{BASE_URL}/api/airports?search={TestAirportCRUD.created_airport_code}")
        airports = response.json()["airports"]
        airport_found = any(a["id"] == TestAirportCRUD.created_airport_id for a in airports)
        assert not airport_found, "Airport should not exist after deletion"
        print(f"✓ Airport deletion verified")

# ============= PROPOSAL CRUD TESTS =============

class TestProposalCRUD:
    """Test CRUD operations for Proposals"""
    
    def test_get_proposals(self):
        """GET /api/proposals - List all proposals"""
        response = requests.get(f"{BASE_URL}/api/proposals")
        assert response.status_code == 200, f"Expected 200, got {response.status_code}"
        
        data = response.json()
        assert isinstance(data, list)
        print(f"✓ GET /api/proposals returned {len(data)} proposals")
    
    def test_create_proposal(self):
        """POST /api/proposals - Create a new proposal"""
        test_proposal = {
            "leaving_from": f"TEST_Origin_{uuid.uuid4().hex[:8]}",
            "nationality": "TEST_Nationality",
            "leaving_on": "2026-06-15",
            "star_rating": "4",
            "add_transfers": True,
            "room_data": [{"adults": 2, "children": []}],
            "cities": [{"name": "TEST_Dubai", "nights": 3}]
        }
        response = requests.post(f"{BASE_URL}/api/proposals", json=test_proposal)
        assert response.status_code == 200, f"Expected 200, got {response.status_code}: {response.text}"
        
        data = response.json()
        assert "id" in data
        assert data["leaving_from"] == test_proposal["leaving_from"]
        assert data["status"] == "pending"
        proposal_id = data["id"]
        print(f"✓ POST /api/proposals created proposal with id: {proposal_id}")
        
        TestProposalCRUD.created_proposal_id = proposal_id
        return proposal_id
    
    def test_get_proposal_by_id(self):
        """GET /api/proposals/{proposal_id} - Get a specific proposal"""
        if not hasattr(TestProposalCRUD, 'created_proposal_id'):
            pytest.skip("No proposal created to get")
        
        response = requests.get(f"{BASE_URL}/api/proposals/{TestProposalCRUD.created_proposal_id}")
        assert response.status_code == 200, f"Expected 200, got {response.status_code}"
        
        data = response.json()
        assert data["id"] == TestProposalCRUD.created_proposal_id
        print(f"✓ GET /api/proposals/{TestProposalCRUD.created_proposal_id} returned proposal")
    
    def test_update_proposal(self):
        """PUT /api/proposals/{proposal_id} - Update a proposal"""
        if not hasattr(TestProposalCRUD, 'created_proposal_id'):
            pytest.skip("No proposal created to update")
        
        update_data = {
            "leaving_from": f"UPDATED_Origin_{uuid.uuid4().hex[:8]}",
            "nationality": "UPDATED_Nationality",
            "leaving_on": "2026-07-20",
            "star_rating": "5",
            "add_transfers": False,
            "room_data": [{"adults": 3, "children": []}],
            "cities": [{"name": "UPDATED_Paris", "nights": 5}]
        }
        response = requests.put(
            f"{BASE_URL}/api/proposals/{TestProposalCRUD.created_proposal_id}", 
            json=update_data
        )
        assert response.status_code == 200, f"Expected 200, got {response.status_code}: {response.text}"
        
        data = response.json()
        assert data["success"] is True
        print(f"✓ PUT /api/proposals/{TestProposalCRUD.created_proposal_id} updated successfully")
        
        # Verify update
        response = requests.get(f"{BASE_URL}/api/proposals/{TestProposalCRUD.created_proposal_id}")
        updated_proposal = response.json()
        assert updated_proposal["leaving_from"] == update_data["leaving_from"]
        assert updated_proposal["star_rating"] == update_data["star_rating"]
        print(f"✓ Proposal update verified: {updated_proposal['leaving_from']}")
    
    def test_update_proposal_status(self):
        """PUT /api/proposals/{proposal_id}/status - Update proposal status"""
        if not hasattr(TestProposalCRUD, 'created_proposal_id'):
            pytest.skip("No proposal created to update status")
        
        response = requests.put(
            f"{BASE_URL}/api/proposals/{TestProposalCRUD.created_proposal_id}/status?status=confirmed"
        )
        assert response.status_code == 200, f"Expected 200, got {response.status_code}: {response.text}"
        
        data = response.json()
        assert data["success"] is True
        print(f"✓ Proposal status updated to 'confirmed'")
        
        # Verify status change
        response = requests.get(f"{BASE_URL}/api/proposals/{TestProposalCRUD.created_proposal_id}")
        proposal = response.json()
        assert proposal["status"] == "confirmed"
        print(f"✓ Proposal status verified: {proposal['status']}")
    
    def test_update_nonexistent_proposal(self):
        """PUT /api/proposals/{invalid_id} - Should return 404"""
        update_data = {
            "leaving_from": "Test", "nationality": "Test", "leaving_on": "2026-01-01",
            "star_rating": "3", "add_transfers": True,
            "room_data": [{"adults": 2, "children": []}],
            "cities": [{"name": "Test", "nights": 2}]
        }
        response = requests.put(f"{BASE_URL}/api/proposals/nonexistent-id", json=update_data)
        assert response.status_code == 404, f"Expected 404, got {response.status_code}"
        print("✓ PUT nonexistent proposal returns 404")
    
    def test_delete_proposal(self, auth_headers):
        """DELETE /api/proposals/{proposal_id} - Delete a proposal (requires auth)"""
        if not hasattr(TestProposalCRUD, 'created_proposal_id'):
            pytest.skip("No proposal created to delete")
        
        response = requests.delete(
            f"{BASE_URL}/api/proposals/{TestProposalCRUD.created_proposal_id}",
            headers=auth_headers
        )
        assert response.status_code == 200, f"Expected 200, got {response.status_code}"
        
        data = response.json()
        assert data["success"] is True
        print(f"✓ DELETE /api/proposals/{TestProposalCRUD.created_proposal_id} successful")
        
        # Verify deletion
        response = requests.get(f"{BASE_URL}/api/proposals/{TestProposalCRUD.created_proposal_id}")
        assert response.status_code == 404, "Proposal should return 404 after deletion"
        print(f"✓ Proposal deletion verified - returns 404")

# ============= INTEGRATION TESTS =============

class TestAdminDashboardIntegration:
    """Test admin dashboard data retrieval for CRUD operations"""
    
    def test_admin_stats(self):
        """GET /api/admin/stats - Admin dashboard statistics"""
        response = requests.get(f"{BASE_URL}/api/admin/stats")
        assert response.status_code == 200
        
        data = response.json()
        assert data["success"] is True
        assert "stats" in data
        assert "total_users" in data["stats"]
        assert "total_proposals" in data["stats"]
        print(f"✓ Admin stats: users={data['stats']['total_users']}, proposals={data['stats']['total_proposals']}")
    
    def test_all_endpoints_return_data(self):
        """Verify all entity endpoints return data properly"""
        endpoints = [
            ("/api/cities", "cities"),
            ("/api/hotels", "hotels"),
            ("/api/airports", "airports"),
            ("/api/proposals", None),  # Returns array directly
        ]
        
        for endpoint, key in endpoints:
            response = requests.get(f"{BASE_URL}{endpoint}")
            assert response.status_code == 200, f"{endpoint} returned {response.status_code}"
            
            data = response.json()
            if key:
                assert key in data, f"{endpoint} missing '{key}' field"
            else:
                assert isinstance(data, list), f"{endpoint} should return list"
            print(f"✓ {endpoint} returns data correctly")


# Run tests if executed directly
if __name__ == "__main__":
    pytest.main([__file__, "-v", "--tb=short"])
