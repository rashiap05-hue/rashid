"""
Tests for Transfer Management CRUD operations
Tests: GET /api/transfers, POST /api/transfers, GET /api/transfers/{id}, PUT /api/transfers/{id}, DELETE /api/transfers/{id}
"""
import pytest
import requests
import os
import uuid

BASE_URL = os.environ.get('REACT_APP_BACKEND_URL', '').rstrip('/')

class TestTransfersCRUD:
    """Transfer Management CRUD tests"""
    
    @pytest.fixture(autouse=True)
    def setup(self):
        """Setup test session"""
        self.session = requests.Session()
        self.session.headers.update({"Content-Type": "application/json"})
        self.created_transfer_ids = []
        yield
        # Cleanup: Delete any test transfers created during tests
        for transfer_id in self.created_transfer_ids:
            try:
                self.session.delete(f"{BASE_URL}/api/transfers/{transfer_id}")
            except:
                pass
    
    # ========== GET /api/transfers Tests ==========
    
    def test_get_all_transfers_success(self):
        """Test GET /api/transfers returns success and transfers array"""
        response = self.session.get(f"{BASE_URL}/api/transfers")
        assert response.status_code == 200
        data = response.json()
        assert data["success"] == True
        assert "transfers" in data
        assert isinstance(data["transfers"], list)
        print(f"✓ GET /api/transfers returned {len(data['transfers'])} transfers")
    
    def test_get_transfers_with_city_filter(self):
        """Test GET /api/transfers with city filter"""
        response = self.session.get(f"{BASE_URL}/api/transfers?city=Dubai")
        assert response.status_code == 200
        data = response.json()
        assert data["success"] == True
        # All returned transfers should be for Dubai
        for transfer in data["transfers"]:
            assert "dubai" in transfer["city"].lower()
        print(f"✓ City filter returned {len(data['transfers'])} Dubai transfers")
    
    def test_get_transfers_with_search_filter(self):
        """Test GET /api/transfers with search filter"""
        response = self.session.get(f"{BASE_URL}/api/transfers?search=Airport")
        assert response.status_code == 200
        data = response.json()
        assert data["success"] == True
        print(f"✓ Search filter returned {len(data['transfers'])} transfers")
    
    def test_seeded_transfers_have_required_fields(self):
        """Verify seeded transfers have all required fields"""
        response = self.session.get(f"{BASE_URL}/api/transfers")
        assert response.status_code == 200
        transfers = response.json()["transfers"]
        assert len(transfers) >= 5, "Expected at least 5 seeded transfers"
        
        required_fields = ["id", "title", "from_location", "to_location", "price", 
                          "description", "duration", "transfer_type", "city", "is_available"]
        
        for transfer in transfers:
            for field in required_fields:
                assert field in transfer, f"Missing field: {field}"
        print(f"✓ All {len(transfers)} transfers have required fields")
    
    def test_transfer_types_are_valid(self):
        """Verify transfer_type values are Private, Shared, or Luxury"""
        response = self.session.get(f"{BASE_URL}/api/transfers")
        transfers = response.json()["transfers"]
        valid_types = ["Private", "Shared", "Luxury"]
        
        for transfer in transfers:
            assert transfer["transfer_type"] in valid_types, f"Invalid type: {transfer['transfer_type']}"
        print(f"✓ All transfer types are valid (Private/Shared/Luxury)")
    
    # ========== POST /api/transfers Tests ==========
    
    def test_create_transfer_success(self):
        """Test POST /api/transfers creates new transfer"""
        unique_id = str(uuid.uuid4())[:8]
        payload = {
            "title": f"TEST_Transfer_{unique_id}",
            "from_location": "Test Airport",
            "to_location": "Test Hotel",
            "price": 100,
            "description": "Test transfer description",
            "duration": "2 hrs",
            "confirmation_time": "4 hrs",
            "transfer_type": "Private",
            "city": "Test City",
            "is_available": True
        }
        
        response = self.session.post(f"{BASE_URL}/api/transfers", json=payload)
        assert response.status_code == 200
        data = response.json()
        assert data["success"] == True
        assert "id" in data
        
        transfer_id = data["id"]
        self.created_transfer_ids.append(transfer_id)
        
        # Verify transfer was created by fetching it
        get_response = self.session.get(f"{BASE_URL}/api/transfers/{transfer_id}")
        assert get_response.status_code == 200
        created = get_response.json()["transfer"]
        assert created["title"] == payload["title"]
        assert created["price"] == payload["price"]
        assert created["transfer_type"] == payload["transfer_type"]
        print(f"✓ Transfer created successfully with ID: {transfer_id}")
    
    def test_create_transfer_with_all_fields(self):
        """Test POST /api/transfers with all fields including extras"""
        unique_id = str(uuid.uuid4())[:8]
        payload = {
            "title": f"TEST_LuxuryTransfer_{unique_id}",
            "from_location": "Premium Airport Terminal",
            "to_location": "5-Star Resort",
            "price": 500,
            "description": "Luxury VIP transfer with all amenities",
            "duration": "1.5 hrs",
            "confirmation_time": "2 hrs",
            "transfer_type": "Luxury",
            "city": "Dubai",
            "extras": [
                {"name": "VIP Lounge Access", "price": 100, "duration": "2 hrs"},
                {"name": "Personal Butler", "price": 200}
            ],
            "is_available": True
        }
        
        response = self.session.post(f"{BASE_URL}/api/transfers", json=payload)
        assert response.status_code == 200
        data = response.json()
        assert data["success"] == True
        
        transfer_id = data["id"]
        self.created_transfer_ids.append(transfer_id)
        
        # Verify all fields persisted
        get_response = self.session.get(f"{BASE_URL}/api/transfers/{transfer_id}")
        created = get_response.json()["transfer"]
        assert created["transfer_type"] == "Luxury"
        assert created["price"] == 500
        print(f"✓ Transfer with all fields created: {transfer_id}")
    
    def test_create_shared_transfer_type(self):
        """Test creating transfer with Shared type"""
        unique_id = str(uuid.uuid4())[:8]
        payload = {
            "title": f"TEST_SharedTransfer_{unique_id}",
            "from_location": "Bus Station",
            "to_location": "City Center",
            "price": 25,
            "description": "Shared shuttle service",
            "duration": "2 hrs",
            "confirmation_time": "6 hrs",
            "transfer_type": "Shared",
            "city": "Test City",
            "is_available": True
        }
        
        response = self.session.post(f"{BASE_URL}/api/transfers", json=payload)
        assert response.status_code == 200
        
        transfer_id = response.json()["id"]
        self.created_transfer_ids.append(transfer_id)
        
        get_response = self.session.get(f"{BASE_URL}/api/transfers/{transfer_id}")
        assert get_response.json()["transfer"]["transfer_type"] == "Shared"
        print(f"✓ Shared transfer type created successfully")
    
    # ========== GET /api/transfers/{id} Tests ==========
    
    def test_get_transfer_by_id_success(self):
        """Test GET /api/transfers/{id} returns correct transfer"""
        # First get all transfers to get a valid ID
        response = self.session.get(f"{BASE_URL}/api/transfers")
        transfers = response.json()["transfers"]
        assert len(transfers) > 0
        
        transfer_id = transfers[0]["id"]
        get_response = self.session.get(f"{BASE_URL}/api/transfers/{transfer_id}")
        assert get_response.status_code == 200
        data = get_response.json()
        assert data["success"] == True
        assert data["transfer"]["id"] == transfer_id
        print(f"✓ GET /api/transfers/{transfer_id} returned correct transfer")
    
    def test_get_transfer_by_id_not_found(self):
        """Test GET /api/transfers/{id} returns 404 for invalid ID"""
        fake_id = "non-existent-id-12345"
        response = self.session.get(f"{BASE_URL}/api/transfers/{fake_id}")
        assert response.status_code == 404
        print(f"✓ 404 returned for non-existent transfer")
    
    # ========== PUT /api/transfers/{id} Tests ==========
    
    def test_update_transfer_success(self):
        """Test PUT /api/transfers/{id} updates transfer"""
        # Create a transfer first
        unique_id = str(uuid.uuid4())[:8]
        create_payload = {
            "title": f"TEST_ToUpdate_{unique_id}",
            "from_location": "Original Location",
            "to_location": "Original Destination",
            "price": 75,
            "description": "Original description",
            "duration": "1 hrs",
            "confirmation_time": "4 hrs",
            "transfer_type": "Private",
            "city": "Original City",
            "is_available": True
        }
        
        create_response = self.session.post(f"{BASE_URL}/api/transfers", json=create_payload)
        transfer_id = create_response.json()["id"]
        self.created_transfer_ids.append(transfer_id)
        
        # Update the transfer
        update_payload = {
            "title": f"TEST_Updated_{unique_id}",
            "from_location": "Updated Location",
            "to_location": "Updated Destination",
            "price": 150,
            "description": "Updated description",
            "duration": "2 hrs",
            "confirmation_time": "2 hrs",
            "transfer_type": "Luxury",
            "city": "Updated City",
            "is_available": False
        }
        
        update_response = self.session.put(f"{BASE_URL}/api/transfers/{transfer_id}", json=update_payload)
        assert update_response.status_code == 200
        assert update_response.json()["success"] == True
        
        # Verify update persisted
        get_response = self.session.get(f"{BASE_URL}/api/transfers/{transfer_id}")
        updated = get_response.json()["transfer"]
        assert updated["title"] == update_payload["title"]
        assert updated["price"] == 150
        assert updated["transfer_type"] == "Luxury"
        assert updated["is_available"] == False
        print(f"✓ Transfer updated successfully")
    
    def test_update_transfer_not_found(self):
        """Test PUT /api/transfers/{id} returns 404 for invalid ID"""
        fake_id = "non-existent-id-12345"
        payload = {
            "title": "Test",
            "from_location": "Test",
            "to_location": "Test",
            "price": 100,
            "description": "Test",
            "duration": "1 hrs",
            "confirmation_time": "4 hrs",
            "transfer_type": "Private",
            "city": "Test",
            "is_available": True
        }
        response = self.session.put(f"{BASE_URL}/api/transfers/{fake_id}", json=payload)
        assert response.status_code == 404
        print(f"✓ 404 returned for updating non-existent transfer")
    
    # ========== DELETE /api/transfers/{id} Tests ==========
    
    def test_delete_transfer_success(self):
        """Test DELETE /api/transfers/{id} removes transfer"""
        # Create a transfer first
        unique_id = str(uuid.uuid4())[:8]
        create_payload = {
            "title": f"TEST_ToDelete_{unique_id}",
            "from_location": "To Delete Location",
            "to_location": "To Delete Destination",
            "price": 50,
            "description": "To be deleted",
            "duration": "1 hrs",
            "confirmation_time": "4 hrs",
            "transfer_type": "Shared",
            "city": "Delete City",
            "is_available": True
        }
        
        create_response = self.session.post(f"{BASE_URL}/api/transfers", json=create_payload)
        transfer_id = create_response.json()["id"]
        # Don't add to cleanup list since we're deleting it
        
        # Delete the transfer
        delete_response = self.session.delete(f"{BASE_URL}/api/transfers/{transfer_id}")
        assert delete_response.status_code == 200
        assert delete_response.json()["success"] == True
        
        # Verify deletion
        get_response = self.session.get(f"{BASE_URL}/api/transfers/{transfer_id}")
        assert get_response.status_code == 404
        print(f"✓ Transfer deleted successfully")
    
    def test_delete_transfer_not_found(self):
        """Test DELETE /api/transfers/{id} returns 404 for invalid ID"""
        fake_id = "non-existent-id-12345"
        response = self.session.delete(f"{BASE_URL}/api/transfers/{fake_id}")
        assert response.status_code == 404
        print(f"✓ 404 returned for deleting non-existent transfer")


