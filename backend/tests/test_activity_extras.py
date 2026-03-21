"""
Test Activity Extras Feature
Tests for the new 'Extras available for purchase' feature for activities.
- Backend: POST/PUT/GET activities with extras field
- Extras schema: {id, name, description, price, vehicle_pricing}
"""
import pytest
import requests
import os
import uuid

BASE_URL = os.environ.get('REACT_APP_BACKEND_URL', '').rstrip('/')

class TestActivityExtrasBackend:
    """Test Activity Extras CRUD operations"""
    
    @pytest.fixture(autouse=True)
    def setup(self):
        """Setup test data"""
        self.test_activity_id = None
        self.test_extras = [
            {
                "id": f"extra_{uuid.uuid4().hex[:8]}",
                "name": "Goa Gajah (Elephant Cave)",
                "description": "Visit the ancient Elephant Cave temple",
                "price": 150,
                "vehicle_pricing": None
            },
            {
                "id": f"extra_{uuid.uuid4().hex[:8]}",
                "name": "Traditional Lunch",
                "description": "Authentic local cuisine experience",
                "price": 75,
                "vehicle_pricing": {
                    "sedan_4": 75,
                    "car_7": 100,
                    "van_17": 150,
                    "bus_45": 250
                }
            }
        ]
        yield
        # Cleanup: Delete test activity if created
        if self.test_activity_id:
            try:
                requests.delete(f"{BASE_URL}/api/activities/{self.test_activity_id}")
            except:
                pass
    
    def test_01_create_activity_with_extras(self):
        """Test POST /api/activities with extras field"""
        activity_data = {
            "name": "TEST_Bali Full Day Tour with Extras",
            "description": "Explore Bali's cultural highlights",
            "city": "Bali",
            "country": "Indonesia",
            "category": "Cultural",
            "duration": "8 hrs",
            "price": 500,
            "currency": "AED",
            "images": [],
            "highlights": ["Temple visits", "Rice terraces"],
            "inclusions": ["Transport", "Guide"],
            "exclusions": ["Lunch", "Entrance fees"],
            "extras": self.test_extras
        }
        
        response = requests.post(f"{BASE_URL}/api/activities", json=activity_data)
        
        assert response.status_code == 200, f"Expected 200, got {response.status_code}: {response.text}"
        data = response.json()
        assert data.get("success") == True, "Response should indicate success"
        assert "id" in data, "Response should contain activity id"
        
        self.test_activity_id = data["id"]
        
        # Verify activity was created with extras
        activity = data.get("activity", {})
        assert "extras" in activity, "Activity should have extras field"
        assert len(activity["extras"]) == 2, f"Expected 2 extras, got {len(activity.get('extras', []))}"
        
        # Verify extras structure
        for extra in activity["extras"]:
            assert "name" in extra, "Extra should have name"
            assert "price" in extra, "Extra should have price"
        
        print(f"✓ Created activity with {len(activity['extras'])} extras")
    
    def test_02_get_activity_returns_extras(self):
        """Test GET /api/activities returns extras field"""
        # First create an activity with extras
        activity_data = {
            "name": "TEST_Activity with Extras for GET",
            "description": "Test activity",
            "city": "Dubai",
            "country": "UAE",
            "category": "Adventure",
            "duration": "4 hrs",
            "price": 300,
            "extras": self.test_extras
        }
        
        create_response = requests.post(f"{BASE_URL}/api/activities", json=activity_data)
        assert create_response.status_code == 200
        activity_id = create_response.json()["id"]
        self.test_activity_id = activity_id
        
        # GET the activity
        get_response = requests.get(f"{BASE_URL}/api/activities/{activity_id}")
        
        assert get_response.status_code == 200, f"Expected 200, got {get_response.status_code}"
        data = get_response.json()
        assert data.get("success") == True
        
        activity = data.get("activity", {})
        assert "extras" in activity, "GET response should include extras"
        assert len(activity["extras"]) == 2, f"Expected 2 extras, got {len(activity.get('extras', []))}"
        
        # Verify extras data integrity
        extra_names = [e["name"] for e in activity["extras"]]
        assert "Goa Gajah (Elephant Cave)" in extra_names
        assert "Traditional Lunch" in extra_names
        
        print(f"✓ GET activity returns {len(activity['extras'])} extras correctly")
    
    def test_03_get_activities_list_includes_extras(self):
        """Test GET /api/activities (list) includes extras for activities that have them"""
        # First create an activity with extras
        activity_data = {
            "name": "TEST_Activity for List Test",
            "description": "Test activity for list",
            "city": "Tbilisi",
            "country": "Georgia",
            "category": "City Tours",
            "duration": "5 hrs",
            "price": 200,
            "extras": [
                {"id": "test_extra_1", "name": "Wine Tasting", "price": 50}
            ]
        }
        
        create_response = requests.post(f"{BASE_URL}/api/activities", json=activity_data)
        assert create_response.status_code == 200
        activity_id = create_response.json()["id"]
        self.test_activity_id = activity_id
        
        # GET activities list
        list_response = requests.get(f"{BASE_URL}/api/activities")
        
        assert list_response.status_code == 200
        data = list_response.json()
        assert data.get("success") == True
        assert "activities" in data
        
        # Find our test activity
        test_activity = None
        for act in data["activities"]:
            if act.get("id") == activity_id:
                test_activity = act
                break
        
        assert test_activity is not None, "Test activity should be in list"
        assert "extras" in test_activity, "Activity in list should have extras field"
        assert len(test_activity["extras"]) == 1, f"Expected 1 extra, got {len(test_activity.get('extras', []))}"
        
        print(f"✓ Activities list includes extras field")
    
    def test_04_update_activity_extras(self):
        """Test PUT /api/activities/{id} updates extras field"""
        # First create an activity with extras
        activity_data = {
            "name": "TEST_Activity for Update",
            "description": "Test activity",
            "city": "Dubai",
            "country": "UAE",
            "category": "Adventure",
            "duration": "4 hrs",
            "price": 300,
            "extras": [
                {"id": "original_extra", "name": "Original Extra", "price": 100}
            ]
        }
        
        create_response = requests.post(f"{BASE_URL}/api/activities", json=activity_data)
        assert create_response.status_code == 200
        activity_id = create_response.json()["id"]
        self.test_activity_id = activity_id
        
        # Update with new extras
        updated_extras = [
            {"id": "new_extra_1", "name": "New Extra 1", "description": "First new extra", "price": 150},
            {"id": "new_extra_2", "name": "New Extra 2", "description": "Second new extra", "price": 200, "vehicle_pricing": {"sedan_4": 200, "van_17": 350}}
        ]
        
        update_data = {
            "name": "TEST_Activity for Update - Updated",
            "description": "Updated description",
            "city": "Dubai",
            "country": "UAE",
            "category": "Adventure",
            "duration": "4 hrs",
            "price": 350,
            "extras": updated_extras
        }
        
        update_response = requests.put(f"{BASE_URL}/api/activities/{activity_id}", json=update_data)
        
        assert update_response.status_code == 200, f"Expected 200, got {update_response.status_code}: {update_response.text}"
        data = update_response.json()
        assert data.get("success") == True
        
        # Verify extras were updated
        activity = data.get("activity", {})
        assert "extras" in activity, "Updated activity should have extras"
        assert len(activity["extras"]) == 2, f"Expected 2 extras after update, got {len(activity.get('extras', []))}"
        
        # Verify new extras data
        extra_names = [e["name"] for e in activity["extras"]]
        assert "New Extra 1" in extra_names
        assert "New Extra 2" in extra_names
        assert "Original Extra" not in extra_names, "Original extra should be replaced"
        
        # Verify vehicle pricing on second extra
        extra_with_vehicle = next((e for e in activity["extras"] if e["name"] == "New Extra 2"), None)
        assert extra_with_vehicle is not None
        assert extra_with_vehicle.get("vehicle_pricing") is not None
        assert extra_with_vehicle["vehicle_pricing"].get("sedan_4") == 200
        
        print(f"✓ PUT activity updates extras correctly")
    
    def test_05_activity_without_extras(self):
        """Test activity without extras returns empty array or null"""
        activity_data = {
            "name": "TEST_Activity without Extras",
            "description": "Test activity with no extras",
            "city": "Dubai",
            "country": "UAE",
            "category": "Adventure",
            "duration": "4 hrs",
            "price": 300
            # No extras field
        }
        
        create_response = requests.post(f"{BASE_URL}/api/activities", json=activity_data)
        assert create_response.status_code == 200
        activity_id = create_response.json()["id"]
        self.test_activity_id = activity_id
        
        # GET the activity
        get_response = requests.get(f"{BASE_URL}/api/activities/{activity_id}")
        assert get_response.status_code == 200
        
        activity = get_response.json().get("activity", {})
        # extras should be empty array or None
        extras = activity.get("extras", [])
        assert extras is None or len(extras) == 0, f"Activity without extras should have empty/null extras, got {extras}"
        
        print(f"✓ Activity without extras handled correctly")
    
    def test_06_extras_with_vehicle_pricing(self):
        """Test extras with vehicle-based pricing"""
        activity_data = {
            "name": "TEST_Activity with Vehicle Priced Extras",
            "description": "Test activity",
            "city": "Dubai",
            "country": "UAE",
            "category": "Adventure",
            "duration": "4 hrs",
            "price": 300,
            "extras": [
                {
                    "id": "vehicle_extra",
                    "name": "VIP Upgrade",
                    "description": "Upgrade to VIP experience",
                    "price": 100,
                    "vehicle_pricing": {
                        "sedan_4": 100,
                        "car_7": 150,
                        "van_8": 180,
                        "van_17": 250,
                        "bus_29": 400,
                        "bus_45": 500,
                        "bus_55": 600
                    }
                }
            ]
        }
        
        create_response = requests.post(f"{BASE_URL}/api/activities", json=activity_data)
        assert create_response.status_code == 200
        activity_id = create_response.json()["id"]
        self.test_activity_id = activity_id
        
        # GET and verify vehicle pricing
        get_response = requests.get(f"{BASE_URL}/api/activities/{activity_id}")
        assert get_response.status_code == 200
        
        activity = get_response.json().get("activity", {})
        extras = activity.get("extras", [])
        assert len(extras) == 1
        
        extra = extras[0]
        assert extra.get("vehicle_pricing") is not None, "Extra should have vehicle_pricing"
        vp = extra["vehicle_pricing"]
        assert vp.get("sedan_4") == 100
        assert vp.get("van_17") == 250
        assert vp.get("bus_45") == 500
        
        print(f"✓ Extras with vehicle pricing stored and retrieved correctly")


