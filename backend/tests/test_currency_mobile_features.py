"""
Test suite for Multi-currency support and Mobile responsive features
Tests: Currency API, Exchange rates, Currency conversion
"""
import pytest
import requests
import os

BASE_URL = os.environ.get('REACT_APP_BACKEND_URL', '').rstrip('/')

class TestCurrencyAPI:
    """Currency exchange rates API tests"""
    
    def test_currency_rates_endpoint_returns_200(self):
        """GET /api/currency/rates should return 200"""
        response = requests.get(f"{BASE_URL}/api/currency/rates")
        assert response.status_code == 200, f"Expected 200, got {response.status_code}"
        print("✓ Currency rates endpoint returns 200")
    
    def test_currency_rates_returns_all_supported_currencies(self):
        """Currency rates should include AED, USD, EUR, GBP, INR"""
        response = requests.get(f"{BASE_URL}/api/currency/rates")
        assert response.status_code == 200
        data = response.json()
        
        # Check rates object exists
        assert "rates" in data, "Response should contain 'rates' object"
        rates = data["rates"]
        
        # Check all supported currencies are present
        expected_currencies = ["AED", "USD", "EUR", "GBP", "INR"]
        for currency in expected_currencies:
            assert currency in rates, f"Currency {currency} should be in rates"
            assert isinstance(rates[currency], (int, float)), f"Rate for {currency} should be numeric"
        
        print(f"✓ All supported currencies present: {list(rates.keys())}")
    
    def test_currency_rates_aed_is_base(self):
        """AED should be the base currency with rate 1"""
        response = requests.get(f"{BASE_URL}/api/currency/rates")
        assert response.status_code == 200
        data = response.json()
        
        # Check base currency
        assert data.get("base") == "AED", "Base currency should be AED"
        assert data["rates"]["AED"] == 1, "AED rate should be 1 (base)"
        
        print("✓ AED is base currency with rate 1")
    
    def test_currency_rates_includes_metadata(self):
        """Currency rates should include currency metadata (symbol, name)"""
        response = requests.get(f"{BASE_URL}/api/currency/rates")
        assert response.status_code == 200
        data = response.json()
        
        # Check currencies metadata
        assert "currencies" in data, "Response should contain 'currencies' metadata"
        currencies = data["currencies"]
        
        # Verify metadata structure
        for code in ["AED", "USD", "EUR", "GBP", "INR"]:
            assert code in currencies, f"Currency metadata for {code} should exist"
            assert "symbol" in currencies[code], f"Symbol for {code} should exist"
            assert "name" in currencies[code], f"Name for {code} should exist"
        
        # Verify specific symbols
        assert currencies["USD"]["symbol"] == "$", "USD symbol should be $"
        assert currencies["EUR"]["symbol"] == "€", "EUR symbol should be €"
        assert currencies["GBP"]["symbol"] == "£", "GBP symbol should be £"
        assert currencies["INR"]["symbol"] == "₹", "INR symbol should be ₹"
        
        print("✓ Currency metadata includes symbols and names")
    
    def test_currency_rates_includes_timestamp(self):
        """Currency rates should include updated_at timestamp"""
        response = requests.get(f"{BASE_URL}/api/currency/rates")
        assert response.status_code == 200
        data = response.json()
        
        assert "updated_at" in data, "Response should contain 'updated_at' timestamp"
        assert data["updated_at"] is not None, "updated_at should not be null"
        
        print(f"✓ Currency rates include timestamp: {data['updated_at']}")
    
    def test_currency_rates_values_are_reasonable(self):
        """Exchange rates should be within reasonable ranges"""
        response = requests.get(f"{BASE_URL}/api/currency/rates")
        assert response.status_code == 200
        data = response.json()
        rates = data["rates"]
        
        # USD rate should be around 0.27 (1 AED ≈ 0.27 USD)
        assert 0.2 < rates["USD"] < 0.35, f"USD rate {rates['USD']} seems unreasonable"
        
        # EUR rate should be around 0.25 (1 AED ≈ 0.25 EUR)
        assert 0.2 < rates["EUR"] < 0.35, f"EUR rate {rates['EUR']} seems unreasonable"
        
        # GBP rate should be around 0.21 (1 AED ≈ 0.21 GBP)
        assert 0.15 < rates["GBP"] < 0.30, f"GBP rate {rates['GBP']} seems unreasonable"
        
        # INR rate should be around 22-25 (1 AED ≈ 22-25 INR)
        assert 15 < rates["INR"] < 35, f"INR rate {rates['INR']} seems unreasonable"
        
        print(f"✓ Exchange rates are within reasonable ranges: USD={rates['USD']}, EUR={rates['EUR']}, GBP={rates['GBP']}, INR={rates['INR']}")


