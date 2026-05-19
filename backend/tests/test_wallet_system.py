"""
Wallet & Account Statement System Tests
Tests for B2B Travel Platform wallet features:
- Agent wallet with balance/transactions
- Admin/Staff top-up, debit, refund
- Payment proof upload and approval
- Statement download
"""
import pytest
import requests
import os
import io
from tests.test_helpers import (
    TEST_ADMIN_EMAIL,
    TEST_AGENT_EMAIL,
    TEST_STAFF_EMAIL,
    TEST_SUPPLIER_EMAIL,
    DEFAULT_PASSWORD,
)

BASE_URL = os.environ.get('REACT_APP_BACKEND_URL', '').rstrip('/')

# Test credentials

AGENT_USER_ID = "83cfe3b8-256a-4f19-aca6-977deefe20c0"

class TestWalletAuth:
    """Test authentication for wallet endpoints"""
    
    @pytest.fixture(scope="class")
    def agent_token(self):
        """Get agent auth token"""
        response = requests.post(f"{BASE_URL}/api/auth/login", json={
            "email": TEST_AGENT_EMAIL,
            "password": DEFAULT_PASSWORD
        })
        assert response.status_code == 200, f"Agent login failed: {response.text}"
        data = response.json()
        return data.get("access_token")
    
    @pytest.fixture(scope="class")
    def admin_token(self):
        """Get admin auth token"""
        response = requests.post(f"{BASE_URL}/api/auth/login", json={
            "email": TEST_ADMIN_EMAIL,
            "password": DEFAULT_PASSWORD
        })
        assert response.status_code == 200, f"Admin login failed: {response.text}"
        data = response.json()
        return data.get("access_token")
    
    def test_agent_login_success(self):
        """Test agent can login"""
        response = requests.post(f"{BASE_URL}/api/auth/login", json={
            "email": TEST_AGENT_EMAIL,
            "password": DEFAULT_PASSWORD
        })
        assert response.status_code == 200
        data = response.json()
        assert "access_token" in data
        assert "user" in data
        print(f"Agent login successful, user_id: {data['user'].get('id')}")
    
    def test_admin_login_success(self):
        """Test admin can login"""
        response = requests.post(f"{BASE_URL}/api/auth/login", json={
            "email": TEST_ADMIN_EMAIL,
            "password": DEFAULT_PASSWORD
        })
        assert response.status_code == 200
        data = response.json()
        assert "access_token" in data
        assert "user" in data
        # Note: role is not returned in login response, but is stored in DB
        print(f"Admin login successful, email: {data['user'].get('email')}")

