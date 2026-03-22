"""
Test suite for verifying selected_extras and inter_city_transfers fields
in proposal creation, retrieval, and editing flow.

This tests the P0 bug fix where these fields were missing from the Pydantic schemas
and backend save document.
"""
import pytest
import requests
import os
import uuid

BASE_URL = os.environ.get('REACT_APP_BACKEND_URL', '').rstrip('/')

class TestProposalExtrasAndInterCityTransfers:
    """Test selected_extras and inter_city_transfers persistence in proposals"""
    
    @pytest.fixture(autouse=True)
    def setup(self):
        """Setup test data"""
        self.test_proposal_id = None
        self.auth_token = None
        
        # Login to get auth token
        login_response = requests.post(f"{BASE_URL}/api/auth/login", json={
            "email": "testadmin@example.com",
            "password": "password123"
        })
        if login_response.status_code == 200:
            self.auth_token = login_response.json().get("access_token")
        
        yield
        
        # Cleanup: delete test proposal if created
        if self.test_proposal_id and self.auth_token:
            try:
                requests.delete(
                    f"{BASE_URL}/api/proposals/{self.test_proposal_id}",
                    headers={"Authorization": f"Bearer {self.auth_token}"}
                )
            except:
                pass
    
    def test_create_proposal_with_selected_extras(self):
        """Test that selected_extras field is saved and returned correctly"""
        # Create proposal with selected_extras
        proposal_data = {
            "leaving_from": "Dubai (DXB)",
            "nationality": "UAE",
            "leaving_on": "2026-02-15",
            "star_rating": "4",
            "add_transfers": True,
            "room_data": [{"adults": 2, "children": []}],
            "cities": [{"name": "Tbilisi", "nights": 3}],
            "selected_extras": {
                "activity_123": [
                    {"id": "extra_1", "name": "Lunch Included", "price": 50},
                    {"id": "extra_2", "name": "Photo Package", "price": 30}
                ],
                "activity_456": [
                    {"id": "extra_3", "name": "Wine Tasting", "price": 75}
                ]
            },
            "total_price": 1500
        }
        
        response = requests.post(f"{BASE_URL}/api/proposals", json=proposal_data)
        
        assert response.status_code == 200, f"Failed to create proposal: {response.text}"
        
        data = response.json()
        self.test_proposal_id = data.get("id")
        
        # Verify selected_extras is returned
        assert "selected_extras" in data, "selected_extras field missing from response"
        assert data["selected_extras"] is not None, "selected_extras should not be None"
        assert "activity_123" in data["selected_extras"], "activity_123 extras missing"
        assert len(data["selected_extras"]["activity_123"]) == 2, "Should have 2 extras for activity_123"
        
        print(f"✓ Created proposal with selected_extras: {self.test_proposal_id}")
    
    def test_create_proposal_with_inter_city_transfers(self):
        """Test that inter_city_transfers field is saved and returned correctly"""
        # Create proposal with inter_city_transfers
        proposal_data = {
            "leaving_from": "Dubai (DXB)",
            "nationality": "UAE",
            "leaving_on": "2026-02-15",
            "star_rating": "4",
            "add_transfers": True,
            "room_data": [{"adults": 2, "children": []}],
            "cities": [
                {"name": "Tbilisi", "nights": 2},
                {"name": "Gudauri", "nights": 2}
            ],
            "inter_city_transfers": {
                "0_1": {
                    "id": "transfer_001",
                    "title": "Tbilisi to Gudauri Transfer",
                    "from_city": "Tbilisi",
                    "to_city": "Gudauri",
                    "price": 120,
                    "vehicle_type": "sedan_4",
                    "duration": "2 hrs"
                }
            },
            "total_price": 2000
        }
        
        response = requests.post(f"{BASE_URL}/api/proposals", json=proposal_data)
        
        assert response.status_code == 200, f"Failed to create proposal: {response.text}"
        
        data = response.json()
        self.test_proposal_id = data.get("id")
        
        # Verify inter_city_transfers is returned
        assert "inter_city_transfers" in data, "inter_city_transfers field missing from response"
        assert data["inter_city_transfers"] is not None, "inter_city_transfers should not be None"
        assert "0_1" in data["inter_city_transfers"], "0_1 transfer key missing"
        assert data["inter_city_transfers"]["0_1"]["from_city"] == "Tbilisi"
        assert data["inter_city_transfers"]["0_1"]["to_city"] == "Gudauri"
        
        print(f"✓ Created proposal with inter_city_transfers: {self.test_proposal_id}")
    
    def test_get_proposal_returns_extras_and_transfers(self):
        """Test that GET /proposals/{id} returns selected_extras and inter_city_transfers"""
        # First create a proposal with both fields
        proposal_data = {
            "leaving_from": "Dubai (DXB)",
            "nationality": "UAE",
            "leaving_on": "2026-02-15",
            "star_rating": "4",
            "add_transfers": True,
            "room_data": [{"adults": 2, "children": []}],
            "cities": [
                {"name": "Tbilisi", "nights": 2},
                {"name": "Batumi", "nights": 2}
            ],
            "selected_extras": {
                "act_001": [{"id": "ex1", "name": "Guide", "price": 100}]
            },
            "inter_city_transfers": {
                "0_1": {
                    "id": "tr_001",
                    "title": "Tbilisi to Batumi",
                    "from_city": "Tbilisi",
                    "to_city": "Batumi",
                    "price": 200
                }
            },
            "total_price": 2500
        }
        
        create_response = requests.post(f"{BASE_URL}/api/proposals", json=proposal_data)
        assert create_response.status_code == 200
        
        proposal_id = create_response.json().get("id")
        self.test_proposal_id = proposal_id
        
        # Now GET the proposal
        get_response = requests.get(f"{BASE_URL}/api/proposals/{proposal_id}")
        
        assert get_response.status_code == 200, f"Failed to get proposal: {get_response.text}"
        
        data = get_response.json()
        
        # Verify both fields are returned
        assert "selected_extras" in data, "selected_extras missing from GET response"
        assert "inter_city_transfers" in data, "inter_city_transfers missing from GET response"
        
        # Verify data integrity
        assert data["selected_extras"]["act_001"][0]["name"] == "Guide"
        assert data["inter_city_transfers"]["0_1"]["title"] == "Tbilisi to Batumi"
        
        print(f"✓ GET proposal returns selected_extras and inter_city_transfers correctly")
    
    def test_list_proposals_returns_extras_and_transfers(self):
        """Test that GET /proposals list returns selected_extras and inter_city_transfers"""
        # First create a proposal with both fields
        proposal_data = {
            "leaving_from": "Dubai (DXB)",
            "nationality": "UAE",
            "leaving_on": "2026-02-15",
            "star_rating": "4",
            "add_transfers": True,
            "room_data": [{"adults": 2, "children": []}],
            "cities": [{"name": "Tbilisi", "nights": 3}],
            "selected_extras": {
                "test_act": [{"id": "test_ex", "name": "Test Extra", "price": 25}]
            },
            "inter_city_transfers": {
                "test_key": {"id": "test_tr", "title": "Test Transfer", "price": 50}
            },
            "total_price": 1000,
            "proposal_name": f"TEST_EXTRAS_INTERCITY_{uuid.uuid4().hex[:8]}"
        }
        
        create_response = requests.post(f"{BASE_URL}/api/proposals", json=proposal_data)
        assert create_response.status_code == 200
        
        proposal_id = create_response.json().get("id")
        self.test_proposal_id = proposal_id
        
        # Get list of proposals
        list_response = requests.get(f"{BASE_URL}/api/proposals")
        
        assert list_response.status_code == 200, f"Failed to list proposals: {list_response.text}"
        
        proposals = list_response.json()
        
        # Find our test proposal
        test_proposal = next((p for p in proposals if p.get("id") == proposal_id), None)
        
        assert test_proposal is not None, "Test proposal not found in list"
        assert "selected_extras" in test_proposal, "selected_extras missing from list response"
        assert "inter_city_transfers" in test_proposal, "inter_city_transfers missing from list response"
        
        print(f"✓ List proposals returns selected_extras and inter_city_transfers correctly")
    
    def test_full_proposal_with_all_fields(self):
        """Test creating a complete proposal with all fields including extras and transfers"""
        proposal_data = {
            "leaving_from": "Mumbai (BOM)",
            "leaving_from_code": "BOM",
            "nationality": "India",
            "leaving_on": "2026-03-01",
            "star_rating": "5",
            "add_transfers": True,
            "room_data": [
                {"adults": 2, "children": []},
                {"adults": 2, "children": [{"age": "5"}]}
            ],
            "cities": [
                {"name": "Tbilisi", "nights": 3},
                {"name": "Gudauri", "nights": 2},
                {"name": "Batumi", "nights": 2}
            ],
            "selected_hotels": {
                "Tbilisi_0": {
                    "id": "hotel_001",
                    "name": "Marriott Tbilisi",
                    "star_rating": 5,
                    "selectedRoom": {"name": "Deluxe Room", "price": 200}
                }
            },
            "selected_activities": {
                "Tbilisi_1": [
                    {
                        "id": "act_001",
                        "name": "Tbilisi City Tour",
                        "price": 150,
                        "selectedVehicle": "sedan_4",
                        "vehiclePrice": 150
                    }
                ]
            },
            "selected_extras": {
                "act_001": [
                    {"id": "ex_001", "name": "Lunch", "price": 30},
                    {"id": "ex_002", "name": "Wine Tasting", "price": 50}
                ]
            },
            "inter_city_transfers": {
                "0_1": {
                    "id": "ict_001",
                    "title": "Tbilisi to Gudauri",
                    "from_city": "Tbilisi",
                    "to_city": "Gudauri",
                    "price": 100,
                    "selectedVehicle": "van_8",
                    "vehicleLabel": "8 Seater Van"
                },
                "1_2": {
                    "id": "ict_002",
                    "title": "Gudauri to Batumi",
                    "from_city": "Gudauri",
                    "to_city": "Batumi",
                    "price": 250,
                    "selectedVehicle": "van_8",
                    "vehicleLabel": "8 Seater Van"
                }
            },
            "arrival_transfer": {
                "id": "arr_001",
                "title": "Airport to Hotel",
                "selectedVehicle": "sedan_4",
                "vehiclePrice": 80
            },
            "departure_transfer": {
                "id": "dep_001",
                "title": "Hotel to Airport",
                "selectedVehicle": "sedan_4",
                "vehiclePrice": 80
            },
            "total_price": 3500,
            "customer_name": "Test Customer",
            "customer_email": "test@example.com",
            "proposal_name": f"TEST_FULL_PROPOSAL_{uuid.uuid4().hex[:8]}"
        }
        
        # Create proposal
        create_response = requests.post(f"{BASE_URL}/api/proposals", json=proposal_data)
        
        assert create_response.status_code == 200, f"Failed to create full proposal: {create_response.text}"
        
        created = create_response.json()
        self.test_proposal_id = created.get("id")
        
        # Verify all fields are present
        assert created.get("selected_hotels") is not None
        assert created.get("selected_activities") is not None
        assert created.get("selected_extras") is not None
        assert created.get("inter_city_transfers") is not None
        assert created.get("arrival_transfer") is not None
        assert created.get("departure_transfer") is not None
        
        # Verify selected_extras content
        assert "act_001" in created["selected_extras"]
        assert len(created["selected_extras"]["act_001"]) == 2
        
        # Verify inter_city_transfers content
        assert "0_1" in created["inter_city_transfers"]
        assert "1_2" in created["inter_city_transfers"]
        assert created["inter_city_transfers"]["0_1"]["from_city"] == "Tbilisi"
        assert created["inter_city_transfers"]["1_2"]["to_city"] == "Batumi"
        
        # Now GET the proposal to verify persistence
        get_response = requests.get(f"{BASE_URL}/api/proposals/{self.test_proposal_id}")
        assert get_response.status_code == 200
        
        fetched = get_response.json()
        
        # Verify data persisted correctly
        assert fetched["selected_extras"]["act_001"][0]["name"] == "Lunch"
        assert fetched["inter_city_transfers"]["0_1"]["title"] == "Tbilisi to Gudauri"
        
        print(f"✓ Full proposal with all fields created and retrieved successfully")


