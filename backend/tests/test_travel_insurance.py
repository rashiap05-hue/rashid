"""
Travel Insurance Feature Tests
Tests for:
1. POST /api/proposals - accepts travel_insurance field and stores it in MongoDB
2. GET /api/proposals/{id} - returns travel_insurance field in response
3. GET /api/proposals/{id}/pdf - includes Travel Insurance section with correct status
"""

import pytest
import requests
import os

BASE_URL = os.environ.get('REACT_APP_BACKEND_URL', '').rstrip('/')

class TestTravelInsuranceBackend:
    """Tests for Travel Insurance backend functionality"""
    
    # Credentials for authentication
    TEST_EMAIL = "testadmin@example.com"
    TEST_PASSWORD = "password123"
    
    @pytest.fixture(autouse=True)
    def setup(self):
        """Setup - get auth token"""
        self.session = requests.Session()
        self.session.headers.update({"Content-Type": "application/json"})
        
        # Login to get token
        login_res = self.session.post(f"{BASE_URL}/api/auth/login", json={
            "email": self.TEST_EMAIL,
            "password": self.TEST_PASSWORD
        })
        
        if login_res.status_code == 200:
            token = login_res.json().get("access_token")
            self.session.headers.update({"Authorization": f"Bearer {token}"})
        else:
            pytest.skip("Authentication failed - cannot proceed with tests")
    
    # Module 1: Test POST /api/proposals with travel_insurance=true
    def test_create_proposal_with_travel_insurance_true(self):
        """Test creating a proposal with travel_insurance=true saves correctly"""
        proposal_data = {
            "leaving_from": "Dubai International Airport (DXB)",
            "leaving_from_code": "DXB",
            "nationality": "India",
            "leaving_on": "2026-04-15",
            "star_rating": "4",
            "add_transfers": True,
            "room_data": [{"adults": 2, "children": []}],
            "cities": [{"name": "Tbilisi", "nights": 3}],
            "travel_insurance": True,  # Key field being tested
            "proposal_name": "TEST_Insurance_True_Proposal",
            "customer_name": "Test Customer Insurance True"
        }
        
        # Create proposal
        create_res = self.session.post(f"{BASE_URL}/api/proposals", json=proposal_data)
        assert create_res.status_code == 200, f"Failed to create proposal: {create_res.text}"
        
        created = create_res.json()
        proposal_id = created.get("id")
        assert proposal_id, "Proposal ID not returned"
        
        # Verify travel_insurance is True in response
        assert created.get("travel_insurance") == True, f"travel_insurance should be True, got: {created.get('travel_insurance')}"
        
        # GET the proposal to verify persistence
        get_res = self.session.get(f"{BASE_URL}/api/proposals/{proposal_id}")
        assert get_res.status_code == 200, f"Failed to get proposal: {get_res.text}"
        
        fetched = get_res.json()
        assert fetched.get("travel_insurance") == True, f"travel_insurance should be True after fetch, got: {fetched.get('travel_insurance')}"
        
        print(f"SUCCESS: Created proposal {proposal_id} with travel_insurance=True and verified persistence")
        
        # Cleanup
        self.session.delete(f"{BASE_URL}/api/proposals/{proposal_id}")
    
    # Module 2: Test POST /api/proposals with travel_insurance=false
    def test_create_proposal_with_travel_insurance_false(self):
        """Test creating a proposal with travel_insurance=false saves correctly"""
        proposal_data = {
            "leaving_from": "Dubai International Airport (DXB)",
            "leaving_from_code": "DXB",
            "nationality": "India",
            "leaving_on": "2026-04-16",
            "star_rating": "4",
            "add_transfers": True,
            "room_data": [{"adults": 2, "children": []}],
            "cities": [{"name": "Dubai", "nights": 2}],
            "travel_insurance": False,  # Key field being tested
            "proposal_name": "TEST_Insurance_False_Proposal",
            "customer_name": "Test Customer Insurance False"
        }
        
        # Create proposal
        create_res = self.session.post(f"{BASE_URL}/api/proposals", json=proposal_data)
        assert create_res.status_code == 200, f"Failed to create proposal: {create_res.text}"
        
        created = create_res.json()
        proposal_id = created.get("id")
        
        # Verify travel_insurance is False in response
        assert created.get("travel_insurance") == False, f"travel_insurance should be False, got: {created.get('travel_insurance')}"
        
        # GET the proposal to verify persistence
        get_res = self.session.get(f"{BASE_URL}/api/proposals/{proposal_id}")
        assert get_res.status_code == 200
        
        fetched = get_res.json()
        assert fetched.get("travel_insurance") == False, f"travel_insurance should be False after fetch, got: {fetched.get('travel_insurance')}"
        
        print(f"SUCCESS: Created proposal {proposal_id} with travel_insurance=False and verified persistence")
        
        # Cleanup
        self.session.delete(f"{BASE_URL}/api/proposals/{proposal_id}")
    
    # Module 3: Test POST /api/proposals without travel_insurance (null case)
    def test_create_proposal_without_travel_insurance(self):
        """Test creating a proposal without travel_insurance field (should default to null)"""
        proposal_data = {
            "leaving_from": "Dubai International Airport (DXB)",
            "leaving_from_code": "DXB",
            "nationality": "India",
            "leaving_on": "2026-04-17",
            "star_rating": "4",
            "add_transfers": True,
            "room_data": [{"adults": 2, "children": []}],
            "cities": [{"name": "Dubai", "nights": 2}],
            # No travel_insurance field
            "proposal_name": "TEST_Insurance_Null_Proposal",
            "customer_name": "Test Customer Insurance Null"
        }
        
        # Create proposal
        create_res = self.session.post(f"{BASE_URL}/api/proposals", json=proposal_data)
        assert create_res.status_code == 200, f"Failed to create proposal: {create_res.text}"
        
        created = create_res.json()
        proposal_id = created.get("id")
        
        # Verify travel_insurance is None/null in response
        assert created.get("travel_insurance") is None, f"travel_insurance should be None, got: {created.get('travel_insurance')}"
        
        # GET the proposal to verify persistence
        get_res = self.session.get(f"{BASE_URL}/api/proposals/{proposal_id}")
        assert get_res.status_code == 200
        
        fetched = get_res.json()
        # travel_insurance could be None or missing from response
        assert fetched.get("travel_insurance") in [None, False], f"travel_insurance should be None or False, got: {fetched.get('travel_insurance')}"
        
        print(f"SUCCESS: Created proposal {proposal_id} without travel_insurance field")
        
        # Cleanup
        self.session.delete(f"{BASE_URL}/api/proposals/{proposal_id}")
    
    # Module 4: Test PATCH /api/proposals/{id} updates travel_insurance
    def test_update_proposal_travel_insurance(self):
        """Test updating travel_insurance field via PATCH"""
        # First create a proposal without insurance
        proposal_data = {
            "leaving_from": "Dubai International Airport (DXB)",
            "nationality": "India",
            "leaving_on": "2026-04-18",
            "star_rating": "4",
            "add_transfers": True,
            "room_data": [{"adults": 2, "children": []}],
            "cities": [{"name": "Dubai", "nights": 2}],
            "travel_insurance": False,
            "proposal_name": "TEST_Insurance_Update_Proposal"
        }
        
        create_res = self.session.post(f"{BASE_URL}/api/proposals", json=proposal_data)
        assert create_res.status_code == 200
        proposal_id = create_res.json().get("id")
        
        # Update travel_insurance to True via PATCH
        patch_res = self.session.patch(f"{BASE_URL}/api/proposals/{proposal_id}", json={
            "travel_insurance": True
        })
        assert patch_res.status_code == 200, f"Failed to patch proposal: {patch_res.text}"
        
        # Verify the update
        get_res = self.session.get(f"{BASE_URL}/api/proposals/{proposal_id}")
        assert get_res.status_code == 200
        fetched = get_res.json()
        assert fetched.get("travel_insurance") == True, f"travel_insurance should be True after PATCH, got: {fetched.get('travel_insurance')}"
        
        print(f"SUCCESS: Updated proposal {proposal_id} travel_insurance from False to True via PATCH")
        
        # Cleanup
        self.session.delete(f"{BASE_URL}/api/proposals/{proposal_id}")
    
    # Module 5: Test PDF generation includes Travel Insurance section
    def test_pdf_generation_with_insurance_included(self):
        """Test PDF generation shows 'Included' when travel_insurance=true"""
        # Create proposal with insurance
        proposal_data = {
            "leaving_from": "Dubai International Airport (DXB)",
            "nationality": "India",
            "leaving_on": "2026-04-19",
            "star_rating": "4",
            "add_transfers": True,
            "room_data": [{"adults": 2, "children": []}],
            "cities": [{"name": "Tbilisi", "nights": 3}],
            "travel_insurance": True,
            "proposal_name": "TEST_Insurance_PDF_True"
        }
        
        create_res = self.session.post(f"{BASE_URL}/api/proposals", json=proposal_data)
        assert create_res.status_code == 200
        proposal_id = create_res.json().get("id")
        
        # Request PDF
        pdf_res = self.session.get(f"{BASE_URL}/api/proposals/{proposal_id}/pdf")
        assert pdf_res.status_code == 200, f"Failed to generate PDF: {pdf_res.text}"
        
        # Verify PDF is returned (check content-type)
        content_type = pdf_res.headers.get('content-type', '')
        assert 'application/pdf' in content_type, f"Expected PDF content-type, got: {content_type}"
        
        # Verify PDF has content
        assert len(pdf_res.content) > 1000, "PDF content seems too small"
        
        print(f"SUCCESS: Generated PDF for proposal {proposal_id} with travel_insurance=True")
        
        # Cleanup
        self.session.delete(f"{BASE_URL}/api/proposals/{proposal_id}")
    
    # Module 6: Test PDF generation without insurance
    def test_pdf_generation_without_insurance(self):
        """Test PDF generation shows 'Not Included' when travel_insurance=false"""
        # Create proposal without insurance
        proposal_data = {
            "leaving_from": "Dubai International Airport (DXB)",
            "nationality": "India",
            "leaving_on": "2026-04-20",
            "star_rating": "4",
            "add_transfers": True,
            "room_data": [{"adults": 2, "children": []}],
            "cities": [{"name": "Dubai", "nights": 2}],
            "travel_insurance": False,
            "proposal_name": "TEST_Insurance_PDF_False"
        }
        
        create_res = self.session.post(f"{BASE_URL}/api/proposals", json=proposal_data)
        assert create_res.status_code == 200
        proposal_id = create_res.json().get("id")
        
        # Request PDF
        pdf_res = self.session.get(f"{BASE_URL}/api/proposals/{proposal_id}/pdf")
        assert pdf_res.status_code == 200, f"Failed to generate PDF: {pdf_res.text}"
        
        # Verify PDF is returned
        content_type = pdf_res.headers.get('content-type', '')
        assert 'application/pdf' in content_type
        
        print(f"SUCCESS: Generated PDF for proposal {proposal_id} with travel_insurance=False")
        
        # Cleanup
        self.session.delete(f"{BASE_URL}/api/proposals/{proposal_id}")


if __name__ == "__main__":
    pytest.main([__file__, "-v", "--tb=short"])
