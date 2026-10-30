import pytest
from fastapi.testclient import TestClient
from app.main import app

client = TestClient(app)


def test_admin_login_invalid_credentials():
    resp = client.post(
        "/api/admin/login",
        json={"username": "non_existent_admin", "password": "wrongpassword"},
    )
    assert resp.status_code == 401
    assert "Invalid admin username or password" in resp.json()["detail"]["message"]


def test_admin_me_unauthorized():
    resp = client.get("/api/admin/me")
    assert resp.status_code == 401


def test_admin_dashboard_unauthorized():
    resp = client.get("/api/admin/dashboard")
    assert resp.status_code == 401


def test_admin_round_control_unauthorized():
    resp = client.post("/api/admin/rounds/control", json={"action": "start_r1"})
    assert resp.status_code == 401


def test_admin_login_and_flow():
    # 1. Login as admin
    resp = client.post(
        "/api/admin/login",
        json={"username": "admin", "password": "admin123"},
    )
    assert resp.status_code == 200
    assert resp.json()["ok"] is True
    assert resp.json()["admin"]["username"] == "admin"
    assert "admin_session" in resp.cookies

    admin_cookie = {"admin_session": resp.cookies["admin_session"]}

    # 2. Check /api/admin/me
    me_resp = client.get("/api/admin/me", cookies=admin_cookie)
    assert me_resp.status_code == 200
    assert me_resp.json()["admin"]["username"] == "admin"

    # 3. Check /api/admin/dashboard
    dash_resp = client.get("/api/admin/dashboard", cookies=admin_cookie)
    assert dash_resp.status_code == 200
    data = dash_resp.json()
    assert "rounds" in data
    assert "presence" in data
    assert "teams" in data
    assert "logged_in" in data["presence"]
    assert "logged_out" in data["presence"]

    # 4. Test manual round control (start round 1)
    ctrl_resp = client.post(
        "/api/admin/rounds/control",
        json={"action": "start_r1"},
        cookies=admin_cookie,
    )
    assert ctrl_resp.status_code == 200
    ctrl_data = ctrl_resp.json()
    assert ctrl_data["ok"] is True
    assert ctrl_data["status"] == "live"

    # 4b. Test admin force logout for team
    team_to_logout = data["teams"][0]["id"]
    logout_team_resp = client.post(f"/api/admin/teams/{team_to_logout}/logout", cookies=admin_cookie)
    assert logout_team_resp.status_code == 200
    assert logout_team_resp.json()["ok"] is True
    assert logout_team_resp.json()["team_id"] == team_to_logout

    # 4c. Test Leaderboard API
    lb_resp = client.get("/api/admin/leaderboard?round_num=1", cookies=admin_cookie)
    assert lb_resp.status_code == 200
    assert "leaderboard" in lb_resp.json()

    # 4d. Test Preview Qualification for top N
    preview_resp = client.get("/api/admin/qualification/preview?count=3", cookies=admin_cookie)
    assert preview_resp.status_code == 200
    assert len(preview_resp.json()["preview"]) <= 3

    # 4e. Test Qualify top N teams
    qualify_resp = client.post(
        "/api/admin/qualification/qualify",
        json={"count": 3},
        cookies=admin_cookie,
    )
    assert qualify_resp.status_code == 200
    assert qualify_resp.json()["ok"] is True
    assert qualify_resp.json()["qualified_count"] <= 3

    # Reset Round 1 back to pending
    reset_resp = client.post(
        "/api/admin/rounds/control",
        json={"action": "reset_r1"},
        cookies=admin_cookie,
    )
    assert reset_resp.status_code == 200
    assert reset_resp.json()["status"] == "pending"

    # 5. Logout
    logout_resp = client.post("/api/admin/logout", cookies=admin_cookie)
    assert logout_resp.status_code == 200
    assert logout_resp.json()["ok"] is True

    # 6. Verify session ended
    me_after_logout = client.get("/api/admin/me", cookies=admin_cookie)
    assert me_after_logout.status_code == 401
