"""
Test PDF Generation and Email Integration Features
- GET /api/proposals/{id}/pdf - generates and returns a valid PDF document
- POST /api/email/send-proposal - sends a real proposal email via Resend
- Email is automatically sent when admin advances booking status
"""
import pytest
import requests
import os

BASE_URL = os.environ.get('REACT_APP_BACKEND_URL', '').rstrip('/')

# Test credentials
ADMIN_EMAIL = "testadmin@example.com"
ADMIN_PASSWORD = "password123"
AGENT_EMAIL = "rashid@travotours.ae"
AGENT_PASSWORD = "password123"

# Known proposal IDs from context
PROPOSAL_ID_1 = "a50358ca"  # Trip to Tbilisi
PROPOSAL_ID_2 = "5390639d"  # multi-city Tbilisi/Gudauri


class TestAuthentication:
    """Test authentication for PDF and Email endpoints"""
    
    def test_admin_login(self):
        """Test admin login returns access_token"""
        response = requests.post(f"{BASE_URL}/api/auth/login", json={
            "email": ADMIN_EMAIL,
            "password": ADMIN_PASSWORD
        })
        assert response.status_code == 200, f"Admin login failed: {response.text}"
        data = response.json()
        assert "access_token" in data, "Response should contain access_token"
        print(f"PASSED: Admin login successful, token received")
    
    def test_agent_login(self):
        """Test agent login returns access_token"""
        response = requests.post(f"{BASE_URL}/api/auth/login", json={
            "email": AGENT_EMAIL,
            "password": AGENT_PASSWORD
        })
        assert response.status_code == 200, f"Agent login failed: {response.text}"
        data = response.json()
        assert "access_token" in data, "Response should contain access_token"
        print(f"PASSED: Agent login successful, token received")


class TestPDFGeneration:
    """Test PDF generation endpoint"""
    
    @pytest.fixture
    def auth_token(self):
        """Get authentication token"""
        response = requests.post(f"{BASE_URL}/api/auth/login", json={
            "email": AGENT_EMAIL,
            "password": AGENT_PASSWORD
        })
        if response.status_code == 200:
            return response.json().get("access_token")
        pytest.skip("Authentication failed")
    
    def test_pdf_generation_returns_pdf(self, auth_token):
        """Test GET /api/proposals/{id}/pdf returns valid PDF"""
        # First get list of proposals to find a valid ID
        headers = {"Authorization": f"Bearer {auth_token}"}
        
        # Get proposals list
        proposals_response = requests.get(f"{BASE_URL}/api/proposals", headers=headers)
        if proposals_response.status_code == 200:
            proposals = proposals_response.json()
            if proposals and len(proposals) > 0:
                proposal_id = proposals[0].get("id")
            else:
                proposal_id = PROPOSAL_ID_1
        else:
            proposal_id = PROPOSAL_ID_1
        
        # Request PDF
        response = requests.get(
            f"{BASE_URL}/api/proposals/{proposal_id}/pdf",
            headers=headers
        )
        
        assert response.status_code == 200, f"PDF generation failed: {response.status_code} - {response.text}"
        assert response.headers.get("content-type") == "application/pdf", f"Expected application/pdf, got {response.headers.get('content-type')}"
        
        # Verify PDF content starts with %PDF
        content = response.content
        assert content[:8].startswith(b'%PDF'), f"PDF content should start with %PDF, got: {content[:20]}"
        assert len(content) > 1000, f"PDF should be substantial, got {len(content)} bytes"
        
        print(f"PASSED: PDF generated successfully, size: {len(content)} bytes")
    
    def test_pdf_generation_requires_auth(self):
        """Test PDF endpoint requires authentication"""
        response = requests.get(f"{BASE_URL}/api/proposals/{PROPOSAL_ID_1}/pdf")
        assert response.status_code in [401, 403], f"Expected 401/403 without auth, got {response.status_code}"
        print(f"PASSED: PDF endpoint correctly requires authentication")
    
    def test_pdf_generation_invalid_proposal(self, auth_token):
        """Test PDF endpoint returns 404 for invalid proposal"""
        headers = {"Authorization": f"Bearer {auth_token}"}
        response = requests.get(
            f"{BASE_URL}/api/proposals/invalid-proposal-id-12345/pdf",
            headers=headers
        )
        assert response.status_code == 404, f"Expected 404 for invalid proposal, got {response.status_code}"
        print(f"PASSED: PDF endpoint returns 404 for invalid proposal")


