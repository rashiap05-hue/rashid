"""
Test suite for Country-Based Insurance Pricing feature.
Tests all CRUD operations for insurance_prices collection:
- GET /api/settings/insurance (list all)
- GET /api/settings/insurance?country=X (specific country or fallback)
- POST /api/settings/insurance (create new country entry)
- PUT /api/settings/insurance/{id} (update existing entry)
- DELETE /api/settings/insurance/{id} (delete entry, not Default)
"""

import pytest
import requests
import os
import uuid

BASE_URL = os.environ.get('REACT_APP_BACKEND_URL', '').rstrip('/')

# Test credentials
ADMIN_EMAIL = "testadmin@example.com"
ADMIN_PASSWORD = "password123"


class TestInsuranceCountryPricing:
    """Insurance country-based pricing API tests"""
    
    @pytest.fixture(autouse=True)
    def setup(self):
        """Setup: Get auth token"""
        self.session = requests.Session()
        self.session.headers.update({"Content-Type": "application/json"})
        
        # Login to get token
        login_response = self.session.post(f"{BASE_URL}/api/auth/login", json={
            "email": ADMIN_EMAIL,
            "password": ADMIN_PASSWORD
        })
        if login_response.status_code == 200:
            data = login_response.json()
            self.token = data.get("access_token")
            self.session.headers.update({"Authorization": f"Bearer {self.token}"})
        else:
            pytest.skip(f"Login failed: {login_response.status_code} - {login_response.text}")
    
    # ============ GET - List all insurance prices ============
    def test_get_all_insurance_prices_no_param(self):
        """GET /api/settings/insurance - should return list of all insurance_prices"""
        response = self.session.get(f"{BASE_URL}/api/settings/insurance")
        
        assert response.status_code == 200, f"Expected 200, got {response.status_code}: {response.text}"
        
        data = response.json()
        assert "insurance_prices" in data, "Response should contain 'insurance_prices' key"
        assert isinstance(data["insurance_prices"], list), "insurance_prices should be a list"
        
        # Should have at least Default entry from seed data
        if len(data["insurance_prices"]) > 0:
            # Validate structure of entries
            entry = data["insurance_prices"][0]
            assert "id" in entry, "Entry should have 'id'"
            assert "country" in entry, "Entry should have 'country'"
            assert "price_per_person" in entry, "Entry should have 'price_per_person'"
            assert "currency" in entry, "Entry should have 'currency'"
            
            # Check Default exists
            countries = [e["country"] for e in data["insurance_prices"]]
            assert "Default" in countries, "Default entry should exist"
            print(f"Found {len(data['insurance_prices'])} insurance entries: {countries}")
    
    # ============ GET - Country-specific pricing ============
    def test_get_insurance_by_country_uae(self):
        """GET /api/settings/insurance?country=United%20Arab%20Emirates - should return UAE-specific pricing"""
        response = self.session.get(f"{BASE_URL}/api/settings/insurance?country=United%20Arab%20Emirates")
        
        assert response.status_code == 200, f"Expected 200, got {response.status_code}: {response.text}"
        
        data = response.json()
        # When country param is provided, returns single entry (not wrapped in insurance_prices)
        assert "country" in data, "Should return a single insurance entry"
        assert data["country"] == "United Arab Emirates", f"Expected UAE, got {data['country']}"
        assert data["price_per_person"] == 75, f"Expected price 75, got {data['price_per_person']}"
        print(f"UAE insurance: {data['price_per_person']} {data['currency']}")
    
    def test_get_insurance_by_country_georgia(self):
        """GET /api/settings/insurance?country=Georgia - should return Georgia-specific pricing"""
        response = self.session.get(f"{BASE_URL}/api/settings/insurance?country=Georgia")
        
        assert response.status_code == 200
        data = response.json()
        assert data["country"] == "Georgia"
        assert data["price_per_person"] == 40, f"Expected price 40, got {data['price_per_person']}"
        print(f"Georgia insurance: {data['price_per_person']} {data['currency']}")
    
    def test_get_insurance_fallback_to_default(self):
        """GET /api/settings/insurance?country=Brazil - should return Default fallback pricing"""
        response = self.session.get(f"{BASE_URL}/api/settings/insurance?country=Brazil")
        
        assert response.status_code == 200, f"Expected 200, got {response.status_code}: {response.text}"
        
        data = response.json()
        # Brazil doesn't have specific pricing, should fallback to Default
        assert data["country"] == "Default", f"Expected Default fallback, got {data['country']}"
        assert data["price_per_person"] == 50, f"Expected price 50, got {data['price_per_person']}"
        print(f"Brazil (fallback to Default): {data['price_per_person']} {data['currency']}")
    
    def test_get_insurance_default_direct(self):
        """GET /api/settings/insurance?country=Default - should return Default pricing directly"""
        response = self.session.get(f"{BASE_URL}/api/settings/insurance?country=Default")
        
        assert response.status_code == 200
        data = response.json()
        assert data["country"] == "Default"
        print(f"Default insurance: {data['price_per_person']} {data['currency']}")
    
    # ============ POST - Create new country entry ============
    def test_create_insurance_price_new_country(self):
        """POST /api/settings/insurance - should create a new country price entry"""
        unique_country = f"TEST_Country_{uuid.uuid4().hex[:6]}"
        
        payload = {
            "country": unique_country,
            "price_per_person": 65,
            "currency": "AED",
            "min_coverage": 75000,
            "max_age": 55,
            "description": f"Test insurance for {unique_country}"
        }
        
        response = self.session.post(f"{BASE_URL}/api/settings/insurance", json=payload)
        
        assert response.status_code == 200, f"Expected 200, got {response.status_code}: {response.text}"
        
        data = response.json()
        assert "id" in data, "Response should have 'id'"
        assert data["country"] == unique_country
        assert data["price_per_person"] == 65
        assert data["currency"] == "AED"
        assert data["min_coverage"] == 75000
        assert data["max_age"] == 55
        
        created_id = data["id"]
        print(f"Created insurance entry: {data['country']} (id: {created_id})")
        
        # Verify by GET
        verify_response = self.session.get(f"{BASE_URL}/api/settings/insurance?country={unique_country}")
        assert verify_response.status_code == 200
        verify_data = verify_response.json()
        assert verify_data["country"] == unique_country
        assert verify_data["price_per_person"] == 65
        print(f"Verified: {verify_data['country']} price = {verify_data['price_per_person']}")
        
        # Cleanup
        self.session.delete(f"{BASE_URL}/api/settings/insurance/{created_id}")
    
    def test_create_insurance_duplicate_country_fails(self):
        """POST /api/settings/insurance - should fail if country already exists"""
        # Try to create another Default entry
        payload = {
            "country": "Default",
            "price_per_person": 999,
            "currency": "AED"
        }
        
        response = self.session.post(f"{BASE_URL}/api/settings/insurance", json=payload)
        
        assert response.status_code == 400, f"Expected 400 for duplicate, got {response.status_code}"
        assert "already exists" in response.text.lower()
        print(f"Correctly rejected duplicate: {response.json().get('detail', '')}")
    
    def test_create_insurance_empty_country_fails(self):
        """POST /api/settings/insurance - should fail if country is empty"""
        payload = {
            "country": "",
            "price_per_person": 50,
            "currency": "AED"
        }
        
        response = self.session.post(f"{BASE_URL}/api/settings/insurance", json=payload)
        
        assert response.status_code == 400, f"Expected 400 for empty country, got {response.status_code}"
        print(f"Correctly rejected empty country: {response.json().get('detail', '')}")
    
    # ============ PUT - Update existing entry ============
    def test_update_insurance_price_existing_entry(self):
        """PUT /api/settings/insurance/{id} - should update existing country price entry"""
        # First create a test entry
        unique_country = f"TEST_Update_{uuid.uuid4().hex[:6]}"
        create_response = self.session.post(f"{BASE_URL}/api/settings/insurance", json={
            "country": unique_country,
            "price_per_person": 30,
            "currency": "AED",
            "min_coverage": 50000,
            "max_age": 60,
            "description": "Original description"
        })
        assert create_response.status_code == 200
        entry_id = create_response.json()["id"]
        
        # Update the entry
        update_payload = {
            "price_per_person": 45,
            "min_coverage": 80000,
            "max_age": 65,
            "description": "Updated description"
        }
        
        update_response = self.session.put(f"{BASE_URL}/api/settings/insurance/{entry_id}", json=update_payload)
        
        assert update_response.status_code == 200, f"Expected 200, got {update_response.status_code}: {update_response.text}"
        
        updated_data = update_response.json()
        assert updated_data["price_per_person"] == 45
        assert updated_data["min_coverage"] == 80000
        assert updated_data["max_age"] == 65
        assert updated_data["description"] == "Updated description"
        print(f"Updated {unique_country}: price={updated_data['price_per_person']}, coverage={updated_data['min_coverage']}")
        
        # Verify by GET
        verify_response = self.session.get(f"{BASE_URL}/api/settings/insurance?country={unique_country}")
        assert verify_response.status_code == 200
        verify_data = verify_response.json()
        assert verify_data["price_per_person"] == 45
        
        # Cleanup
        self.session.delete(f"{BASE_URL}/api/settings/insurance/{entry_id}")
    
    def test_update_insurance_nonexistent_id_fails(self):
        """PUT /api/settings/insurance/{id} - should return 404 for non-existent ID"""
        fake_id = str(uuid.uuid4())
        
        response = self.session.put(f"{BASE_URL}/api/settings/insurance/{fake_id}", json={
            "price_per_person": 100
        })
        
        assert response.status_code == 404, f"Expected 404, got {response.status_code}"
        print(f"Correctly returned 404 for non-existent ID")
    
    # ============ DELETE - Delete entry ============
    def test_delete_insurance_price_entry(self):
        """DELETE /api/settings/insurance/{id} - should delete a country price entry"""
        # First create a test entry
        unique_country = f"TEST_Delete_{uuid.uuid4().hex[:6]}"
        create_response = self.session.post(f"{BASE_URL}/api/settings/insurance", json={
            "country": unique_country,
            "price_per_person": 55,
            "currency": "AED"
        })
        assert create_response.status_code == 200
        entry_id = create_response.json()["id"]
        
        # Delete the entry
        delete_response = self.session.delete(f"{BASE_URL}/api/settings/insurance/{entry_id}")
        
        assert delete_response.status_code == 200, f"Expected 200, got {delete_response.status_code}: {delete_response.text}"
        
        data = delete_response.json()
        assert "message" in data or "deleted" in str(data).lower()
        print(f"Successfully deleted {unique_country}")
        
        # Verify deletion - should fallback to Default now
        verify_response = self.session.get(f"{BASE_URL}/api/settings/insurance?country={unique_country}")
        assert verify_response.status_code == 200
        verify_data = verify_response.json()
        assert verify_data["country"] == "Default", "Deleted country should fallback to Default"
    
    def test_delete_default_entry_fails(self):
        """DELETE /api/settings/insurance/{default_id} - should fail for Default entry"""
        # Get Default entry ID
        all_response = self.session.get(f"{BASE_URL}/api/settings/insurance")
        assert all_response.status_code == 200
        
        entries = all_response.json().get("insurance_prices", [])
        default_entry = next((e for e in entries if e["country"] == "Default"), None)
        
        if not default_entry:
            pytest.skip("Default entry not found")
        
        default_id = default_entry["id"]
        
        # Try to delete Default
        delete_response = self.session.delete(f"{BASE_URL}/api/settings/insurance/{default_id}")
        
        assert delete_response.status_code == 400, f"Expected 400 for Default deletion, got {delete_response.status_code}"
        assert "cannot delete" in delete_response.text.lower() or "default" in delete_response.text.lower()
        print(f"Correctly prevented Default deletion: {delete_response.json().get('detail', '')}")
    
    def test_delete_nonexistent_id_fails(self):
        """DELETE /api/settings/insurance/{id} - should return 404 for non-existent ID"""
        fake_id = str(uuid.uuid4())
        
        response = self.session.delete(f"{BASE_URL}/api/settings/insurance/{fake_id}")
        
        assert response.status_code == 404, f"Expected 404, got {response.status_code}"
        print("Correctly returned 404 for non-existent ID")
    
    # ============ Integration test - Full CRUD cycle ============
    def test_full_crud_cycle(self):
        """Full CRUD cycle test for insurance pricing"""
        unique_country = f"TEST_CRUD_{uuid.uuid4().hex[:6]}"
        
        # CREATE
        create_response = self.session.post(f"{BASE_URL}/api/settings/insurance", json={
            "country": unique_country,
            "price_per_person": 80,
            "currency": "USD",
            "min_coverage": 100000,
            "max_age": 70,
            "description": "Full cycle test"
        })
        assert create_response.status_code == 200
        entry_id = create_response.json()["id"]
        print(f"CREATE: {unique_country} with ID {entry_id}")
        
        # READ (by country)
        read_response = self.session.get(f"{BASE_URL}/api/settings/insurance?country={unique_country}")
        assert read_response.status_code == 200
        assert read_response.json()["country"] == unique_country
        print(f"READ: Found {unique_country}")
        
        # UPDATE
        update_response = self.session.put(f"{BASE_URL}/api/settings/insurance/{entry_id}", json={
            "price_per_person": 95,
            "description": "Updated in CRUD test"
        })
        assert update_response.status_code == 200
        assert update_response.json()["price_per_person"] == 95
        print(f"UPDATE: Price changed to 95")
        
        # DELETE
        delete_response = self.session.delete(f"{BASE_URL}/api/settings/insurance/{entry_id}")
        assert delete_response.status_code == 200
        print(f"DELETE: {unique_country} removed")
        
        # VERIFY deletion
        verify_response = self.session.get(f"{BASE_URL}/api/settings/insurance?country={unique_country}")
        assert verify_response.status_code == 200
        assert verify_response.json()["country"] == "Default", "Should fallback to Default after deletion"
        print("VERIFY: Correctly falls back to Default")


if __name__ == "__main__":
    pytest.main([__file__, "-v"])
