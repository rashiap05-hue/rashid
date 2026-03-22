"""
Test Inter-City Transfer Feature
Tests the /api/transfers/inter-city/search endpoint for multi-city trips
"""
import pytest
import requests
import os

BASE_URL = os.environ.get('REACT_APP_BACKEND_URL', 'https://proposal-hub-46.preview.emergentagent.com')


class TestInterCityTransferSearch:
    """Tests for inter-city transfer search endpoint"""
    
    def test_search_tbilisi_to_gudauri_returns_transfers(self):
        """Test that searching Tbilisi to Gudauri returns transfer results"""
        response = requests.get(
            f"{BASE_URL}/api/transfers/inter-city/search",
            params={"from_city": "Tbilisi", "to_city": "Gudauri"}
        )
        
        assert response.status_code == 200
        data = response.json()
        
        # Verify response structure
        assert "success" in data
        assert data["success"] == True
        assert "transfers" in data
        assert "from_city" in data
        assert "to_city" in data
        
        # Verify from/to cities are returned
        assert data["from_city"] == "Tbilisi"
        assert data["to_city"] == "Gudauri"
        
        # Verify at least one transfer is returned
        assert len(data["transfers"]) > 0
        
        # Verify transfer structure
        transfer = data["transfers"][0]
        assert "id" in transfer
        assert "title" in transfer
        assert "price" in transfer or "vehicle_pricing" in transfer
        
    def test_search_gudauri_to_tbilisi_returns_transfers(self):
        """Test that searching Gudauri to Tbilisi returns transfer results"""
        response = requests.get(
            f"{BASE_URL}/api/transfers/inter-city/search",
            params={"from_city": "Gudauri", "to_city": "Tbilisi"}
        )
        
        assert response.status_code == 200
        data = response.json()
        
        assert data["success"] == True
        assert "transfers" in data
        assert data["from_city"] == "Gudauri"
        assert data["to_city"] == "Tbilisi"
        
    def test_transfer_has_vehicle_pricing(self):
        """Test that transfers have vehicle pricing options"""
        response = requests.get(
            f"{BASE_URL}/api/transfers/inter-city/search",
            params={"from_city": "Tbilisi", "to_city": "Gudauri"}
        )
        
        assert response.status_code == 200
        data = response.json()
        
        # Find a transfer with vehicle pricing
        transfers_with_pricing = [t for t in data["transfers"] if t.get("vehicle_pricing")]
        
        if transfers_with_pricing:
            transfer = transfers_with_pricing[0]
            vehicle_pricing = transfer["vehicle_pricing"]
            
            # Verify vehicle pricing structure
            assert isinstance(vehicle_pricing, dict)
            
            # Check for common vehicle types
            expected_vehicles = ["sedan_4", "car_7", "van_8", "van_17", "bus_29", "bus_45", "bus_55"]
            for vehicle in expected_vehicles:
                if vehicle in vehicle_pricing:
                    assert "selling_price" in vehicle_pricing[vehicle]
                    assert vehicle_pricing[vehicle]["selling_price"] > 0
                    
    def test_transfer_has_required_fields(self):
        """Test that transfers have all required fields"""
        response = requests.get(
            f"{BASE_URL}/api/transfers/inter-city/search",
            params={"from_city": "Tbilisi", "to_city": "Gudauri"}
        )
        
        assert response.status_code == 200
        data = response.json()
        
        if data["transfers"]:
            transfer = data["transfers"][0]
            
            # Required fields
            assert "id" in transfer
            assert "title" in transfer
            
            # Optional but expected fields
            expected_fields = ["from_location", "to_location", "duration", "transfer_type", "city"]
            for field in expected_fields:
                if field in transfer:
                    assert transfer[field] is not None or transfer[field] == ""
                    
    def test_search_nonexistent_cities_returns_empty_or_fallback(self):
        """Test that searching non-existent cities returns empty or fallback results"""
        response = requests.get(
            f"{BASE_URL}/api/transfers/inter-city/search",
            params={"from_city": "NonExistentCity123", "to_city": "AnotherFakeCity456"}
        )
        
        assert response.status_code == 200
        data = response.json()
        
        # Should still return success with empty or fallback transfers
        assert data["success"] == True
        assert "transfers" in data
        # transfers can be empty or contain fallback results
        assert isinstance(data["transfers"], list)


class TestTransfersEndpoint:
    """Tests for general transfers endpoint"""
    
    def test_get_transfers_by_city(self):
        """Test getting transfers filtered by city"""
        response = requests.get(
            f"{BASE_URL}/api/transfers",
            params={"city": "Tbilisi"}
        )
        
        assert response.status_code == 200
        data = response.json()
        
        assert data["success"] == True
        assert "transfers" in data
        
    def test_get_all_transfers(self):
        """Test getting all transfers"""
        response = requests.get(f"{BASE_URL}/api/transfers")
        
        assert response.status_code == 200
        data = response.json()
        
        assert data["success"] == True
        assert "transfers" in data
        assert isinstance(data["transfers"], list)


class TestAuthEndpoint:
    """Tests for authentication endpoint"""
    
    def test_login_success(self):
        """Test successful login"""
        response = requests.post(
            f"{BASE_URL}/api/auth/login",
            json={
                "email": "testadmin@example.com",
                "password": "password123"
            }
        )
        
        assert response.status_code == 200
        data = response.json()
        
        assert "access_token" in data
        assert "user" in data
        assert data["user"]["email"] == "testadmin@example.com"
        
    def test_login_invalid_credentials(self):
        """Test login with invalid credentials"""
        response = requests.post(
            f"{BASE_URL}/api/auth/login",
            json={
                "email": "invalid@example.com",
                "password": "wrongpassword"
            }
        )
        
        assert response.status_code == 401


if __name__ == "__main__":
    pytest.main([__file__, "-v"])
