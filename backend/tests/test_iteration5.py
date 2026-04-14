"""
Tests for Iteration 5: Socios CRUD, photo upload, locations, team assignment, financials
"""
import pytest
import requests
import os

BASE_URL = os.environ.get("REACT_APP_BACKEND_URL", "").rstrip("/")

class TestSociosCRUD:
    """Test Socios CRUD operations"""
    socio_id = None

    def test_create_socio(self):
        payload = {"name": "TEST_Carlos Pérez", "role": "Fotógrafo", "phone": "+502 1234 5678", "rate_per_event": 2000}
        r = requests.post(f"{BASE_URL}/api/socios", json=payload)
        assert r.status_code == 201, r.text
        data = r.json()
        assert data["name"] == "TEST_Carlos Pérez"
        assert data["role"] == "Fotógrafo"
        assert "id" in data
        TestSociosCRUD.socio_id = data["id"]
        print(f"Created socio id: {TestSociosCRUD.socio_id}")

    def test_list_socios(self):
        r = requests.get(f"{BASE_URL}/api/socios")
        assert r.status_code == 200
        data = r.json()
        assert isinstance(data, list)
        names = [s["name"] for s in data]
        assert "TEST_Carlos Pérez" in names
        print(f"Listed {len(data)} socios")

    def test_get_socio(self):
        assert TestSociosCRUD.socio_id
        r = requests.get(f"{BASE_URL}/api/socios/{TestSociosCRUD.socio_id}")
        assert r.status_code == 200
        data = r.json()
        assert data["name"] == "TEST_Carlos Pérez"

    def test_update_socio(self):
        assert TestSociosCRUD.socio_id
        r = requests.put(f"{BASE_URL}/api/socios/{TestSociosCRUD.socio_id}", json={"phone": "+502 9999 9999"})
        assert r.status_code == 200
        data = r.json()
        assert data["phone"] == "+502 9999 9999"

    def test_upload_photo(self):
        assert TestSociosCRUD.socio_id
        # Create a minimal JPEG bytes
        import base64
        # 1x1 pixel red JPEG
        jpg_b64 = "/9j/4AAQSkZJRgABAQEASABIAAD/2wBDAAgGBgcGBQgHBwcJCQgKDBQNDAsLDBkSEw8UHRofHh0aHBwgJC4nICIsIxwcKDcpLDAxNDQ0Hyc5PTgyPC4zNDL/2wBDAQkJCQwLDBgNDRgyIRwhMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjL/wAARCAABAAEDASIAAhEBAxEB/8QAFAABAAAAAAAAAAAAAAAAAAAACf/EABQQAQAAAAAAAAAAAAAAAAAAAAD/xAAUAQEAAAAAAAAAAAAAAAAAAAAA/8QAFBEBAAAAAAAAAAAAAAAAAAAAAP/aAAwDAQACEQMRAD8AJQAB/9k="
        img_bytes = base64.b64decode(jpg_b64)
        files = {"file": ("photo.jpg", img_bytes, "image/jpeg")}
        r = requests.post(f"{BASE_URL}/api/socios/{TestSociosCRUD.socio_id}/photo", files=files)
        assert r.status_code == 200, r.text
        # Verify photo is stored
        r2 = requests.get(f"{BASE_URL}/api/socios/{TestSociosCRUD.socio_id}")
        data = r2.json()
        assert data.get("photo") is not None
        assert data.get("photo_content_type") is not None
        print("Photo uploaded successfully")

    def test_delete_socio(self):
        assert TestSociosCRUD.socio_id
        r = requests.delete(f"{BASE_URL}/api/socios/{TestSociosCRUD.socio_id}")
        assert r.status_code == 200
        # Verify deletion
        r2 = requests.get(f"{BASE_URL}/api/socios/{TestSociosCRUD.socio_id}")
        assert r2.status_code == 404


