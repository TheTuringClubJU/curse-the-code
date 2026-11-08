import pytest
from datetime import datetime, timezone, timedelta
from fastapi.testclient import TestClient
from app.main import app
from app.login.service import seed_demo_teams, get_db_connection
from app.admin.service import seed_demo_admin

client = TestClient(app)

def reset_vault_team_db(team_name="Team Cipher"):
    conn = get_db_connection()
    if conn:
        with conn.cursor() as cur:
            cur.execute("""
                DELETE FROM team_forks WHERE team_id = (SELECT id FROM teams WHERE name = %s);
                DELETE FROM team_clues WHERE team_id = (SELECT id FROM teams WHERE name = %s) AND room_id IN ('records', 'control', 'vault');
                DELETE FROM team_fragments WHERE team_id = (SELECT id FROM teams WHERE name = %s) AND room_id IN ('records', 'control', 'vault');
                DELETE FROM team_rooms WHERE team_id = (SELECT id FROM teams WHERE name = %s) AND room_id IN ('records', 'control', 'vault');
                DELETE FROM submissions WHERE team_id = (SELECT id FROM teams WHERE name = %s) AND clue_id IN ('R2-01', 'R2-05', 'R2-06', 'R2-08', 'R2-09', 'R2-10');
                UPDATE team_rounds 
                SET penalty_seconds = 0, clues_solved = 0, total_score = 0, last_solved_at = NULL, finished_at = NULL, qualified_at = NULL
                WHERE team_id = (SELECT id FROM teams WHERE name = %s) AND round IN (1, 2);
            """, (team_name, team_name, team_name, team_name, team_name, team_name))
            conn.commit()
        conn.close()

def unlock_vault_entrance(team_name="Team Cipher"):
    conn = get_db_connection()
    if conn:
        with conn.cursor() as cur:
            # Unseal Room 6 (vault) in team_rooms
            cur.execute("""
                INSERT INTO team_rooms (team_id, room_id, is_basket_unlocked, is_completed)
                VALUES ((SELECT id FROM teams WHERE name = %s), 'vault', TRUE, FALSE)
                ON CONFLICT (team_id, room_id) DO UPDATE SET is_basket_unlocked = TRUE;
            """, (team_name,))
            conn.commit()
        conn.close()

def solve_prereqs_r2_08_r2_09(team_name="Team Cipher"):
    conn = get_db_connection()
    if conn:
        with conn.cursor() as cur:
            cur.execute("""
                INSERT INTO team_clues (team_id, round, clue_id, room_id, solved, attempts, score, solved_at)
                VALUES 
                    ((SELECT id FROM teams WHERE name = %s), 2, 'R2-08', 'vault', TRUE, 1, 100.0, NOW()),
                    ((SELECT id FROM teams WHERE name = %s), 2, 'R2-09', 'vault', TRUE, 1, 100.0, NOW())
                ON CONFLICT (team_id, clue_id) DO UPDATE SET solved = TRUE, score = 100.0, solved_at = NOW();
            """, (team_name, team_name))
            conn.commit()
        conn.close()

def ensure_round_2_started(team_name="Team Cipher"):
    now = datetime.now(timezone.utc) - timedelta(minutes=15)
    conn = get_db_connection()
    if conn:
        with conn.cursor() as cur:
            cur.execute("""
                INSERT INTO rounds (round, status, starts_at)
                VALUES (2, 'live', %s)
                ON CONFLICT (round) DO UPDATE SET status = 'live', starts_at = %s;

                INSERT INTO team_rounds (team_id, round, penalty_seconds, clues_solved, total_score)
                VALUES ((SELECT id FROM teams WHERE name = %s), 2, 0, 0, 0)
                ON CONFLICT (team_id, round) DO NOTHING;
            """, (now, now, team_name))
            conn.commit()
        conn.close()

@pytest.fixture(scope="module")
def auth_headers():
    seed_demo_teams()
    seed_demo_admin()
    ensure_round_2_started("Team Cipher")
    client.post("/api/auth/logout-all", json={
        "team_name": "Team Cipher",
        "password": "password123"
    })
    res = client.post("/api/auth/login", json={
        "team_name": "Team Cipher",
        "password": "password123"
    })
    token = res.cookies.get("team_session")
    reset_vault_team_db("Team Cipher")
    unlock_vault_entrance("Team Cipher")
    return {"x-session-token": token}

