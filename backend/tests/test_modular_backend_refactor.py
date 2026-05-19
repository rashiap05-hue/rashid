"""
Test suite for verifying the modular backend refactoring (Phase 2).
Tests all endpoints after server.py was split from ~3370 lines into modular route files.
Also verifies the P0 bug fix for inter-city transfer search (excluding inter-hotel direction).
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

class TestRootAndHealth:
    """Test root and health endpoints"""
    
    def test_root_endpoint(self):
        """GET /api - returns API info"""
        response = requests.get(f"{BASE_URL}/api")
        assert response.status_code == 200
        data = response.json()
        assert "message" in data
        assert "Travo DMC" in data["message"]
        print(f"✓ Root endpoint: {data}")
    
    def test_health_check(self):
        """GET /api/health - returns healthy status"""
        response = requests.get(f"{BASE_URL}/api/health")
        assert response.status_code == 200
        data = response.json()
        assert data["status"] == "healthy"
        assert "timestamp" in data
        print(f"✓ Health check: {data}")

class TestAuthentication:
    """Test authentication endpoints from routes/auth.py"""
    
    def test_login_admin_success(self):
        """POST /api/auth/login - login with admin credentials"""
        response = requests.post(f"{BASE_URL}/api/auth/login", json={
            "email": TEST_ADMIN_EMAIL,
            "password": DEFAULT_PASSWORD
        })
        assert response.status_code == 200
        data = response.json()
        assert "access_token" in data
        assert "user" in data
        assert data["user"]["email"] == TEST_ADMIN_EMAIL
        print(f"✓ Admin login successful: {data['user']['email']}")
        return data["access_token"]
    
    def test_login_agent_success(self):
        """POST /api/auth/login - login with agent credentials"""
        response = requests.post(f"{BASE_URL}/api/auth/login", json={
            "email": TEST_AGENT_EMAIL,
            "password": DEFAULT_PASSWORD
        })
        assert response.status_code == 200
        data = response.json()
        assert "access_token" in data
        assert "user" in data
        assert data["user"]["email"] == TEST_AGENT_EMAIL
        print(f"✓ Agent login successful: {data['user']['email']}")
    
    def test_login_invalid_credentials(self):
        """POST /api/auth/login - invalid credentials returns 401"""
        response = requests.post(f"{BASE_URL}/api/auth/login", json={
            "email": "invalid@example.com",
            "password": "wrongpassword"
        })
        assert response.status_code == 401
        print("✓ Invalid credentials correctly rejected")

class TestHotels:
    """Test hotel endpoints from routes/hotels.py"""
    
    def test_get_hotels(self):
        """GET /api/hotels - returns list of hotels"""
        response = requests.get(f"{BASE_URL}/api/hotels")
        assert response.status_code == 200
        data = response.json()
        assert data["success"] == True
        assert "hotels" in data
        assert isinstance(data["hotels"], list)
        print(f"✓ Hotels endpoint: {len(data['hotels'])} hotels returned")
    
    def test_get_hotels_with_city_filter(self):
        """GET /api/hotels?city=Tbilisi - filter by city"""
        response = requests.get(f"{BASE_URL}/api/hotels?city=Tbilisi")
        assert response.status_code == 200
        data = response.json()
        assert data["success"] == True
        print(f"✓ Hotels filtered by city: {len(data['hotels'])} hotels")

class TestTransfers:
    """Test transfer endpoints from routes/transfers.py"""
    
    def test_get_transfers(self):
        """GET /api/transfers - returns list of transfers"""
        response = requests.get(f"{BASE_URL}/api/transfers")
        assert response.status_code == 200
        data = response.json()
        assert data["success"] == True
        assert "transfers" in data
        assert isinstance(data["transfers"], list)
        print(f"✓ Transfers endpoint: {len(data['transfers'])} transfers returned")
    
    def test_inter_city_search_excludes_inter_hotel(self):
        """
        GET /api/transfers/inter-city/search - P0 BUG FIX VERIFICATION
        Should NOT return any inter-hotel direction transfers.
        Should return arrival/departure transfers.
        """
        response = requests.get(
            f"{BASE_URL}/api/transfers/inter-city/search",
            params={"from_city": "Tbilisi", "to_city": "Gudauri"}
        )
        assert response.status_code == 200
        data = response.json()
        assert data["success"] == True
        assert "transfers" in data
        assert data["from_city"] == "Tbilisi"
        assert data["to_city"] == "Gudauri"
        
        # P0 BUG FIX: Verify NO inter-hotel transfers are returned
        for transfer in data["transfers"]:
            transfer_direction = transfer.get("transfer_direction", "")
            assert transfer_direction != "inter-hotel", \
                f"P0 BUG: Found inter-hotel transfer in results: {transfer.get('title', 'Unknown')}"
        
        print(f"✓ Inter-city search: {len(data['transfers'])} transfers (no inter-hotel)")
        print(f"  P0 Bug Fix Verified: No inter-hotel direction transfers returned")

class TestActivities:
    """Test activity endpoints from routes/activities.py"""
    
    def test_get_activities(self):
        """GET /api/activities - returns list of activities"""
        response = requests.get(f"{BASE_URL}/api/activities")
        assert response.status_code == 200
        data = response.json()
        assert data["success"] == True
        assert "activities" in data
        assert isinstance(data["activities"], list)
        print(f"✓ Activities endpoint: {len(data['activities'])} activities returned")

class TestCities:
    """Test city endpoints from routes/cities.py"""
    
    def test_get_cities(self):
        """GET /api/cities - returns list of cities"""
        response = requests.get(f"{BASE_URL}/api/cities")
        assert response.status_code == 200
        data = response.json()
        assert data["success"] == True
        assert "cities" in data
        assert isinstance(data["cities"], list)
        print(f"✓ Cities endpoint: {len(data['cities'])} cities returned")

class TestAirports:
    """Test airport endpoints from routes/airports.py"""
    
    def test_get_airports_paginated(self):
        """GET /api/airports?page=1&limit=10 - returns paginated airports"""
        response = requests.get(f"{BASE_URL}/api/airports", params={"page": 1, "limit": 10})
        assert response.status_code == 200
        data = response.json()
        assert data["success"] == True
        assert "airports" in data
        assert "pagination" in data
        assert data["pagination"]["page"] == 1
        assert data["pagination"]["limit"] == 10
        assert len(data["airports"]) <= 10
        print(f"✓ Airports paginated: {len(data['airports'])} airports, total: {data['pagination']['total']}")

class TestSettings:
    """Test settings endpoints from routes/settings.py"""
    
    def test_get_insurance_settings(self):
        """GET /api/settings/insurance - returns insurance prices"""
        response = requests.get(f"{BASE_URL}/api/settings/insurance")
        assert response.status_code == 200
        data = response.json()
        assert "insurance_prices" in data
        assert isinstance(data["insurance_prices"], list)
        print(f"✓ Insurance settings: {len(data['insurance_prices'])} entries")

class TestTermsPolicies:
    """Test terms and policies endpoints from routes/terms.py"""
    
    def test_get_all_terms_policies(self):
        """GET /api/terms-policies/all - returns all terms and policies"""
        response = requests.get(f"{BASE_URL}/api/terms-policies/all")
        assert response.status_code == 200
        data = response.json()
        assert isinstance(data, list)
        print(f"✓ Terms and policies: {len(data)} entries")

class TestProposals:
    """Test proposal endpoints from routes/proposals.py"""
    
    @pytest.fixture
    def auth_token(self):
        """Get auth token for authenticated requests"""
        response = requests.post(f"{BASE_URL}/api/auth/login", json={
            "email": TEST_ADMIN_EMAIL,
            "password": DEFAULT_PASSWORD
        })
        if response.status_code == 200:
            return response.json()["access_token"]
        pytest.skip("Authentication failed")
    
    def test_get_proposals(self, auth_token):
        """GET /api/proposals - get proposals list"""
        headers = {"Authorization": f"Bearer {auth_token}"}
        response = requests.get(f"{BASE_URL}/api/proposals", headers=headers)
        assert response.status_code == 200
        data = response.json()
        assert isinstance(data, list)
        print(f"✓ Proposals list: {len(data)} proposals")
    
    def test_create_proposal(self, auth_token):
        """POST /api/proposals - create a proposal"""
        headers = {"Authorization": f"Bearer {auth_token}"}
        proposal_data = {
            "leaving_from": "Dubai (DXB)",
            "leaving_from_code": "DXB",
            "nationality": "UAE",
            "leaving_on": "2026-04-01",
            "star_rating": "4",
            "add_transfers": True,
            "room_data": [{"adults": 2, "children": []}],
            "cities": [{"name": "Tbilisi", "nights": 3}],
            "status": "pending",
            "proposal_name": "TEST_Modular_Backend_Test_Proposal"
        }
        response = requests.post(f"{BASE_URL}/api/proposals", json=proposal_data, headers=headers)
        assert response.status_code == 200
        data = response.json()
        assert "id" in data
        assert data["leaving_from"] == "Dubai (DXB)"
        print(f"✓ Proposal created: {data['id']}")
        
        # Cleanup - delete the test proposal
        delete_response = requests.delete(f"{BASE_URL}/api/proposals/{data['id']}", headers=headers)
        assert delete_response.status_code == 200
        print(f"✓ Test proposal cleaned up")

class TestAdmin:
    """Test admin endpoints from routes/admin.py"""
    
    @pytest.fixture
    def auth_token(self):
        """Get auth token for authenticated requests"""
        response = requests.post(f"{BASE_URL}/api/auth/login", json={
            "email": TEST_ADMIN_EMAIL,
            "password": DEFAULT_PASSWORD
        })
        if response.status_code == 200:
            return response.json()["access_token"]
        pytest.skip("Authentication failed")
    
    def test_get_admin_stats(self, auth_token):
        """GET /api/admin/stats - get admin dashboard stats"""
        headers = {"Authorization": f"Bearer {auth_token}"}
        response = requests.get(f"{BASE_URL}/api/admin/stats", headers=headers)
        assert response.status_code == 200
        data = response.json()
        assert data["success"] == True
        assert "stats" in data
        stats = data["stats"]
        assert "total_users" in stats
        assert "total_proposals" in stats
        assert "total_revenue" in stats
        print(f"✓ Admin stats: {stats['total_users']} users, {stats['total_proposals']} proposals")

if __name__ == "__main__":
    pytest.main([__file__, "-v", "--tb=short"])