class TestAuthAndBookings:
    """Test auth and bookings endpoints for currency display"""
    
    @pytest.fixture
    def auth_token(self):
        """Get authentication token for agent"""
        response = requests.post(f"{BASE_URL}/api/auth/login", json={
            "email": "rashid@travotours.ae",
            "password": "password123"
        })
        if response.status_code == 200:
            return response.json().get("access_token")
        pytest.skip("Authentication failed")
    
    def test_agent_login_success(self):
        """Agent login should return access_token"""
        response = requests.post(f"{BASE_URL}/api/auth/login", json={
            "email": "rashid@travotours.ae",
            "password": "password123"
        })
        assert response.status_code == 200, f"Expected 200, got {response.status_code}"
        data = response.json()
        assert "access_token" in data, "Response should contain access_token"
        assert "user" in data, "Response should contain user object"
        print("✓ Agent login successful")
    
    def test_held_bookings_returns_data(self, auth_token):
        """GET /api/held-bookings should return bookings list"""
        headers = {"Authorization": f"Bearer {auth_token}"}
        response = requests.get(f"{BASE_URL}/api/held-bookings", headers=headers)
        assert response.status_code == 200, f"Expected 200, got {response.status_code}"
        data = response.json()
        assert isinstance(data, list), "Response should be a list"
        print(f"✓ Held bookings returned {len(data)} bookings")
        
        # Check if bookings have price fields for currency conversion
        if len(data) > 0:
            booking = data[0]
            assert "total_price" in booking or "price" in booking, "Booking should have price field"
            print(f"✓ Booking has price field: {booking.get('total_price', booking.get('price'))}")
    
    def test_booking_detail_returns_price(self, auth_token):
        """GET /api/held-bookings/{id} should return booking with price"""
        headers = {"Authorization": f"Bearer {auth_token}"}
        
        # First get list of bookings
        list_response = requests.get(f"{BASE_URL}/api/held-bookings", headers=headers)
        if list_response.status_code != 200 or len(list_response.json()) == 0:
            pytest.skip("No bookings available to test")
        
        booking_id = list_response.json()[0]["id"]
        
        # Get booking detail
        response = requests.get(f"{BASE_URL}/api/held-bookings/{booking_id}", headers=headers)
        assert response.status_code == 200, f"Expected 200, got {response.status_code}"
        data = response.json()
        
        assert "booking" in data, "Response should contain booking object"
        booking = data["booking"]
        assert "total_price" in booking, "Booking should have total_price"
        
        print(f"✓ Booking detail has total_price: {booking['total_price']}")


class TestNotifications:
    """Test notifications for mobile bell icon"""
    
    @pytest.fixture
    def auth_token(self):
        """Get authentication token"""
        response = requests.post(f"{BASE_URL}/api/auth/login", json={
            "email": "rashid@travotours.ae",
            "password": "password123"
        })
        if response.status_code == 200:
            return response.json().get("access_token")
        pytest.skip("Authentication failed")
    
    def test_notifications_endpoint(self, auth_token):
        """GET /api/notifications should return notifications list"""
        headers = {"Authorization": f"Bearer {auth_token}"}
        response = requests.get(f"{BASE_URL}/api/notifications", headers=headers)
        assert response.status_code == 200, f"Expected 200, got {response.status_code}"
        data = response.json()
        assert isinstance(data, list), "Response should be a list"
        print(f"✓ Notifications endpoint returned {len(data)} notifications")
    
    def test_unread_count_endpoint(self, auth_token):
        """GET /api/notifications/unread-count should return count"""
        headers = {"Authorization": f"Bearer {auth_token}"}
        response = requests.get(f"{BASE_URL}/api/notifications/unread-count", headers=headers)
        assert response.status_code == 200, f"Expected 200, got {response.status_code}"
        data = response.json()
        assert "count" in data, "Response should contain count"
        assert isinstance(data["count"], int), "Count should be integer"
        print(f"✓ Unread count: {data['count']}")


if __name__ == "__main__":
    pytest.main([__file__, "-v", "--tb=short"])