class TestExistingProposalRetrieval:
    """Test retrieving the existing test proposal mentioned in the bug report"""
    
    def test_get_existing_proposal(self):
        """Test retrieving the existing proposal bf0328bb-2c14-4cc6-9937-3f7dc0918750"""
        proposal_id = "bf0328bb-2c14-4cc6-9937-3f7dc0918750"
        
        response = requests.get(f"{BASE_URL}/api/proposals/{proposal_id}")
        
        # This proposal may or may not exist, so we handle both cases
        if response.status_code == 200:
            data = response.json()
            print(f"✓ Existing proposal found: {proposal_id}")
            print(f"  - selected_extras present: {'selected_extras' in data}")
            print(f"  - inter_city_transfers present: {'inter_city_transfers' in data}")
            
            # If the proposal exists, verify the new fields are present
            assert "selected_extras" in data, "selected_extras field should be in response schema"
            assert "inter_city_transfers" in data, "inter_city_transfers field should be in response schema"
        elif response.status_code == 404:
            print(f"ℹ Existing proposal {proposal_id} not found (may have been deleted)")
            pytest.skip("Test proposal not found")
        else:
            pytest.fail(f"Unexpected response: {response.status_code} - {response.text}")


if __name__ == "__main__":
    pytest.main([__file__, "-v"])