class TestTransfersDataIntegrity:
    """Tests for data integrity and edge cases"""
    
    @pytest.fixture(autouse=True)
    def setup(self):
        """Setup test session"""
        self.session = requests.Session()
        self.session.headers.update({"Content-Type": "application/json"})
        self.created_ids = []
        yield
        for tid in self.created_ids:
            try:
                self.session.delete(f"{BASE_URL}/api/transfers/{tid}")
            except:
                pass
    
    def test_transfer_price_is_numeric(self):
        """Test that transfer prices are stored as numbers"""
        response = self.session.get(f"{BASE_URL}/api/transfers")
        transfers = response.json()["transfers"]
        
        for transfer in transfers:
            assert isinstance(transfer["price"], (int, float)), f"Price should be numeric: {transfer['price']}"
        print(f"✓ All transfer prices are numeric")
    
    def test_create_transfer_with_zero_price(self):
        """Test creating transfer with zero price (valid for complimentary)"""
        unique_id = str(uuid.uuid4())[:8]
        payload = {
            "title": f"TEST_Complimentary_{unique_id}",
            "from_location": "Hotel",
            "to_location": "Airport",
            "price": 0,
            "description": "Complimentary transfer",
            "duration": "30 mins",
            "confirmation_time": "4 hrs",
            "transfer_type": "Private",
            "city": "Test",
            "is_available": True
        }
        
        response = self.session.post(f"{BASE_URL}/api/transfers", json=payload)
        assert response.status_code == 200
        self.created_ids.append(response.json()["id"])
        print(f"✓ Zero price transfer created successfully")
    
    def test_seeded_data_count(self):
        """Verify 5 transfers are seeded on startup"""
        response = self.session.get(f"{BASE_URL}/api/transfers")
        transfers = response.json()["transfers"]
        # Should have at least 5 seeded transfers
        assert len(transfers) >= 5, f"Expected at least 5 seeded transfers, got {len(transfers)}"
        print(f"✓ Found {len(transfers)} transfers (including {min(5, len(transfers))} seeded)")


if __name__ == "__main__":
    pytest.main([__file__, "-v"])
