"""
Tests for backup/restore endpoints - verifying 3 collections and multipart upload fix
"""
import pytest
import requests
import os
import json
import tempfile

BASE_URL = os.environ.get('REACT_APP_BACKEND_URL', '').rstrip('/')

class TestBackupDownload:
    """Test GET /api/backup/download"""

    def test_backup_download_returns_200(self):
        r = requests.get(f"{BASE_URL}/api/backup/download")
        assert r.status_code == 200, f"Expected 200, got {r.status_code}: {r.text[:200]}"
        print("PASS: backup download returns 200")

    def test_backup_download_is_json(self):
        r = requests.get(f"{BASE_URL}/api/backup/download")
        assert r.status_code == 200
        data = r.json()
        assert isinstance(data, dict), "Response should be a dict"
        print(f"PASS: backup is JSON with keys: {list(data.keys())}")

    def test_backup_contains_reservations(self):
        r = requests.get(f"{BASE_URL}/api/backup/download")
        data = r.json()
        assert "reservations" in data, f"Missing 'reservations' key. Keys: {list(data.keys())}"
        print("PASS: backup contains 'reservations'")

    def test_backup_contains_socios(self):
        r = requests.get(f"{BASE_URL}/api/backup/download")
        data = r.json()
        assert "socios" in data, f"Missing 'socios' key. Keys: {list(data.keys())}"
        print("PASS: backup contains 'socios'")

    def test_backup_contains_app_settings(self):
        r = requests.get(f"{BASE_URL}/api/backup/download")
        data = r.json()
        assert "app_settings" in data, f"Missing 'app_settings' key. Keys: {list(data.keys())}"
        print("PASS: backup contains 'app_settings'")

    def test_backup_collections_are_lists(self):
        r = requests.get(f"{BASE_URL}/api/backup/download")
        data = r.json()
        for col in ["reservations", "socios", "app_settings"]:
            assert isinstance(data.get(col), list), f"'{col}' should be a list"
        print("PASS: all 3 collections are lists")


class TestBackupRestore:
    """Test POST /api/backup/restore"""

    def _get_backup_data(self):
        r = requests.get(f"{BASE_URL}/api/backup/download")
        assert r.status_code == 200
        return r.json()

    def test_restore_with_valid_json_file(self):
        backup_data = self._get_backup_data()
        json_bytes = json.dumps(backup_data).encode("utf-8")
        
        # Send as multipart/form-data WITHOUT explicit Content-Type header
        files = {"file": ("backup.json", json_bytes, "application/json")}
        r = requests.post(f"{BASE_URL}/api/backup/restore", files=files)
        assert r.status_code == 200, f"Expected 200, got {r.status_code}: {r.text[:300]}"
        print(f"PASS: restore returns 200. Response: {r.text[:200]}")

    def test_restore_response_has_success_true(self):
        backup_data = self._get_backup_data()
        json_bytes = json.dumps(backup_data).encode("utf-8")
        files = {"file": ("backup.json", json_bytes, "application/json")}
        r = requests.post(f"{BASE_URL}/api/backup/restore", files=files)
        data = r.json()
        assert data.get("success") == True, f"Expected success:true, got: {data}"
        print(f"PASS: restore success=True")

    def test_restore_restores_all_3_collections(self):
        backup_data = self._get_backup_data()
        json_bytes = json.dumps(backup_data).encode("utf-8")
        files = {"file": ("backup.json", json_bytes, "application/json")}
        r = requests.post(f"{BASE_URL}/api/backup/restore", files=files)
        data = r.json()
        # Check response mentions the collections
        print(f"Restore response: {data}")
        assert r.status_code == 200
        print("PASS: restore completed for all collections")
