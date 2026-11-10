import pytest
from fastapi.testclient import TestClient
from app.main import app
from app.login.service import get_db_connection, seed_demo_teams
from app.admin.service import seed_demo_admin
import bcrypt
import json

client = TestClient(app)

def setup_competing_teams():
    """Ensure two distinct competition teams exist with known passwords."""
    seed_demo_admin()
    seed_demo_teams()

    conn = get_db_connection()
    if conn:
        try:
            with conn.cursor() as cur:
                pw_hash = bcrypt.hashpw(b"password123", bcrypt.gensalt()).decode("utf-8")
                cur.execute(
                    """
                    INSERT INTO teams (name, password_hash, members, contact, is_active, failed_logins, locked_until)
                    VALUES 
                        ('Competitor Alpha', %s, ARRAY['Alpha 1', 'Alpha 2'], 'alpha@cursethecode.local', true, 0, NULL),
                        ('Competitor Beta', %s, ARRAY['Beta 1', 'Beta 2'], 'beta@cursethecode.local', true, 0, NULL)
                    ON CONFLICT (name) DO UPDATE SET
                        failed_logins = 0,
                        locked_until = NULL,
                        is_active = true;
                    """,
                    (pw_hash, pw_hash)
                )
                # Clear previous sessions and game progress for these teams
                cur.execute("""
                    DELETE FROM team_sessions WHERE team_id IN (SELECT id FROM teams WHERE name IN ('Competitor Alpha', 'Competitor Beta'));
                    DELETE FROM team_fragments WHERE team_id IN (SELECT id FROM teams WHERE name IN ('Competitor Alpha', 'Competitor Beta'));
                    DELETE FROM team_clues WHERE team_id IN (SELECT id FROM teams WHERE name IN ('Competitor Alpha', 'Competitor Beta'));
                    DELETE FROM team_rooms WHERE team_id IN (SELECT id FROM teams WHERE name IN ('Competitor Alpha', 'Competitor Beta'));
                    DELETE FROM team_rounds WHERE team_id IN (SELECT id FROM teams WHERE name IN ('Competitor Alpha', 'Competitor Beta'));
                    DELETE FROM team_forks WHERE team_id IN (SELECT id FROM teams WHERE name IN ('Competitor Alpha', 'Competitor Beta'));
                    DELETE FROM submissions WHERE team_id IN (SELECT id FROM teams WHERE name IN ('Competitor Alpha', 'Competitor Beta'));
                """)
                conn.commit()
        finally:
            conn.close()

def login_team(team_name: str, password: str = "password123"):
    conn = get_db_connection()
    if conn:
        try:
            with conn.cursor() as cur:
                cur.execute("DELETE FROM team_sessions WHERE team_id IN (SELECT id FROM teams WHERE name = %s);", (team_name,))
                conn.commit()
        finally:
            conn.close()

    res = client.post("/api/auth/login", json={"team_name": team_name, "password": password})
    assert res.status_code == 200, f"Failed to login {team_name}: {res.text}"
    cookie = res.cookies.get("team_session")
    return {
        "team": res.json()["team"],
        "cookie": cookie,
        "headers": {"Cookie": f"team_session={cookie}"}
    }

def login_admin():
    res = client.post("/api/admin/login", json={"username": "admin", "password": "admin123"})
    assert res.status_code == 200, f"Admin login failed: {res.text}"
    token = res.json()["token"]
    cookie = res.cookies.get("admin_session") or token
    return {
        "token": token,
        "cookie": cookie,
        "headers": {"Cookie": f"admin_session={cookie}", "x-admin-token": token}
    }

# ---------------------------------------------------------------------------
# End-to-End Multi-Team Competition Tests
# ---------------------------------------------------------------------------