@pytest.fixture(scope="module")
def admin_cookie():
    res = client.post("/api/admin/login", json={
        "username": "admin",
        "password": "admin123"
    })
    return {"admin_session": res.cookies.get("admin_session")}

# =========================================================================
# ROOM 6 BACKEND COMPREHENSIVE TEST SUITE (49 TESTS)
# =========================================================================

# 1. State, Title, Ambient, and Initial Flags (01-09)
def test_r6_01_room6_state_returns_200(auth_headers):
    reset_vault_team_db("Team Cipher")
    unlock_vault_entrance("Team Cipher")
    res = client.get("/api/game/room/vault", headers=auth_headers)
    assert res.status_code == 200
    assert res.json()["ok"] is True

def test_r6_02_room6_state_alias_route(auth_headers):
    res = client.get("/api/game/room/vault/state", headers=auth_headers)
    assert res.status_code == 200
    data = res.json()
    assert data["ok"] is True
    assert data["room_id"] == "vault"

def test_r6_03_room6_id_and_title(auth_headers):
    res = client.get("/api/game/room/vault", headers=auth_headers)
    data = res.json()
    assert data["room_id"] == "vault"
    assert "Vault" in data["title"] or "Anointing" in data["title"]

def test_r6_04_room6_theme_and_ambient(auth_headers):
    res = client.get("/api/game/room/vault", headers=auth_headers)
    data = res.json()
    assert "theme" in data
    assert "ambient" in data
    theme = data["theme"]
    assert theme.get("bg_top") == "#120d17"
    assert theme.get("accent") == "#38f0ff"
    ambient = data["ambient"]
    assert ambient.get("loop") == "amb_vault.mp3"
    assert "core_pulse.mp3" in ambient.get("sfx", [])

def test_r6_05_room6_initial_flags_false(auth_headers):
    reset_vault_team_db("Team Cipher")
    unlock_vault_entrance("Team Cipher")
    res = client.get("/api/game/room/vault", headers=auth_headers)
    data = res.json()
    assert data["is_completed"] is False
    assert data.get("total_fragments_in_room", 0) == 0

def test_r6_06_room6_no_fragments_or_basket_mechanic(auth_headers):
    res = client.get("/api/game/room/vault/basket", headers=auth_headers)
    assert res.status_code == 200
    data = res.json()
    assert data["ok"] is True
    assert data["room_id"] == "vault"
    assert data["total_fragments_in_room"] == 0
    assert data["collected_count"] == 0
    assert data["fragments"] == []
    assert data["basket_unlocked"] is True

def test_r6_07_room6_all_three_clues_projected(auth_headers):
    res = client.get("/api/game/room/vault", headers=auth_headers)
    clues = res.json()["clues"]
    clue_ids = [c["id"] for c in clues]
    assert "R2-08" in clue_ids
    assert "R2-09" in clue_ids
    assert "R2-10" in clue_ids

def test_r6_08_room6_clue_secret_hashes_hidden(auth_headers):
    res = client.get("/api/game/room/vault", headers=auth_headers)
    for clue in res.json()["clues"]:
        for stage in clue.get("stages", []):
            assert "answer_hash" not in stage
            assert "answer_plain" not in stage

def test_r6_09_room6_objects_count_and_types(auth_headers):
    res = client.get("/api/game/room/vault", headers=auth_headers)
    objects = res.json()["objects"]
    obj_ids = [o["id"] for o in objects]
    expected_props = ["core_glass", "countdown_timer", "manual_terminal", "failsafe_panel", "central_console"]
    for p in expected_props:
        assert p in obj_ids

# 2. R2-08 Procedure Manual Diff (10-18)
def test_r6_10_submit_r2_08_missing_answer_returns_rejected(auth_headers):
    res = client.post("/api/game/clue/R2-08/submit", json={}, headers=auth_headers)
    assert res.status_code == 200
    assert res.json()["correct"] is False

