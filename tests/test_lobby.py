import pytest
from fastapi.testclient import TestClient
from app.main import app
from app.login.service import seed_demo_teams

client = TestClient(app)

@pytest.fixture(autouse=True)
def reset_store():
    seed_demo_teams()

def test_lobby_state_unauthenticated():
    """Lobby state returns 200 with default round information even without login"""
    res = client.get("/api/lobby/state")
    assert res.status_code == 200
    data = res.json()
    assert data["ok"] is True
    assert "current_round" in data
    assert "round_status" in data
    assert data["team"] is None

def test_lobby_state_authenticated():
    """Lobby state identifies the logged-in team and their current round"""
    # Clear any previous test sessions first
    client.post("/api/auth/logout-all", json={
        "team_name": "techtesting1",
        "password": "password123"
    })

    # 1. Login with demo team (techtesting1 from database)
    login_res = client.post("/api/auth/login", json={
        "team_name": "techtesting1",
        "password": "password123"
    })
    assert login_res.status_code == 200
    cookies = login_res.cookies

    # 2. Check lobby state with session cookie
    lobby_res = client.get("/api/lobby/state", cookies=cookies)
    assert lobby_res.status_code == 200
    data = lobby_res.json()
    assert data["ok"] is True
    assert data["team"] is not None
    assert data["team"]["name"].lower() == "techtesting1"
    assert data["current_round"] in (1, 2)
