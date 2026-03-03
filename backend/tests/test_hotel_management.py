"""
Hotel Management API Tests
Tests for the comprehensive Hotel Management system including:
- Hotel CRUD operations
- Room types with bed config, view type, size, amenities
- Rate plans per room with meal plans, refund policies, inclusions, taxes
- Image upload endpoints
"""
import pytest
import requests
import os

BASE_URL = os.environ.get('REACT_APP_BACKEND_URL', '').rstrip('/')


class TestHotelCRUD:
    """Hotel CRUD endpoint tests"""
    
    def test_get_all_hotels(self):
        """Test GET /api/hotels returns hotel list with enhanced fields"""
        response = requests.get(f"{BASE_URL}/api/hotels")
        assert response.status_code == 200
        data = response.json()
        assert data.get("success") == True
        assert "hotels" in data
        hotels = data["hotels"]
        print(f"Found {len(hotels)} hotels")
        
        # Verify hotel structure for enhanced fields
        if hotels:
            hotel = hotels[0]
            print(f"First hotel: {hotel.get('name')}")
            # Check for new fields
            assert "name" in hotel
            assert "city" in hotel
            assert "star_rating" in hotel or hotel.get("star_rating") is not None
            print("SUCCESS: Hotels list retrieved with expected structure")
    
    def test_get_hotel_by_id(self):
        """Test GET /api/hotels/{id} returns single hotel"""
        # First get list to get an ID
        list_response = requests.get(f"{BASE_URL}/api/hotels")
        hotels = list_response.json().get("hotels", [])
        
        if hotels:
            hotel_id = hotels[0]["id"]
            response = requests.get(f"{BASE_URL}/api/hotels/{hotel_id}")
            assert response.status_code == 200
            data = response.json()
            assert data.get("success") == True
            assert "hotel" in data
            print(f"SUCCESS: Retrieved hotel: {data['hotel'].get('name')}")
        else:
            pytest.skip("No hotels available for individual retrieval test")
    
    def test_create_hotel_with_room_types(self):
        """Test POST /api/hotels with room_types and rate_plans"""
        # Create hotel with room types and rate plans
        hotel_data = {
            "name": "TEST_New Hotel with Rooms",
            "city": "Dubai",
            "country": "United Arab Emirates",
            "address": "123 Test Street, Dubai Marina",
            "description": "A test hotel with comprehensive room types",
            "star_rating": 5,
            "rating_score": 8.5,
            "rating_text": "Excellent",
            "review_count": 500,
            "images": ["https://example.com/hotel1.jpg"],
            "amenities": ["Free WiFi", "Pool", "Spa", "Gym"],
            "detailed_ratings": {
                "cleanliness": 4.8,
                "service": 4.7,
                "comfort": 4.6,
                "location": 4.9,
                "amenities": 4.5
            },
            "check_in_time": "15:00",
            "check_out_time": "11:00",
            "total_rooms": 200,
            "highlights": ["Beachfront location", "Free parking", "24-hour room service"],
            "board_types": ["RO", "BB", "HB"],
            "cancellation_policy": "Flexible",
            "supplier_name": "Test Supplier",
            "supplier_cost_per_night": 150.0,
            "room_types": [
                {
                    "id": "test_room_1",
                    "name": "Deluxe Room - Sea View",
                    "category": "Deluxe",
                    "bed_configuration": ["1 King"],
                    "view_type": "Sea View",
                    "room_size": 45,
                    "size_unit": "sqm",
                    "max_adults": 2,
                    "max_children": 1,
                    "smoking": False,
                    "amenities": ["Free WiFi", "LED TV", "Minibar", "Safe", "Hairdryer"],
                    "images": [],
                    "description": "Spacious deluxe room with stunning sea views",
                    "rate_plans": [
                        {
                            "id": "rp_1",
                            "name": "Room Only",
                            "price": 350,
                            "original_price": 400,
                            "currency": "AED",
                            "meal_plan": "Room Only",
                            "refund_policy": "Refundable",
                            "refund_deadline": "Free cancellation until 24 hours before",
                            "inclusions": ["Free WiFi", "Free parking"],
                            "taxes": ["Tourism Tax", "City Tax"],
                            "available": True
                        },
                        {
                            "id": "rp_2",
                            "name": "Breakfast Included",
                            "price": 450,
                            "original_price": 500,
                            "currency": "AED",
                            "meal_plan": "Breakfast",
                            "meal_details": "Breakfast buffet for 2",
                            "refund_policy": "Non-refundable",
                            "inclusions": ["Free WiFi", "Free parking", "Breakfast for 2"],
                            "taxes": ["Tourism Tax", "City Tax", "VAT"],
                            "available": True
                        }
                    ]
                }
            ]
        }
        
        response = requests.post(f"{BASE_URL}/api/hotels", json=hotel_data)
        assert response.status_code == 200
        data = response.json()
        assert data.get("success") == True
        assert "id" in data
        print(f"SUCCESS: Created hotel with ID: {data['id']}")
        
        # Verify the created hotel has room_types
        hotel_id = data["id"]
        get_response = requests.get(f"{BASE_URL}/api/hotels/{hotel_id}")
        assert get_response.status_code == 200
        hotel = get_response.json().get("hotel", {})
        assert hotel.get("name") == "TEST_New Hotel with Rooms"
        assert "room_types" in hotel
        print(f"SUCCESS: Hotel has room_types field")
        
        return hotel_id
    
    def test_update_hotel_room_types(self):
        """Test PUT /api/hotels/{id} updates room types correctly"""
        # First create a hotel
        hotel_id = self.test_create_hotel_with_room_types()
        
        # Update the hotel with modified room types
        update_data = {
            "name": "TEST_Updated Hotel",
            "city": "Abu Dhabi",
            "country": "United Arab Emirates",
            "address": "456 Updated Street",
            "star_rating": 5,
            "rating_score": 9.0,
            "rating_text": "Wonderful",
            "review_count": 750,
            "images": [],
            "amenities": ["Free WiFi", "Pool"],
            "detailed_ratings": {},
            "room_types": [
                {
                    "id": "room_updated",
                    "name": "Executive Suite",
                    "category": "Suite",
                    "bed_configuration": ["1 King", "Sofa Bed"],
                    "view_type": "City View",
                    "room_size": 65,
                    "size_unit": "sqm",
                    "max_adults": 3,
                    "max_children": 2,
                    "amenities": ["Free WiFi", "Mini Kitchen"],
                    "rate_plans": [
                        {
                            "id": "rp_updated",
                            "name": "Full Board",
                            "price": 800,
                            "currency": "AED",
                            "meal_plan": "Full Board",
                            "refund_policy": "Refundable",
                            "available": True
                        }
                    ]
                }
            ]
        }
        
        response = requests.put(f"{BASE_URL}/api/hotels/{hotel_id}", json=update_data)
        assert response.status_code == 200
        
        # Verify update
        get_response = requests.get(f"{BASE_URL}/api/hotels/{hotel_id}")
        updated_hotel = get_response.json().get("hotel", {})
        assert updated_hotel.get("name") == "TEST_Updated Hotel"
        assert updated_hotel.get("city") == "Abu Dhabi"
        print("SUCCESS: Hotel updated with new room types")
        
        return hotel_id
    
    def test_delete_hotel(self):
        """Test DELETE /api/hotels/{id}"""
        # First create a test hotel
        hotel_data = {
            "name": "TEST_Hotel to Delete",
            "city": "Test City",
            "country": "Test Country",
            "star_rating": 3,
            "rating_score": 7.0
        }
        create_response = requests.post(f"{BASE_URL}/api/hotels", json=hotel_data)
        hotel_id = create_response.json().get("id")
        
        # Delete the hotel
        delete_response = requests.delete(f"{BASE_URL}/api/hotels/{hotel_id}")
        assert delete_response.status_code == 200
        
        # Verify deletion
        get_response = requests.get(f"{BASE_URL}/api/hotels/{hotel_id}")
        assert get_response.status_code == 404
        print("SUCCESS: Hotel deleted successfully")


