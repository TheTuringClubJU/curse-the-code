import pytest
from fastapi.testclient import TestClient
from app.main import app
from app.login.service import TEAMS_DB, SESSIONS_DB, seed_demo_teams

client = TestClient(app)

@pytest.fixture(autouse=True)
def reset_state():
    SESSIONS_DB.clear()
    seed_demo_teams()

def test_login_success():
    res = client.post("/api/auth/login", json={"team_name": "Team Cipher", "password": "password123"})
    assert res.status_code == 200
    data = res.json()
    assert data["ok"] is True
    assert data["team"]["name"] == "Team Cipher"
    assert data["active_sessions"] == 1
    assert "team_session" in res.cookies

def test_login_invalid_password():
    res = client.post("/api/auth/login", json={"team_name": "Team Cipher", "password": "wrongpassword"})
    assert res.status_code == 401
    assert res.json()["detail"]["code"] == "BAD_CREDENTIALS"

def test_session_limit_per_team_max_two():
    # Login 1st session
    client1 = TestClient(app)
    res1 = client1.post("/api/auth/login", json={"team_name": "Team Cipher", "password": "password123"})
    assert res1.status_code == 200

    # Login 2nd session
    client2 = TestClient(app)
    res2 = client2.post("/api/auth/login", json={"team_name": "Team Cipher", "password": "password123"})
    assert res2.status_code == 200

    # 3rd session should be refused with SESSION_LIMIT (max 2 sessions per team)
    client3 = TestClient(app)
    res3 = client3.post("/api/auth/login", json={"team_name": "Team Cipher", "password": "password123"})
    assert res3.status_code == 409
    assert res3.json()["detail"]["code"] == "SESSION_LIMIT"
    assert res3.json()["detail"]["active_sessions"] == 2

def test_logout_all_sessions():
    # Login two sessions
    c1 = TestClient(app)
    c1.post("/api/auth/login", json={"team_name": "Team Cipher", "password": "password123"})
    c2 = TestClient(app)
    c2.post("/api/auth/login", json={"team_name": "Team Cipher", "password": "password123"})

    # Now call logout-all
    res = client.post("/api/auth/logout-all", json={"team_name": "Team Cipher", "password": "password123"})
    assert res.status_code == 200
    data = res.json()
    assert data["ok"] is True
    assert data["sessions_ended"] == 2

    # Now login can proceed again as active sessions are cleared
    res_after = client.post("/api/auth/login", json={"team_name": "Team Cipher", "password": "password123"})
    assert res_after.status_code == 200
    assert res_after.json()["active_sessions"] == 1
