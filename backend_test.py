#!/usr/bin/env python3
"""
Backend API Testing Suite for Travo DMC B2B Travel Platform
Tests all API endpoints with proper authentication and data flow.
"""

import requests
import sys
import json
from datetime import datetime, date
from typing import Dict, Any, Optional

# Public endpoint from frontend .env
BACKEND_URL = "https://trip-builder-ui.preview.emergentagent.com"
API_BASE = f"{BACKEND_URL}/api"

class TravoAPITester:
    def __init__(self):
        self.session = requests.Session()
        self.session.headers.update({'Content-Type': 'application/json'})
        self.token: Optional[str] = None
        self.user_id: Optional[str] = None
        self.test_results = {
            'total': 0,
            'passed': 0,
            'failed': 0,
            'errors': []
        }

    def log_test(self, name: str, success: bool, details: str = ""):
        """Log test result"""
        self.test_results['total'] += 1
        if success:
            self.test_results['passed'] += 1
            print(f"✅ {name}: PASSED {details}")
        else:
            self.test_results['failed'] += 1
            self.test_results['errors'].append(f"{name}: {details}")
            print(f"❌ {name}: FAILED - {details}")

    def make_request(self, method: str, endpoint: str, data: Any = None, expected_status: int = 200) -> tuple[bool, Any]:
        """Make API request and return success status and response data"""
        url = f"{API_BASE}{endpoint}"
        
        # Add auth header if token exists
        headers = {}
        if self.token:
            headers['Authorization'] = f'Bearer {self.token}'
        
        try:
            if method.upper() == 'GET':
                response = self.session.get(url, headers=headers)
            elif method.upper() == 'POST':
                response = self.session.post(url, json=data, headers=headers)
            elif method.upper() == 'PUT':
                response = self.session.put(url, json=data, headers=headers)
            elif method.upper() == 'DELETE':
                response = self.session.delete(url, headers=headers)
            
            success = response.status_code == expected_status
            
            try:
                response_data = response.json()
            except:
                response_data = response.text
            
            return success, response_data
            
        except Exception as e:
            return False, str(e)

    def test_health_endpoints(self):
        """Test basic health and info endpoints"""
        print("\n🔍 Testing Health Endpoints...")
        
        # Test root endpoint
        success, data = self.make_request('GET', '')
        self.log_test("API Root", success, f"Response: {data}")
        
        # Test health endpoint
        success, data = self.make_request('GET', '/health')
        self.log_test("Health Check", success, f"Status: {data.get('status', 'unknown') if isinstance(data, dict) else data}")

    def test_auth_endpoints(self):
        """Test authentication endpoints"""
        print("\n🔍 Testing Authentication...")
        
        # Test user signup
        test_email = f"test_{datetime.now().strftime('%Y%m%d_%H%M%S')}@example.com"
        signup_data = {
            "email": test_email,
            "password": "TestPass123!",
            "full_name": "Test User",
            "company_name": "Test Travel Agency"
        }
        
        success, response = self.make_request('POST', '/auth/signup', signup_data)
        if success and isinstance(response, dict):
            self.token = response.get('access_token')
            user_data = response.get('user', {})
            self.user_id = user_data.get('id')
            self.log_test("User Signup", True, f"User ID: {self.user_id}")
        else:
            self.log_test("User Signup", False, str(response))
            return
        
        # Test user login
        login_data = {
            "email": test_email,
            "password": "TestPass123!"
        }
        
        success, response = self.make_request('POST', '/auth/login', login_data)
        if success and isinstance(response, dict):
            self.token = response.get('access_token')
            self.log_test("User Login", True, "Login successful")
        else:
            self.log_test("User Login", False, str(response))
        
        # Test get current user
        success, response = self.make_request('GET', '/auth/me')
        self.log_test("Get Current User", success, f"User: {response.get('full_name') if isinstance(response, dict) else response}")

    def test_data_endpoints(self):
        """Test data retrieval endpoints"""
        print("\n🔍 Testing Data Endpoints...")
        
        # Test airports
        success, response = self.make_request('GET', '/airports')
        airports_count = len(response.get('airports', [])) if isinstance(response, dict) else 0
        self.log_test("Get Airports", success, f"Found {airports_count} airports")
        
        # Test cities
        success, response = self.make_request('GET', '/cities')
        cities_count = len(response.get('cities', [])) if isinstance(response, dict) else 0
        self.log_test("Get Cities", success, f"Found {cities_count} cities")
        
        # Test hotels
        success, response = self.make_request('GET', '/hotels')
        hotels_count = len(response.get('hotels', [])) if isinstance(response, dict) else 0
        self.log_test("Get Hotels", success, f"Found {hotels_count} hotels")

    def test_flight_search(self):
        """Test flight search functionality"""
        print("\n🔍 Testing Flight Search...")
        
        # Test flight search with return_date for round trip
        search_data = {
            "from_airport": "Dubai (DXB)",
            "to_airport": "Tbilisi (TBS)",
            "depart_date": "2026-04-15",
            "return_date": "2026-04-20",
            "trip_type": "Round-trip",
            "cabin_class": "Economy"
        }
        
        success, response = self.make_request('POST', '/flights/search', search_data)
        if success and isinstance(response, dict):
            flights = response.get('flights', [])
            flights_count = len(flights)
            self.log_test("Flight Search", True, f"Found {flights_count} flights")
        else:
            self.log_test("Flight Search", False, str(response))

    def test_proposals(self):
        """Test proposal creation and management"""
        print("\n🔍 Testing Proposals...")
        
        # Create a test proposal
        proposal_data = {
            "leaving_from": "Dubai",
            "nationality": "United Arab Emirates",
            "leaving_on": "2026-04-15",
            "star_rating": "4",
            "add_transfers": True,
            "room_data": [
                {
                    "adults": 2,
                    "children": []
                }
            ],
            "cities": [
                {
                    "name": "Tbilisi",
                    "nights": 3
                },
                {
                    "name": "Batumi", 
                    "nights": 2
                }
            ]
        }
        
        success, response = self.make_request('POST', '/proposals/', proposal_data, expected_status=200)
        if success and isinstance(response, dict):
            proposal_id = response.get('id')
            total_price = response.get('total_price')
            self.log_test("Create Proposal", True, f"ID: {proposal_id}, Price: AED {total_price}")
            
            # Test get proposals
            success, response = self.make_request('GET', '/proposals/')
            proposals_count = len(response) if isinstance(response, list) else 0
            self.log_test("Get Proposals", success, f"Found {proposals_count} proposals")
            
            # Test get single proposal
            if proposal_id:
                success, response = self.make_request('GET', f'/proposals/{proposal_id}')
                self.log_test("Get Single Proposal", success, f"Retrieved proposal: {proposal_id}")
                
                # Test update proposal status
                success, response = self.make_request('PUT', f'/proposals/{proposal_id}/status?status=confirmed')
                self.log_test("Update Proposal Status", success, "Status updated to confirmed")
        elif isinstance(response, list) and len(response) == 0:
            self.log_test("Create Proposal", False, "API returned empty array instead of proposal object")
        else:
            self.log_test("Create Proposal", False, f"Unexpected response: {response}")

    def test_ai_endpoints(self):
        """Test AI chat functionality"""
        print("\n🔍 Testing AI Endpoints...")
        
        # Test AI chat
        chat_data = {
            "message": "What are the best destinations in Georgia?",
            "session_id": None
        }
        
        success, response = self.make_request('POST', '/ai/chat', chat_data)
        if success and isinstance(response, dict):
            ai_response = response.get('response', '')
            session_id = response.get('session_id', '')
            self.log_test("AI Chat", True, f"Response length: {len(ai_response)} chars, Session: {session_id[:8]}")
        else:
            self.log_test("AI Chat", False, str(response))

        # Test AI recommendations
        recommendations_data = {
            "preferences": "Beach vacation, luxury resorts, good food",
            "budget": "$5000",
            "duration": "7 days",
            "travelers": 2
        }
        
        success, response = self.make_request('POST', '/ai/recommendations', recommendations_data)
        if success and isinstance(response, dict):
            recommendations = response.get('recommendations', '')
            self.log_test("AI Recommendations", True, f"Recommendations generated: {len(recommendations)} chars")
        else:
            self.log_test("AI Recommendations", False, str(response))

    def test_payment_endpoints(self):
        """Test payment functionality"""
        print("\n🔍 Testing Payment Endpoints...")
        
        # Create a proposal first for payment testing
        proposal_data = {
            "leaving_from": "Dubai",
            "nationality": "United Arab Emirates", 
            "leaving_on": "2026-04-20",
            "star_rating": "5",
            "add_transfers": True,
            "room_data": [{"adults": 2, "children": []}],
            "cities": [{"name": "Dubai", "nights": 2}]
        }
        
        success, response = self.make_request('POST', '/proposals/', proposal_data)
        if success and isinstance(response, dict):
            proposal_id = response.get('id')
            
            # Test Stripe checkout creation
            success, response = self.make_request('POST', f'/payments/stripe/checkout?proposal_id={proposal_id}&origin_url={BACKEND_URL}')
            if success and isinstance(response, dict):
                checkout_url = response.get('url', '')
                session_id = response.get('session_id', '')
                self.log_test("Stripe Checkout Creation", True, f"Session: {session_id}")
            else:
                self.log_test("Stripe Checkout Creation", False, str(response))
        else:
            self.log_test("Payment Setup (Create Proposal)", False, str(response))

    def test_sheets_endpoints(self):
        """Test Google Sheets endpoints"""
        print("\n🔍 Testing Google Sheets Integration...")
        
        # Test sheets status
        success, response = self.make_request('GET', '/sheets/status')
        if success and isinstance(response, dict):
            configured = response.get('configured', False)
            self.log_test("Sheets Status", True, f"Configured: {configured}")
        else:
            self.log_test("Sheets Status", False, str(response))
        
        # Test sync proposals (should return mocked response)
        success, response = self.make_request('POST', '/sheets/sync/proposals')
        if success and isinstance(response, dict):
            data_count = response.get('data_count', 0)
            self.log_test("Sheets Sync Proposals", True, f"Data count: {data_count}")
        else:
            self.log_test("Sheets Sync Proposals", False, str(response))

    def test_admin_endpoints(self):
        """Test Admin endpoints"""
        print("\n🔍 Testing Admin Endpoints...")
        
        # Test admin stats
        success, response = self.make_request('GET', '/admin/stats')
        if success and isinstance(response, dict):
            stats = response.get('stats', {})
            total_users = stats.get('total_users', 0)
            total_proposals = stats.get('total_proposals', 0)
            confirmed_proposals = stats.get('confirmed_proposals', 0)
            total_revenue = stats.get('total_revenue', 0)
            self.log_test("Admin Stats", True, f"Users: {total_users}, Proposals: {total_proposals}, Confirmed: {confirmed_proposals}, Revenue: AED {total_revenue}")
        else:
            self.log_test("Admin Stats", False, str(response))
        
        # Test get all users
        success, response = self.make_request('GET', '/admin/users')
        if success and isinstance(response, dict):
            users = response.get('users', [])
            users_count = len(users)
            self.log_test("Admin Get All Users", True, f"Found {users_count} users")
            
            # Test user details if users exist
            if users and len(users) > 0:
                first_user = users[0]
                user_id = first_user.get('id')
                if user_id:
                    success, response = self.make_request('GET', f'/admin/users/{user_id}')
                    if success and isinstance(response, dict):
                        user_data = response.get('user', {})
                        user_stats = response.get('stats', {})
                        self.log_test("Admin Get User Details", True, f"User: {user_data.get('full_name')}, Proposals: {user_stats.get('proposals_count', 0)}")
                    else:
                        self.log_test("Admin Get User Details", False, str(response))
        else:
            self.log_test("Admin Get All Users", False, str(response))

    def run_all_tests(self):
        """Run all API tests"""
        print("🚀 Starting Travo DMC API Tests...")
        print(f"Backend URL: {BACKEND_URL}")
        
        self.test_health_endpoints()
        self.test_auth_endpoints()
        if self.token:  # Only proceed if authentication successful
            self.test_data_endpoints()
            self.test_flight_search() 
            self.test_proposals()
            self.test_ai_endpoints()
            self.test_payment_endpoints()
            self.test_sheets_endpoints()
            self.test_admin_endpoints()
        else:
            print("❌ Skipping remaining tests due to authentication failure")
        
        # Print summary
        print(f"\n📊 TEST SUMMARY")
        print(f"Total Tests: {self.test_results['total']}")
        print(f"Passed: {self.test_results['passed']}")
        print(f"Failed: {self.test_results['failed']}")
        print(f"Success Rate: {(self.test_results['passed']/self.test_results['total']*100):.1f}%")
        
        if self.test_results['errors']:
            print(f"\n❌ FAILED TESTS:")
            for error in self.test_results['errors']:
                print(f"  - {error}")
        
        return self.test_results['failed'] == 0

def main():
    """Main test function"""
    tester = TravoAPITester()
    success = tester.run_all_tests()
    return 0 if success else 1

if __name__ == "__main__":
    sys.exit(main())