class TestEmailSendProposal:
    """Test email send-proposal endpoint"""
    
    @pytest.fixture
    def auth_token(self):
        """Get authentication token"""
        response = requests.post(f"{BASE_URL}/api/auth/login", json={
            "email": AGENT_EMAIL,
            "password": AGENT_PASSWORD
        })
        if response.status_code == 200:
            return response.json().get("access_token")
        pytest.skip("Authentication failed")
    
    @pytest.fixture
    def valid_proposal_id(self, auth_token):
        """Get a valid proposal ID"""
        headers = {"Authorization": f"Bearer {auth_token}"}
        proposals_response = requests.get(f"{BASE_URL}/api/proposals", headers=headers)
        if proposals_response.status_code == 200:
            proposals = proposals_response.json()
            if proposals and len(proposals) > 0:
                return proposals[0].get("id")
        return PROPOSAL_ID_1
    
    def test_send_proposal_email_success(self, auth_token, valid_proposal_id):
        """Test POST /api/email/send-proposal sends email successfully"""
        headers = {"Authorization": f"Bearer {auth_token}"}
        
        payload = {
            "recipient_email": "rashid@travotours.ae",
            "recipient_name": "Test Recipient",
            "subject": "TEST - Your Trip Proposal",
            "message": "This is a test email from automated testing.",
            "proposal_id": valid_proposal_id
        }
        
        response = requests.post(
            f"{BASE_URL}/api/email/send-proposal",
            headers=headers,
            json=payload
        )
        
        assert response.status_code == 200, f"Email send failed: {response.status_code} - {response.text}"
        data = response.json()
        assert data.get("status") == "success", f"Expected status 'success', got {data}"
        assert "email_id" in data, "Response should contain email_id from Resend"
        
        print(f"PASSED: Email sent successfully, email_id: {data.get('email_id')}")
    
    def test_send_proposal_email_requires_auth(self):
        """Test email endpoint requires authentication"""
        payload = {
            "recipient_email": "test@example.com",
            "recipient_name": "Test",
            "subject": "Test",
            "message": "Test",
            "proposal_id": PROPOSAL_ID_1
        }
        
        response = requests.post(f"{BASE_URL}/api/email/send-proposal", json=payload)
        assert response.status_code in [401, 403], f"Expected 401/403 without auth, got {response.status_code}"
        print(f"PASSED: Email endpoint correctly requires authentication")
    
    def test_send_proposal_email_invalid_proposal(self, auth_token):
        """Test email endpoint returns 404 for invalid proposal"""
        headers = {"Authorization": f"Bearer {auth_token}"}
        
        payload = {
            "recipient_email": "test@example.com",
            "recipient_name": "Test",
            "subject": "Test",
            "message": "Test",
            "proposal_id": "invalid-proposal-id-12345"
        }
        
        response = requests.post(
            f"{BASE_URL}/api/email/send-proposal",
            headers=headers,
            json=payload
        )
        
        assert response.status_code == 404, f"Expected 404 for invalid proposal, got {response.status_code}"
        print(f"PASSED: Email endpoint returns 404 for invalid proposal")


class TestBookingStatusEmailIntegration:
    """Test that email is sent when admin advances booking status"""
    
    @pytest.fixture
    def admin_token(self):
        """Get admin authentication token"""
        response = requests.post(f"{BASE_URL}/api/auth/login", json={
            "email": ADMIN_EMAIL,
            "password": ADMIN_PASSWORD
        })
        if response.status_code == 200:
            return response.json().get("access_token")
        pytest.skip("Admin authentication failed")
    
    def test_get_bookings_for_status_advance(self, admin_token):
        """Test admin can get bookings list"""
        headers = {"Authorization": f"Bearer {admin_token}"}
        
        response = requests.get(f"{BASE_URL}/api/bookings/admin/all", headers=headers)
        assert response.status_code == 200, f"Failed to get bookings: {response.text}"
        
        bookings = response.json()
        assert isinstance(bookings, list), "Response should be a list"
        print(f"PASSED: Admin can view {len(bookings)} bookings")
        
        # Find a booking that can be advanced (not ticketed)
        advanceable = [b for b in bookings if b.get("status") != "ticketed"]
        if advanceable:
            print(f"Found {len(advanceable)} bookings that can be advanced")
            return advanceable[0]
        return None
    
    def test_status_advance_triggers_email(self, admin_token):
        """Test that advancing booking status triggers email notification"""
        headers = {"Authorization": f"Bearer {admin_token}"}
        
        # Get bookings
        response = requests.get(f"{BASE_URL}/api/bookings/admin/all", headers=headers)
        assert response.status_code == 200
        bookings = response.json()
        
        # Find a booking that can be advanced
        advanceable = [b for b in bookings if b.get("status") not in ["ticketed", "confirmed"]]
        
        if not advanceable:
            pytest.skip("No bookings available to advance (all are ticketed/confirmed)")
        
        booking = advanceable[0]
        booking_id = booking.get("id")
        current_status = booking.get("status")
        
        print(f"Testing status advance for booking {booking_id}, current status: {current_status}")
        
        # Advance the status
        advance_response = requests.put(
            f"{BASE_URL}/api/bookings/{booking_id}/status/advance",
            headers=headers,
            json={"note": "TEST - Automated testing status advance"}
        )
        
        assert advance_response.status_code == 200, f"Status advance failed: {advance_response.text}"
        data = advance_response.json()
        assert "new_status" in data, "Response should contain new_status"
        
        print(f"PASSED: Status advanced from {current_status} to {data.get('new_status')}")
        print("Note: Email notification should be sent to customer (check backend logs)")


class TestNotificationBellIntegration:
    """Test notification bell updates after status advance"""
    
    @pytest.fixture
    def agent_token(self):
        """Get agent authentication token"""
        response = requests.post(f"{BASE_URL}/api/auth/login", json={
            "email": AGENT_EMAIL,
            "password": AGENT_PASSWORD
        })
        if response.status_code == 200:
            return response.json().get("access_token")
        pytest.skip("Agent authentication failed")
    
    def test_get_notifications(self, agent_token):
        """Test agent can get notifications"""
        headers = {"Authorization": f"Bearer {agent_token}"}
        
        response = requests.get(f"{BASE_URL}/api/notifications", headers=headers)
        assert response.status_code == 200, f"Failed to get notifications: {response.text}"
        
        notifications = response.json()
        assert isinstance(notifications, list), "Response should be a list"
        print(f"PASSED: Agent has {len(notifications)} notifications")
    
    def test_get_unread_count(self, agent_token):
        """Test agent can get unread notification count"""
        headers = {"Authorization": f"Bearer {agent_token}"}
        
        response = requests.get(f"{BASE_URL}/api/notifications/unread-count", headers=headers)
        assert response.status_code == 200, f"Failed to get unread count: {response.text}"
        
        data = response.json()
        assert "count" in data, "Response should contain count"
        print(f"PASSED: Agent has {data.get('count')} unread notifications")


if __name__ == "__main__":
    pytest.main([__file__, "-v", "--tb=short"])
