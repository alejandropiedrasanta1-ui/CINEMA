"""Backend tests for new features: updates/check, settings/appearance, themes CRUD."""
import os
import pytest
import requests

BASE_URL = os.environ.get("REACT_APP_BACKEND_URL", "https://event-reserve-pro-5.preview.emergentagent.com").rstrip("/")


@pytest.fixture(scope="module")
def client():
    s = requests.Session()
    s.headers.update({"Content-Type": "application/json"})
    return s


# --- /api/updates/check ---
class TestUpdatesCheck:
    def test_updates_check_returns_expected_shape(self, client):
        r = client.get(f"{BASE_URL}/api/updates/check", timeout=30)
        assert r.status_code == 200, r.text
        data = r.json()
        assert data.get("checked") is True
        assert data.get("has_update") is False
        assert data.get("is_cloud") is True
        assert "remote_version" in data
        assert "id" in data
        assert "filename" in data


# --- /api/settings/appearance ---
class TestAppearanceSettings:
    def test_put_and_get_appearance(self, client):
        payload = {"snapshot": {"theme": "rose", "TEST_MARKER": True}}
        r = client.put(f"{BASE_URL}/api/settings/appearance", json=payload, timeout=30)
        assert r.status_code == 200, r.text
        assert "updated_at" in r.json()

        g = client.get(f"{BASE_URL}/api/settings/appearance", timeout=30)
        assert g.status_code == 200
        gd = g.json()
        snap = gd.get("snapshot") or {}
        assert snap.get("theme") == "rose"
        assert snap.get("TEST_MARKER") is True

    def test_cleanup_appearance(self, client):
        # cleanup: reset to empty so user's UI not affected
        r = client.put(f"{BASE_URL}/api/settings/appearance", json={"snapshot": {}}, timeout=30)
        assert r.status_code == 200


# --- /api/themes CRUD ---
class TestThemesCRUD:
    created_id = None

    def test_create_theme_without_name_400(self, client):
        r = client.post(f"{BASE_URL}/api/themes", json={"snapshot": {"theme": "rose"}}, timeout=30)
        assert r.status_code == 400, f"expected 400 got {r.status_code}: {r.text}"

    def test_create_list_delete_theme(self, client):
        # CREATE
        payload = {"name": "TEST_Theme_Playbook", "snapshot": {"theme": "rose"}}
        r = client.post(f"{BASE_URL}/api/themes", json=payload, timeout=30)
        assert r.status_code in (200, 201), r.text
        theme = r.json()
        assert "id" in theme
        assert theme.get("name") == "TEST_Theme_Playbook"
        tid = theme["id"]

        # LIST
        lr = client.get(f"{BASE_URL}/api/themes", timeout=30)
        assert lr.status_code == 200
        items = lr.json()
        # accept either list or {items: [...]}
        arr = items if isinstance(items, list) else items.get("items") or items.get("themes") or []
        assert any(t.get("id") == tid for t in arr), f"created theme not in list: {arr}"

        # DELETE
        dr = client.delete(f"{BASE_URL}/api/themes/{tid}", timeout=30)
        assert dr.status_code in (200, 204), dr.text

        # VERIFY gone
        lr2 = client.get(f"{BASE_URL}/api/themes", timeout=30)
        arr2 = lr2.json() if isinstance(lr2.json(), list) else lr2.json().get("items") or lr2.json().get("themes") or []
        assert not any(t.get("id") == tid for t in arr2)


# --- REGRESSION: reservations create ---
class TestReservationsRegression:
    def test_create_reservation(self, client):
        payload = {
            "client_name": "TEST_Cliente_Playbook",
            "client_email": "test_playbook@example.com",
            "client_phone": "1234567890",
            "event_type": "boda",
            "event_date": "2027-01-15",
            "event_time": "18:00",
            "location": "TEST_Location",
            "guest_count": 50,
            "package": "basico",
            "total_amount": 1000,
            "deposit": 200,
            "status": "pendiente",
            "notes": "TEST reservation from playbook",
        }
        r = client.post(f"{BASE_URL}/api/reservations", json=payload, timeout=30)
        # Accept 200 or 201
        assert r.status_code in (200, 201), r.text
        d = r.json()
        assert d.get("client_name") == payload["client_name"]
        rid = d.get("id")
        assert rid
        # cleanup
        client.delete(f"{BASE_URL}/api/reservations/{rid}", timeout=30)
