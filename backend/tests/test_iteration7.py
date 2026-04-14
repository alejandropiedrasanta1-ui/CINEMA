"""
Iteration 7: Test new features - Settings (Reminders + Database), Reminders manual trigger, and existing endpoints
"""
import pytest
import requests
import os

BASE_URL = os.environ.get('REACT_APP_BACKEND_URL', '').rstrip('/')


class TestExistingEndpoints:
    """Verify existing endpoints still work"""

    def test_get_reservations(self):
        r = requests.get(f"{BASE_URL}/api/reservations")
        assert r.status_code == 200
        assert isinstance(r.json(), list)

    def test_get_calendar(self):
        r = requests.get(f"{BASE_URL}/api/calendar")
        assert r.status_code == 200
        assert isinstance(r.json(), list)

    def test_get_socios(self):
        r = requests.get(f"{BASE_URL}/api/socios")
        assert r.status_code == 200
        assert isinstance(r.json(), list)

    def test_get_financials(self):
        r = requests.get(f"{BASE_URL}/api/financials")
        assert r.status_code == 200
        data = r.json()
        assert "total_event_amount" in data
        assert "real_income" in data


class TestSettings:
    """GET/PUT /api/settings"""

    def test_get_settings(self):
        r = requests.get(f"{BASE_URL}/api/settings")
        assert r.status_code == 200
        # Returns dict (may be empty if no settings saved yet)
        assert isinstance(r.json(), dict)

    def test_put_settings_basic(self):
        payload = {
            "reminders_enabled": True,
            "reminder_days": 5,
            "admin_email": "test@cinema.com",
            "admin_whatsapp": "+521234567890",
            "notification_channel": "email",
            "resend_api_key": None
        }
        r = requests.put(f"{BASE_URL}/api/settings", json=payload)
        assert r.status_code == 200
        data = r.json()
        assert data.get("reminders_enabled") == True
        assert data.get("reminder_days") == 5
        assert data.get("admin_email") == "test@cinema.com"

    def test_put_settings_persists(self):
        """After PUT, GET should return same values"""
        payload = {
            "reminders_enabled": False,
            "reminder_days": 7,
            "admin_email": "persist@cinema.com",
            "admin_whatsapp": None,
            "notification_channel": "both",
            "resend_api_key": None
        }
        requests.put(f"{BASE_URL}/api/settings", json=payload)
        r = requests.get(f"{BASE_URL}/api/settings")
        assert r.status_code == 200
        data = r.json()
        assert data.get("reminder_days") == 7
        assert data.get("notification_channel") == "both"

    def test_settings_api_key_masked(self):
        """If resend_api_key is set, it should be masked in GET response"""
        payload = {
            "reminders_enabled": False,
            "reminder_days": 3,
            "admin_email": "test@cinema.com",
            "admin_whatsapp": None,
            "notification_channel": "email",
            "resend_api_key": "re_testkey_abcdefghij1234"
        }
        requests.put(f"{BASE_URL}/api/settings", json=payload)
        r = requests.get(f"{BASE_URL}/api/settings")
        data = r.json()
        assert data.get("has_resend_key") == True
        # Key should be masked
        key_val = data.get("resend_api_key", "")
        assert "testkey_abcdefghij1234" not in key_val  # original key not exposed


class TestDatabaseSettings:
    """GET /api/settings/database and POST /api/settings/database/*"""

    def test_get_db_stats(self):
        r = requests.get(f"{BASE_URL}/api/settings/database")
        assert r.status_code == 200
        data = r.json()
        assert "collections" in data
        assert "objects" in data
        assert "data_size" in data
        assert "storage_size" in data
        assert "current_url" in data
        print(f"DB stats: collections={data['collections']}, objects={data['objects']}")

    def test_test_db_connection_valid(self):
        """Test valid MongoDB URL"""
        from dotenv import dotenv_values
        mongo_url = dotenv_values('/app/backend/.env').get('MONGO_URL', 'mongodb://localhost:27017')
        r = requests.post(f"{BASE_URL}/api/settings/database/test", json={"url": mongo_url})
        assert r.status_code == 200
        data = r.json()
        assert data.get("success") == True

    def test_test_db_connection_invalid(self):
        """Invalid URL should return 400"""
        r = requests.post(
            f"{BASE_URL}/api/settings/database/test",
            json={"url": "mongodb://invalid-host-that-does-not-exist:27017/testdb"}
        )
        assert r.status_code == 400

    def test_reset_database(self):
        """Reset should always succeed (restores original)"""
        r = requests.post(f"{BASE_URL}/api/settings/database/reset")
        assert r.status_code == 200
        data = r.json()
        assert data.get("success") == True


class TestReminders:
    """POST /api/reminders/send"""

    def test_trigger_reminders_manual(self):
        # First ensure settings exist
        requests.put(f"{BASE_URL}/api/settings", json={
            "reminders_enabled": True,
            "reminder_days": 3,
            "admin_email": "test@cinema.com",
            "admin_whatsapp": None,
            "notification_channel": "email",
            "resend_api_key": None
        })
        r = requests.post(f"{BASE_URL}/api/reminders/send")
        assert r.status_code == 200
        data = r.json()
        assert "events_found" in data
        assert "target_date" in data
        assert "sent" in data
        assert data.get("success") == True
        print(f"Reminders: events_found={data['events_found']}, target_date={data['target_date']}")
