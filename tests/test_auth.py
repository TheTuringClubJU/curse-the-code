import pytest
from datetime import datetime, timedelta, timezone
from fastapi.testclient import TestClient
from app.main import app
from app.login.service import (
    TEAMS_DB,
    SESSIONS_DB,
    LOGIN_ATTEMPTS,
    EVENT_LOG,
    seed_demo_teams,
    LoginService,
)

client = TestClient(app)

@pytest.fixture(autouse=True)
def setup_teardown():
    SESSIONS_DB.clear()
    LOGIN_ATTEMPTS.clear()
    EVENT_LOG.clear()
    seed_demo_teams()

# 1. test_login_success_sets_cookie
def test_login_success_sets_cookie():
    res = client.post("/api/auth/login", json={"team_name": "Team Cipher", "password": "password123"})
    assert res.status_code == 200
    assert "team_session" in res.cookies
    assert res.json()["ok"] is True
    assert res.json()["team"]["name"] == "Team Cipher"

# 2. test_login_is_case_insensitive_on_team_name
def test_login_is_case_insensitive_on_team_name():
    res1 = client.post("/api/auth/login", json={"team_name": "tEaM cIpHeR", "password": "password123"})
    assert res1.status_code == 200
    assert res1.json()["team"]["name"] == "Team Cipher"

# 3. test_login_wrong_password_generic_error
def test_login_wrong_password_generic_error():
    res = client.post("/api/auth/login", json={"team_name": "Team Cipher", "password": "wrongpassword"})
    assert res.status_code == 401
    assert res.json()["detail"]["code"] == "BAD_CREDENTIALS"
    assert res.json()["detail"]["message"] == "Team name or password is wrong"

# 4. test_login_unknown_team_same_error_as_wrong_password
def test_login_unknown_team_same_error_as_wrong_password():
    res_wrong_pw = client.post("/api/auth/login", json={"team_name": "Team Cipher", "password": "wrong"})
    res_unknown_team = client.post("/api/auth/login", json={"team_name": "NonExistentTeam", "password": "any"})
    assert res_wrong_pw.status_code == res_unknown_team.status_code == 401
    assert res_wrong_pw.json()["detail"]["message"] == res_unknown_team.json()["detail"]["message"]

# 5. test_login_disabled_team_rejected
def test_login_disabled_team_rejected():
    TEAMS_DB["team cipher"]["is_active"] = False
    res = client.post("/api/auth/login", json={"team_name": "Team Cipher", "password": "password123"})
    assert res.status_code == 403
    assert res.json()["detail"]["code"] == "ACCOUNT_DISABLED"

# 6. test_login_lockout_after_eight_failures
def test_login_lockout_after_eight_failures():
    for _ in range(7):
        r = client.post("/api/auth/login", json={"team_name": "Team Cipher", "password": "bad"})
        assert r.status_code == 401
    # 8th failure locks the account
    r8 = client.post("/api/auth/login", json={"team_name": "Team Cipher", "password": "bad"})
    assert r8.status_code == 401
    # Subsequent login is rejected with LOCKED
    r9 = client.post("/api/auth/login", json={"team_name": "Team Cipher", "password": "password123"})
    assert r9.status_code == 429
    assert r9.json()["detail"]["code"] == "LOCKED"

# 7. test_session_limit_blocks_login_over_limit & lists devices
def test_session_limit_blocks_login_over_limit():
    c1 = TestClient(app)
    c2 = TestClient(app)
    c3 = TestClient(app)

    r1 = c1.post("/api/auth/login", json={"team_name": "Team Cipher", "password": "password123"}, headers={"user-agent": "Device-One"})
    assert r1.status_code == 200

    r2 = c2.post("/api/auth/login", json={"team_name": "Team Cipher", "password": "password123"}, headers={"user-agent": "Device-Two"})
    assert r2.status_code == 200

    # 3rd login fails because max session is 2
    r3 = c3.post("/api/auth/login", json={"team_name": "Team Cipher", "password": "password123"})
    assert r3.status_code == 409
    data = r3.json()["detail"]
    assert data["code"] == "SESSION_LIMIT"
    assert data["active_sessions"] == 2
    assert len(data["devices"]) == 2

# 8. test_logout_ends_only_current_session
def test_logout_ends_only_current_session():
    c1 = TestClient(app)
    c2 = TestClient(app)

    c1.post("/api/auth/login", json={"team_name": "Team Cipher", "password": "password123"})
    c2.post("/api/auth/login", json={"team_name": "Team Cipher", "password": "password123"})

    # c1 logs out
    res_logout = c1.post("/api/auth/logout")
    assert res_logout.status_code == 200

    # c1 is now unauthenticated
    assert c1.get("/api/auth/me").status_code == 401
    # c2 is still authenticated
    assert c2.get("/api/auth/me").status_code == 200

# 9. test_logout_all_requires_valid_credentials
def test_logout_all_requires_valid_credentials():
    res = client.post("/api/auth/logout-all", json={"team_name": "Team Cipher", "password": "wrong"})
    assert res.status_code == 401
    assert res.json()["detail"]["code"] == "BAD_CREDENTIALS"

# 10. test_logout_all_ends_every_session & test_login_succeeds_after_logout_all
def test_logout_all_ends_every_session_and_allows_relogin():
    c1 = TestClient(app)
    c2 = TestClient(app)
    c1.post("/api/auth/login", json={"team_name": "Team Cipher", "password": "password123"})
    c2.post("/api/auth/login", json={"team_name": "Team Cipher", "password": "password123"})

    res_all = client.post("/api/auth/logout-all", json={"team_name": "Team Cipher", "password": "password123"})
    assert res_all.status_code == 200
    assert res_all.json()["sessions_ended"] == 2

    # Both sessions are now revoked
    assert c1.get("/api/auth/me").status_code == 401
    assert c2.get("/api/auth/me").status_code == 401

    # New login succeeds immediately
    r_new = client.post("/api/auth/login", json={"team_name": "Team Cipher", "password": "password123"})
    assert r_new.status_code == 200
    assert r_new.json()["active_sessions"] == 1

# 11. test_logout_all_is_idempotent_with_zero_sessions
def test_logout_all_is_idempotent_with_zero_sessions():
    res = client.post("/api/auth/logout-all", json={"team_name": "Team Cipher", "password": "password123"})
    assert res.status_code == 200
    assert res.json()["sessions_ended"] == 0

# 12. test_login_and_logout_events_recorded
def test_login_and_logout_events_recorded():
    c = TestClient(app)
    c.post("/api/auth/login", json={"team_name": "Team Cipher", "password": "password123"})
    c.post("/api/auth/logout")

    event_kinds = [e["kind"] for e in EVENT_LOG]
    assert "login" in event_kinds
    assert "logout" in event_kinds
