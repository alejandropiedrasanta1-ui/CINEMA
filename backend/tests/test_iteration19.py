"""
Iteration 19: Test new appearance settings and business config API
Tests: PUT /api/settings with business config fields, GET /api/settings response
"""
import pytest
import requests
import os

BASE_URL = os.environ.get("REACT_APP_BACKEND_URL", "").rstrip("/")


class TestBusinessConfigSettings:
    """Test business config fields in PUT /api/settings"""

    def test_get_settings_returns_200(self):
        r = requests.get(f"{BASE_URL}/api/settings")
        assert r.status_code == 200
        data = r.json()
        assert isinstance(data, dict)

    def test_get_settings_has_business_fields(self):
        r = requests.get(f"{BASE_URL}/api/settings")
        assert r.status_code == 200
        data = r.json()
        # These fields should be present (may be None/empty)
        for field in ["company_name", "company_address", "company_phone", "timezone",
                      "default_advance_pct", "business_hours_start", "business_hours_end",
                      "backup_retention"]:
            assert field in data, f"Field '{field}' missing from GET /api/settings response"

    def test_put_settings_business_config(self):
        payload = {
            "company_name": "TEST_Cinema Productions",
            "company_address": "123 Calle Principal, Guatemala",
            "company_phone": "+502 1234 5678",
            "company_website": "https://example.com",
            "company_tax_id": "123456789",
            "timezone": "America/Guatemala",
            "default_advance_pct": 25,
            "business_hours_start": "08:00",
            "business_hours_end": "21:00",
            "backup_retention": 20,
        }
        r = requests.put(f"{BASE_URL}/api/settings", json=payload)
        assert r.status_code == 200

    def test_put_settings_persists_company_name(self):
        payload = {"company_name": "TEST_Verified Company"}
        r = requests.put(f"{BASE_URL}/api/settings", json=payload)
        assert r.status_code == 200
        # Verify persistence via GET
        r2 = requests.get(f"{BASE_URL}/api/settings")
        assert r2.status_code == 200
        data = r2.json()
        assert data.get("company_name") == "TEST_Verified Company"

    def test_put_settings_backup_retention(self):
        for val in [5, 10, 20, 50, 100]:
            r = requests.put(f"{BASE_URL}/api/settings", json={"backup_retention": val})
            assert r.status_code == 200

    def test_put_settings_advance_pct(self):
        r = requests.put(f"{BASE_URL}/api/settings", json={"default_advance_pct": 40})
        assert r.status_code == 200
        r2 = requests.get(f"{BASE_URL}/api/settings")
        data = r2.json()
        assert data.get("default_advance_pct") == 40

    def test_put_settings_business_hours(self):
        r = requests.put(f"{BASE_URL}/api/settings", json={
            "business_hours_start": "09:00",
            "business_hours_end": "20:00"
        })
        assert r.status_code == 200
        r2 = requests.get(f"{BASE_URL}/api/settings")
        data = r2.json()
        assert data.get("business_hours_start") == "09:00"
        assert data.get("business_hours_end") == "20:00"

    def test_put_settings_timezone(self):
        timezones = ["America/Guatemala", "America/Mexico_City", "America/Bogota", "America/Lima"]
        for tz in timezones:
            r = requests.put(f"{BASE_URL}/api/settings", json={"timezone": tz})
            assert r.status_code == 200

    def test_put_settings_auto_cleanup_months(self):
        r = requests.put(f"{BASE_URL}/api/settings", json={"auto_cleanup_months": 6})
        assert r.status_code == 200
        r2 = requests.get(f"{BASE_URL}/api/settings")
        data = r2.json()
        assert data.get("auto_cleanup_months") == 6

    def test_cleanup_restore_defaults(self):
        """Restore defaults after tests"""
        r = requests.put(f"{BASE_URL}/api/settings", json={
            "company_name": "",
            "default_advance_pct": 30,
            "backup_retention": 10,
        })
        assert r.status_code == 200