def test_01_admin_round1_start_and_teams_lobby_synchronization():
    setup_competing_teams()
    admin = login_admin()

    # Admin starts Round 1
    res = client.post("/api/admin/rounds/control", json={"action": "start_r1"}, headers=admin["headers"])
    assert res.status_code == 200
    assert res.json()["status"] == "live"
    assert res.json()["round"] == 1

    # Both teams authenticate
    alpha = login_team("Competitor Alpha")
    beta = login_team("Competitor Beta")

    # Both teams poll lobby
    lobby_a = client.get("/api/lobby/state", headers=alpha["headers"]).json()
    lobby_b = client.get("/api/lobby/state", headers=beta["headers"]).json()

    assert lobby_a["round_status"] == "live"
    assert lobby_a["current_round"] == 1
    assert lobby_b["round_status"] == "live"
    assert lobby_b["current_round"] == 1

def test_02_both_teams_compete_in_round1_bedroom():
    alpha = login_team("Competitor Alpha")
    beta = login_team("Competitor Beta")

    # Team Alpha enters Room 1 Bedroom
    r1_a = client.get("/api/game/room/bedroom", headers=alpha["headers"]).json()
    assert r1_a["room_id"] == "bedroom"
    assert r1_a["basket_unlocked"] is False

    # Team Alpha searches objects
    search_res = client.post("/api/game/room/bedroom/search", json={"object_id": "trunk"}, headers=alpha["headers"]).json()
    assert search_res["found"] is True

    # Both teams solve Room 1 clues
    # R1-01: LANTERN, R1-02: SUNRISE, R1-03: 07/04/2001, R1-04: SHADOW
    for c_id, ans in [("R1-01", "LANTERN"), ("R1-02", "SUNRISE"), ("R1-03", "07/04/2001"), ("R1-04", "SHADOW")]:
        sub_a = client.post(f"/api/game/clue/{c_id}/submit", json={"answer": ans}, headers=alpha["headers"]).json()
        assert sub_a["correct"] is True

        sub_b = client.post(f"/api/game/clue/{c_id}/submit", json={"answer": ans}, headers=beta["headers"]).json()
        assert sub_b["correct"] is True

    # Room 1 is completed for both
    state_a = client.get("/api/game/room/bedroom", headers=alpha["headers"]).json()
    state_b = client.get("/api/game/room/bedroom", headers=beta["headers"]).json()
    assert state_a["is_completed"] is True
    assert state_b["is_completed"] is True

def test_03_admin_round1_leaderboard_and_top_n_qualification():
    admin = login_admin()

    # Admin checks Round 1 leaderboard
    lb_res = client.get("/api/admin/leaderboard?round_num=1", headers=admin["headers"])
    assert lb_res.status_code == 200
    lb_data = lb_res.json()["leaderboard"]
    team_names = [t["team_name"] for t in lb_data]
    assert "Competitor Alpha" in team_names
    assert "Competitor Beta" in team_names

    # Admin ends Round 1
    end_res = client.post("/api/admin/rounds/control", json={"action": "end_r1"}, headers=admin["headers"])
    assert end_res.json()["status"] == "ended"

    # Admin previews qualification for top teams
    prev_res = client.get("/api/admin/qualification/preview?count=10", headers=admin["headers"])
    assert prev_res.status_code == 200
    assert len(prev_res.json()["preview"]) >= 2

    # Admin executes qualification
    qual_res = client.post("/api/admin/qualification/qualify", json={"count": 10}, headers=admin["headers"])
    assert qual_res.status_code == 200
    assert qual_res.json()["ok"] is True

    # Both teams verify in lobby that they are qualified for Round 2
    alpha = login_team("Competitor Alpha")
    beta = login_team("Competitor Beta")

    lobby_a = client.get("/api/lobby/state", headers=alpha["headers"]).json()
    lobby_b = client.get("/api/lobby/state", headers=beta["headers"]).json()

    assert lobby_a["is_qualified_r2"] is True
    assert lobby_b["is_qualified_r2"] is True

