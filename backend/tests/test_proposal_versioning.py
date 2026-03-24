"""
Test Proposal Versioning Feature
- POST /api/proposals/{id}/versions - Save current proposal state as a new version
- GET /api/proposals/{id}/versions - Get all versions for a proposal
- POST /api/proposals/{id}/versions/{version_id}/restore - Restore version as new proposal
"""
import pytest
import requests
import os

BASE_URL = os.environ.get('REACT_APP_BACKEND_URL', '').rstrip('/')

class TestProposalVersioning:
    """Test proposal versioning endpoints"""
    
    @pytest.fixture(autouse=True)
    def setup(self):
        """Setup test data"""
        self.test_proposal_id = "bf0328bb-2c14-4cc6-9937-3f7dc0918750"
        self.session = requests.Session()
        self.session.headers.update({"Content-Type": "application/json"})
    
    def test_get_versions_for_existing_proposal(self):
        """Test GET /api/proposals/{id}/versions returns version list"""
        response = self.session.get(f"{BASE_URL}/api/proposals/{self.test_proposal_id}/versions")
        
        assert response.status_code == 200, f"Expected 200, got {response.status_code}: {response.text}"
        
        data = response.json()
        assert "versions" in data, "Response should contain 'versions' key"
        assert isinstance(data["versions"], list), "versions should be a list"
        
        # Per main agent context, there should be 2 existing versions
        print(f"Found {len(data['versions'])} versions for proposal")
        
        if len(data["versions"]) > 0:
            version = data["versions"][0]
            # Verify version structure
            assert "id" in version, "Version should have 'id'"
            assert "version_number" in version, "Version should have 'version_number'"
            assert "snapshot" in version, "Version should have 'snapshot'"
            assert "created_at" in version, "Version should have 'created_at'"
            print(f"Latest version: v{version['version_number']}, created at {version['created_at']}")
    
    def test_save_new_version_with_note(self):
        """Test POST /api/proposals/{id}/versions saves a new version with note"""
        version_note = "TEST_Version created by automated test"
        
        response = self.session.post(
            f"{BASE_URL}/api/proposals/{self.test_proposal_id}/versions",
            json={"version_note": version_note}
        )
        
        assert response.status_code == 200, f"Expected 200, got {response.status_code}: {response.text}"
        
        data = response.json()
        assert "id" in data, "Response should contain version 'id'"
        assert "version_number" in data, "Response should contain 'version_number'"
        assert "snapshot" in data, "Response should contain 'snapshot'"
        assert "created_at" in data, "Response should contain 'created_at'"
        assert data.get("version_note") == version_note, f"Version note mismatch: {data.get('version_note')}"
        
        # Store for later tests
        self.new_version_id = data["id"]
        self.new_version_number = data["version_number"]
        
        print(f"Created version v{data['version_number']} with id {data['id']}")
        
        # Verify snapshot contains proposal data
        snapshot = data.get("snapshot", {})
        assert "id" in snapshot, "Snapshot should contain proposal 'id'"
        assert snapshot["id"] == self.test_proposal_id, "Snapshot proposal id should match"
    
    def test_version_number_auto_increments(self):
        """Test that version numbers auto-increment correctly"""
        # Get current versions
        response = self.session.get(f"{BASE_URL}/api/proposals/{self.test_proposal_id}/versions")
        assert response.status_code == 200
        
        versions = response.json().get("versions", [])
        if len(versions) < 2:
            pytest.skip("Need at least 2 versions to test auto-increment")
        
        # Versions should be sorted by version_number descending
        version_numbers = [v["version_number"] for v in versions]
        print(f"Version numbers: {version_numbers}")
        
        # Check they are in descending order
        assert version_numbers == sorted(version_numbers, reverse=True), "Versions should be sorted descending"
        
        # Check consecutive numbering
        for i in range(len(version_numbers) - 1):
            assert version_numbers[i] > version_numbers[i + 1], "Version numbers should be consecutive"
    
    def test_save_version_without_note(self):
        """Test POST /api/proposals/{id}/versions works without version_note"""
        response = self.session.post(
            f"{BASE_URL}/api/proposals/{self.test_proposal_id}/versions",
            json={}
        )
        
        assert response.status_code == 200, f"Expected 200, got {response.status_code}: {response.text}"
        
        data = response.json()
        assert "id" in data
        assert "version_number" in data
        # version_note should be empty string or not present
        assert data.get("version_note", "") == "", "Version note should be empty"
        
        print(f"Created version v{data['version_number']} without note")
    
    def test_restore_version_as_new_proposal(self):
        """Test POST /api/proposals/{id}/versions/{version_id}/restore creates new proposal"""
        # First get a version to restore
        response = self.session.get(f"{BASE_URL}/api/proposals/{self.test_proposal_id}/versions")
        assert response.status_code == 200
        
        versions = response.json().get("versions", [])
        if len(versions) == 0:
            pytest.skip("No versions available to restore")
        
        version_to_restore = versions[0]  # Latest version
        version_id = version_to_restore["id"]
        version_number = version_to_restore["version_number"]
        
        print(f"Restoring version v{version_number} (id: {version_id})")
        
        # Restore as new proposal
        response = self.session.post(
            f"{BASE_URL}/api/proposals/{self.test_proposal_id}/versions/{version_id}/restore"
        )
        
        assert response.status_code == 200, f"Expected 200, got {response.status_code}: {response.text}"
        
        data = response.json()
        assert data.get("success") == True, "Response should indicate success"
        assert "new_proposal_id" in data, "Response should contain 'new_proposal_id'"
        assert "proposal" in data, "Response should contain 'proposal' object"
        
        new_proposal_id = data["new_proposal_id"]
        new_proposal = data["proposal"]
        
        # Verify new proposal has correct name format
        expected_name_suffix = f"(Restored v{version_number})"
        assert expected_name_suffix in new_proposal.get("proposal_name", ""), \
            f"New proposal name should contain '{expected_name_suffix}', got: {new_proposal.get('proposal_name')}"
        
        # Verify new proposal has different ID
        assert new_proposal_id != self.test_proposal_id, "New proposal should have different ID"
        
        # Verify new proposal exists in database
        verify_response = self.session.get(f"{BASE_URL}/api/proposals/{new_proposal_id}")
        assert verify_response.status_code == 200, f"New proposal should exist: {verify_response.status_code}"
        
        print(f"Restored as new proposal: {new_proposal_id}")
        print(f"New proposal name: {new_proposal.get('proposal_name')}")
        
        # Cleanup: delete the test-created proposal
        cleanup_response = self.session.delete(f"{BASE_URL}/api/proposals/{new_proposal_id}")
        print(f"Cleanup: deleted restored proposal (status: {cleanup_response.status_code})")
    
    def test_restore_nonexistent_version_returns_404(self):
        """Test restoring a non-existent version returns 404"""
        fake_version_id = "nonexistent-version-id-12345"
        
        response = self.session.post(
            f"{BASE_URL}/api/proposals/{self.test_proposal_id}/versions/{fake_version_id}/restore"
        )
        
        assert response.status_code == 404, f"Expected 404, got {response.status_code}"
    
    def test_get_versions_for_nonexistent_proposal(self):
        """Test GET versions for non-existent proposal returns empty list"""
        fake_proposal_id = "nonexistent-proposal-id-12345"
        
        response = self.session.get(f"{BASE_URL}/api/proposals/{fake_proposal_id}/versions")
        
        # Should return 200 with empty versions list (not 404)
        assert response.status_code == 200, f"Expected 200, got {response.status_code}"
        
        data = response.json()
        assert data.get("versions") == [], "Should return empty versions list"
    
    def test_version_snapshot_contains_full_proposal_data(self):
        """Test that version snapshot contains complete proposal data"""
        response = self.session.get(f"{BASE_URL}/api/proposals/{self.test_proposal_id}/versions")
        assert response.status_code == 200
        
        versions = response.json().get("versions", [])
        if len(versions) == 0:
            pytest.skip("No versions available")
        
        snapshot = versions[0].get("snapshot", {})
        
        # Check essential proposal fields are in snapshot
        essential_fields = ["id", "cities", "room_data", "leaving_on"]
        for field in essential_fields:
            assert field in snapshot, f"Snapshot should contain '{field}'"
        
        print(f"Snapshot contains {len(snapshot)} fields")
        print(f"Snapshot cities: {snapshot.get('cities')}")


class TestProposalVersioningEdgeCases:
    """Edge case tests for versioning"""
    
    @pytest.fixture(autouse=True)
    def setup(self):
        self.session = requests.Session()
        self.session.headers.update({"Content-Type": "application/json"})
    
    def test_save_version_for_nonexistent_proposal_returns_404(self):
        """Test saving version for non-existent proposal returns 404"""
        fake_proposal_id = "nonexistent-proposal-id-12345"
        
        response = self.session.post(
            f"{BASE_URL}/api/proposals/{fake_proposal_id}/versions",
            json={"version_note": "Test"}
        )
        
        assert response.status_code == 404, f"Expected 404, got {response.status_code}"