class TestAgentWallet:
    """Test agent wallet endpoints"""
    
    @pytest.fixture(scope="class")
    def agent_token(self):
        """Get agent auth token"""
        response = requests.post(f"{BASE_URL}/api/auth/login", json={
            "email": TEST_AGENT_EMAIL,
            "password": DEFAULT_PASSWORD
        })
        if response.status_code != 200:
            pytest.skip("Agent login failed")
        return response.json().get("access_token")
    
    def test_get_my_wallet(self, agent_token):
        """GET /api/wallets/my - Agent can get their wallet"""
        response = requests.get(
            f"{BASE_URL}/api/wallets/my",
            headers={"Authorization": f"Bearer {agent_token}"}
        )
        assert response.status_code == 200, f"Failed: {response.text}"
        data = response.json()
        
        # Verify wallet structure
        assert "balance" in data, "Wallet should have balance"
        assert "currency" in data, "Wallet should have currency"
        assert data["currency"] == "AED", "Currency should be AED"
        assert "user_id" in data, "Wallet should have user_id"
        
        print(f"Agent wallet balance: AED {data['balance']}")
    
    def test_get_my_transactions(self, agent_token):
        """GET /api/wallets/transactions - Agent can get their transactions"""
        response = requests.get(
            f"{BASE_URL}/api/wallets/transactions",
            headers={"Authorization": f"Bearer {agent_token}"}
        )
        assert response.status_code == 200, f"Failed: {response.text}"
        data = response.json()
        
        # Should be a list
        assert isinstance(data, list), "Transactions should be a list"
        
        # If transactions exist, verify structure
        if len(data) > 0:
            txn = data[0]
            assert "id" in txn, "Transaction should have id"
            assert "type" in txn, "Transaction should have type"
            assert "amount" in txn, "Transaction should have amount"
            assert "created_at" in txn, "Transaction should have created_at"
            print(f"Found {len(data)} transactions, latest: {txn['type']} AED {txn['amount']}")
        else:
            print("No transactions found")
    
    def test_get_my_payment_proofs(self, agent_token):
        """GET /api/wallets/payment-proofs/my - Agent can get their payment proofs"""
        response = requests.get(
            f"{BASE_URL}/api/wallets/payment-proofs/my",
            headers={"Authorization": f"Bearer {agent_token}"}
        )
        assert response.status_code == 200, f"Failed: {response.text}"
        data = response.json()
        
        # Should be a list
        assert isinstance(data, list), "Payment proofs should be a list"
        
        if len(data) > 0:
            proof = data[0]
            assert "id" in proof, "Proof should have id"
            assert "amount" in proof, "Proof should have amount"
            assert "status" in proof, "Proof should have status"
            print(f"Found {len(data)} payment proofs")
        else:
            print("No payment proofs found")
    
    def test_agent_cannot_access_all_wallets(self, agent_token):
        """GET /api/wallets/all - Agent should get 403"""
        response = requests.get(
            f"{BASE_URL}/api/wallets/all",
            headers={"Authorization": f"Bearer {agent_token}"}
        )
        assert response.status_code == 403, f"Expected 403, got {response.status_code}"
        print("Agent correctly denied access to all wallets")
    
    def test_agent_cannot_topup(self, agent_token):
        """POST /api/wallets/topup - Agent should get 403"""
        response = requests.post(
            f"{BASE_URL}/api/wallets/topup",
            headers={"Authorization": f"Bearer {agent_token}"},
            json={"user_id": AGENT_USER_ID, "amount": 100, "note": "Test"}
        )
        assert response.status_code == 403, f"Expected 403, got {response.status_code}"
        print("Agent correctly denied topup access")
    
    def test_agent_cannot_refund(self, agent_token):
        """POST /api/wallets/refund - Agent should get 403"""
        response = requests.post(
            f"{BASE_URL}/api/wallets/refund",
            headers={"Authorization": f"Bearer {agent_token}"},
            json={"user_id": AGENT_USER_ID, "amount": 100, "note": "Test"}
        )
        assert response.status_code == 403, f"Expected 403, got {response.status_code}"
        print("Agent correctly denied refund access")

