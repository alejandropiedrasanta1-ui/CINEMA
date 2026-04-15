"""
Test iteration 18 - Testing new Database features:
xlsx export, csv import, cleanup preview, auto-backup
"""
import pytest
import requests
import os
import io

BASE_URL = os.environ.get('REACT_APP_BACKEND_URL', '').rstrip('/')


class TestXLSXExport:
    """Test Excel export endpoint"""

    def test_xlsx_export_returns_200(self):
        res = requests.get(f"{BASE_URL}/api/export/reservations/xlsx")
        assert res.status_code == 200, f"Expected 200, got {res.status_code}: {res.text[:200]}"

    def test_xlsx_export_content_type(self):
        res = requests.get(f"{BASE_URL}/api/export/reservations/xlsx")
        assert "spreadsheet" in res.headers.get("content-type", "").lower() or \
               "octet-stream" in res.headers.get("content-type", "").lower(), \
               f"Unexpected content-type: {res.headers.get('content-type')}"

    def test_xlsx_export_file_size(self):
        res = requests.get(f"{BASE_URL}/api/export/reservations/xlsx")
        assert len(res.content) > 1000, f"XLSX too small: {len(res.content)} bytes"

    def test_xlsx_export_is_valid_xlsx(self):
        """Verify it's a valid xlsx (zip-based) file"""
        res = requests.get(f"{BASE_URL}/api/export/reservations/xlsx")
        # .xlsx files start with PK (zip magic bytes)
        assert res.content[:2] == b'PK', "Not a valid .xlsx (zip) file"


class TestCSVImport:
    """Test CSV import endpoint"""

    def test_csv_import_basic(self):
        csv_data = "nombre,tipo_evento,fecha,total,anticipo,estado\nTEST_Juan Prueba,Boda,2026-05-01,5000,1000,Pendiente\n"
        files = {"file": ("test_import.csv", io.BytesIO(csv_data.encode()), "text/csv")}
        res = requests.post(f"{BASE_URL}/api/import/reservations", files=files)
        assert res.status_code == 200
        data = res.json()
        assert data["ok"] == True
        assert data["imported"] > 0, f"Expected imported > 0, got {data}"

    def test_csv_import_response_fields(self):
        csv_data = "nombre,tipo_evento,fecha,total,anticipo,estado\nTEST_Maria CSV,Quinceañera,2026-06-15,3000,500,Pendiente\n"
        files = {"file": ("test2.csv", io.BytesIO(csv_data.encode()), "text/csv")}
        res = requests.post(f"{BASE_URL}/api/import/reservations", files=files)
        data = res.json()
        assert "ok" in data
        assert "imported" in data
        assert "message" in data
        assert "errors" in data

    def test_csv_import_empty_name_skipped(self):
        """Rows with empty name should be skipped"""
        csv_data = "nombre,tipo_evento,fecha,total\n,Boda,2026-05-01,5000\n"
        files = {"file": ("empty_name.csv", io.BytesIO(csv_data.encode()), "text/csv")}
        res = requests.post(f"{BASE_URL}/api/import/reservations", files=files)
        data = res.json()
        assert data["imported"] == 0


class TestCleanupPreview:
    """Test data cleanup preview endpoint"""

    def test_cleanup_preview_returns_200(self):
        res = requests.post(f"{BASE_URL}/api/data/cleanup?action=preview&months_old=6")
        assert res.status_code == 200

    def test_cleanup_preview_has_counts(self):
        res = requests.post(f"{BASE_URL}/api/data/cleanup?action=preview&months_old=6")
        data = res.json()
        assert data["ok"] == True
        assert "cancelled_count" in data
        assert "old_completed_count" in data
        assert isinstance(data["cancelled_count"], int)
        assert isinstance(data["old_completed_count"], int)

    def test_cleanup_preview_months_threshold(self):
        res = requests.post(f"{BASE_URL}/api/data/cleanup?action=preview&months_old=6")
        data = res.json()
        assert data.get("months_threshold") == 6


class TestCSVExport:
    """Test CSV and JSON export"""

    def test_csv_export(self):
        res = requests.get(f"{BASE_URL}/api/export/reservations?format=csv")
        assert res.status_code == 200
        assert len(res.content) > 0

    def test_json_export(self):
        res = requests.get(f"{BASE_URL}/api/export/reservations?format=json")
        assert res.status_code == 200
        data = res.json()
        assert isinstance(data, list)


class TestBackupDownload:
    """Test backup download endpoint"""

    def test_backup_download_returns_json(self):
        res = requests.get(f"{BASE_URL}/api/backup/download")
        assert res.status_code == 200
        assert len(res.content) > 100