def test_r6_11_submit_r2_08_correct_steps_26(auth_headers):
    reset_vault_team_db("Team Cipher")
    unlock_vault_entrance("Team Cipher")
    res = client.post("/api/game/clue/R2-08/submit", json={"answer": "26"}, headers=auth_headers)
    assert res.status_code == 200
    data = res.json()
    assert data["correct"] is True
    assert data["solved"] is True
    assert data["attempts"] == 1

def test_r6_12_submit_r2_08_whitespace_normalized(auth_headers):
    conn = get_db_connection()
    with conn.cursor() as cur:
        cur.execute("DELETE FROM team_clues WHERE clue_id = 'R2-08' AND team_id = (SELECT id FROM teams WHERE name = 'Team Cipher')")
        conn.commit()
    conn.close()
    res = client.post("/api/game/clue/R2-08/submit", json={"answer": "  26 \n"}, headers=auth_headers)
    assert res.status_code == 200
    assert res.json()["correct"] is True

def test_r6_13_submit_r2_08_key_specific_payload_steps(auth_headers):
    conn = get_db_connection()
    with conn.cursor() as cur:
        cur.execute("DELETE FROM team_clues WHERE clue_id = 'R2-08' AND team_id = (SELECT id FROM teams WHERE name = 'Team Cipher')")
        conn.commit()
    conn.close()
    res = client.post("/api/game/clue/R2-08/submit", json={"steps": "26"}, headers=auth_headers)
    assert res.status_code == 200
    assert res.json()["correct"] is True

def test_r6_14_submit_r2_08_duplicate_returns_already_solved(auth_headers):
    res = client.post("/api/game/clue/R2-08/submit", json={"answer": "26"}, headers=auth_headers)
    assert res.status_code == 200
    assert res.json().get("already_solved") is True

def test_r6_15_submit_r2_08_wrong_custom_feedback(auth_headers):
    conn = get_db_connection()
    with conn.cursor() as cur:
        cur.execute("DELETE FROM team_clues WHERE clue_id = 'R2-08' AND team_id = (SELECT id FROM teams WHERE name = 'Team Cipher')")
        conn.commit()
    conn.close()
    res = client.post("/api/game/clue/R2-08/submit", json={"answer": "99"}, headers=auth_headers)
    assert res.status_code == 200
    data = res.json()
    assert data["correct"] is False
    assert "tampered steps" in data["message"].lower() or "manual" in data["message"].lower()

def test_r6_16_submit_r2_08_reveal_payload_clean_steps(auth_headers):
    conn = get_db_connection()
    with conn.cursor() as cur:
        cur.execute("DELETE FROM team_clues WHERE clue_id = 'R2-08' AND team_id = (SELECT id FROM teams WHERE name = 'Team Cipher')")
        conn.commit()
    conn.close()
    res = client.post("/api/game/clue/R2-08/submit", json={"answer": "26"}, headers=auth_headers)
    data = res.json()
    assert "reveal" in data
    reveal = data["reveal"]
    assert "clean_steps" in reveal
    assert reveal["clean_steps"] == ["1", "3", "4", "5", "7", "8"]
    assert reveal["clean_steps_code"] == "134578"

def test_r6_17_clue_r2_08_hints_endpoint(auth_headers):
    res = client.get("/api/game/clue/R2-08/hints", headers=auth_headers)
    assert res.status_code == 200
    assert res.json()["ok"] is True
    assert len(res.json()["hints"]) > 0

def test_r6_18_submit_r2_08_scoring(auth_headers):
    conn = get_db_connection()
    with conn.cursor() as cur:
        cur.execute("SELECT score FROM team_clues WHERE clue_id = 'R2-08' AND team_id = (SELECT id FROM teams WHERE name = 'Team Cipher')")
        row = cur.fetchone()
        assert row is not None
        assert float(row[0]) == 100.0
    conn.close()

# 3. R2-09 Failsafe Logic Circuit (19-27)
def test_r6_19_submit_r2_09_correct_code_1101(auth_headers):
    reset_vault_team_db("Team Cipher")
    unlock_vault_entrance("Team Cipher")
    res = client.post("/api/game/clue/R2-09/submit", json={"answer": "1101"}, headers=auth_headers)
    assert res.status_code == 200
    data = res.json()
    assert data["correct"] is True
    assert data["solved"] is True
    assert data["attempts"] == 1

