"""
Test ProposalView data hydration - verifies that saved hotels, activities, and transfers
are correctly returned by the API and keyed properly for frontend display.

Bug fix verification: Hotels were saved as 'CityName_cityIndex' (e.g., 'Tbilisi_0') 
but ProposalView looked up by plain city name. Activities were only looked up using 
mainCity instead of computing which city each day belongs to.
"""
import pytest
import requests
import os

BASE_URL = os.environ.get('REACT_APP_BACKEND_URL', '').rstrip('/')

class TestProposalViewHydration:
    """Test proposal data hydration for ProposalView display"""
    
    # Test proposal ID with saved hotels, activities, and transfers
    TEST_PROPOSAL_ID = "bf0328bb-2c14-4cc6-9937-3f7dc0918750"
    
    def test_get_proposal_returns_200(self):
        """Test that GET /api/proposals/{id} returns 200"""
        response = requests.get(f"{BASE_URL}/api/proposals/{self.TEST_PROPOSAL_ID}")
        assert response.status_code == 200, f"Expected 200, got {response.status_code}"
        print("PASSED: GET /api/proposals/{id} returns 200")
    
    def test_proposal_has_selected_hotels(self):
        """Test that proposal contains selected_hotels data"""
        response = requests.get(f"{BASE_URL}/api/proposals/{self.TEST_PROPOSAL_ID}")
        assert response.status_code == 200
        
        data = response.json()
        assert "selected_hotels" in data, "selected_hotels field missing"
        assert data["selected_hotels"] is not None, "selected_hotels is null"
        assert len(data["selected_hotels"]) > 0, "selected_hotels is empty"
        print(f"PASSED: Proposal has selected_hotels: {list(data['selected_hotels'].keys())}")
    
    def test_hotel_key_format_cityname_index(self):
        """Test that hotels are keyed as 'CityName_cityIndex' format"""
        response = requests.get(f"{BASE_URL}/api/proposals/{self.TEST_PROPOSAL_ID}")
        data = response.json()
        
        selected_hotels = data.get("selected_hotels", {})
        # Check for Tbilisi_0 key format
        assert "Tbilisi_0" in selected_hotels, f"Expected 'Tbilisi_0' key, got keys: {list(selected_hotels.keys())}"
        print("PASSED: Hotel keyed as 'Tbilisi_0' (CityName_cityIndex format)")
    
    def test_hotel_has_required_fields(self):
        """Test that hotel data contains required fields for display"""
        response = requests.get(f"{BASE_URL}/api/proposals/{self.TEST_PROPOSAL_ID}")
        data = response.json()
        
        hotel = data.get("selected_hotels", {}).get("Tbilisi_0", {})
        assert hotel, "Hotel data for Tbilisi_0 is empty"
        
        # Check required fields
        assert "name" in hotel, "Hotel missing 'name' field"
        assert hotel["name"], "Hotel name is empty"
        print(f"PASSED: Hotel has name: {hotel['name']}")
        
        # Check for selectedRoom
        assert "selectedRoom" in hotel, "Hotel missing 'selectedRoom' field"
        assert hotel["selectedRoom"], "selectedRoom is empty"
        print(f"PASSED: Hotel has selectedRoom: {hotel['selectedRoom'].get('name', 'N/A')}")
    
    def test_proposal_has_selected_activities(self):
        """Test that proposal contains selected_activities data"""
        response = requests.get(f"{BASE_URL}/api/proposals/{self.TEST_PROPOSAL_ID}")
        data = response.json()
        
        assert "selected_activities" in data, "selected_activities field missing"
        assert data["selected_activities"] is not None, "selected_activities is null"
        assert len(data["selected_activities"]) > 0, "selected_activities is empty"
        print(f"PASSED: Proposal has selected_activities: {list(data['selected_activities'].keys())}")
    
    def test_activity_key_format_cityname_day(self):
        """Test that activities are keyed as 'CityName_dayNumber' format"""
        response = requests.get(f"{BASE_URL}/api/proposals/{self.TEST_PROPOSAL_ID}")
        data = response.json()
        
        selected_activities = data.get("selected_activities", {})
        # Check for Tbilisi_1 key format (activities on day 1)
        assert "Tbilisi_1" in selected_activities, f"Expected 'Tbilisi_1' key, got keys: {list(selected_activities.keys())}"
        print("PASSED: Activity keyed as 'Tbilisi_1' (CityName_dayNumber format)")
    
    def test_activity_has_required_fields(self):
        """Test that activity data contains required fields for display"""
        response = requests.get(f"{BASE_URL}/api/proposals/{self.TEST_PROPOSAL_ID}")
        data = response.json()
        
        activities = data.get("selected_activities", {}).get("Tbilisi_1", [])
        assert len(activities) > 0, "No activities found for Tbilisi_1"
        
        activity = activities[0]
        assert "name" in activity, "Activity missing 'name' field"
        assert activity["name"], "Activity name is empty"
        print(f"PASSED: Activity has name: {activity['name']}")
    
    def test_proposal_has_arrival_transfer(self):
        """Test that proposal contains arrival_transfer data"""
        response = requests.get(f"{BASE_URL}/api/proposals/{self.TEST_PROPOSAL_ID}")
        data = response.json()
        
        assert "arrival_transfer" in data, "arrival_transfer field missing"
        assert data["arrival_transfer"] is not None, "arrival_transfer is null"
        
        arrival = data["arrival_transfer"]
        assert "title" in arrival, "arrival_transfer missing 'title' field"
        assert "selectedVehicle" in arrival, "arrival_transfer missing 'selectedVehicle' field"
        print(f"PASSED: Arrival transfer: {arrival.get('title')} - {arrival.get('selectedVehicle')}")
    
    def test_proposal_has_departure_transfer(self):
        """Test that proposal contains departure_transfer data"""
        response = requests.get(f"{BASE_URL}/api/proposals/{self.TEST_PROPOSAL_ID}")
        data = response.json()
        
        assert "departure_transfer" in data, "departure_transfer field missing"
        assert data["departure_transfer"] is not None, "departure_transfer is null"
        
        departure = data["departure_transfer"]
        assert "title" in departure, "departure_transfer missing 'title' field"
        assert "selectedVehicle" in departure, "departure_transfer missing 'selectedVehicle' field"
        print(f"PASSED: Departure transfer: {departure.get('title')} - {departure.get('selectedVehicle')}")
    
    def test_proposal_has_cities(self):
        """Test that proposal contains cities data for multi-city support"""
        response = requests.get(f"{BASE_URL}/api/proposals/{self.TEST_PROPOSAL_ID}")
        data = response.json()
        
        assert "cities" in data, "cities field missing"
        assert data["cities"] is not None, "cities is null"
        assert len(data["cities"]) > 0, "cities is empty"
        
        city = data["cities"][0]
        assert "name" in city, "City missing 'name' field"
        assert "nights" in city, "City missing 'nights' field"
        print(f"PASSED: Cities: {[(c['name'], c['nights']) for c in data['cities']]}")
    
    def test_proposal_has_inter_city_transfers(self):
        """Test that proposal contains inter_city_transfers data"""
        response = requests.get(f"{BASE_URL}/api/proposals/{self.TEST_PROPOSAL_ID}")
        data = response.json()
        
        # inter_city_transfers may be empty for single-city trips
        assert "inter_city_transfers" in data, "inter_city_transfers field missing"
        print(f"PASSED: Inter-city transfers present: {data.get('inter_city_transfers')}")


class TestProposalNotFound:
    """Test error handling for non-existent proposals"""
    
    def test_get_nonexistent_proposal_returns_404(self):
        """Test that GET /api/proposals/{invalid_id} returns 404"""
        response = requests.get(f"{BASE_URL}/api/proposals/nonexistent-id-12345")
        assert response.status_code == 404, f"Expected 404, got {response.status_code}"
        print("PASSED: Non-existent proposal returns 404")


if __name__ == "__main__":
    pytest.main([__file__, "-v"])
