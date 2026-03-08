"""
Test suite for Terms & Policies API endpoints
Tests dynamic terms loading for ProposalView page
"""

import pytest
import requests
import os

BASE_URL = os.environ.get('REACT_APP_BACKEND_URL', '').rstrip('/')


class TestTermsPoliciesAPI:
    """Tests for Terms & Policies endpoints"""
    
    def test_get_all_terms_policies(self):
        """Test getting all active terms and policies"""
        response = requests.get(f"{BASE_URL}/api/terms-policies")
        assert response.status_code == 200
        
        data = response.json()
        assert isinstance(data, list)
        assert len(data) >= 1, "Expected at least 1 term/policy"
        
        # Verify structure of terms
        if data:
            term = data[0]
            assert "id" in term
            assert "title" in term
            assert "is_active" in term
    
    def test_get_terms_with_active_filter(self):
        """Test getting only active terms"""
        response = requests.get(f"{BASE_URL}/api/terms-policies?active_only=true")
        assert response.status_code == 200
        
        data = response.json()
        # All returned terms should be active
        for term in data:
            assert term.get("is_active") == True
    
    def test_get_terms_by_city(self):
        """Test filtering terms by city (Tbilisi)"""
        response = requests.get(f"{BASE_URL}/api/terms-policies?city=Tbilisi&active_only=true")
        assert response.status_code == 200
        
        data = response.json()
        assert isinstance(data, list)
        # Should return global "all" policies plus any city-specific
        print(f"Found {len(data)} terms for Tbilisi")
    
    def test_get_terms_by_country(self):
        """Test filtering terms by country (Georgia)"""
        response = requests.get(f"{BASE_URL}/api/terms-policies?country=Georgia&active_only=true")
        assert response.status_code == 200
        
        data = response.json()
        assert isinstance(data, list)
        print(f"Found {len(data)} terms for Georgia")
    
    def test_terms_ordering(self):
        """Test that terms are returned in correct order"""
        response = requests.get(f"{BASE_URL}/api/terms-policies?active_only=true")
        assert response.status_code == 200
        
        data = response.json()
        # Verify ordering by 'order' field
        orders = [t.get("order", 0) for t in data]
        assert orders == sorted(orders), "Terms should be sorted by order"
    
    def test_term_structure(self):
        """Test that terms have all required fields"""
        response = requests.get(f"{BASE_URL}/api/terms-policies?active_only=true")
        assert response.status_code == 200
        
        data = response.json()
        required_fields = ["id", "title", "category", "is_active", "icon"]
        
        for term in data:
            for field in required_fields:
                assert field in term, f"Missing field '{field}' in term"
    
    def test_term_sub_sections(self):
        """Test that Important Notes has sub-sections (General, Hotel, etc.)"""
        response = requests.get(f"{BASE_URL}/api/terms-policies?active_only=true")
        assert response.status_code == 200
        
        data = response.json()
        
        # Find "Important Notes" term
        important_notes = None
        for term in data:
            if term.get("title") == "Important Notes":
                important_notes = term
                break
        
        assert important_notes is not None, "Important Notes term not found"
        assert "sub_sections" in important_notes
        
        sub_sections = important_notes.get("sub_sections", [])
        sub_section_titles = [s.get("title") for s in sub_sections]
        
        # Check for expected sub-sections
        assert "General" in sub_section_titles, "Missing 'General' sub-section"
        assert "Hotel" in sub_section_titles, "Missing 'Hotel' sub-section"
    
    def test_get_all_terms_admin(self):
        """Test admin endpoint returns all terms including inactive"""
        response = requests.get(f"{BASE_URL}/api/terms-policies/all")
        assert response.status_code == 200
        
        data = response.json()
        assert isinstance(data, list)
    
    def test_get_term_by_id(self):
        """Test getting a specific term by ID"""
        # First get all terms to get an ID
        response = requests.get(f"{BASE_URL}/api/terms-policies")
        assert response.status_code == 200
        
        data = response.json()
        if data:
            term_id = data[0]["id"]
            
            # Get specific term
            response = requests.get(f"{BASE_URL}/api/terms-policies/{term_id}")
            assert response.status_code == 200
            
            term = response.json()
            assert term["id"] == term_id
    
    def test_get_nonexistent_term(self):
        """Test 404 for non-existent term ID"""
        response = requests.get(f"{BASE_URL}/api/terms-policies/nonexistent-id-12345")
        assert response.status_code == 404
    
    def test_get_categories_list(self):
        """Test getting unique categories"""
        response = requests.get(f"{BASE_URL}/api/terms-policies/categories/list")
        assert response.status_code == 200
        
        data = response.json()
        assert isinstance(data, list)
    
    def test_get_countries_list(self):
        """Test getting countries with specific terms"""
        response = requests.get(f"{BASE_URL}/api/terms-policies/countries/list")
        assert response.status_code == 200
        
        data = response.json()
        assert isinstance(data, list)


class TestDeleteProposalAPI:
    """Tests for Proposal deletion endpoint"""
    
    def setup_method(self):
        """Get auth token for tests"""
        login_response = requests.post(
            f"{BASE_URL}/api/auth/login",
            json={"email": "testadmin@example.com", "password": "password123"}
        )
        if login_response.status_code == 200:
            self.token = login_response.json().get("access_token")
        else:
            self.token = None
    
    def test_delete_proposal_requires_auth(self):
        """Test that delete requires authentication"""
        # Get a proposal ID first
        response = requests.get(f"{BASE_URL}/api/proposals")
        proposals = response.json()
        
        if proposals:
            proposal_id = proposals[0]["id"]
            # Try delete without auth
            response = requests.delete(f"{BASE_URL}/api/proposals/{proposal_id}")
            assert response.status_code == 401
    
    def test_delete_nonexistent_proposal(self):
        """Test 404 for deleting non-existent proposal"""
        if not self.token:
            pytest.skip("No auth token available")
        
        headers = {"Authorization": f"Bearer {self.token}"}
        response = requests.delete(
            f"{BASE_URL}/api/proposals/nonexistent-id-12345",
            headers=headers
        )
        assert response.status_code == 404
    
    def test_create_and_delete_proposal(self):
        """Test creating and then deleting a proposal"""
        if not self.token:
            pytest.skip("No auth token available")
        
        headers = {"Authorization": f"Bearer {self.token}"}
        
        # Create a test proposal
        proposal_data = {
            "leaving_from": "Dubai (DXB)",
            "nationality": "India",
            "leaving_on": "2026-04-01",
            "star_rating": "4",
            "add_transfers": True,
            "room_data": [{"adults": 2, "children": []}],
            "cities": [{"name": "TEST_City", "nights": 2}]
        }
        
        create_response = requests.post(
            f"{BASE_URL}/api/proposals",
            json=proposal_data,
            headers=headers
        )
        assert create_response.status_code == 200
        
        created = create_response.json()
        proposal_id = created["id"]
        print(f"Created test proposal: {proposal_id[:8]}...")
        
        # Now delete it
        delete_response = requests.delete(
            f"{BASE_URL}/api/proposals/{proposal_id}",
            headers=headers
        )
        assert delete_response.status_code == 200
        
        result = delete_response.json()
        assert result.get("success") == True
        print(f"Successfully deleted proposal: {proposal_id[:8]}...")
        
        # Verify it's deleted
        get_response = requests.get(f"{BASE_URL}/api/proposals/{proposal_id}")
        assert get_response.status_code == 404


if __name__ == "__main__":
    pytest.main([__file__, "-v"])