def test_r6_20_submit_r2_09_whitespace_normalized(auth_headers):
    conn = get_db_connection()
    with conn.cursor() as cur:
        cur.execute("DELETE FROM team_clues WHERE clue_id = 'R2-09' AND team_id = (SELECT id FROM teams WHERE name = 'Team Cipher')")
        conn.commit()
    conn.close()
    res = client.post("/api/game/clue/R2-09/submit", json={"answer": "  1101  "}, headers=auth_headers)
    assert res.status_code == 200
    assert res.json()["correct"] is True

def test_r6_21_submit_r2_09_key_specific_code(auth_headers):
    conn = get_db_connection()
    with conn.cursor() as cur:
        cur.execute("DELETE FROM team_clues WHERE clue_id = 'R2-09' AND team_id = (SELECT id FROM teams WHERE name = 'Team Cipher')")
        conn.commit()
    conn.close()
    res = client.post("/api/game/clue/R2-09/submit", json={"code": "1101"}, headers=auth_headers)
    assert res.status_code == 200
    assert res.json()["correct"] is True

def test_r6_22_submit_r2_09_key_specific_circuit_code(auth_headers):
    conn = get_db_connection()
    with conn.cursor() as cur:
        cur.execute("DELETE FROM team_clues WHERE clue_id = 'R2-09' AND team_id = (SELECT id FROM teams WHERE name = 'Team Cipher')")
        conn.commit()
    conn.close()
    res = client.post("/api/game/clue/R2-09/submit", json={"circuit_code": "1101"}, headers=auth_headers)
    assert res.status_code == 200
    assert res.json()["correct"] is True

def test_r6_23_submit_r2_09_duplicate_returns_already_solved(auth_headers):
    res = client.post("/api/game/clue/R2-09/submit", json={"answer": "1101"}, headers=auth_headers)
    assert res.status_code == 200
    assert res.json().get("already_solved") is True

def test_r6_24_submit_r2_09_wrong_custom_feedback(auth_headers):
    conn = get_db_connection()
    with conn.cursor() as cur:
        cur.execute("DELETE FROM team_clues WHERE clue_id = 'R2-09' AND team_id = (SELECT id FROM teams WHERE name = 'Team Cipher')")
        conn.commit()
    conn.close()
    res = client.post("/api/game/clue/R2-09/submit", json={"answer": "0000"}, headers=auth_headers)
    assert res.status_code == 200
    data = res.json()
    assert data["correct"] is False
    assert "authorization code" in data["message"].lower() or "spectrogram" in data["message"].lower()

def test_r6_25_clue_r2_09_hints_endpoint(auth_headers):
    res = client.get("/api/game/clue/R2-09/hints", headers=auth_headers)
    assert res.status_code == 200
    assert res.json()["ok"] is True
    assert len(res.json()["hints"]) > 0

def test_r6_26_submit_r2_09_scoring(auth_headers):
    client.post("/api/game/clue/R2-09/submit", json={"answer": "1101"}, headers=auth_headers)
    conn = get_db_connection()
    with conn.cursor() as cur:
        cur.execute("SELECT score FROM team_clues WHERE clue_id = 'R2-09' AND team_id = (SELECT id FROM teams WHERE name = 'Team Cipher')")
        row = cur.fetchone()
        assert row is not None
        assert float(row[0]) == 100.0
    conn.close()

def test_r6_27_submit_r2_09_attempts_max_3(auth_headers):
    res = client.get("/api/game/room/vault", headers=auth_headers)
    r2_09_def = next(c for c in res.json()["clues"] if c["id"] == "R2-09")
    assert r2_09_def["attempts_max"] == 3

# 4. R2-10 Prerequisite Gating & Console Locking (28-32)
def test_r6_28_r2_10_locked_in_state_initially(auth_headers):
    reset_vault_team_db("Team Cipher")
    unlock_vault_entrance("Team Cipher")
    res = client.get("/api/game/room/vault", headers=auth_headers)
    clues = res.json()["clues"]
    r2_10 = next(c for c in clues if c["id"] == "R2-10")
    assert r2_10["locked"] is True

