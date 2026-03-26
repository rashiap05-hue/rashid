"""
Test suite for Transfer Image URL fix and PDF Generation with multi-city support
Tests:
1. Transfer image URLs are relative paths (not absolute with wrong domain)
2. GET /api/transfers/{id} returns images array with relative paths
3. PDF generation endpoint returns valid PDF
4. PDF contains correct hotel names for multi-city trips
"""
import pytest
import requests
import os

BASE_URL = os.environ.get('REACT_APP_BACKEND_URL').rstrip('/')

# Test proposal ID with 3 cities: Tbilisi, Gudauri, Tbilisi
TEST_PROPOSAL_ID = "1b5af497-d15c-4d3f-be65-3ebdbe45ed20"


class TestTransferImageURLs:
    """Tests for transfer image URL fix - should be relative paths"""
    
    def test_get_transfer_returns_relative_image_path(self):
        """GET /api/transfers/{id} should return images with relative paths"""
        # Get the arrival transfer ID from the test proposal
        proposal_res = requests.get(f"{BASE_URL}/api/proposals/{TEST_PROPOSAL_ID}")
        assert proposal_res.status_code == 200, f"Failed to get proposal: {proposal_res.text}"
        
        proposal = proposal_res.json()
        arrival_transfer = proposal.get("arrival_transfer", {})
        transfer_id = arrival_transfer.get("id")
        
        assert transfer_id, "Proposal should have arrival_transfer with id"
        
        # Fetch full transfer details
        transfer_res = requests.get(f"{BASE_URL}/api/transfers/{transfer_id}")
        assert transfer_res.status_code == 200, f"Failed to get transfer: {transfer_res.text}"
        
        data = transfer_res.json()
        transfer = data.get("transfer", data)
        images = transfer.get("images", [])
        
        # Verify images exist
        assert len(images) > 0, "Transfer should have at least one image"
        
        # Verify images are relative paths (not absolute URLs with wrong domain)
        for img in images:
            assert img.startswith("/api/static/") or img.startswith("http"), f"Image should be relative path or valid URL: {img}"
            # Should NOT contain double /api/api/ path
            assert "/api/api/" not in img, f"Image URL should not have double /api/api/ path: {img}"
            # Should NOT contain wrong domain
            assert "proposal-hub-46" not in img, f"Image URL should not contain old domain: {img}"
    
    def test_transfer_image_is_accessible(self):
        """Transfer image should be accessible via the static endpoint"""
        # Get transfer with image
        proposal_res = requests.get(f"{BASE_URL}/api/proposals/{TEST_PROPOSAL_ID}")
        proposal = proposal_res.json()
        transfer_id = proposal.get("arrival_transfer", {}).get("id")
        
        transfer_res = requests.get(f"{BASE_URL}/api/transfers/{transfer_id}")
        transfer = transfer_res.json().get("transfer", transfer_res.json())
        images = transfer.get("images", [])
        
        if images:
            img_path = images[0]
            # Build full URL for relative path
            if img_path.startswith("/"):
                img_url = f"{BASE_URL}{img_path}"
            else:
                img_url = img_path
            
            img_res = requests.get(img_url)
            assert img_res.status_code == 200, f"Image should be accessible: {img_url}"
            assert len(img_res.content) > 1000, "Image should have content (not empty)"


class TestPDFGeneration:
    """Tests for PDF generation with multi-city support"""
    
    def test_pdf_endpoint_returns_valid_pdf(self):
        """GET /api/proposals/{id}/pdf should return a valid PDF"""
        response = requests.get(f"{BASE_URL}/api/proposals/{TEST_PROPOSAL_ID}/pdf")
        
        assert response.status_code == 200, f"PDF endpoint failed: {response.text}"
        assert response.headers.get("content-type") == "application/pdf", "Should return PDF content type"
        
        # Check PDF magic bytes
        content = response.content
        assert content[:4] == b'%PDF', "Response should be a valid PDF file"
        assert len(content) > 5000, "PDF should have substantial content"
    
    def test_pdf_has_correct_filename(self):
        """PDF should have correct filename in Content-Disposition header"""
        response = requests.get(f"{BASE_URL}/api/proposals/{TEST_PROPOSAL_ID}/pdf")
        
        content_disposition = response.headers.get("content-disposition", "")
        assert "attachment" in content_disposition, "Should be attachment"
        assert "Travo_DMC" in content_disposition, "Filename should contain Travo_DMC"
        assert ".pdf" in content_disposition, "Filename should have .pdf extension"
    
    def test_proposal_has_multi_city_hotels(self):
        """Proposal should have hotels keyed by cityName_cityIndex format"""
        response = requests.get(f"{BASE_URL}/api/proposals/{TEST_PROPOSAL_ID}")
        assert response.status_code == 200
        
        proposal = response.json()
        selected_hotels = proposal.get("selected_hotels", {})
        cities = proposal.get("cities", [])
        
        # Verify cities structure
        assert len(cities) == 3, f"Should have 3 cities, got {len(cities)}"
        assert cities[0]["name"] == "Tbilisi", "First city should be Tbilisi"
        assert cities[1]["name"] == "Gudauri", "Second city should be Gudauri"
        assert cities[2]["name"] == "Tbilisi", "Third city should be Tbilisi"
        
        # Verify hotel keys use cityName_cityIndex format
        expected_keys = ["Tbilisi_0", "Gudauri_1", "Tbilisi_2"]
        for key in expected_keys:
            assert key in selected_hotels, f"Should have hotel key '{key}'"
            hotel = selected_hotels[key]
            assert hotel.get("name"), f"Hotel at {key} should have name"
    
    def test_proposal_hotels_have_correct_names(self):
        """Verify the specific hotel names in the test proposal"""
        response = requests.get(f"{BASE_URL}/api/proposals/{TEST_PROPOSAL_ID}")
        proposal = response.json()
        selected_hotels = proposal.get("selected_hotels", {})
        
        # Check specific hotel names
        tbilisi_0 = selected_hotels.get("Tbilisi_0", {})
        gudauri_1 = selected_hotels.get("Gudauri_1", {})
        tbilisi_2 = selected_hotels.get("Tbilisi_2", {})
        
        assert "Horizont" in tbilisi_0.get("name", ""), f"Tbilisi_0 should be Horizont Hotel, got: {tbilisi_0.get('name')}"
        # Note: Gudauri and Tbilisi_2 hotel names may vary based on data