class TestLocationsAndTeam:
    """Test locations update and team assignment in reservations"""
    reservation_id = None
    socio_id = None

    def test_setup_create_reservation_and_socio(self):
        # Create a test reservation
        r = requests.post(f"{BASE_URL}/api/reservations", json={
            "client_name": "TEST_Boda Lopez",
            "event_type": "Boda",
            "event_date": "2026-06-15",
            "total_amount": 10000
        })
        assert r.status_code == 201, r.text
        TestLocationsAndTeam.reservation_id = r.json()["id"]

        # Create a test socio
        r2 = requests.post(f"{BASE_URL}/api/socios", json={"name": "TEST_Fotógrafo Team", "role": "Fotógrafo", "rate_per_event": 3000})
        assert r2.status_code == 201
        TestLocationsAndTeam.socio_id = r2.json()["id"]
        print(f"Setup: reservation={TestLocationsAndTeam.reservation_id}, socio={TestLocationsAndTeam.socio_id}")

    def test_update_locations(self):
        assert TestLocationsAndTeam.reservation_id
        locations = [
            {"type": "maquillaje", "address": "Salon Bella, Zona 10", "waze_url": "https://waze.com/ul?ll=14.6,-90.5"},
            {"type": "ceremonia", "address": "Iglesia Catedral, Zona 1", "waze_url": "https://waze.com/ul?ll=14.64,-90.51"},
            {"type": "fiesta", "address": "Hotel Barcelo, Zona 15", "waze_url": ""},
        ]
        r = requests.put(f"{BASE_URL}/api/reservations/{TestLocationsAndTeam.reservation_id}", json={"locations": locations})
        assert r.status_code == 200, r.text
        data = r.json()
        locs = data.get("locations", [])
        assert len(locs) == 3
        maquillaje = next((l for l in locs if l["type"] == "maquillaje"), None)
        assert maquillaje is not None
        assert maquillaje["address"] == "Salon Bella, Zona 10"
        print("Locations saved successfully")

    def test_assign_partner_to_reservation(self):
        assert TestLocationsAndTeam.reservation_id
        assert TestLocationsAndTeam.socio_id
        partners = [{"socio_id": TestLocationsAndTeam.socio_id, "name": "TEST_Fotógrafo Team", "role": "Fotógrafo", "photo": None, "photo_content_type": None, "payment": 3000}]
        r = requests.put(f"{BASE_URL}/api/reservations/{TestLocationsAndTeam.reservation_id}", json={"assigned_partners": partners})
        assert r.status_code == 200
        data = r.json()
        assigned = data.get("assigned_partners", [])
        assert len(assigned) == 1
        assert assigned[0]["payment"] == 3000
        print("Partner assigned successfully")

    def test_real_income_calculation(self):
        """Ingreso Real = total_amount - total_partner_cost (NOT advance_paid)"""
        assert TestLocationsAndTeam.reservation_id
        r = requests.get(f"{BASE_URL}/api/reservations/{TestLocationsAndTeam.reservation_id}")
        assert r.status_code == 200
        data = r.json()
        total = data.get("total_amount", 0)
        partners = data.get("assigned_partners", [])
        team_cost = sum(p.get("payment", 0) for p in partners)
        real_income = total - team_cost
        assert real_income == 7000, f"Expected 7000, got {real_income} (total={total}, team_cost={team_cost})"
        print(f"Real income = {real_income} (correct)")

    def test_remove_partner(self):
        assert TestLocationsAndTeam.reservation_id
        r = requests.put(f"{BASE_URL}/api/reservations/{TestLocationsAndTeam.reservation_id}", json={"assigned_partners": []})
        assert r.status_code == 200
        data = r.json()
        assert len(data.get("assigned_partners", [])) == 0
        print("Partner removed successfully")

    def test_financials_endpoint(self):
        """GET /api/financials returns correct fields"""
        r = requests.get(f"{BASE_URL}/api/financials")
        assert r.status_code == 200, r.text
        data = r.json()
        assert "total_event_amount" in data, f"Missing total_event_amount in {data}"
        assert "total_partner_cost" in data
        assert "real_income" in data
        assert isinstance(data["total_event_amount"], (int, float))
        assert isinstance(data["real_income"], (int, float))
        # real_income = total_event_amount - total_partner_cost
        expected = round(data["total_event_amount"] - data["total_partner_cost"], 2)
        assert abs(data["real_income"] - expected) < 0.01, f"real_income mismatch: {data}"
        print(f"Financials: {data}")

    def test_cleanup(self):
        """Cleanup test data"""
        if TestLocationsAndTeam.reservation_id:
            requests.delete(f"{BASE_URL}/api/reservations/{TestLocationsAndTeam.reservation_id}")
        if TestLocationsAndTeam.socio_id:
            requests.delete(f"{BASE_URL}/api/socios/{TestLocationsAndTeam.socio_id}")
        print("Cleanup done")