class TestAdminWalletOperations:
    """Test admin wallet operations"""
    
    @pytest.fixture(scope="class")
    def admin_token(self):
        """Get admin auth token"""
        response = requests.post(f"{BASE_URL}/api/auth/login", json={
            "email": TEST_ADMIN_EMAIL,
            "password": DEFAULT_PASSWORD
        })
        if response.status_code != 200:
            pytest.skip("Admin login failed")
        return response.json().get("access_token")
    
    @pytest.fixture(scope="class")
    def agent_user_id(self, admin_token):
        """Get agent user ID from wallets list"""
        response = requests.get(
            f"{BASE_URL}/api/wallets/all",
            headers={"Authorization": f"Bearer {admin_token}"}
        )
        if response.status_code == 200:
            wallets = response.json()
            if wallets:
                return wallets[0].get("user_id")
        return AGENT_USER_ID
    
    def test_admin_get_all_wallets(self, admin_token):
        """GET /api/wallets/all - Admin can get all wallets"""
        response = requests.get(
            f"{BASE_URL}/api/wallets/all",
            headers={"Authorization": f"Bearer {admin_token}"}
        )
        assert response.status_code == 200, f"Failed: {response.text}"
        data = response.json()
        
        # Should be a list
        assert isinstance(data, list), "Wallets should be a list"
        
        if len(data) > 0:
            wallet = data[0]
            assert "balance" in wallet, "Wallet should have balance"
            assert "user_id" in wallet, "Wallet should have user_id"
            assert "user" in wallet, "Wallet should have user info"
            print(f"Found {len(data)} wallets")
        else:
            print("No wallets found")
    
    def test_admin_get_all_payment_proofs(self, admin_token):
        """GET /api/wallets/payment-proofs/all - Admin can get all payment proofs"""
        response = requests.get(
            f"{BASE_URL}/api/wallets/payment-proofs/all",
            headers={"Authorization": f"Bearer {admin_token}"}
        )
        assert response.status_code == 200, f"Failed: {response.text}"
        data = response.json()
        
        assert isinstance(data, list), "Payment proofs should be a list"
        print(f"Found {len(data)} payment proofs (all)")
    
    def test_admin_topup_wallet(self, admin_token, agent_user_id):
        """POST /api/wallets/topup - Admin can top up agent wallet"""
        # Get initial balance
        response = requests.get(
            f"{BASE_URL}/api/wallets/all",
            headers={"Authorization": f"Bearer {admin_token}"}
        )
        initial_balance = 0
        if response.status_code == 200:
            wallets = response.json()
            for w in wallets:
                if w.get("user_id") == agent_user_id:
                    initial_balance = w.get("balance", 0)
                    break
        
        # Top up
        topup_amount = 100.50
        response = requests.post(
            f"{BASE_URL}/api/wallets/topup",
            headers={"Authorization": f"Bearer {admin_token}"},
            json={
                "user_id": agent_user_id,
                "amount": topup_amount,
                "note": "TEST_topup_pytest"
            }
        )
        assert response.status_code == 200, f"Topup failed: {response.text}"
        data = response.json()
        
        assert data.get("success") == True, "Topup should succeed"
        assert "new_balance" in data, "Response should have new_balance"
        assert "transaction" in data, "Response should have transaction"
        
        # Verify balance increased
        expected_balance = initial_balance + topup_amount
        assert abs(data["new_balance"] - expected_balance) < 0.01, f"Balance mismatch: expected {expected_balance}, got {data['new_balance']}"
        
        print(f"Topup successful: AED {topup_amount}, new balance: AED {data['new_balance']}")
    
    def test_admin_refund_wallet(self, admin_token, agent_user_id):
        """POST /api/wallets/refund - Admin can refund to agent wallet"""
        # Get initial balance
        response = requests.get(
            f"{BASE_URL}/api/wallets/all",
            headers={"Authorization": f"Bearer {admin_token}"}
        )
        initial_balance = 0
        if response.status_code == 200:
            wallets = response.json()
            for w in wallets:
                if w.get("user_id") == agent_user_id:
                    initial_balance = w.get("balance", 0)
                    break
        
        # Refund
        refund_amount = 50.25
        response = requests.post(
            f"{BASE_URL}/api/wallets/refund",
            headers={"Authorization": f"Bearer {admin_token}"},
            json={
                "user_id": agent_user_id,
                "amount": refund_amount,
                "note": "TEST_refund_pytest"
            }
        )
        assert response.status_code == 200, f"Refund failed: {response.text}"
        data = response.json()
        
        assert data.get("success") == True, "Refund should succeed"
        assert "new_balance" in data, "Response should have new_balance"
        
        # Verify balance increased
        expected_balance = initial_balance + refund_amount
        assert abs(data["new_balance"] - expected_balance) < 0.01, f"Balance mismatch"
        
        print(f"Refund successful: AED {refund_amount}, new balance: AED {data['new_balance']}")
    
    def test_admin_get_user_transactions(self, admin_token, agent_user_id):
        """GET /api/wallets/transactions/{user_id} - Admin can get specific user transactions"""
        response = requests.get(
            f"{BASE_URL}/api/wallets/transactions/{agent_user_id}",
            headers={"Authorization": f"Bearer {admin_token}"}
        )
        assert response.status_code == 200, f"Failed: {response.text}"
        data = response.json()
        
        assert isinstance(data, list), "Transactions should be a list"
        print(f"Found {len(data)} transactions for user {agent_user_id}")

