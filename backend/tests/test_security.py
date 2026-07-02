"""Tests for /api/security/* endpoints + regression on core endpoints.

CRITICAL: cleanup fixture at bottom removes the test password so the user
is not locked out. Do not remove.
"""
import os
import pytest
import requests

BASE_URL = os.environ.get("REACT_APP_BACKEND_URL", "https://event-reserve-pro-5.preview.emergentagent.com").rstrip("/")
API = f"{BASE_URL}/api"
PWD = "test1234"
HINT = "pista test"


@pytest.fixture(scope="module")
def client():
    s = requests.Session()
    s.headers.update({"Content-Type": "application/json"})
    yield s
    # Final safety cleanup: ensure password removed & protection off
    try:
        st = s.get(f"{API}/security/status", timeout=10).json()
        if st.get("password_enabled"):
            s.post(f"{API}/security/remove-password", json={"current_password": PWD}, timeout=10)
        s.put(f"{API}/security/protection", json={"enabled": False}, timeout=10)
    except Exception as e:
        print(f"CLEANUP WARNING: {e}")


# ── Security flow ───────────────────────────────────────────────────────────

def test_01_initial_status(client):
    # Ensure clean state first
    st = client.get(f"{API}/security/status").json()
    if st.get("password_enabled"):
        client.post(f"{API}/security/remove-password", json={"current_password": PWD})
    client.put(f"{API}/security/protection", json={"enabled": False})

    r = client.get(f"{API}/security/status")
    assert r.status_code == 200
    data = r.json()
    assert data == {"password_enabled": False, "hint": "", "protection_enabled": False}


def test_02_set_password(client):
    r = client.post(f"{API}/security/set-password", json={"password": PWD, "hint": HINT})
    assert r.status_code == 200
    st = client.get(f"{API}/security/status").json()
    assert st["password_enabled"] is True
    assert st["hint"] == HINT


def test_03_verify_bad_password(client):
    r = client.post(f"{API}/security/verify", json={"password": "wrongwrong"})
    assert r.status_code == 401


def test_04_verify_good_password(client):
    r = client.post(f"{API}/security/verify", json={"password": PWD})
    assert r.status_code == 200
    assert r.json() == {"valid": True}


def test_05_set_password_without_current_when_exists(client):
    r = client.post(f"{API}/security/set-password", json={"password": "newpass99"})
    assert r.status_code == 401


def test_06_toggle_protection(client):
    r = client.put(f"{API}/security/protection", json={"enabled": True})
    assert r.status_code == 200
    assert r.json() == {"enabled": True}
    st = client.get(f"{API}/security/status").json()
    assert st["protection_enabled"] is True
    r = client.put(f"{API}/security/protection", json={"enabled": False})
    assert r.status_code == 200
    assert r.json() == {"enabled": False}


def test_07_remove_password(client):
    r = client.post(f"{API}/security/remove-password", json={"current_password": PWD})
    assert r.status_code == 200
    st = client.get(f"{API}/security/status").json()
    assert st["password_enabled"] is False
    assert st["hint"] == ""


def test_08_settings_endpoint_hides_password_hash(client):
    # Set a password to ensure hash exists
    client.post(f"{API}/security/set-password", json={"password": PWD, "hint": HINT})
    r = client.get(f"{API}/settings")
    assert r.status_code == 200
    body = r.json()
    assert "app_password_hash" not in body, f"app_password_hash leaked: {list(body.keys())}"
    # Cleanup
    client.post(f"{API}/security/remove-password", json={"current_password": PWD})


# ── Regression ──────────────────────────────────────────────────────────────

def test_09_reservations_crud(client):
    r = client.get(f"{API}/reservations")
    assert r.status_code == 200
    assert isinstance(r.json(), list)

    payload = {
        "client_name": "TEST_Security_Reg",
        "phone": "+123",
        "event_date": "2027-01-15",
        "event_time": "18:00",
        "service_type": "boda",
        "event_type": "boda",
        "total_amount": 100.0,
        "notes": "reg",
    }
    c = client.post(f"{API}/reservations", json=payload)
    assert c.status_code in (200, 201), c.text
    rid = c.json().get("id")
    assert rid
    d = client.delete(f"{API}/reservations/{rid}")
    assert d.status_code in (200, 204)


def test_10_updates_check(client):
    r = client.get(f"{API}/updates/check")
    assert r.status_code == 200
    body = r.json()
    assert "checked" in body


def test_11_themes_crud(client):
    r = client.get(f"{API}/themes")
    assert r.status_code == 200
    c = client.post(f"{API}/themes", json={"name": "TEST_SecReg_Theme", "snapshot": {"a": 1}})
    assert c.status_code == 200
    tid = c.json()["id"]
    d = client.delete(f"{API}/themes/{tid}")
    assert d.status_code == 200