def test_r6_29_r2_10_submit_blocked_when_both_unsolved(auth_headers):
    res = client.post("/api/game/clue/R2-10/submit", json={"steps": "134578", "code": "1101", "badge": "BDG-9001"}, headers=auth_headers)
    assert res.status_code == 200
    data = res.json()
    assert data["correct"] is False
    assert data.get("locked") is True
    assert "prerequisite" in data["message"].lower() or "locked" in data["message"].lower()

def test_r6_30_r2_10_submit_blocked_when_only_r2_08_solved(auth_headers):
    client.post("/api/game/clue/R2-08/submit", json={"answer": "26"}, headers=auth_headers)
    res = client.post("/api/game/clue/R2-10/submit", json={"steps": "134578", "code": "1101", "badge": "BDG-9001"}, headers=auth_headers)
    assert res.status_code == 200
    assert res.json().get("locked") is True

def test_r6_31_r2_10_submit_blocked_when_only_r2_09_solved(auth_headers):
    conn = get_db_connection()
    with conn.cursor() as cur:
        cur.execute("DELETE FROM team_clues WHERE clue_id = 'R2-08' AND team_id = (SELECT id FROM teams WHERE name = 'Team Cipher')")
        conn.commit()
    conn.close()
    client.post("/api/game/clue/R2-09/submit", json={"answer": "1101"}, headers=auth_headers)
    res = client.post("/api/game/clue/R2-10/submit", json={"steps": "134578", "code": "1101", "badge": "BDG-9001"}, headers=auth_headers)
    assert res.status_code == 200
    assert res.json().get("locked") is True

def test_r6_32_r2_10_unlocked_when_both_prereqs_resolved(auth_headers):
    client.post("/api/game/clue/R2-08/submit", json={"answer": "26"}, headers=auth_headers)
    client.post("/api/game/clue/R2-09/submit", json={"answer": "1101"}, headers=auth_headers)
    res = client.get("/api/game/room/vault", headers=auth_headers)
    r2_10 = next(c for c in res.json()["clues"] if c["id"] == "R2-10")
    assert r2_10["locked"] is False

# 5. R2-10 Atomic 3-Field Compound Verification (33-40)
def test_r6_33_r2_10_compound_exact_keys(auth_headers):
    solve_prereqs_r2_08_r2_09("Team Cipher")
    conn = get_db_connection()
    with conn.cursor() as cur:
        cur.execute("DELETE FROM team_clues WHERE clue_id = 'R2-10' AND team_id = (SELECT id FROM teams WHERE name = 'Team Cipher')")
        conn.commit()
    conn.close()
    res = client.post("/api/game/clue/R2-10/submit", json={
        "steps": "134578",
        "code": "1101",
        "badge": "BDG-9001"
    }, headers=auth_headers)
    assert res.status_code == 200
    data = res.json()
    assert data["correct"] is True
    assert data["solved"] is True

def test_r6_34_r2_10_compound_alternate_keys(auth_headers):
    solve_prereqs_r2_08_r2_09("Team Cipher")
    conn = get_db_connection()
    with conn.cursor() as cur:
        cur.execute("DELETE FROM team_clues WHERE clue_id = 'R2-10' AND team_id = (SELECT id FROM teams WHERE name = 'Team Cipher')")
        conn.commit()
    conn.close()
    res = client.post("/api/game/clue/R2-10/submit", json={
        "clean_steps": "134578",
        "auth_code": "1101",
        "operator_badge": "BDG-9001"
    }, headers=auth_headers)
    assert res.status_code == 200
    assert res.json()["correct"] is True

def test_r6_35_r2_10_compound_unhyphenated_badge(auth_headers):
    solve_prereqs_r2_08_r2_09("Team Cipher")
    conn = get_db_connection()
    with conn.cursor() as cur:
        cur.execute("DELETE FROM team_clues WHERE clue_id = 'R2-10' AND team_id = (SELECT id FROM teams WHERE name = 'Team Cipher')")
        conn.commit()
    conn.close()
    res = client.post("/api/game/clue/R2-10/submit", json={
        "steps": "134578",
        "code": "1101",
        "badge": "BDG9001"
    }, headers=auth_headers)
    assert res.status_code == 200
    assert res.json()["correct"] is True

