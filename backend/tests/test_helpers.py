"""Shared pytest fixtures + helpers for the backend integration tests.

All test credentials are pulled from environment variables (with sensible
local defaults) so individual test files don't hard-code passwords. This
keeps the test suite scannable for secret-detection tools and lets CI
override the defaults via the standard env-var mechanism.

Override locally by adding to `backend/.env.test` (gitignored) e.g.:
    TEST_ADMIN_PASSWORD=mySecret
    TEST_AGENT_PASSWORD=otherSecret
"""
import os
import requests


# ---------------------------------------------------------------------------
# URLs
# ---------------------------------------------------------------------------
def _read_backend_url() -> str:
    explicit = os.environ.get("BACKEND_URL") or os.environ.get("REACT_APP_BACKEND_URL")
    if explicit:
        return explicit.rstrip("/")
    try:
        with open("/app/frontend/.env") as fh:
            for line in fh:
                if line.startswith("REACT_APP_BACKEND_URL="):
                    return line.split("=", 1)[1].strip().rstrip("/")
    except FileNotFoundError:
        pass
    return "http://localhost:8001"


BACKEND_URL = _read_backend_url()
API = f"{BACKEND_URL}/api"


# ---------------------------------------------------------------------------
# Credentials  (env-var → fallback default kept in this single file)
# ---------------------------------------------------------------------------
_DEFAULT_PWD = os.environ.get("TEST_DEFAULT_PASSWORD", "password123")

TEST_ADMIN_EMAIL = os.environ.get("TEST_ADMIN_EMAIL", "testadmin@example.com")
TEST_ADMIN_PASSWORD = os.environ.get("TEST_ADMIN_PASSWORD", _DEFAULT_PWD)

TEST_AGENT_EMAIL = os.environ.get("TEST_AGENT_EMAIL", "rashid@travotours.ae")
TEST_AGENT_PASSWORD = os.environ.get("TEST_AGENT_PASSWORD", _DEFAULT_PWD)

TEST_STAFF_EMAIL = os.environ.get("TEST_STAFF_EMAIL", "neha@travotours.ae")
TEST_STAFF_PASSWORD = os.environ.get("TEST_STAFF_PASSWORD", _DEFAULT_PWD)

TEST_SUPPLIER_EMAIL = os.environ.get("TEST_SUPPLIER_EMAIL", "supplier@georgiancars.ge")
TEST_SUPPLIER_PASSWORD = os.environ.get("TEST_SUPPLIER_PASSWORD", _DEFAULT_PWD)


# ---------------------------------------------------------------------------
# Auth helpers
# ---------------------------------------------------------------------------
def login(email: str, password: str) -> str:
    """Return the JWT access token for the given account."""
    r = requests.post(f"{API}/auth/login", json={"email": email, "password": password}, timeout=15)
    r.raise_for_status()
    return r.json()["access_token"]


def auth_headers(token: str) -> dict:
    return {"Authorization": f"Bearer {token}", "Content-Type": "application/json"}


def admin_token() -> str:
    return login(TEST_ADMIN_EMAIL, TEST_ADMIN_PASSWORD)


def agent_token() -> str:
    return login(TEST_AGENT_EMAIL, TEST_AGENT_PASSWORD)


def staff_token() -> str:
    return login(TEST_STAFF_EMAIL, TEST_STAFF_PASSWORD)


def supplier_token() -> str:
    return login(TEST_SUPPLIER_EMAIL, TEST_SUPPLIER_PASSWORD)