class TestExistingActivityExtras:
    """Test adding extras to existing activities"""
    
    def test_get_existing_activities_for_extras(self):
        """Verify we can get existing activities and check their extras field"""
        response = requests.get(f"{BASE_URL}/api/activities")
        
        assert response.status_code == 200
        data = response.json()
        assert data.get("success") == True
        
        activities = data.get("activities", [])
        print(f"Found {len(activities)} activities in database")
        
        # Check if any activities have extras
        activities_with_extras = [a for a in activities if a.get("extras") and len(a.get("extras", [])) > 0]
        print(f"Activities with extras: {len(activities_with_extras)}")
        
        for act in activities_with_extras[:3]:  # Show first 3
            print(f"  - {act['name']}: {len(act.get('extras', []))} extras")
        
        print(f"✓ Activities endpoint returns extras field")


class TestActivityExtrasSchema:
    """Test ActivityExtra schema validation"""
    
    def test_extra_with_minimal_fields(self):
        """Test extra with only required fields (name, price)"""
        activity_data = {
            "name": "TEST_Minimal Extra Activity",
            "description": "Test",
            "city": "Dubai",
            "country": "UAE",
            "category": "Adventure",
            "duration": "4 hrs",
            "price": 300,
            "extras": [
                {"name": "Simple Extra", "price": 50}  # Minimal fields
            ]
        }
        
        response = requests.post(f"{BASE_URL}/api/activities", json=activity_data)
        assert response.status_code == 200, f"Should accept minimal extra fields: {response.text}"
        
        activity_id = response.json()["id"]
        
        # Cleanup
        requests.delete(f"{BASE_URL}/api/activities/{activity_id}")
        
        print(f"✓ Minimal extra fields accepted")
    
    def test_extra_with_all_fields(self):
        """Test extra with all fields populated"""
        activity_data = {
            "name": "TEST_Full Extra Activity",
            "description": "Test",
            "city": "Dubai",
            "country": "UAE",
            "category": "Adventure",
            "duration": "4 hrs",
            "price": 300,
            "extras": [
                {
                    "id": "full_extra_123",
                    "name": "Full Extra",
                    "description": "This is a complete extra with all fields",
                    "price": 150,
                    "vehicle_pricing": {
                        "sedan_4": 150,
                        "car_7": 200,
                        "van_17": 300,
                        "bus_45": 450
                    }
                }
            ]
        }
        
        response = requests.post(f"{BASE_URL}/api/activities", json=activity_data)
        assert response.status_code == 200, f"Should accept full extra fields: {response.text}"
        
        activity_id = response.json()["id"]
        activity = response.json().get("activity", {})
        
        extra = activity.get("extras", [])[0]
        assert extra.get("id") == "full_extra_123"
        assert extra.get("name") == "Full Extra"
        assert extra.get("description") == "This is a complete extra with all fields"
        assert extra.get("price") == 150
        assert extra.get("vehicle_pricing", {}).get("sedan_4") == 150
        
        # Cleanup
        requests.delete(f"{BASE_URL}/api/activities/{activity_id}")
        
        print(f"✓ Full extra fields stored correctly")


if __name__ == "__main__":
    pytest.main([__file__, "-v", "--tb=short"])
