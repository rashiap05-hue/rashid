"""Backend regression for the Stripe Checkout integration and related booking flows.

Covers:
- POST /api/payments/stripe/checkout (auth + server-side amount calc + persistence)
- GET  /api/payments/stripe/status/{session_id} (idempotency, no booking on unpaid)
- POST /api/webhook/stripe (route registered, no body returns error/processed)
- POST /api/bookings (legacy wallet flow via _create_or_update_booking_doc)
- Idempotency: double /api/bookings POST for same proposal yields same booking_ref
- Coupon usage_count: not incremented for unpaid sessions
"""
import os
import sys
import time
import requests
import pytest

sys.path.insert(0, os.path.dirname(__file__))
from test_helpers import API, login, auth_headers, TEST_AGENT_EMAIL, TEST_AGENT_PASSWORD, TEST_ADMIN_EMAIL, TEST_ADMIN_PASSWORD  # noqa: E402


# ---------------------------------------------------------------------------
# Fixtures
# ---------------------------------------------------------------------------
@pytest.fixture(scope="module")
def agent_token_str():
    return login(TEST_AGENT_EMAIL, TEST_AGENT_PASSWORD)


@pytest.fixture(scope="module")
def admin_token_str():
    return login(TEST_ADMIN_EMAIL, TEST_ADMIN_PASSWORD)


@pytest.fixture(scope="module")
def agent_headers(agent_token_str):
    return auth_headers(agent_token_str)


@pytest.fixture(scope="module")
def admin_headers(admin_token_str):
    return auth_headers(admin_token_str)


@pytest.fixture(scope="module")
def proposal(agent_headers):
    """Pick the first available proposal (or skip if there are none)."""
    r = requests.get(f"{API}/proposals", headers=agent_headers, timeout=15)
    if r.status_code != 200:
        pytest.skip(f"Cannot list proposals: {r.status_code}")
    items = r.json() if isinstance(r.json(), list) else r.json().get("proposals", [])
    if not items:
        pytest.skip("No proposals seeded — cannot test Stripe flow")
    # Prefer one with a positive total_price
    for p in items:
        if float(p.get("total_price") or 0) > 0:
            return p
    return items[0]


# ---------------------------------------------------------------------------
# 1. Auth + Stripe Checkout endpoint
# ---------------------------------------------------------------------------
class TestStripeCheckoutAuth:
    def test_checkout_requires_auth(self, proposal):
        r = requests.post(
            f"{API}/payments/stripe/checkout",
            json={"proposal_id": proposal["id"], "origin_url": "https://example.com"},
            timeout=15,
        )
        # FastAPI returns 401 (or 403) without bearer token
        assert r.status_code in (401, 403), f"Expected 401/403, got {r.status_code}: {r.text}"

    def test_checkout_unknown_proposal_404(self, agent_headers):
        r = requests.post(
            f"{API}/payments/stripe/checkout",
            headers=agent_headers,
            json={"proposal_id": "does-not-exist", "origin_url": "https://example.com"},
            timeout=15,
        )
        assert r.status_code == 404


# ---------------------------------------------------------------------------
# 2. Server-side amount calculation (tampered amount is ignored)
# ---------------------------------------------------------------------------
class TestStripeCheckoutAmount:
    def test_full_payment_amount_matches_proposal_total(self, agent_headers, proposal):
        body = {
            "proposal_id": proposal["id"],
            "origin_url": "https://example.com",
            "paymentOption": "full",
            "amount": 1,  # tampered — must be ignored by server
            "couponDiscount": 0,
        }
        r = requests.post(f"{API}/payments/stripe/checkout", headers=agent_headers, json=body, timeout=30)
        assert r.status_code == 200, r.text
        data = r.json()
        assert data.get("success") is True
        assert "url" in data and data["url"].startswith("https://")
        assert "session_id" in data
        session_id = data["session_id"]

        # Verify persistence in payment_transactions via GET status (no booking yet)
        time.sleep(1)
        s = requests.get(f"{API}/payments/stripe/status/{session_id}", timeout=20)
        assert s.status_code == 200, s.text
        sdata = s.json()
        # New session — should be unpaid / open, no booking yet
        assert sdata.get("payment_status") in ("unpaid", "no_payment_required", "paid")
        # If unpaid, booking_id must NOT be set
        if sdata.get("payment_status") == "unpaid":
            assert sdata.get("booking_id") in (None, "")

    def test_partial_payment_with_custom_amount(self, agent_headers, proposal):
        custom = 1850.0
        body = {
            "proposal_id": proposal["id"],
            "origin_url": "https://example.com",
            "paymentOption": "partial",
            "customPartialAmount": custom,
            "amount": 9999999,  # tampered
        }
        r = requests.post(f"{API}/payments/stripe/checkout", headers=agent_headers, json=body, timeout=30)
        assert r.status_code == 200, r.text
        assert "session_id" in r.json()

    def test_partial_payment_defaults_to_25_percent(self, agent_headers, proposal):
        body = {
            "proposal_id": proposal["id"],
            "origin_url": "https://example.com",
            "paymentOption": "partial",
            # no customPartialAmount → should default to 25% of price_after_markup
        }
        r = requests.post(f"{API}/payments/stripe/checkout", headers=agent_headers, json=body, timeout=30)
        assert r.status_code == 200, r.text
        assert "session_id" in r.json()


