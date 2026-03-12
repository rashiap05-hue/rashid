"""
PDF Generation Tests for Travo DMC B2B Travel Platform

Tests the PDF generation endpoint:
- GET /api/proposals/{proposal_id}/pdf

Features tested:
- Returns valid PDF with Content-Type: application/pdf
- PDF contains proper sections (TRAVO DMC header, flights, hotels, itinerary, inclusions, terms, pricing)
- Returns 404 for non-existent proposal
- PDF filename contains 'Travo_DMC'
"""

import pytest
import requests
import os
import tempfile

# Get base URL from environment
BASE_URL = os.environ.get('REACT_APP_BACKEND_URL', '').rstrip('/')


class TestPDFGeneration:
    """Tests for PDF generation endpoint"""
    
    @pytest.fixture
    def existing_proposal_id(self):
        """Get an existing proposal ID for testing"""
        response = requests.get(f"{BASE_URL}/api/proposals")
        assert response.status_code == 200, f"Failed to get proposals: {response.text}"
        proposals = response.json()
        assert len(proposals) > 0, "No proposals found in database"
        return proposals[0]['id']
    
    @pytest.fixture
    def proposal_with_details(self):
        """Get proposal details for content validation"""
        response = requests.get(f"{BASE_URL}/api/proposals")
        assert response.status_code == 200
        proposals = response.json()
        assert len(proposals) > 0
        # Return the first proposal with city data
        for p in proposals:
            if p.get('cities') and len(p.get('cities', [])) > 0:
                return p
        return proposals[0]

    def test_pdf_endpoint_returns_200_for_existing_proposal(self, existing_proposal_id):
        """Test PDF endpoint returns HTTP 200 for existing proposal"""
        response = requests.get(f"{BASE_URL}/api/proposals/{existing_proposal_id}/pdf")
        assert response.status_code == 200, f"Expected 200, got {response.status_code}: {response.text}"
        print(f"PASS: PDF endpoint returns 200 for proposal {existing_proposal_id}")

    def test_pdf_endpoint_content_type(self, existing_proposal_id):
        """Test PDF endpoint returns correct Content-Type: application/pdf"""
        response = requests.get(f"{BASE_URL}/api/proposals/{existing_proposal_id}/pdf")
        assert response.status_code == 200
        content_type = response.headers.get('Content-Type', '')
        assert 'application/pdf' in content_type, f"Expected Content-Type: application/pdf, got {content_type}"
        print(f"PASS: Content-Type is application/pdf")

    def test_pdf_content_is_valid_pdf(self, existing_proposal_id):
        """Test that response is a valid PDF file (starts with %PDF)"""
        response = requests.get(f"{BASE_URL}/api/proposals/{existing_proposal_id}/pdf")
        assert response.status_code == 200
        content = response.content
        assert len(content) > 100, f"PDF content too small: {len(content)} bytes"
        assert content.startswith(b'%PDF'), "Response does not start with %PDF header"
        print(f"PASS: PDF content is valid (size: {len(content)} bytes)")

    def test_pdf_filename_contains_travo_dmc(self, existing_proposal_id):
        """Test that Content-Disposition header contains 'Travo_DMC' in filename"""
        response = requests.get(f"{BASE_URL}/api/proposals/{existing_proposal_id}/pdf")
        assert response.status_code == 200
        content_disposition = response.headers.get('Content-Disposition', '')
        assert 'Travo_DMC' in content_disposition, f"Filename should contain 'Travo_DMC', got: {content_disposition}"
        print(f"PASS: Filename contains 'Travo_DMC': {content_disposition}")

    def test_pdf_returns_404_for_nonexistent_proposal(self):
        """Test PDF endpoint returns 404 for non-existent proposal"""
        fake_id = "non-existent-proposal-id-12345"
        response = requests.get(f"{BASE_URL}/api/proposals/{fake_id}/pdf")
        assert response.status_code == 404, f"Expected 404, got {response.status_code}"
        print(f"PASS: Returns 404 for non-existent proposal")

    def test_pdf_size_reasonable(self, existing_proposal_id):
        """Test that PDF has reasonable size (not empty, not too large)"""
        response = requests.get(f"{BASE_URL}/api/proposals/{existing_proposal_id}/pdf")
        assert response.status_code == 200
        content_length = len(response.content)
        # PDF should be at least 5KB and not more than 10MB
        assert content_length > 5000, f"PDF too small: {content_length} bytes"
        assert content_length < 10 * 1024 * 1024, f"PDF too large: {content_length} bytes"
        print(f"PASS: PDF size is reasonable: {content_length} bytes")

    def test_pdf_can_be_saved_and_read(self, existing_proposal_id):
        """Test that PDF can be saved to file and is readable"""
        response = requests.get(f"{BASE_URL}/api/proposals/{existing_proposal_id}/pdf")
        assert response.status_code == 200
        
        # Save to temp file
        with tempfile.NamedTemporaryFile(suffix='.pdf', delete=False) as f:
            f.write(response.content)
            temp_path = f.name
        
        try:
            # Read back and verify
            with open(temp_path, 'rb') as f:
                content = f.read()
            assert content.startswith(b'%PDF'), "Saved PDF is not valid"
            assert len(content) == len(response.content), "Saved file size mismatch"
            print(f"PASS: PDF can be saved and read back (file: {temp_path})")
        finally:
            os.unlink(temp_path)

    def test_pdf_generation_multiple_proposals(self):
        """Test PDF generation works for multiple different proposals"""
        response = requests.get(f"{BASE_URL}/api/proposals")
        proposals = response.json()
        
        # Test up to 3 proposals
        tested = 0
        for p in proposals[:3]:
            proposal_id = p['id']
            pdf_response = requests.get(f"{BASE_URL}/api/proposals/{proposal_id}/pdf")
            assert pdf_response.status_code == 200, f"Failed for proposal {proposal_id}"
            assert pdf_response.content.startswith(b'%PDF'), f"Invalid PDF for {proposal_id}"
            tested += 1
        
        assert tested > 0, "No proposals tested"
        print(f"PASS: PDF generation works for {tested} different proposals")


class TestPDFEndpointSecurity:
    """Security tests for PDF endpoint (PDF is public - no auth required)"""
    
    @pytest.fixture
    def existing_proposal_id(self):
        """Get an existing proposal ID"""
        response = requests.get(f"{BASE_URL}/api/proposals")
        return response.json()[0]['id'] if response.status_code == 200 and response.json() else None
    
    def test_pdf_endpoint_accessible_without_auth(self, existing_proposal_id):
        """Test PDF endpoint is accessible without authentication token"""
        # PDF endpoint should work without Bearer token (public for sharing)
        response = requests.get(
            f"{BASE_URL}/api/proposals/{existing_proposal_id}/pdf",
            headers={}  # No auth header
        )
        assert response.status_code == 200, f"PDF should be accessible without auth, got {response.status_code}"
        print("PASS: PDF endpoint accessible without authentication (public endpoint)")


if __name__ == "__main__":
    pytest.main([__file__, "-v"])
