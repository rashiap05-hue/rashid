"""
Supplier Dashboard API Tests
Tests for supplier-specific endpoints: dashboard, transfers, bookings, earnings
"""
import pytest
import requests
import os

BASE_URL = os.environ.get('REACT_APP_BACKEND_URL', '').rstrip('/')

# Test suppliers from seed data
TEST_SUPPLIERS = [
    "Emirates Transfers LLC",
    "Georgia Tours Co.",
    "VIP Cars Dubai", 
    "Budget Shuttles LLC"
]

class TestSupplierDashboard:
    """Test supplier dashboard endpoint"""
    
    def test_get_supplier_dashboard_emirates(self):
        """Test getting dashboard for Emirates Transfers LLC"""
        supplier_name = "Emirates Transfers LLC"
        response = requests.get(f"{BASE_URL}/api/supplier/dashboard?supplier_name={supplier_name}")
        
        assert response.status_code == 200
        data = response.json()
        assert data["success"] == True
        assert "stats" in data
        assert "transfers" in data
        assert "recent_bookings" in data
        
        # Verify stats structure
        stats = data["stats"]
        assert "total_transfers" in stats
        assert "total_bookings" in stats
        assert "pending_bookings" in stats
        assert "confirmed_bookings" in stats
        assert "completed_bookings" in stats
        assert "total_earnings" in stats
        assert "pending_earnings" in stats
        
        print(f"Dashboard stats for {supplier_name}: {stats}")
    
    def test_get_supplier_dashboard_georgia(self):
        """Test getting dashboard for Georgia Tours Co."""
        supplier_name = "Georgia Tours Co."
        response = requests.get(f"{BASE_URL}/api/supplier/dashboard?supplier_name={supplier_name}")
        
        assert response.status_code == 200
        data = response.json()
        assert data["success"] == True
        print(f"Dashboard stats for {supplier_name}: {data['stats']}")
    
    def test_get_supplier_dashboard_unknown(self):
        """Test getting dashboard for unknown supplier (should return empty stats)"""
        supplier_name = "Unknown Supplier XYZ"
        response = requests.get(f"{BASE_URL}/api/supplier/dashboard?supplier_name={supplier_name}")
        
        assert response.status_code == 200
        data = response.json()
        assert data["success"] == True
        # Should return zero stats for unknown supplier
        assert data["stats"]["total_transfers"] == 0


class TestSupplierTransfers:
    """Test supplier transfers endpoint"""
    
    def test_get_supplier_transfers(self):
        """Test getting transfers for a supplier"""
        supplier_name = "Emirates Transfers LLC"
        response = requests.get(f"{BASE_URL}/api/supplier/transfers?supplier_name={supplier_name}")
        
        assert response.status_code == 200
        data = response.json()
        assert data["success"] == True
        assert "transfers" in data
        
        # Emirates should have transfers from seed data
        if len(data["transfers"]) > 0:
            transfer = data["transfers"][0]
            assert "id" in transfer
            assert "title" in transfer
            assert "from_location" in transfer
            assert "to_location" in transfer
            assert "price" in transfer
            assert "supplier_cost" in transfer
            assert transfer["supplier_name"] == supplier_name
            print(f"Found {len(data['transfers'])} transfers for {supplier_name}")
    
    def test_update_supplier_transfer(self):
        """Test updating a supplier's transfer (limited fields)"""
        supplier_name = "Emirates Transfers LLC"
        
        # First get the supplier's transfers
        response = requests.get(f"{BASE_URL}/api/supplier/transfers?supplier_name={supplier_name}")
        assert response.status_code == 200
        transfers = response.json()["transfers"]
        
        if len(transfers) == 0:
            pytest.skip("No transfers found for supplier")
        
        transfer_id = transfers[0]["id"]
        original_duration = transfers[0].get("duration", "1 hrs")
        
        # Update the transfer
        update_data = {
            "duration": "2 hrs",
            "description": "Updated test description",
            "confirmation_time": "3 hrs",
            "is_available": True
        }
        
        update_response = requests.put(
            f"{BASE_URL}/api/supplier/transfers/{transfer_id}?supplier_name={supplier_name}",
            json=update_data
        )
        
        assert update_response.status_code == 200
        updated = update_response.json()
        assert updated["success"] == True
        
        # Verify update was applied
        if "transfer" in updated:
            assert updated["transfer"]["duration"] == "2 hrs"
        
        # Restore original value
        restore_data = {"duration": original_duration}
        requests.put(
            f"{BASE_URL}/api/supplier/transfers/{transfer_id}?supplier_name={supplier_name}",
            json=restore_data
        )
        print(f"Updated transfer {transfer_id} successfully")
    
    def test_update_transfer_unauthorized(self):
        """Test that supplier cannot update another supplier's transfer"""
        # Get a transfer from one supplier
        response = requests.get(f"{BASE_URL}/api/supplier/transfers?supplier_name=Emirates Transfers LLC")
        if response.status_code != 200 or len(response.json()["transfers"]) == 0:
            pytest.skip("No transfers found for Emirates")
        
        transfer_id = response.json()["transfers"][0]["id"]
        
        # Try to update it as a different supplier
        update_response = requests.put(
            f"{BASE_URL}/api/supplier/transfers/{transfer_id}?supplier_name=Georgia Tours Co.",
            json={"duration": "5 hrs"}
        )
        
        # Should fail with 404 (transfer not found for this supplier)
        assert update_response.status_code == 404


