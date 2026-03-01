"""
Test suite for Airport Management features in Travo DMC B2B Travel Platform
Tests: Airport seeding (452 airports), pagination, search, CRUD operations
"""
import pytest
import requests
import os

BASE_URL = os.environ.get('REACT_APP_BACKEND_URL', '').rstrip('/')

class TestAirportSeeding:
    """Verify airport data seeding - 452 airports expected"""
    
    def test_airport_count_is_452(self):
        """Verify that 452 airports are seeded in the database"""
        response = requests.get(f"{BASE_URL}/api/airports?page=1&limit=1")
        assert response.status_code == 200, f"Expected 200, got {response.status_code}"
        
        data = response.json()
        assert "pagination" in data, "Response should include pagination info"
        assert data["pagination"]["total"] == 452, f"Expected 452 airports, got {data['pagination']['total']}"
        print(f"✓ Airport count verified: {data['pagination']['total']} airports")

class TestAirportPagination:
    """Test airport pagination functionality"""
    
    def test_default_pagination(self):
        """Test default pagination (page=1, limit=50)"""
        response = requests.get(f"{BASE_URL}/api/airports")
        assert response.status_code == 200
        
        data = response.json()
        assert data["success"] is True
        assert "airports" in data
        assert "pagination" in data
        assert len(data["airports"]) == 50, f"Expected 50 airports, got {len(data['airports'])}"
        assert data["pagination"]["page"] == 1
        assert data["pagination"]["limit"] == 50
        print(f"✓ Default pagination works: {len(data['airports'])} airports on page 1")
    
    def test_pagination_page_2(self):
        """Test fetching page 2"""
        response = requests.get(f"{BASE_URL}/api/airports?page=2&limit=50")
        assert response.status_code == 200
        
        data = response.json()
        assert data["pagination"]["page"] == 2
        assert len(data["airports"]) == 50
        print(f"✓ Page 2 works: {len(data['airports'])} airports")
    
    def test_pagination_last_page(self):
        """Test fetching the last page (with 452 airports and limit=50, last page should have 2 items)"""
        response = requests.get(f"{BASE_URL}/api/airports?page=10&limit=50")
        assert response.status_code == 200
        
        data = response.json()
        assert data["pagination"]["page"] == 10
        # 452 airports / 50 per page = 9 full pages + 2 on page 10
        expected_count = 452 - (9 * 50)  # 2 airports
        assert len(data["airports"]) == expected_count, f"Expected {expected_count} airports on last page, got {len(data['airports'])}"
        print(f"✓ Last page (10) has {len(data['airports'])} airports as expected")
    
    def test_pagination_total_pages(self):
        """Verify total pages calculation (452/50 = 10 pages)"""
        response = requests.get(f"{BASE_URL}/api/airports?page=1&limit=50")
        assert response.status_code == 200
        
        data = response.json()
        expected_pages = (452 + 49) // 50  # Ceiling division = 10
        assert data["pagination"]["pages"] == expected_pages, f"Expected {expected_pages} pages, got {data['pagination']['pages']}"
        print(f"✓ Total pages: {data['pagination']['pages']}")
    
    def test_custom_limit(self):
        """Test with custom limit"""
        response = requests.get(f"{BASE_URL}/api/airports?page=1&limit=25")
        assert response.status_code == 200
        
        data = response.json()
        assert len(data["airports"]) == 25
        assert data["pagination"]["limit"] == 25
        print(f"✓ Custom limit (25) works")

