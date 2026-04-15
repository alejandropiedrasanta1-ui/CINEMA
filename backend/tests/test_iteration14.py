"""Iteration 14 backend tests: reminders/send, settings, reservations, stats"""
import pytest
import requests
import os

BASE_URL = os.environ.get('REACT_APP_BACKEND_URL', '').rstrip('/')

def test_get_settings():
    r = requests.get(f"{BASE_URL}/api/settings")
    assert r.status_code == 200, f"GET /api/settings failed: {r.status_code} {r.text}"
    print(f"PASS GET /api/settings: {r.status_code}")

def test_get_reservations():
    r = requests.get(f"{BASE_URL}/api/reservations")
    assert r.status_code == 200, f"GET /api/reservations failed: {r.status_code} {r.text}"
    print(f"PASS GET /api/reservations: {r.status_code}")

def test_get_stats():
    r = requests.get(f"{BASE_URL}/api/stats")
    assert r.status_code == 200, f"GET /api/stats failed: {r.status_code} {r.text}"
    data = r.json()
    print(f"PASS GET /api/stats: {data}")

def test_post_reminders_send():
    r = requests.post(f"{BASE_URL}/api/reminders/send")
    assert r.status_code in (200, 400), f"POST /api/reminders/send unexpected: {r.status_code} {r.text}"
    data = r.json()
    # Either success true or settings not configured (400)
    if r.status_code == 200:
        assert data.get("success") == True, f"Expected success=true: {data}"
        print(f"PASS POST /api/reminders/send: success=True, {data}")
    else:
        print(f"INFO POST /api/reminders/send: 400 - no settings configured (expected if not set up): {data}")
