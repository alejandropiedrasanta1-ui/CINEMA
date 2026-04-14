"""Iteration 6 backend tests: payment status toggle, financials with paid/pending"""
import pytest
import requests
import os

BASE_URL = os.environ.get('REACT_APP_BACKEND_URL', '').rstrip('/')

class TestFinancials:
    """Test /api/financials returns all required fields"""

    def test_financials_has_all_fields(self):
        r = requests.get(f"{BASE_URL}/api/financials")
        assert r.status_code == 200
        data = r.json()
        assert "total_event_amount" in data
        assert "total_partner_cost" in data
        assert "total_paid_to_partners" in data
        assert "total_pending_to_partners" in data
        assert "real_income" in data

    def test_financials_values_are_numbers(self):
        r = requests.get(f"{BASE_URL}/api/financials")
        assert r.status_code == 200
        data = r.json()
        for k in ["total_event_amount", "total_partner_cost", "total_paid_to_partners", "total_pending_to_partners", "real_income"]:
            assert isinstance(data[k], (int, float)), f"{k} is not a number"

    def test_real_income_formula(self):
        """real_income = total_event_amount - total_partner_cost"""
        r = requests.get(f"{BASE_URL}/api/financials")
        assert r.status_code == 200
        data = r.json()
        expected = round(data["total_event_amount"] - data["total_partner_cost"], 2)
        assert abs(data["real_income"] - expected) < 0.01

    def test_paid_plus_pending_equals_total_partner_cost(self):
        """paid + pending should equal total_partner_cost"""
        r = requests.get(f"{BASE_URL}/api/financials")
        assert r.status_code == 200
        data = r.json()
        total = round(data["total_paid_to_partners"] + data["total_pending_to_partners"], 2)
        assert abs(total - data["total_partner_cost"]) < 0.01


class TestPaymentStatusToggle:
    """Test full flow: create reservation with partner, toggle payment"""

    socio_id = None
    reservation_id = None

    def test_01_create_socio(self):
        r = requests.post(f"{BASE_URL}/api/socios", json={
            "name": "TEST_Socio_Iter6",
            "role": "Fotógrafo",
            "rate_per_event": 500.0
        })
        assert r.status_code in [200, 201]
        data = r.json()
        TestPaymentStatusToggle.socio_id = data["id"]
        assert data["name"] == "TEST_Socio_Iter6"

    def test_02_create_reservation(self):
        r = requests.post(f"{BASE_URL}/api/reservations", json={
            "client_name": "TEST_Client_Iter6",
            "event_type": "Quinceañera",
            "event_date": "2026-06-15",
            "total_amount": 5000.0,
            "advance_paid": 1000.0,
        })
        assert r.status_code in [200, 201]
        data = r.json()
        TestPaymentStatusToggle.reservation_id = data["id"]

    def test_03_assign_partner_with_pending_status(self):
        sid = TestPaymentStatusToggle.socio_id
        rid = TestPaymentStatusToggle.reservation_id
        partner = {
            "socio_id": sid,
            "name": "TEST_Socio_Iter6",
            "role": "Fotógrafo",
            "payment": 500.0,
            "payment_status": "Pendiente"
        }
        r = requests.put(f"{BASE_URL}/api/reservations/{rid}", json={
            "assigned_partners": [partner]
        })
        assert r.status_code == 200
        data = r.json()
        partners = data.get("assigned_partners", [])
        assert len(partners) == 1
        assert partners[0]["payment_status"] == "Pendiente"

    def test_04_toggle_payment_to_paid(self):
        sid = TestPaymentStatusToggle.socio_id
        rid = TestPaymentStatusToggle.reservation_id
        partner = {
            "socio_id": sid,
            "name": "TEST_Socio_Iter6",
            "role": "Fotógrafo",
            "payment": 500.0,
            "payment_status": "Pagado"
        }
        r = requests.put(f"{BASE_URL}/api/reservations/{rid}", json={
            "assigned_partners": [partner]
        })
        assert r.status_code == 200
        data = r.json()
        partners = data.get("assigned_partners", [])
        assert partners[0]["payment_status"] == "Pagado"

    def test_05_financials_reflect_paid(self):
        """After marking partner as paid, financials should have paid > 0"""
        r = requests.get(f"{BASE_URL}/api/financials")
        assert r.status_code == 200
        data = r.json()
        assert data["total_paid_to_partners"] >= 500.0

    def test_06_toggle_back_to_pending(self):
        sid = TestPaymentStatusToggle.socio_id
        rid = TestPaymentStatusToggle.reservation_id
        partner = {
            "socio_id": sid,
            "name": "TEST_Socio_Iter6",
            "role": "Fotógrafo",
            "payment": 500.0,
            "payment_status": "Pendiente"
        }
        r = requests.put(f"{BASE_URL}/api/reservations/{rid}", json={
            "assigned_partners": [partner]
        })
        assert r.status_code == 200
        data = r.json()
        assert data["assigned_partners"][0]["payment_status"] == "Pendiente"

    def test_07_cleanup(self):
        rid = TestPaymentStatusToggle.reservation_id
        sid = TestPaymentStatusToggle.socio_id
        if rid:
            r = requests.delete(f"{BASE_URL}/api/reservations/{rid}")
            assert r.status_code in [200, 204, 404]
        if sid:
            r = requests.delete(f"{BASE_URL}/api/socios/{sid}")
            assert r.status_code in [200, 204, 404]


class TestSocioCRUD:
    """Test socio CRUD: create, get, update, delete"""

    socio_id = None

    def test_create_socio(self):
        r = requests.post(f"{BASE_URL}/api/socios", json={
            "name": "TEST_CRUD_Socio",
            "role": "Videógrafo",
        })
        assert r.status_code in [200, 201]
        data = r.json()
        assert data["name"] == "TEST_CRUD_Socio"
        TestSocioCRUD.socio_id = data["id"]

    def test_update_socio(self):
        sid = TestSocioCRUD.socio_id
        assert sid is not None, "Socio not created"
        r = requests.put(f"{BASE_URL}/api/socios/{sid}", json={"name": "TEST_CRUD_Socio_Updated"})
        assert r.status_code == 200
        data = r.json()
        assert data["name"] == "TEST_CRUD_Socio_Updated"

    def test_get_socio(self):
        sid = TestSocioCRUD.socio_id
        r = requests.get(f"{BASE_URL}/api/socios/{sid}")
        assert r.status_code == 200
        data = r.json()
        assert data["name"] == "TEST_CRUD_Socio_Updated"

    def test_delete_socio(self):
        sid = TestSocioCRUD.socio_id
        r = requests.delete(f"{BASE_URL}/api/socios/{sid}")
        assert r.status_code in [200, 204]