class TestDebitWallet:
    """Test wallet debit operations"""
    
    @pytest.fixture(scope="class")
    def admin_token(self):
        """Get admin auth token"""
        response = requests.post(f"{BASE_URL}/api/auth/login", json={
            "email": TEST_ADMIN_EMAIL,
            "password": DEFAULT_PASSWORD
        })
        if response.status_code != 200:
            pytest.skip("Admin login failed")
        return response.json().get("access_token")
    
    @pytest.fixture(scope="class")
    def agent_token(self):
        """Get agent auth token"""
        response = requests.post(f"{BASE_URL}/api/auth/login", json={
            "email": TEST_AGENT_EMAIL,
            "password": DEFAULT_PASSWORD
        })
        if response.status_code != 200:
            pytest.skip("Agent login failed")
        return response.json().get("access_token")
    
    def test_debit_with_sufficient_balance(self, admin_token):
        """POST /api/wallets/debit - Debit with sufficient balance"""
        # First ensure wallet has balance by topping up
        response = requests.post(
            f"{BASE_URL}/api/wallets/topup",
            headers={"Authorization": f"Bearer {admin_token}"},
            json={
                "user_id": AGENT_USER_ID,
                "amount": 200,
                "note": "TEST_topup_for_debit"
            }
        )
        
        # Now debit
        debit_amount = 50
        response = requests.post(
            f"{BASE_URL}/api/wallets/debit",
            headers={"Authorization": f"Bearer {admin_token}"},
            json={
                "user_id": AGENT_USER_ID,
                "amount": debit_amount,
                "note": "TEST_debit_pytest"
            }
        )
        assert response.status_code == 200, f"Debit failed: {response.text}"
        data = response.json()
        
        assert data.get("success") == True, "Debit should succeed"
        assert "new_balance" in data, "Response should have new_balance"
        assert "transaction" in data, "Response should have transaction"
        
        # Verify transaction has negative amount
        txn = data["transaction"]
        assert txn["amount"] < 0, "Debit transaction amount should be negative"
        
        print(f"Debit successful: AED {debit_amount}, new balance: AED {data['new_balance']}")
    
    def test_debit_insufficient_balance(self, agent_token):
        """POST /api/wallets/debit - Debit with insufficient balance should fail"""
        # Try to debit a very large amount
        response = requests.post(
            f"{BASE_URL}/api/wallets/debit",
            headers={"Authorization": f"Bearer {agent_token}"},
            json={
                "amount": 999999999,
                "note": "TEST_insufficient_balance"
            }
        )
        assert response.status_code == 400, f"Expected 400, got {response.status_code}"
        data = response.json()
        assert "insufficient" in data.get("detail", "").lower() or "balance" in data.get("detail", "").lower()
        print("Insufficient balance check working correctly")
    
    def test_debit_invalid_amount(self, agent_token):
        """POST /api/wallets/debit - Debit with invalid amount should fail"""
        response = requests.post(
            f"{BASE_URL}/api/wallets/debit",
            headers={"Authorization": f"Bearer {agent_token}"},
            json={
                "amount": -100,
                "note": "TEST_negative_amount"
            }
        )
        assert response.status_code == 400, f"Expected 400, got {response.status_code}"
        print("Negative amount validation working correctly")

