"""
Test Transfer Selection Feature - Testing API filtering and transfer endpoints
"""
import pytest
import requests
import os

BASE_URL = os.environ.get('REACT_APP_BACKEND_URL', '').rstrip('/')

class TestTransferFiltering:
    """Test transfers API filtering by city"""
    
    def test_get_all_transfers(self):
        """Test getting all transfers returns multiple cities"""
        response = requests.get(f"{BASE_URL}/api/transfers")
        assert response.status_code == 200
        
        data = response.json()
        assert data["success"] == True
        assert "transfers" in data
        assert len(data["transfers"]) > 0
        
        # Verify we have transfers from multiple cities
        cities = set(t.get("city", "") for t in data["transfers"])
        print(f"Cities with transfers: {cities}")
        assert len(cities) >= 2, "Expected transfers from at least 2 cities"
    
    def test_filter_transfers_by_dubai(self):
        """Test filtering transfers by Dubai city"""
        response = requests.get(f"{BASE_URL}/api/transfers?city=Dubai")
        assert response.status_code == 200
        
        data = response.json()
        assert data["success"] == True
        assert "transfers" in data
        assert len(data["transfers"]) > 0
        
        # All transfers should be from Dubai
        for transfer in data["transfers"]:
            assert transfer["city"].lower() == "dubai", f"Expected Dubai, got {transfer['city']}"
        
        print(f"Dubai transfers count: {len(data['transfers'])}")
        
    def test_filter_transfers_by_tbilisi(self):
        """Test filtering transfers by Tbilisi city"""
        response = requests.get(f"{BASE_URL}/api/transfers?city=Tbilisi")
        assert response.status_code == 200
        
        data = response.json()
        assert data["success"] == True
        
        # Tbilisi transfers should be returned
        if len(data["transfers"]) > 0:
            for transfer in data["transfers"]:
                assert "tbilisi" in transfer["city"].lower(), f"Expected Tbilisi, got {transfer['city']}"
        print(f"Tbilisi transfers count: {len(data['transfers'])}")
    
    def test_filter_transfers_by_nonexistent_city(self):
        """Test filtering by non-existent city returns empty list"""
        response = requests.get(f"{BASE_URL}/api/transfers?city=NonExistentCity123")
        assert response.status_code == 200
        
        data = response.json()
        assert data["success"] == True
        assert len(data["transfers"]) == 0


class TestTransferDetails:
    """Test transfer detail structure"""
    
    def test_transfer_has_required_fields(self):
        """Test that transfers have all required fields for Trip Builder"""
        response = requests.get(f"{BASE_URL}/api/transfers?city=Dubai")
        assert response.status_code == 200
        
        data = response.json()
        assert len(data["transfers"]) > 0
        
        transfer = data["transfers"][0]
        
        # Check required fields for Trip Builder UI
        required_fields = [
            "id", "title", "from_location", "to_location", 
            "price", "duration", "transfer_type", "city", "vehicle_type"
        ]
        
        for field in required_fields:
            assert field in transfer, f"Missing required field: {field}"
            assert transfer[field] is not None, f"Field {field} is None"
        
        # Check price is numeric
        assert isinstance(transfer["price"], (int, float)), "Price should be numeric"
        
        print(f"Transfer structure validated: {transfer['title']}")
    
    def test_dubai_transfer_types(self):
        """Test Dubai has different transfer types"""
        response = requests.get(f"{BASE_URL}/api/transfers?city=Dubai")
        assert response.status_code == 200
        
        data = response.json()
        transfers = data["transfers"]
        
        # Get unique transfer types
        transfer_types = set(t.get("transfer_type") for t in transfers)
        print(f"Dubai transfer types: {transfer_types}")
        
        # Verify we have multiple types (Private, Shared, Luxury)
        assert len(transfer_types) >= 2, "Expected multiple transfer types"


class TestCityEndpoint:
    """Test cities endpoint for transfer integration"""
    
    def test_search_city_dubai(self):
        """Test searching for Dubai city"""
        response = requests.get(f"{BASE_URL}/api/cities?search=Dubai")
        assert response.status_code == 200
        
        data = response.json()
        assert data["success"] == True
        assert len(data["cities"]) > 0
        
        # Verify Dubai city is returned with country
        dubai = data["cities"][0]
        assert "name" in dubai
        assert "country" in dubai
        assert dubai["name"].lower() == "dubai"
        print(f"Dubai city data: {dubai}")


class TestTransferSearchEndpoint:
    """Test transfer search functionality"""
    
    def test_search_transfers_by_title(self):
        """Test searching transfers by title"""
        response = requests.get(f"{BASE_URL}/api/transfers?search=Airport")
        assert response.status_code == 200
        
        data = response.json()
        assert data["success"] == True
        
        # Should return transfers with 'Airport' in title
        for transfer in data["transfers"]:
            title = transfer.get("title", "").lower()
            from_loc = transfer.get("from_location", "").lower()
            to_loc = transfer.get("to_location", "").lower()
            has_airport = "airport" in title or "airport" in from_loc or "airport" in to_loc
            assert has_airport, f"Expected 'Airport' in transfer details"
        
        print(f"Search results count: {len(data['transfers'])}")
    
    def test_combined_city_and_search_filter(self):
        """Test combining city filter with search"""
        response = requests.get(f"{BASE_URL}/api/transfers?city=Dubai&search=Private")
        assert response.status_code == 200
        
        data = response.json()
        assert data["success"] == True
        
        # All results should be Dubai + contain 'Private'
        for transfer in data["transfers"]:
            assert transfer["city"].lower() == "dubai"
        
        print(f"Combined filter results: {len(data['transfers'])}")
