"""Backend tests for Event Reservation System"""
import pytest
import requests
import os

BASE_URL = os.environ.get('REACT_APP_BACKEND_URL', '').rstrip('/')

@pytest.fixture
def client():
    s = requests.Session()
    s.headers.update({"Content-Type": "application/json"})
    return s

@pytest.fixture
def created_reservation(client):
    """Create a reservation for testing and clean up after"""
    payload = {
        "client_name": "TEST_Ana López",
        "client_phone": "5551234567",
        "client_email": "ana@test.com",
        "event_type": "Boda",
        "event_date": "2026-08-15",
        "event_time": "18:00",
        "venue": "Jardín Las Palmas",
        "guests_count": 150,
        "total_amount": 50000.0,
        "advance_paid": 10000.0,
        "status": "Pendiente",
        "notes": "Test reservation"
    }
    r = client.post(f"{BASE_URL}/api/reservations", json=payload)
    assert r.status_code == 201
    res_id = r.json()["id"]
    yield r.json()
    # Cleanup
    client.delete(f"{BASE_URL}/api/reservations/{res_id}")


# Stats endpoint
def test_stats(client):
    r = client.get(f"{BASE_URL}/api/stats")
    assert r.status_code == 200
    data = r.json()
    assert "total_reservations" in data
    assert "upcoming_events" in data
    assert "pending_payment" in data
    assert "confirmed" in data

# List reservations
def test_list_reservations(client):
    r = client.get(f"{BASE_URL}/api/reservations")
    assert r.status_code == 200
    assert isinstance(r.json(), list)

# Create reservation
def test_create_reservation(client):
    payload = {
        "client_name": "TEST_Create Test",
        "event_type": "Fiesta",
        "event_date": "2026-09-10",
        "total_amount": 20000.0,
        "advance_paid": 5000.0,
        "status": "Pendiente"
    }
    r = client.post(f"{BASE_URL}/api/reservations", json=payload)
    assert r.status_code == 201
    data = r.json()
    assert data["client_name"] == "TEST_Create Test"
    assert data["event_type"] == "Fiesta"
    assert "id" in data
    # Cleanup
    client.delete(f"{BASE_URL}/api/reservations/{data['id']}")

# Get reservation
def test_get_reservation(client, created_reservation):
    r = client.get(f"{BASE_URL}/api/reservations/{created_reservation['id']}")
    assert r.status_code == 200
    data = r.json()
    assert data["client_name"] == "TEST_Ana López"
    assert data["event_type"] == "Boda"

# Update reservation
def test_update_reservation(client, created_reservation):
    r = client.put(f"{BASE_URL}/api/reservations/{created_reservation['id']}", json={"status": "Confirmado"})
    assert r.status_code == 200
    data = r.json()
    assert data["status"] == "Confirmado"
    # Verify persistence
    r2 = client.get(f"{BASE_URL}/api/reservations/{created_reservation['id']}")
    assert r2.json()["status"] == "Confirmado"

# Delete reservation
def test_delete_reservation(client):
    payload = {"client_name": "TEST_Delete Me", "event_type": "Corporativo", "event_date": "2026-10-01", "total_amount": 5000.0}
    r = client.post(f"{BASE_URL}/api/reservations", json=payload)
    assert r.status_code == 201
    rid = r.json()["id"]
    del_r = client.delete(f"{BASE_URL}/api/reservations/{rid}")
    assert del_r.status_code == 200
    get_r = client.get(f"{BASE_URL}/api/reservations/{rid}")
    assert get_r.status_code == 404

# Calendar endpoint
def test_calendar(client):
    r = client.get(f"{BASE_URL}/api/calendar")
    assert r.status_code == 200
    assert isinstance(r.json(), list)

# Receipt upload
def test_upload_receipt(client, created_reservation):
    import io
    # Create a small fake image (PNG header)
    fake_img = b'\x89PNG\r\n\x1a\n' + b'\x00' * 100
    files = {"file": ("test.png", io.BytesIO(fake_img), "image/png")}
    r = requests.post(f"{BASE_URL}/api/reservations/{created_reservation['id']}/receipts", files=files)
    assert r.status_code == 200
    data = r.json()
    assert "id" in data
    assert data["filename"] == "test.png"

# Invalid ID handling
def test_invalid_id(client):
    r = client.get(f"{BASE_URL}/api/reservations/invalid_id")
    assert r.status_code == 400

# Not found
def test_not_found(client):
    r = client.get(f"{BASE_URL}/api/reservations/000000000000000000000000")
    assert r.status_code == 404