def test_r6_36_r2_10_compound_space_separated_string(auth_headers):
    solve_prereqs_r2_08_r2_09("Team Cipher")
    conn = get_db_connection()
    with conn.cursor() as cur:
        cur.execute("DELETE FROM team_clues WHERE clue_id = 'R2-10' AND team_id = (SELECT id FROM teams WHERE name = 'Team Cipher')")
        conn.commit()
    conn.close()
    res = client.post("/api/game/clue/R2-10/submit", json={"answer": "134578 1101 BDG-9001"}, headers=auth_headers)
    assert res.status_code == 200
    assert res.json()["correct"] is True

def test_r6_37_r2_10_compound_array_payload(auth_headers):
    solve_prereqs_r2_08_r2_09("Team Cipher")
    conn = get_db_connection()
    with conn.cursor() as cur:
        cur.execute("DELETE FROM team_clues WHERE clue_id = 'R2-10' AND team_id = (SELECT id FROM teams WHERE name = 'Team Cipher')")
        conn.commit()
    conn.close()
    res = client.post("/api/game/clue/R2-10/submit", json={"answer": ["134578", "1101", "BDG-9001"]}, headers=auth_headers)
    assert res.status_code == 200
    assert res.json()["correct"] is True

def test_r6_38_r2_10_rejects_wrong_steps(auth_headers):
    solve_prereqs_r2_08_r2_09("Team Cipher")
    conn = get_db_connection()
    with conn.cursor() as cur:
        cur.execute("DELETE FROM team_clues WHERE clue_id = 'R2-10' AND team_id = (SELECT id FROM teams WHERE name = 'Team Cipher')")
        conn.commit()
    conn.close()
    res = client.post("/api/game/clue/R2-10/submit", json={
        "steps": "123456",
        "code": "1101",
        "badge": "BDG-9001"
    }, headers=auth_headers)
    assert res.status_code == 200
    data = res.json()
    assert data["correct"] is False
    assert "CONTAINMENT REJECTED" in data["message"]

def test_r6_39_r2_10_rejects_wrong_code(auth_headers):
    solve_prereqs_r2_08_r2_09("Team Cipher")
    conn = get_db_connection()
    with conn.cursor() as cur:
        cur.execute("DELETE FROM team_clues WHERE clue_id = 'R2-10' AND team_id = (SELECT id FROM teams WHERE name = 'Team Cipher')")
        conn.commit()
    conn.close()
    res = client.post("/api/game/clue/R2-10/submit", json={
        "steps": "134578",
        "code": "0000",
        "badge": "BDG-9001"
    }, headers=auth_headers)
    assert res.status_code == 200
    assert res.json()["correct"] is False

def test_r6_40_r2_10_rejects_wrong_badge(auth_headers):
    solve_prereqs_r2_08_r2_09("Team Cipher")
    conn = get_db_connection()
    with conn.cursor() as cur:
        cur.execute("DELETE FROM team_clues WHERE clue_id = 'R2-10' AND team_id = (SELECT id FROM teams WHERE name = 'Team Cipher')")
        conn.commit()
    conn.close()
    res = client.post("/api/game/clue/R2-10/submit", json={
        "steps": "134578",
        "code": "1101",
        "badge": "BDG-9999"
    }, headers=auth_headers)
    assert res.status_code == 200
    assert res.json()["correct"] is False

# 6. Tournament Victory, Qualification, Burnout & Dossier (41-49)
def test_r6_41_r2_10_victory_flags(auth_headers):
    conn = get_db_connection()
    with conn.cursor() as cur:
        cur.execute("DELETE FROM team_clues WHERE clue_id = 'R2-10' AND team_id = (SELECT id FROM teams WHERE name = 'Team Cipher')")
        conn.commit()
    conn.close()
    res = client.post("/api/game/clue/R2-10/submit", json={
        "steps": "134578",
        "code": "1101",
        "badge": "BDG-9001"
    }, headers=auth_headers)
    assert res.status_code == 200
    data = res.json()
    assert data["correct"] is True
    assert data["round_complete"] is True
    assert data["qualified"] is True
    assert "Tournament Round 2 Complete" in data["message"]

def test_r6_42_r2_10_sets_qualified_at_timestamp(auth_headers):
    conn = get_db_connection()
    with conn.cursor() as cur:
        cur.execute("SELECT qualified_at FROM team_rounds WHERE round = 2 AND team_id = (SELECT id FROM teams WHERE name = 'Team Cipher')")
        q_at = cur.fetchone()[0]
        assert q_at is not None
    conn.close()