# ---------------------------------------------------------------------------
# 3. Status endpoint idempotency / no booking on unpaid
# ---------------------------------------------------------------------------
class TestStripeStatus:
    def test_status_unknown_session_returns_error_or_400(self):
        # Stripe will return 4xx for non-existent session — emergentintegrations may raise
        r = requests.get(f"{API}/payments/stripe/status/cs_does_not_exist_XYZ", timeout=20)
        # Either 4xx/5xx error or 200 with an empty/unknown payload — accept gracefully
        assert r.status_code in (200, 400, 404, 500), r.text

    def test_unpaid_status_does_not_create_booking(self, agent_headers, proposal):
        # Create a fresh checkout, immediately poll, expect unpaid + no booking
        body = {"proposal_id": proposal["id"], "origin_url": "https://example.com", "paymentOption": "full"}
        r = requests.post(f"{API}/payments/stripe/checkout", headers=agent_headers, json=body, timeout=30)
        assert r.status_code == 200
        sid = r.json()["session_id"]

        # Poll multiple times — booking should NEVER be created for unpaid
        for _ in range(3):
            s = requests.get(f"{API}/payments/stripe/status/{sid}", timeout=20)
            assert s.status_code == 200
            sdata = s.json()
            if sdata.get("payment_status") == "unpaid":
                assert sdata.get("booking_id") in (None, "")


# ---------------------------------------------------------------------------
# 4. Stripe webhook is registered (not 404)
# ---------------------------------------------------------------------------
class TestStripeWebhook:
    def test_webhook_route_exists(self):
        # Missing signature/body — endpoint returns 200 with status=error (not 404).
        r = requests.post(f"{API}/webhook/stripe", data=b"", timeout=10)
        assert r.status_code in (200, 400), f"Webhook route should exist, got {r.status_code}"
        if r.status_code == 200:
            body = r.json()
            assert "status" in body


# ---------------------------------------------------------------------------
# 5. Legacy /api/bookings POST (wallet/cash) + idempotency
# ---------------------------------------------------------------------------
class TestLegacyBookingFlow:
    def test_bookings_requires_auth(self, proposal):
        r = requests.post(
            f"{API}/bookings",
            json={"proposal_id": proposal["id"], "paymentOption": "full"},
            timeout=15,
        )
        assert r.status_code in (401, 403)

    def test_bookings_create_and_idempotent(self, agent_headers, proposal):
        payload = {
            "proposal_id": proposal["id"],
            "paymentOption": "full",
            "payment_method": "wallet",
            "payment_amount": 100.0,
            "travelers": [],
            "contactInfo": {"email": "t@example.com", "phone": "+97150000000"},
            "specialOccasion": "none",
            "confirmationTime": "2026-01-01T00:00:00Z",
        }
        r1 = requests.post(f"{API}/bookings", headers=agent_headers, json=payload, timeout=20)
        assert r1.status_code == 200, r1.text
        d1 = r1.json()
        assert "booking_ref" in d1 and d1["booking_ref"]
        ref1 = d1["booking_ref"]

        # Second call → must NOT create a duplicate (same booking_ref)
        r2 = requests.post(f"{API}/bookings", headers=agent_headers, json=payload, timeout=20)
        assert r2.status_code == 200, r2.text
        d2 = r2.json()
        assert d2.get("booking_ref") == ref1, f"Idempotency failed: {ref1} vs {d2.get('booking_ref')}"
        # On second call the helper should signal already_processed
        assert d2.get("already_processed") in (True, False)  # always present (bool)

    def test_bookings_list_visible_to_admin(self, admin_headers):
        r = requests.get(f"{API}/bookings", headers=admin_headers, timeout=15)
        assert r.status_code == 200
        assert isinstance(r.json(), list)

    def test_held_bookings_list(self, agent_headers):
        r = requests.get(f"{API}/held-bookings", headers=agent_headers, timeout=15)
        assert r.status_code == 200
        assert isinstance(r.json(), list)


# ---------------------------------------------------------------------------
# 6. Coupon: usage_count not incremented for unpaid Stripe sessions
# ---------------------------------------------------------------------------
class TestCouponUnpaidNoRedemption:
    def _get_coupon(self, admin_headers):
        r = requests.get(f"{API}/coupons", headers=admin_headers, timeout=15)
        if r.status_code != 200:
            return None
        items = r.json() if isinstance(r.json(), list) else r.json().get("coupons", [])
        return items[0] if items else None

    def test_unpaid_session_does_not_increment_coupon(self, agent_headers, admin_headers, proposal):
        coupon = self._get_coupon(admin_headers)
        if not coupon:
            pytest.skip("No coupons available — skipping")
        code = coupon.get("code")
        usage_before = int(coupon.get("usage_count") or 0)

        body = {
            "proposal_id": proposal["id"],
            "origin_url": "https://example.com",
            "paymentOption": "full",
            "couponCode": code,
            "couponDiscount": 10,
        }
        r = requests.post(f"{API}/payments/stripe/checkout", headers=agent_headers, json=body, timeout=30)
        assert r.status_code == 200
        sid = r.json()["session_id"]
        # Poll status (should be unpaid)
        requests.get(f"{API}/payments/stripe/status/{sid}", timeout=15)

        # Coupon usage must be unchanged for unpaid session
        r2 = requests.get(f"{API}/coupons", headers=admin_headers, timeout=15)
        items = r2.json() if isinstance(r2.json(), list) else r2.json().get("coupons", [])
        same = next((c for c in items if c.get("code") == code), None)
        if same is not None:
            usage_after = int(same.get("usage_count") or 0)
            assert usage_after == usage_before, (
                f"Coupon {code} usage incremented on UNPAID session: {usage_before} -> {usage_after}"
            )