class TestSupplierBookings:
    """Test supplier bookings endpoints"""
    
    def test_get_supplier_bookings_empty(self):
        """Test getting bookings (may be empty initially)"""
        supplier_name = "Emirates Transfers LLC"
        response = requests.get(f"{BASE_URL}/api/supplier/bookings?supplier_name={supplier_name}")
        
        assert response.status_code == 200
        data = response.json()
        assert data["success"] == True
        assert "bookings" in data
        print(f"Found {len(data['bookings'])} bookings for {supplier_name}")
    
    def test_get_supplier_bookings_with_status_filter(self):
        """Test filtering bookings by status"""
        supplier_name = "Emirates Transfers LLC"
        
        for status in ["pending", "confirmed", "completed"]:
            response = requests.get(f"{BASE_URL}/api/supplier/bookings?supplier_name={supplier_name}&status={status}")
            assert response.status_code == 200
            data = response.json()
            assert data["success"] == True
            
            # All returned bookings should have the filtered status
            for booking in data["bookings"]:
                assert booking["status"] == status
            print(f"Found {len(data['bookings'])} {status} bookings")
    
    def test_create_sample_bookings(self):
        """Test creating sample bookings for testing"""
        supplier_name = "Emirates Transfers LLC"
        response = requests.post(f"{BASE_URL}/api/supplier/bookings/create-sample?supplier_name={supplier_name}")
        
        assert response.status_code == 200
        data = response.json()
        
        if data["success"]:
            assert "created" in data
            assert "bookings" in data
            print(f"Created {data['created']} sample bookings")
            
            # Verify bookings structure
            if len(data["bookings"]) > 0:
                booking = data["bookings"][0]
                assert "id" in booking
                assert "transfer_id" in booking
                assert "customer_name" in booking
                assert "customer_email" in booking
                assert "status" in booking
                assert "supplier_earnings" in booking