def test_r6_43_r2_10_sets_finished_at_and_completed_at(auth_headers):
    conn = get_db_connection()
    with conn.cursor() as cur:
        cur.execute("SELECT finished_at FROM team_rounds WHERE round = 2 AND team_id = (SELECT id FROM teams WHERE name = 'Team Cipher')")
        f_at = cur.fetchone()[0]
        assert f_at is not None

        cur.execute("SELECT completed_at FROM team_rooms WHERE room_id = 'vault' AND team_id = (SELECT id FROM teams WHERE name = 'Team Cipher')")
        c_at = cur.fetchone()[0]
        assert c_at is not None
    conn.close()

def test_r6_44_room6_completed_flag(auth_headers):
    res = client.get("/api/game/room/vault", headers=auth_headers)
    assert res.status_code == 200
    assert res.json()["is_completed"] is True

def test_r6_45_r2_10_duplicate_already_solved(auth_headers):
    res = client.post("/api/game/clue/R2-10/submit", json={
        "steps": "134578",
        "code": "1101",
        "badge": "BDG-9001"
    }, headers=auth_headers)
    assert res.status_code == 200
    assert res.json().get("already_solved") is True

def test_r6_46_r2_10_burnout_penalty_90s(auth_headers):
    reset_vault_team_db("Team Cipher")
    unlock_vault_entrance("Team Cipher")
    solve_prereqs_r2_08_r2_09("Team Cipher")

    # Wrong attempt 1
    r1 = client.post("/api/game/clue/R2-10/submit", json={"answer": "WRONG_1"}, headers=auth_headers)
    assert r1.json()["attempts"] == 1
    assert r1.json()["exhausted"] is False

    # Wrong attempt 2
    r2 = client.post("/api/game/clue/R2-10/submit", json={"answer": "WRONG_2"}, headers=auth_headers)
    assert r2.json()["attempts"] == 2
    assert r2.json()["exhausted"] is False

    # Wrong attempt 3 (exhaustion + 90s penalty)
    r3 = client.post("/api/game/clue/R2-10/submit", json={"answer": "WRONG_3"}, headers=auth_headers)
    assert r3.json()["attempts"] == 3
    assert r3.json()["exhausted"] is True

    conn = get_db_connection()
    with conn.cursor() as cur:
        cur.execute("SELECT penalty_seconds FROM team_rounds WHERE round = 2 AND team_id = (SELECT id FROM teams WHERE name = 'Team Cipher')")
        pen = cur.fetchone()[0]
        assert pen == 90
    conn.close()

def test_r6_47_r2_10_exhaustion_blocks_further_attempts(auth_headers):
    r4 = client.post("/api/game/clue/R2-10/submit", json={
        "steps": "134578",
        "code": "1101",
        "badge": "BDG-9001"
    }, headers=auth_headers)
    assert r4.status_code == 200
    assert r4.json()["exhausted"] is True

def test_r6_48_case_dossier_all_round2_clues(auth_headers):
    res = client.get("/api/game/round/2/dossier", headers=auth_headers)
    assert res.status_code == 200
    data = res.json()
    assert data["ok"] is True
    assert data["round"] == 2
    assert "records" in data
    # Contains all 6 round 2 clues
    records = data["records"]
    cids = [r["clue_id"] for r in records]
    assert "R2-08" in cids
    assert "R2-09" in cids
    assert "R2-10" in cids
    # R2-08 reveal contains clean_steps
    r2_08_rec = next(r for r in records if r["clue_id"] == "R2-08")
    assert r2_08_rec["solved"] is True
    assert r2_08_rec["reveal"]["clean_steps_code"] == "134578"

def test_r6_49_room6_completion_via_all_clues_resolved_with_exhaustion(auth_headers):
    # In test 46, R2-08 (solved), R2-09 (solved), R2-10 (exhausted at 3 attempts)
    # Under "all clues resolved" rule, Room 6 marks is_completed == True!
    res = client.get("/api/game/room/vault", headers=auth_headers)
    assert res.status_code == 200
    assert res.json()["is_completed"] is True