def test_04_admin_starts_round2_and_both_teams_enter_rotting_archive():
    admin = login_admin()

    # Admin starts Round 2
    res = client.post("/api/admin/rounds/control", json={"action": "start_r2"}, headers=admin["headers"])
    assert res.status_code == 200
    assert res.json()["status"] == "live"
    assert res.json()["round"] == 2

    # Both teams poll lobby: now live in round 2!
    alpha = login_team("Competitor Alpha")
    beta = login_team("Competitor Beta")

    lobby_a = client.get("/api/lobby/state", headers=alpha["headers"]).json()
    lobby_b = client.get("/api/lobby/state", headers=beta["headers"]).json()

    assert lobby_a["current_round"] == 2
    assert lobby_a["round_status"] == "live"
    assert lobby_b["current_round"] == 2
    assert lobby_b["round_status"] == "live"

    # Both teams query Room 4: The Rotting Archive
    r4_a = client.get("/api/game/room/records", headers=alpha["headers"]).json()
    r4_b = client.get("/api/game/room/records", headers=beta["headers"]).json()

    assert r4_a["room_id"] == "records"
    assert r4_a["total_fragments_in_room"] == 12
    assert r4_a["basket_unlocked"] is False
    assert r4_b["basket_unlocked"] is False

def test_05_team_alpha_human_prop_exploration_and_basket_unlock():
    alpha = login_team("Competitor Alpha")

    # Team Alpha explores all storage props in the sub-basement following sequence trail
    props_sequence = [
        "filing_cabinet_a",
        "filing_cabinet_a",
        "filing_cabinet_b",
        "filing_cabinet_b",
        "archive_shelves",
        "archive_shelves",
        "clerk_desk",
        "card_catalog",
        "vent_grate",
        "clerk_desk",
        "waste_basket",
        "archive_shelves"
    ]

    for p in props_sequence:
        s_res = client.post("/api/game/room/records/search", json={"object_id": p}, headers=alpha["headers"])
        assert s_res.status_code == 200
        assert s_res.json()["found"] is True

    # Room state now shows 12 fragments and basket unlocked
    r4_state = client.get("/api/game/room/records", headers=alpha["headers"]).json()
    assert r4_state["basket_unlocked"] is True
    assert len(r4_state["collected_fragment_ids"]) == 12

    # All fragments are unwrapped and have secrets revealed
    for ev in r4_state["evidence"]:
        assert ev["is_wrapped"] is False
        assert "secret" in ev

def test_06_team_alpha_solves_all_room4_clues_flawlessly_and_chooses_wing_b():
    alpha = login_team("Competitor Alpha")

    # Clue 1: Redacted Report (R2-02) - UI submits dict { date, word }
    c1 = client.post("/api/game/clue/R2-02/submit", json={"answer": {"date": "2001-02-10", "word": "COMET"}}, headers=alpha["headers"]).json()
    assert c1["correct"] is True
    assert c1["solved"] is True

    # Clue 2: Microfilm Reader (R2-03) - UI submits dict { code: '1357' }
    c2 = client.post("/api/game/clue/R2-03/submit", json={"answer": {"code": "1357"}}, headers=alpha["headers"]).json()
    assert c2["correct"] is True
    assert c2["solved"] is True

    # Clue 3: Epoch Timeline (R2-04) - UI submits dict { keyword: 'PLANET' }
    c3 = client.post("/api/game/clue/R2-04/submit", json={"answer": {"keyword": "PLANET"}}, headers=alpha["headers"]).json()
    assert c3["correct"] is True
    assert c3["solved"] is True

    # Clue 4: Bulkhead Keypad (R2-07) - UI submits dict { panel: '1357', word: 'PLANET' }
    c4 = client.post("/api/game/clue/R2-07/submit", json={"answer": {"panel": "1357", "word": "PLANET"}}, headers=alpha["headers"]).json()
    assert c4["correct"] is True
    assert c4["solved"] is True
    assert c4["room_completed"] is True

    # Bulkhead Door is unlocked and Room 4 is marked completed
    room_state = client.get("/api/game/room/records", headers=alpha["headers"]).json()
    assert room_state["is_completed"] is True

    # Team Alpha checks Fork 1 status
    fork_status = client.get("/api/game/fork/fork_1/status", headers=alpha["headers"]).json()
    assert fork_status["ok"] is True
    assert fork_status["resolved"] is False
    assert "A" in fork_status["available_choices"]
    assert "B" in fork_status["available_choices"]

    # Team Alpha chooses Primary Wing B
    choose_res = client.post("/api/game/fork/fork_1/choose", json={"choice": "B"}, headers=alpha["headers"]).json()
    assert choose_res["ok"] is True
    assert choose_res["is_correct"] is True
    assert choose_res["is_trap"] is False
    assert choose_res["penalty_seconds"] == 0
    assert choose_res["next_room"] == "control"

    # Fork 1 is now marked resolved with 0 penalties
    fork_after = client.get("/api/game/fork/fork_1/status", headers=alpha["headers"]).json()
    assert fork_after["resolved"] is True
    assert fork_after["total_penalty_seconds"] == 0