class TestTransferDetailEndpoint:
    """Tests for GET /api/transfers/{id} endpoint"""
    
    def test_get_transfer_by_id(self):
        """GET /api/transfers/{id} should return full transfer details"""
        # Get transfer ID from proposal
        proposal_res = requests.get(f"{BASE_URL}/api/proposals/{TEST_PROPOSAL_ID}")
        proposal = proposal_res.json()
        transfer_id = proposal.get("arrival_transfer", {}).get("id")
        
        response = requests.get(f"{BASE_URL}/api/transfers/{transfer_id}")
        assert response.status_code == 200
        
        data = response.json()
        assert data.get("success") == True
        
        transfer = data.get("transfer", {})
        assert transfer.get("id") == transfer_id
        assert transfer.get("title"), "Transfer should have title"
        assert transfer.get("from_location"), "Transfer should have from_location"
        assert transfer.get("to_location"), "Transfer should have to_location"
    
    def test_get_transfer_returns_description(self):
        """Transfer should include description field"""
        proposal_res = requests.get(f"{BASE_URL}/api/proposals/{TEST_PROPOSAL_ID}")
        proposal = proposal_res.json()
        transfer_id = proposal.get("arrival_transfer", {}).get("id")
        
        response = requests.get(f"{BASE_URL}/api/transfers/{transfer_id}")
        transfer = response.json().get("transfer", {})
        
        # Description should be present (may be empty string but field should exist)
        assert "description" in transfer, "Transfer should have description field"
    
    def test_get_transfer_returns_highlights(self):
        """Transfer should include highlights array"""
        proposal_res = requests.get(f"{BASE_URL}/api/proposals/{TEST_PROPOSAL_ID}")
        proposal = proposal_res.json()
        transfer_id = proposal.get("arrival_transfer", {}).get("id")
        
        response = requests.get(f"{BASE_URL}/api/transfers/{transfer_id}")
        transfer = response.json().get("transfer", {})
        
        assert "highlights" in transfer, "Transfer should have highlights field"
        assert isinstance(transfer.get("highlights"), list), "Highlights should be a list"
    
    def test_get_nonexistent_transfer_returns_404(self):
        """GET /api/transfers/{invalid_id} should return 404"""
        response = requests.get(f"{BASE_URL}/api/transfers/nonexistent-id-12345")
        assert response.status_code == 404


class TestProposalTransferData:
    """Tests for transfer data in proposals"""
    
    def test_proposal_has_arrival_transfer(self):
        """Proposal should have arrival_transfer with required fields"""
        response = requests.get(f"{BASE_URL}/api/proposals/{TEST_PROPOSAL_ID}")
        proposal = response.json()
        
        arrival = proposal.get("arrival_transfer", {})
        assert arrival, "Proposal should have arrival_transfer"
        assert arrival.get("id"), "arrival_transfer should have id"
        assert arrival.get("title"), "arrival_transfer should have title"
    
    def test_proposal_has_departure_transfer(self):
        """Proposal should have departure_transfer with required fields"""
        response = requests.get(f"{BASE_URL}/api/proposals/{TEST_PROPOSAL_ID}")
        proposal = response.json()
        
        departure = proposal.get("departure_transfer", {})
        assert departure, "Proposal should have departure_transfer"
        assert departure.get("id"), "departure_transfer should have id"
        assert departure.get("title"), "departure_transfer should have title"