class TestSupplierBookingStatusUpdates:
    """Test booking status update workflow"""
    
    @pytest.fixture
    def sample_booking(self):
        """Create sample booking and return a pending one"""
        supplier_name = "Emirates Transfers LLC"
        
        # Create sample bookings
        requests.post(f"{BASE_URL}/api/supplier/bookings/create-sample?supplier_name={supplier_name}")
        
        # Get pending bookings
        response = requests.get(f"{BASE_URL}/api/supplier/bookings?supplier_name={supplier_name}&status=pending")
        bookings = response.json().get("bookings", [])
        
        if len(bookings) == 0:
            pytest.skip("No pending bookings available for testing")
        
        return bookings[0], supplier_name
    
    def test_accept_booking(self, sample_booking):
        """Test accepting a pending booking"""
        booking, supplier_name = sample_booking
        booking_id = booking["id"]
        
        response = requests.post(
            f"{BASE_URL}/api/supplier/bookings/{booking_id}/status?supplier_name={supplier_name}&status=confirmed"
        )
        
        assert response.status_code == 200
        data = response.json()
        assert data["success"] == True
        print(f"Accepted booking {booking_id}")
    
    def test_reject_booking(self, sample_booking):
        """Test rejecting a pending booking"""
        booking, supplier_name = sample_booking
        booking_id = booking["id"]
        
        response = requests.post(
            f"{BASE_URL}/api/supplier/bookings/{booking_id}/status?supplier_name={supplier_name}&status=rejected"
        )
        
        assert response.status_code == 200
        data = response.json()
        assert data["success"] == True
        print(f"Rejected booking {booking_id}")
    
    def test_complete_booking(self):
        """Test completing a confirmed booking"""
        supplier_name = "Emirates Transfers LLC"
        
        # First get confirmed bookings
        response = requests.get(f"{BASE_URL}/api/supplier/bookings?supplier_name={supplier_name}&status=confirmed")
        bookings = response.json().get("bookings", [])
        
        if len(bookings) == 0:
            # Create sample bookings and accept one
            requests.post(f"{BASE_URL}/api/supplier/bookings/create-sample?supplier_name={supplier_name}")
            response = requests.get(f"{BASE_URL}/api/supplier/bookings?supplier_name={supplier_name}&status=pending")
            bookings = response.json().get("bookings", [])
            if len(bookings) > 0:
                requests.post(
                    f"{BASE_URL}/api/supplier/bookings/{bookings[0]['id']}/status?supplier_name={supplier_name}&status=confirmed"
                )
                response = requests.get(f"{BASE_URL}/api/supplier/bookings?supplier_name={supplier_name}&status=confirmed")
                bookings = response.json().get("bookings", [])
        
        if len(bookings) == 0:
            pytest.skip("No confirmed bookings available for testing")
        
        booking_id = bookings[0]["id"]
        
        response = requests.post(
            f"{BASE_URL}/api/supplier/bookings/{booking_id}/status?supplier_name={supplier_name}&status=completed"
        )
        
        assert response.status_code == 200
        data = response.json()
        assert data["success"] == True
        print(f"Completed booking {booking_id}")
    
    def test_invalid_status_update(self):
        """Test that invalid status values are rejected"""
        supplier_name = "Emirates Transfers LLC"
        
        # Get any booking
        response = requests.get(f"{BASE_URL}/api/supplier/bookings?supplier_name={supplier_name}")
        bookings = response.json().get("bookings", [])
        
        if len(bookings) == 0:
            pytest.skip("No bookings available for testing")
        
        booking_id = bookings[0]["id"]
        
        # Try to set invalid status
        response = requests.post(
            f"{BASE_URL}/api/supplier/bookings/{booking_id}/status?supplier_name={supplier_name}&status=invalid_status"
        )
        
        assert response.status_code == 400


class TestSupplierEarnings:
    """Test supplier earnings endpoint"""
    
    def test_get_supplier_earnings(self):
        """Test getting earnings summary"""
        supplier_name = "Emirates Transfers LLC"
        response = requests.get(f"{BASE_URL}/api/supplier/earnings?supplier_name={supplier_name}")
        
        assert response.status_code == 200
        data = response.json()
        assert data["success"] == True
        
        assert "summary" in data
        assert "by_transfer" in data
        
        summary = data["summary"]
        assert "total_earnings" in summary
        assert "total_bookings" in summary
        assert "transfer_count" in summary
        
        print(f"Earnings summary for {supplier_name}: {summary}")
    
    def test_earnings_by_transfer_breakdown(self):
        """Test that earnings are broken down by transfer"""
        supplier_name = "Emirates Transfers LLC"
        
        # First ensure we have some bookings
        requests.post(f"{BASE_URL}/api/supplier/bookings/create-sample?supplier_name={supplier_name}")
        
        response = requests.get(f"{BASE_URL}/api/supplier/earnings?supplier_name={supplier_name}")
        data = response.json()
        
        for transfer_earnings in data["by_transfer"]:
            assert "transfer_id" in transfer_earnings
            assert "transfer_title" in transfer_earnings
            assert "booking_count" in transfer_earnings
            assert "total_earnings" in transfer_earnings
            
            print(f"Transfer: {transfer_earnings['transfer_title']}, Earnings: {transfer_earnings['total_earnings']}")


if __name__ == "__main__":
    pytest.main([__file__, "-v", "--tb=short"])
