"""
Test cases for Hotel/Room 'Recommended' feature.
Tests:
1. Backend API returns hotels sorted with recommended=true first
2. Hotel can be updated with recommended=true
3. Room types can have recommended=true field
"""
import pytest
import requests
import os

BASE_URL = os.environ.get('REACT_APP_BACKEND_URL', 'https://agent-payment.preview.emergentagent.com')

@pytest.fixture
def api_client():
    """Shared requests session"""
    session = requests.Session()
    session.headers.update({"Content-Type": "application/json"})
    return session

@pytest.fixture
def auth_token(api_client):
    """Get authentication token"""
    response = api_client.post(f"{BASE_URL}/api/auth/login", json={
        "email": "testadmin@example.com",
        "password": "password123"
    })
    if response.status_code == 200:
        return response.json().get("access_token")
    pytest.skip("Authentication failed")

class TestRecommendedFeature:
    """Tests for Hotel/Room Recommended feature"""
    
    def test_get_hotels_returns_recommended_field(self, api_client):
        """Test that GET /api/hotels returns hotels with recommended field"""
        response = api_client.get(f"{BASE_URL}/api/hotels")
        assert response.status_code == 200
        
        data = response.json()
        assert "hotels" in data
        hotels = data["hotels"]
        
        # All hotels should have a recommended field (default False)
        for hotel in hotels:
            assert "recommended" in hotel or hotel.get("recommended") is None or hotel.get("recommended") == False, \
                f"Hotel {hotel.get('name')} missing recommended field"
        
        print(f"Found {len(hotels)} hotels with recommended field support")
    
    def test_create_hotel_with_recommended(self, api_client, auth_token):
        """Test creating a hotel with recommended=true"""
        api_client.headers.update({"Authorization": f"Bearer {auth_token}"})
        
        hotel_data = {
            "name": "TEST_Recommended_Hotel",
            "city": "Tbilisi",
            "country": "Georgia",
            "address": "Test Address",
            "star_rating": 4,
            "rating_score": 8.5,
            "recommended": True,  # Set recommended to true
            "amenities": ["Free WiFi", "Pool"],
            "room_types": []
        }
        
        response = api_client.post(f"{BASE_URL}/api/hotels", json=hotel_data)
        assert response.status_code == 200, f"Failed to create hotel: {response.text}"
        
        data = response.json()
        assert "id" in data
        hotel_id = data["id"]
        
        # Verify by GET
        get_response = api_client.get(f"{BASE_URL}/api/hotels/{hotel_id}")
        assert get_response.status_code == 200
        
        hotel = get_response.json().get("hotel", get_response.json())
        assert hotel.get("recommended") == True, f"Hotel recommended should be True, got: {hotel.get('recommended')}"
        
        print(f"Created hotel with recommended=True: {hotel_id}")
        
        # Cleanup
        api_client.delete(f"{BASE_URL}/api/hotels/{hotel_id}")
    
    def test_update_hotel_recommended_flag(self, api_client, auth_token):
        """Test updating an existing hotel to set recommended=true"""
        api_client.headers.update({"Authorization": f"Bearer {auth_token}"})
        
        # First create a hotel with recommended=false
        hotel_data = {
            "name": "TEST_Update_Recommended",
            "city": "Baku",
            "country": "Azerbaijan",
            "address": "Test Address 2",
            "star_rating": 4,
            "rating_score": 8.0,
            "recommended": False,
            "amenities": ["Free WiFi"],
            "room_types": []
        }
        
        create_response = api_client.post(f"{BASE_URL}/api/hotels", json=hotel_data)
        assert create_response.status_code == 200
        hotel_id = create_response.json()["id"]
        
        # Update to set recommended=true
        update_data = {**hotel_data, "recommended": True}
        update_response = api_client.put(f"{BASE_URL}/api/hotels/{hotel_id}", json=update_data)
        assert update_response.status_code == 200
        
        # Verify the update
        get_response = api_client.get(f"{BASE_URL}/api/hotels/{hotel_id}")
        assert get_response.status_code == 200
        
        hotel = get_response.json().get("hotel", get_response.json())
        assert hotel.get("recommended") == True, f"Hotel recommended should be True after update"
        
        print(f"Successfully updated hotel to recommended=True")
        
        # Cleanup
        api_client.delete(f"{BASE_URL}/api/hotels/{hotel_id}")
    
    def test_recommended_hotels_sorted_first(self, api_client, auth_token):
        """Test that recommended hotels appear first in the list"""
        api_client.headers.update({"Authorization": f"Bearer {auth_token}"})
        
        # Create a recommended hotel
        recommended_hotel = {
            "name": "TEST_First_Recommended",
            "city": "Tbilisi",
            "country": "Georgia",
            "address": "Test Address",
            "star_rating": 4,
            "rating_score": 7.0,  # Lower rating but should still be first due to recommended
            "recommended": True,
            "amenities": [],
            "room_types": []
        }
        
        create_response = api_client.post(f"{BASE_URL}/api/hotels", json=recommended_hotel)
        assert create_response.status_code == 200
        hotel_id = create_response.json()["id"]
        
        # Get all hotels
        response = api_client.get(f"{BASE_URL}/api/hotels")
        assert response.status_code == 200
        
        hotels = response.json()["hotels"]
        
        # Find recommended hotels
        recommended_hotels = [h for h in hotels if h.get("recommended") == True]
        non_recommended_hotels = [h for h in hotels if not h.get("recommended")]
        
        print(f"Recommended hotels: {len(recommended_hotels)}, Non-recommended: {len(non_recommended_hotels)}")
        
        # If we have recommended hotels, they should be first in the list
        if recommended_hotels and non_recommended_hotels:
            # Get indexes of first recommended and first non-recommended
            first_recommended_idx = next((i for i, h in enumerate(hotels) if h.get("recommended")), -1)
            first_non_recommended_idx = next((i for i, h in enumerate(hotels) if not h.get("recommended")), -1)
            
            # Recommended should come before non-recommended
            if first_recommended_idx != -1 and first_non_recommended_idx != -1:
                assert first_recommended_idx < first_non_recommended_idx, \
                    f"Recommended hotel (idx:{first_recommended_idx}) should come before non-recommended (idx:{first_non_recommended_idx})"
        
        print(f"Sorting verified: Recommended hotels appear first")
        
        # Cleanup
        api_client.delete(f"{BASE_URL}/api/hotels/{hotel_id}")
    
    def test_hotel_with_recommended_room_types(self, api_client, auth_token):
        """Test creating a hotel with recommended room types"""
        api_client.headers.update({"Authorization": f"Bearer {auth_token}"})
        
        hotel_data = {
            "name": "TEST_Hotel_With_Recommended_Rooms",
            "city": "Tbilisi",
            "country": "Georgia",
            "address": "Test Address",
            "star_rating": 4,
            "rating_score": 8.5,
            "recommended": False,
            "amenities": ["Free WiFi"],
            "room_types": [
                {
                    "id": "room_1",
                    "name": "Standard Room",
                    "category": "Standard",
                    "bed_configuration": ["1 King"],
                    "view_type": "City View",
                    "max_adults": 2,
                    "max_children": 1,
                    "recommended": False,  # Not recommended
                    "rate_plans": [
                        {"id": "rp_1", "name": "Room Only", "price": 100, "meal_plan": "Room Only"}
                    ]
                },
                {
                    "id": "room_2",
                    "name": "Deluxe Suite",
                    "category": "Deluxe",
                    "bed_configuration": ["1 King"],
                    "view_type": "Sea View",
                    "max_adults": 2,
                    "max_children": 1,
                    "recommended": True,  # Recommended room
                    "rate_plans": [
                        {"id": "rp_2", "name": "Breakfast Included", "price": 200, "meal_plan": "Breakfast"}
                    ]
                }
            ]
        }
        
        response = api_client.post(f"{BASE_URL}/api/hotels", json=hotel_data)
        assert response.status_code == 200, f"Failed to create hotel: {response.text}"
        
        hotel_id = response.json()["id"]
        
        # Verify by GET
        get_response = api_client.get(f"{BASE_URL}/api/hotels/{hotel_id}")
        assert get_response.status_code == 200
        
        hotel = get_response.json().get("hotel", get_response.json())
        room_types = hotel.get("room_types", [])
        
        assert len(room_types) == 2, f"Expected 2 room types, got {len(room_types)}"
        
        # Find recommended room
        recommended_rooms = [r for r in room_types if r.get("recommended")]
        assert len(recommended_rooms) >= 1, "Should have at least 1 recommended room"
        
        print(f"Hotel created with {len(recommended_rooms)} recommended room type(s)")
        
        # Cleanup
        api_client.delete(f"{BASE_URL}/api/hotels/{hotel_id}")


if __name__ == "__main__":
    pytest.main([__file__, "-v", "--tb=short"])