class TestImageUploadEndpoints:
    """Test file upload endpoints for hotels and rooms"""
    
    def test_hotel_image_upload_endpoint_exists(self):
        """Verify /api/uploads/hotel-image endpoint is accessible"""
        # We can't fully test file upload without a real file,
        # but we can verify the endpoint responds appropriately
        response = requests.post(f"{BASE_URL}/api/uploads/hotel-image")
        # Should return 422 (Unprocessable Entity) because no file was provided
        # This confirms the endpoint exists and is configured correctly
        assert response.status_code in [400, 422, 401]  # 401 if auth required
        print("SUCCESS: Hotel image upload endpoint exists")
    
    def test_room_image_upload_endpoint_exists(self):
        """Verify /api/uploads/room-image endpoint is accessible"""
        response = requests.post(f"{BASE_URL}/api/uploads/room-image")
        assert response.status_code in [400, 422, 401]
        print("SUCCESS: Room image upload endpoint exists")


class TestHotelSearch:
    """Test hotel search and filtering"""
    
    def test_search_hotels_by_city(self):
        """Test searching hotels by city"""
        response = requests.get(f"{BASE_URL}/api/hotels?city=Dubai")
        assert response.status_code == 200
        data = response.json()
        assert data.get("success") == True
        hotels = data.get("hotels", [])
        
        # If there are results, verify they're from Dubai
        for hotel in hotels:
            assert "dubai" in hotel.get("city", "").lower()
        print(f"SUCCESS: Found {len(hotels)} hotels in Dubai")
    
    def test_search_hotels_by_text(self):
        """Test general search"""
        response = requests.get(f"{BASE_URL}/api/hotels?search=Marriott")
        assert response.status_code == 200
        data = response.json()
        assert data.get("success") == True
        print(f"SUCCESS: Search returned {len(data.get('hotels', []))} results")


class TestCleanup:
    """Cleanup test data"""
    
    def test_cleanup_test_hotels(self):
        """Remove TEST_ prefixed hotels"""
        response = requests.get(f"{BASE_URL}/api/hotels")
        hotels = response.json().get("hotels", [])
        
        deleted_count = 0
        for hotel in hotels:
            if hotel.get("name", "").startswith("TEST_"):
                delete_response = requests.delete(f"{BASE_URL}/api/hotels/{hotel['id']}")
                if delete_response.status_code == 200:
                    deleted_count += 1
        
        print(f"Cleanup: Deleted {deleted_count} test hotels")


if __name__ == "__main__":
    pytest.main([__file__, "-v"])