def test_07_team_beta_experiences_clue_burnout_penalty_and_fork_trap():
    beta = login_team("Competitor Beta")

    # Team Beta unlocks fragments first
    props = [
        "filing_cabinet_a", "filing_cabinet_a",
        "filing_cabinet_b", "filing_cabinet_b",
        "archive_shelves", "archive_shelves",
        "clerk_desk", "card_catalog",
        "vent_grate", "clerk_desk",
        "waste_basket", "archive_shelves"
    ]
    for p in props:
        client.post("/api/game/room/records/search", json={"object_id": p}, headers=beta["headers"])

    # Team Beta fails Clue 1 (R2-02) 3 times -> exhaustion + 90s lockout penalty
    for i in range(1, 4):
        err_res = client.post("/api/game/clue/R2-02/submit", json={"answer": {"date": f"199{i}-01-01", "word": "WRONG"}}, headers=beta["headers"]).json()
        assert err_res["correct"] is False
        assert err_res["attempts"] == i

    assert err_res["exhausted"] is True

    # Team Beta solves Clues 2, 3, 4
    c2 = client.post("/api/game/clue/R2-03/submit", json={"answer": {"code": "1357"}}, headers=beta["headers"]).json()
    assert c2["correct"] is True

    c3 = client.post("/api/game/clue/R2-04/submit", json={"answer": {"keyword": "PLANET"}}, headers=beta["headers"]).json()
    assert c3["correct"] is True

    c4 = client.post("/api/game/clue/R2-07/submit", json={"answer": {"panel": "1357", "word": "PLANET"}}, headers=beta["headers"]).json()
    assert c4["correct"] is True
    # All 4 clues are resolved (3 solved + 1 exhausted) -> Room 4 completed!
    assert c4["room_completed"] is True

    # Room 4 completed for Beta
    r4_beta = client.get("/api/game/room/records", headers=beta["headers"]).json()
    assert r4_beta["is_completed"] is True

    # Team Beta approaches Fork 1 and chooses the Trap Wing A
    trap_res = client.post("/api/game/fork/fork_1/choose", json={"choice": "A"}, headers=beta["headers"]).json()
    assert trap_res["is_trap"] is True
    assert trap_res["penalty_seconds"] == 60
    assert "A" in trap_res["barred_choices"]

    # Beta checks status: Wing A is barred, total fork penalty is 60s
    fork_status = client.get("/api/game/fork/fork_1/status", headers=beta["headers"]).json()
    assert "A" in fork_status["barred_choices"]
    assert fork_status["available_choices"] == ["B"]
    assert fork_status["total_penalty_seconds"] == 60

    # Beta attempts clicking Wing A again -> barred!
    re_trap = client.post("/api/game/fork/fork_1/choose", json={"choice": "A"}, headers=beta["headers"]).json()
    assert re_trap["ok"] is False
    assert re_trap["barred"] is True

    # Beta chooses Wing B -> route confirmed to control
    b_res = client.post("/api/game/fork/fork_1/choose", json={"choice": "B"}, headers=beta["headers"]).json()
    assert b_res["ok"] is True
    assert b_res["is_correct"] is True
    assert b_res["next_room"] == "control"