class TestPaymentProofWorkflow:
    """Test payment proof upload and review workflow"""
    
    @pytest.fixture(scope="class")
    def agent_token(self):
        """Get agent auth token"""
        response = requests.post(f"{BASE_URL}/api/auth/login", json={
            "email": TEST_AGENT_EMAIL,
            "password": DEFAULT_PASSWORD
        })
        if response.status_code != 200:
            pytest.skip("Agent login failed")
        return response.json().get("access_token")
    
    @pytest.fixture(scope="class")
    def admin_token(self):
        """Get admin auth token"""
        response = requests.post(f"{BASE_URL}/api/auth/login", json={
            "email": TEST_ADMIN_EMAIL,
            "password": DEFAULT_PASSWORD
        })
        if response.status_code != 200:
            pytest.skip("Admin login failed")
        return response.json().get("access_token")
    
    def test_upload_payment_proof(self, agent_token):
        """POST /api/wallets/payment-proof - Agent can upload payment proof"""
        # Create a fake image file
        fake_image = io.BytesIO(b'\x89PNG\r\n\x1a\n' + b'\x00' * 100)
        
        response = requests.post(
            f"{BASE_URL}/api/wallets/payment-proof",
            headers={"Authorization": f"Bearer {agent_token}"},
            data={
                "amount": "500.00",
                "reference": "TEST_REF_12345",
                "note": "TEST_payment_proof_pytest"
            },
            files={
                "file": ("test_receipt.png", fake_image, "image/png")
            }
        )
        assert response.status_code == 200, f"Upload failed: {response.text}"
        data = response.json()
        
        assert "id" in data, "Response should have proof id"
        assert data.get("status") == "pending", "New proof should be pending"
        assert data.get("amount") == 500.0, "Amount should match"
        assert data.get("reference") == "TEST_REF_12345", "Reference should match"
        
        print(f"Payment proof uploaded: {data['id']}, status: {data['status']}")
        return data["id"]
    
    def test_approve_payment_proof_credits_wallet(self, agent_token, admin_token):
        """POST /api/wallets/payment-proofs/{id}/review - Approve credits wallet"""
        # First upload a proof
        fake_image = io.BytesIO(b'\x89PNG\r\n\x1a\n' + b'\x00' * 100)
        upload_response = requests.post(
            f"{BASE_URL}/api/wallets/payment-proof",
            headers={"Authorization": f"Bearer {agent_token}"},
            data={
                "amount": "250.00",
                "reference": "TEST_APPROVE_REF",
                "note": "TEST_for_approval"
            },
            files={
                "file": ("test_receipt.png", fake_image, "image/png")
            }
        )
        assert upload_response.status_code == 200
        proof_id = upload_response.json()["id"]
        
        # Get wallet balance before approval
        wallet_response = requests.get(
            f"{BASE_URL}/api/wallets/my",
            headers={"Authorization": f"Bearer {agent_token}"}
        )
        initial_balance = wallet_response.json().get("balance", 0)
        
        # Admin approves the proof
        response = requests.post(
            f"{BASE_URL}/api/wallets/payment-proofs/{proof_id}/review",
            headers={"Authorization": f"Bearer {admin_token}"},
            json={"action": "approve"}
        )
        assert response.status_code == 200, f"Approval failed: {response.text}"
        data = response.json()
        
        assert data.get("success") == True
        assert data.get("status") == "approved"
        
        # Verify wallet was credited
        wallet_response = requests.get(
            f"{BASE_URL}/api/wallets/my",
            headers={"Authorization": f"Bearer {agent_token}"}
        )
        new_balance = wallet_response.json().get("balance", 0)
        
        assert new_balance >= initial_balance + 250, f"Wallet should be credited. Initial: {initial_balance}, New: {new_balance}"
        print(f"Payment proof approved, wallet credited: AED 250, new balance: AED {new_balance}")
    
    def test_reject_payment_proof(self, agent_token, admin_token):
        """POST /api/wallets/payment-proofs/{id}/review - Reject does not credit wallet"""
        # First upload a proof
        fake_image = io.BytesIO(b'\x89PNG\r\n\x1a\n' + b'\x00' * 100)
        upload_response = requests.post(
            f"{BASE_URL}/api/wallets/payment-proof",
            headers={"Authorization": f"Bearer {agent_token}"},
            data={
                "amount": "300.00",
                "reference": "TEST_REJECT_REF",
                "note": "TEST_for_rejection"
            },
            files={
                "file": ("test_receipt.png", fake_image, "image/png")
            }
        )
        assert upload_response.status_code == 200
        proof_id = upload_response.json()["id"]
        
        # Get wallet balance before rejection
        wallet_response = requests.get(
            f"{BASE_URL}/api/wallets/my",
            headers={"Authorization": f"Bearer {agent_token}"}
        )
        initial_balance = wallet_response.json().get("balance", 0)
        
        # Admin rejects the proof
        response = requests.post(
            f"{BASE_URL}/api/wallets/payment-proofs/{proof_id}/review",
            headers={"Authorization": f"Bearer {admin_token}"},
            json={"action": "reject"}
        )
        assert response.status_code == 200, f"Rejection failed: {response.text}"
        data = response.json()
        
        assert data.get("success") == True
        assert data.get("status") == "rejected"
        
        # Verify wallet was NOT credited
        wallet_response = requests.get(
            f"{BASE_URL}/api/wallets/my",
            headers={"Authorization": f"Bearer {agent_token}"}
        )
        new_balance = wallet_response.json().get("balance", 0)
        
        assert new_balance == initial_balance, f"Wallet should NOT be credited on rejection"
        print(f"Payment proof rejected, wallet unchanged: AED {new_balance}")
    
    def test_invalid_review_action(self, admin_token):
        """POST /api/wallets/payment-proofs/{id}/review - Invalid action should fail"""
        # Use a fake proof ID
        response = requests.post(
            f"{BASE_URL}/api/wallets/payment-proofs/fake-id/review",
            headers={"Authorization": f"Bearer {admin_token}"},
            json={"action": "invalid_action"}
        )
        assert response.status_code == 400, f"Expected 400, got {response.status_code}"
        print("Invalid action validation working correctly")