class TestAirportSearch:
    """Test airport search functionality"""
    
    def test_search_by_city_dubai(self):
        """Search airports by city: Dubai"""
        response = requests.get(f"{BASE_URL}/api/airports?search=dubai")
        assert response.status_code == 200
        
        data = response.json()
        assert data["success"] is True
        assert len(data["airports"]) > 0, "Should find Dubai airports"
        
        # Verify all results contain 'dubai' in city, name, or country
        for airport in data["airports"]:
            match_found = (
                "dubai" in airport["city"].lower() or 
                "dubai" in airport["name"].lower() or
                "dubai" in airport.get("country", "").lower()
            )
            assert match_found, f"Airport {airport['code']} doesn't match 'dubai' search"
        print(f"✓ Search 'dubai' found {len(data['airports'])} airports")
    
    def test_search_by_code_dxb(self):
        """Search airports by code: DXB"""
        response = requests.get(f"{BASE_URL}/api/airports?search=DXB")
        assert response.status_code == 200
        
        data = response.json()
        assert len(data["airports"]) >= 1, "Should find DXB airport"
        
        # Find the exact DXB airport
        dxb_found = any(a["code"] == "DXB" for a in data["airports"])
        assert dxb_found, "DXB airport should be in results"
        print(f"✓ Search 'DXB' found airport")
    
    def test_search_by_country(self):
        """Search airports by country: Japan"""
        response = requests.get(f"{BASE_URL}/api/airports?search=japan")
        assert response.status_code == 200
        
        data = response.json()
        assert len(data["airports"]) > 0, "Should find Japanese airports"
        
        # Verify all results are from Japan
        for airport in data["airports"]:
            assert airport["country"] == "Japan", f"Airport {airport['code']} country is {airport['country']}, expected Japan"
        print(f"✓ Search 'japan' found {len(data['airports'])} airports")
    
    def test_search_case_insensitive(self):
        """Verify search is case-insensitive"""
        response_lower = requests.get(f"{BASE_URL}/api/airports?search=london")
        response_upper = requests.get(f"{BASE_URL}/api/airports?search=LONDON")
        
        assert response_lower.status_code == 200
        assert response_upper.status_code == 200
        
        data_lower = response_lower.json()
        data_upper = response_upper.json()
        
        assert data_lower["pagination"]["total"] == data_upper["pagination"]["total"], "Case-insensitive search should return same results"
        print(f"✓ Search is case-insensitive")
    
    def test_search_no_results(self):
        """Search with non-existent term"""
        response = requests.get(f"{BASE_URL}/api/airports?search=xyznonexistent123")
        assert response.status_code == 200
        
        data = response.json()
        assert data["success"] is True
        assert len(data["airports"]) == 0, "Should return no results"
        assert data["pagination"]["total"] == 0
        print(f"✓ Empty search returns 0 results correctly")
    
    def test_search_with_pagination(self):
        """Search combined with pagination"""
        response = requests.get(f"{BASE_URL}/api/airports?search=united&page=1&limit=10")
        assert response.status_code == 200
        
        data = response.json()
        assert len(data["airports"]) <= 10, "Should respect limit"
        print(f"✓ Search with pagination works: {len(data['airports'])} results")

class TestTrailingSlash:
    """Test that APIs work without trailing slashes (FastAPI redirect_slashes=False)"""
    
    def test_airports_no_trailing_slash(self):
        """GET /api/airports should work without trailing slash"""
        response = requests.get(f"{BASE_URL}/api/airports")
        assert response.status_code == 200, f"Expected 200, got {response.status_code}"
        print("✓ /api/airports works without trailing slash")
    
    def test_health_no_trailing_slash(self):
        """GET /api/health should work without trailing slash"""
        response = requests.get(f"{BASE_URL}/api/health")
        assert response.status_code == 200
        print("✓ /api/health works without trailing slash")
    
    def test_cities_no_trailing_slash(self):
        """GET /api/cities should work without trailing slash"""
        response = requests.get(f"{BASE_URL}/api/cities")
        assert response.status_code == 200
        print("✓ /api/cities works without trailing slash")
    
    def test_hotels_no_trailing_slash(self):
        """GET /api/hotels should work without trailing slash"""
        response = requests.get(f"{BASE_URL}/api/hotels")
        assert response.status_code == 200
        print("✓ /api/hotels works without trailing slash")
    
    def test_proposals_no_trailing_slash(self):
        """GET /api/proposals should work without trailing slash"""
        response = requests.get(f"{BASE_URL}/api/proposals")
        assert response.status_code == 200
        print("✓ /api/proposals works without trailing slash")

class TestAuthLogin:
    """Test user authentication flow"""
    
    def test_login_success(self):
        """Test login with valid credentials"""
        response = requests.post(f"{BASE_URL}/api/auth/login", json={
            "email": "testuser@demo.com",
            "password": "Test123!"
        })
        assert response.status_code == 200, f"Expected 200, got {response.status_code}: {response.text}"
        
        data = response.json()
        assert "access_token" in data, "Response should include access_token"
        assert "user" in data, "Response should include user info"
        assert data["user"]["email"] == "testuser@demo.com"
        print(f"✓ Login successful for {data['user']['email']}")
    
    def test_login_invalid_credentials(self):
        """Test login with invalid credentials"""
        response = requests.post(f"{BASE_URL}/api/auth/login", json={
            "email": "invalid@example.com",
            "password": "wrongpassword"
        })
        assert response.status_code == 401, f"Expected 401, got {response.status_code}"
        print("✓ Invalid login correctly returns 401")

class TestAdminStats:
    """Test admin dashboard statistics"""
    
    def test_admin_stats_endpoint(self):
        """Test /api/admin/stats returns correct data"""
        response = requests.get(f"{BASE_URL}/api/admin/stats")
        assert response.status_code == 200
        
        data = response.json()
        assert data["success"] is True
        assert "stats" in data
        assert "total_users" in data["stats"]
        assert "total_proposals" in data["stats"]
        print(f"✓ Admin stats: {data['stats']['total_users']} users, {data['stats']['total_proposals']} proposals")


# Run tests if executed directly
if __name__ == "__main__":
    pytest.main([__file__, "-v", "--tb=short"])