def test_08_round2_leaderboard_competition_ranking():
    admin = login_admin()

    # Admin inspects live Round 2 Leaderboard
    res = client.get("/api/admin/leaderboard?round_num=2", headers=admin["headers"])
    assert res.status_code == 200
    lb = res.json()["leaderboard"]

    # Find Competitor Alpha and Competitor Beta
    alpha_entry = next((e for e in lb if e["team_name"] == "Competitor Alpha"), None)
    beta_entry = next((e for e in lb if e["team_name"] == "Competitor Beta"), None)

    assert alpha_entry is not None
    assert beta_entry is not None

    # Team Alpha stats
    assert alpha_entry["clues_solved"] == 4
    assert alpha_entry["total_score"] == 400.0
    assert alpha_entry["penalty_seconds"] == 0

    # Team Beta stats (3 clues solved, +90s lockout + +60s trap = 150s penalty)
    assert beta_entry["clues_solved"] == 3
    assert beta_entry["total_score"] == 300.0
    assert beta_entry["penalty_seconds"] == 150

    # Competitor Alpha ranks above Competitor Beta
    assert alpha_entry["rank"] < beta_entry["rank"]

def test_09_tiebreaker_adjusted_elapsed_time_exact_formula():
    """
    Test tie-breaking when two teams have equal score and clues solved:
    Adjusted Elapsed Time = (last_solved_at - starts_at) + penalty_seconds
    The team with the lower adjusted elapsed time ranks higher.
    """
    admin = login_admin()
    conn = get_db_connection()
    try:
        with conn.cursor() as cur:
            # Set up simulated Team Gamma with equal score (400 pts, 4 clues) but +180s penalty
            pw_hash = bcrypt.hashpw(b"password123", bcrypt.gensalt()).decode("utf-8")
            cur.execute("""
                INSERT INTO teams (name, password_hash, is_active)
                VALUES ('Competitor Gamma', %s, true)
                ON CONFLICT (name) DO NOTHING;
            """, (pw_hash,))
            cur.execute("""
                SELECT id FROM teams WHERE name = 'Competitor Gamma';
            """)
            gamma_id = cur.fetchone()[0]

            cur.execute("""
                INSERT INTO team_rounds (team_id, round, total_score, clues_solved, penalty_seconds, last_solved_at, updated_at)
                VALUES (%s, 2, 400.0, 4, 180, NOW(), NOW())
                ON CONFLICT (team_id, round)
                DO UPDATE SET total_score = 400.0, clues_solved = 4, penalty_seconds = 180, last_solved_at = NOW();
            """, (gamma_id,))
            conn.commit()
    finally:
        conn.close()

    res = client.get("/api/admin/leaderboard?round_num=2", headers=admin["headers"]).json()
    lb = res["leaderboard"]

    alpha = next(e for e in lb if e["team_name"] == "Competitor Alpha")
    gamma = next(e for e in lb if e["team_name"] == "Competitor Gamma")

    # Both have 4 clues and 400 points
    assert alpha["clues_solved"] == gamma["clues_solved"] == 4
    assert alpha["total_score"] == gamma["total_score"] == 400.0

    # Alpha has 0 penalty, Gamma has 180 penalty
    assert alpha["penalty_seconds"] == 0
    assert gamma["penalty_seconds"] == 180

    # Alpha's adjusted elapsed time is lower, so Alpha ranks ahead of Gamma!
    assert alpha["adjusted_elapsed_seconds"] < gamma["adjusted_elapsed_seconds"]
    assert alpha["rank"] < gamma["rank"]

def test_10_both_teams_clean_logout_and_session_security():
    alpha = login_team("Competitor Alpha")
    beta = login_team("Competitor Beta")
    admin = login_admin()

    # Alpha logs out
    out_a = client.post("/api/auth/logout", headers=alpha["headers"])
    assert out_a.status_code == 200

    # Beta logs out
    out_b = client.post("/api/auth/logout", headers=beta["headers"])
    assert out_b.status_code == 200

    # Admin logs out
    out_adm = client.post("/api/admin/logout", headers=admin["headers"])
    assert out_adm.status_code == 200

    # Verify sessions are invalidated: requesting room returns 401
    unauth_a = client.get("/api/game/room/records", headers=alpha["headers"])
    assert unauth_a.status_code == 401

    unauth_b = client.get("/api/game/room/records", headers=beta["headers"])
    assert unauth_b.status_code == 401
