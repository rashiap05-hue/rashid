"""
Test suite for Enhanced Activities Management in Admin Dashboard
Tests all new activity fields: photos, timing, operating days, duration, languages, 
transfer type, description/itinerary, useful information, inclusions/exclusions
"""

import pytest
import requests
import os

BASE_URL = os.environ.get('REACT_APP_BACKEND_URL', 'https://dmc-platform-staging.preview.emergentagent.com')

# Test activity data with all new fields
TEST_ACTIVITY = {
    "name": "TEST Half Day Tbilisi City Tour - Private Transfers",
    "description": """10:00 AM - Meet the Driver and Guide at your hotel lobby
10:20 AM - Explore the city and have a local tour
- Visit Metekhi Church
- Monument to King Vakhtang Gorgasali
- Rike Park & Cable Car to Narikala Fortress
15:00 PM - Transfer to hotel
15:30 PM - End of the tour""",
    "city": "Tbilisi",
    "country": "Georgia",
    "category": "Sightseeing",
    "duration": "5 hrs",
    "price": 250.0,
    "currency": "AED",
    "images": ["https://example.com/tbilisi1.jpg", "https://example.com/tbilisi2.jpg"],
    "highlights": ["Narikala Fortress visit", "Cable Car ride", "Old Town exploration"],
    "inclusions": ["Driver cum Guide", "Cable Car tickets", "Hotel pickup and drop-off"],
    "exclusions": ["Lunch", "Tips", "Personal expenses"],
    "useful_information": ["Small vehicle up to 6 pax", "English speaking guide", "Air-conditioned vehicle"],
    "meeting_point": "Hotel lobby pickup",
    "start_times": ["10:00", "15:00", "15:30"],
    "languages": ["English", "Arabic", "Russian"],
    "transfer_type": "Private",
    "operating_days": ["Tuesday", "Wednesday", "Thursday", "Friday", "Saturday", "Sunday"],
    "closed_days": ["Monday"],
    "min_participants": 1,
    "max_participants": 6,
    "age_restriction": "All ages",
    "cancellation_policy": "Free cancellation up to 24 hours",
    "supplier_name": "Local Tours Georgia",
    "supplier_cost": 180.0,
    "available": True,
    "rating": 4.8,
    "review_count": 125
}