class TestStatements:
    """Test statement upload (admin only)"""
    
    @pytest.fixture(scope="class")
    def admin_token(self):
        """Get admin auth token"""
        response = requests.post(f"{BASE_URL}/api/auth/login", json={
            "email": TEST_ADMIN_EMAIL,
            "password": DEFAULT_PASSWORD
        })
        if response.status_code != 200:
            pytest.skip("Admin login failed")
        return response.json().get("access_token")
    
    @pytest.fixture(scope="class")
    def agent_token(self):
        """Get agent auth token"""
        response = requests.post(f"{BASE_URL}/api/auth/login", json={
            "email": TEST_AGENT_EMAIL,
            "password": DEFAULT_PASSWORD
        })
        if response.status_code != 200:
            pytest.skip("Agent login failed")
        return response.json().get("access_token")
    
    def test_admin_upload_statement(self, admin_token):
        """POST /api/wallets/statements/upload - Admin can upload statement"""
        fake_pdf = io.BytesIO(b'%PDF-1.4' + b'\x00' * 100)
        
        response = requests.post(
            f"{BASE_URL}/api/wallets/statements/upload",
            headers={"Authorization": f"Bearer {admin_token}"},
            data={
                "note": "TEST_statement_Jan_2026"
            },
            files={
                "file": ("bank_statement.pdf", fake_pdf, "application/pdf")
            }
        )
        assert response.status_code == 200, f"Upload failed: {response.text}"
        data = response.json()
        
        assert "id" in data, "Response should have statement id"
        assert "file_url" in data, "Response should have file_url"
        print(f"Statement uploaded: {data['id']}")
    
    def test_admin_get_statements(self, admin_token):
        """GET /api/wallets/statements - Admin can get statements"""
        response = requests.get(
            f"{BASE_URL}/api/wallets/statements",
            headers={"Authorization": f"Bearer {admin_token}"}
        )
        assert response.status_code == 200, f"Failed: {response.text}"
        data = response.json()
        
        assert isinstance(data, list), "Statements should be a list"
        print(f"Found {len(data)} statements")
    
    def test_agent_cannot_upload_statement(self, agent_token):
        """POST /api/wallets/statements/upload - Agent should get 403"""
        fake_pdf = io.BytesIO(b'%PDF-1.4' + b'\x00' * 100)
        
        response = requests.post(
            f"{BASE_URL}/api/wallets/statements/upload",
            headers={"Authorization": f"Bearer {agent_token}"},
            data={"note": "TEST"},
            files={"file": ("test.pdf", fake_pdf, "application/pdf")}
        )
        assert response.status_code == 403, f"Expected 403, got {response.status_code}"
        print("Agent correctly denied statement upload access")
    
    def test_agent_cannot_get_statements(self, agent_token):
        """GET /api/wallets/statements - Agent should get 403"""
        response = requests.get(
            f"{BASE_URL}/api/wallets/statements",
            headers={"Authorization": f"Bearer {agent_token}"}
        )
        assert response.status_code == 403, f"Expected 403, got {response.status_code}"
        print("Agent correctly denied statements access")

if __name__ == "__main__":
    pytest.main([__file__, "-v", "--tb=short"])
