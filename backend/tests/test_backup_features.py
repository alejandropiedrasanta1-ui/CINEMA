"""Tests for backup/restore feature - iteration 16"""
import pytest
import requests
import os
import json
import tempfile

BASE_URL = os.environ.get("REACT_APP_BACKEND_URL", "").rstrip("/")

class TestBackupAPIs:
    """Tests for backup-related endpoints"""

    def test_download_full_backup(self):
        """GET /api/backup/download returns JSON file"""
        res = requests.get(f"{BASE_URL}/api/backup/download", timeout=15)
        assert res.status_code == 200
        assert "application/json" in res.headers.get("content-type", "")
        cd = res.headers.get("content-disposition", "")
        assert "cinema_backup_" in cd or "attachment" in cd
        data = res.json()
        assert "_meta" in data
        print(f"PASS: download backup - keys: {list(data.keys())}")

    def test_create_server_backup(self):
        """POST /api/backup/create creates a backup and returns filename"""
        res = requests.post(f"{BASE_URL}/api/backup/create", timeout=15)
        assert res.status_code == 200
        data = res.json()
        assert data.get("success") is True
        assert "filename" in data
        print(f"PASS: server backup created: {data['filename']}")

    def test_backup_history(self):
        """GET /api/backup/history returns list"""
        res = requests.get(f"{BASE_URL}/api/backup/history", timeout=10)
        assert res.status_code == 200
        data = res.json()
        assert isinstance(data, list)
        print(f"PASS: history has {len(data)} backup(s)")
        if data:
            b = data[0]
            assert "filename" in b
            assert "size_kb" in b or "created_at" in b

    def test_download_specific_backup(self):
        """GET /api/backup/{filename}/download returns the file"""
        # First get history to get a real filename
        h_res = requests.get(f"{BASE_URL}/api/backup/history", timeout=10)
        history = h_res.json()
        if not history:
            pytest.skip("No backups in history to download")
        filename = history[0]["filename"]
        res = requests.get(f"{BASE_URL}/api/backup/{filename}/download", timeout=15)
        assert res.status_code == 200
        data = res.json()
        assert "_meta" in data
        print(f"PASS: downloaded specific backup {filename}")

    def test_restore_backup(self):
        """POST /api/backup/restore with a valid JSON file"""
        # Create minimal valid backup
        backup = {
            "_meta": {"created_at": "2026-01-01T00:00:00Z", "label": "test"},
            "reservations": [],
            "members": []
        }
        content = json.dumps(backup).encode()
        res = requests.post(
            f"{BASE_URL}/api/backup/restore",
            files={"file": ("test_backup.json", content, "application/json")},
            timeout=20
        )
        assert res.status_code == 200
        data = res.json()
        assert data.get("success") is True
        print(f"PASS: restore returned: {data.get('message','')}")

    def test_clear_all_with_auto_backup(self):
        """DELETE /api/data/clear-all?auto_backup=True creates backup first"""
        # Check history before
        h_before = requests.get(f"{BASE_URL}/api/backup/history", timeout=10).json()
        count_before = len(h_before)
        
        res = requests.delete(f"{BASE_URL}/api/data/clear-all?auto_backup=true", timeout=20)
        assert res.status_code == 200
        data = res.json()
        assert data.get("auto_backup_created") is True
        
        # Check history after
        h_after = requests.get(f"{BASE_URL}/api/backup/history", timeout=10).json()
        count_after = len(h_after)
        assert count_after > count_before or count_after == 15  # 15 max kept
        print(f"PASS: auto-backup created. History: {count_before} -> {count_after}")

    def test_delete_backup(self):
        """DELETE /api/backup/{filename} deletes backup"""
        # Create one first
        cr = requests.post(f"{BASE_URL}/api/backup/create", timeout=15).json()
        filename = cr["filename"]
        
        res = requests.delete(f"{BASE_URL}/api/backup/{filename}", timeout=10)
        assert res.status_code == 200
        data = res.json()
        assert data.get("success") is True
        print(f"PASS: deleted backup {filename}")