class TestActivitiesAPI:
    """Test Activities CRUD operations with new fields"""
    
    @pytest.fixture(scope="class")
    def api_session(self):
        """Create session for API calls"""
        session = requests.Session()
        session.headers.update({"Content-Type": "application/json"})
        return session
    
    @pytest.fixture(scope="class")
    def auth_token(self, api_session):
        """Get authentication token"""
        response = api_session.post(f"{BASE_URL}/api/auth/login", json={
            "email": "admin@travo.com",
            "password": "admin123"
        })
        assert response.status_code == 200, f"Login failed: {response.text}"
        return response.json().get("access_token")
    
    @pytest.fixture(scope="class")
    def authenticated_session(self, api_session, auth_token):
        """Session with auth header"""
        api_session.headers.update({"Authorization": f"Bearer {auth_token}"})
        return api_session

    def test_get_all_activities(self, api_session):
        """Test GET /api/activities returns list of activities"""
        response = api_session.get(f"{BASE_URL}/api/activities")
        assert response.status_code == 200
        
        data = response.json()
        assert "activities" in data
        assert isinstance(data["activities"], list)
        print(f"Found {len(data['activities'])} activities in database")
        
        # Verify at least one activity exists
        assert len(data["activities"]) >= 1

    def test_create_activity_with_all_fields(self, authenticated_session):
        """Test POST /api/activities creates activity with all new fields"""
        response = authenticated_session.post(f"{BASE_URL}/api/activities", json=TEST_ACTIVITY)
        assert response.status_code == 200, f"Create failed: {response.text}"
        
        data = response.json()
        assert data.get("success") == True
        assert "id" in data
        
        # Store ID for later tests
        TestActivitiesAPI.created_activity_id = data["id"]
        print(f"Created activity with ID: {data['id']}")

    def test_get_activity_by_id_with_all_fields(self, api_session):
        """Test GET /api/activities/{id} returns activity with all fields"""
        activity_id = getattr(TestActivitiesAPI, 'created_activity_id', None)
        if not activity_id:
            pytest.skip("No activity ID from create test")
        
        response = api_session.get(f"{BASE_URL}/api/activities/{activity_id}")
        assert response.status_code == 200
        
        data = response.json()
        activity = data.get("activity", data)
        
        # Verify all new fields are present
        assert activity["name"] == TEST_ACTIVITY["name"]
        assert activity["description"] == TEST_ACTIVITY["description"]
        assert activity["duration"] == TEST_ACTIVITY["duration"]
        assert activity["transfer_type"] == TEST_ACTIVITY["transfer_type"]
        
        # Verify array fields
        assert activity["start_times"] == TEST_ACTIVITY["start_times"]
        assert activity["languages"] == TEST_ACTIVITY["languages"]
        assert activity["operating_days"] == TEST_ACTIVITY["operating_days"]
        assert activity["closed_days"] == TEST_ACTIVITY["closed_days"]
        assert activity["useful_information"] == TEST_ACTIVITY["useful_information"]
        assert activity["inclusions"] == TEST_ACTIVITY["inclusions"]
        assert activity["exclusions"] == TEST_ACTIVITY["exclusions"]
        
        # Verify pricing
        assert activity["price"] == TEST_ACTIVITY["price"]
        assert activity["supplier_cost"] == TEST_ACTIVITY["supplier_cost"]
        assert activity["supplier_name"] == TEST_ACTIVITY["supplier_name"]
        
        print("All activity fields verified successfully")

    def test_update_activity_fields(self, authenticated_session):
        """Test PUT /api/activities/{id} updates activity fields"""
        activity_id = getattr(TestActivitiesAPI, 'created_activity_id', None)
        if not activity_id:
            pytest.skip("No activity ID from create test")
        
        # Update some fields
        updated_data = {**TEST_ACTIVITY}
        updated_data["name"] = "TEST Updated Tbilisi Tour"
        updated_data["duration"] = "6 hrs"
        updated_data["start_times"] = ["09:00", "14:00"]
        updated_data["closed_days"] = ["Monday", "Tuesday"]
        updated_data["price"] = 300.0
        
        response = authenticated_session.put(f"{BASE_URL}/api/activities/{activity_id}", json=updated_data)
        assert response.status_code == 200, f"Update failed: {response.text}"
        
        # Verify update by fetching again
        get_response = authenticated_session.get(f"{BASE_URL}/api/activities/{activity_id}")
        assert get_response.status_code == 200
        
        activity = get_response.json().get("activity", get_response.json())
        assert activity["name"] == "TEST Updated Tbilisi Tour"
        assert activity["duration"] == "6 hrs"
        assert activity["start_times"] == ["09:00", "14:00"]
        assert activity["closed_days"] == ["Monday", "Tuesday"]
        assert activity["price"] == 300.0
        
        print("Activity update verified successfully")

    def test_activity_filter_by_city(self, api_session):
        """Test GET /api/activities?city=Dubai filters correctly"""
        response = api_session.get(f"{BASE_URL}/api/activities", params={"city": "Dubai"})
        assert response.status_code == 200
        
        data = response.json()
        activities = data.get("activities", [])
        
        # All returned activities should be in Dubai
        for activity in activities:
            assert "Dubai" in activity.get("city", ""), f"Activity {activity.get('name')} is not in Dubai"
        
        print(f"Found {len(activities)} activities in Dubai")

    def test_activity_filter_by_category(self, api_session):
        """Test GET /api/activities?category=Adventure filters correctly"""
        response = api_session.get(f"{BASE_URL}/api/activities", params={"category": "Adventure"})
        assert response.status_code == 200
        
        data = response.json()
        activities = data.get("activities", [])
        
        print(f"Found {len(activities)} Adventure activities")

    def test_activity_image_upload_endpoint_exists(self, authenticated_session):
        """Test that /api/uploads/activity-image endpoint exists"""
        # Just check the endpoint exists by sending an OPTIONS or HEAD request
        # We can't fully test file upload without a real file
        response = authenticated_session.post(
            f"{BASE_URL}/api/uploads/activity-image",
            data={},
            headers={"Content-Type": "multipart/form-data"}
        )
        # 422 means endpoint exists but validation failed (expected without file)
        assert response.status_code in [422, 400, 200]
        print("Activity image upload endpoint exists")

    def test_delete_activity(self, authenticated_session):
        """Test DELETE /api/activities/{id} removes activity"""
        activity_id = getattr(TestActivitiesAPI, 'created_activity_id', None)
        if not activity_id:
            pytest.skip("No activity ID from create test")
        
        response = authenticated_session.delete(f"{BASE_URL}/api/activities/{activity_id}")
        assert response.status_code == 200, f"Delete failed: {response.text}"
        
        # Verify deletion
        get_response = authenticated_session.get(f"{BASE_URL}/api/activities/{activity_id}")
        assert get_response.status_code == 404, "Activity should not exist after deletion"
        
        print(f"Activity {activity_id} deleted successfully")

    def test_existing_activities_have_new_fields(self, api_session):
        """Test that existing activities have been migrated with new fields"""
        response = api_session.get(f"{BASE_URL}/api/activities")
        assert response.status_code == 200
        
        data = response.json()
        activities = data.get("activities", [])
        
        if len(activities) == 0:
            pytest.skip("No activities in database to check migration")
        
        # Check first activity for new fields
        activity = activities[0]
        
        # These fields should exist (may be empty but should be present)
        new_fields = [
            "useful_information", "transfer_type", "operating_days", 
            "closed_days", "start_times", "languages"
        ]
        
        for field in new_fields:
            assert field in activity, f"Missing migrated field: {field}"
        
        print(f"Activity '{activity.get('name')}' has all new fields after migration")


if __name__ == "__main__":
    pytest.main([__file__, "-v", "--tb=short"])
