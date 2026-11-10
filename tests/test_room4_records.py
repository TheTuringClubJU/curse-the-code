import pytest
from datetime import datetime, timezone, timedelta
from fastapi.testclient import TestClient
from app.main import app
from app.login.service import seed_demo_teams, get_db_connection
from app.admin.service import seed_demo_admin

client = TestClient(app)

def reset_records_team_db(team_name="Team Cipher"):
    conn = get_db_connection()
    if conn:
        with conn.cursor() as cur:
            cur.execute("""
                DELETE FROM team_forks WHERE team_id = (SELECT id FROM teams WHERE name = %s);
                DELETE FROM team_clues WHERE team_id = (SELECT id FROM teams WHERE name = %s) AND room_id = 'records';
                DELETE FROM team_fragments WHERE team_id = (SELECT id FROM teams WHERE name = %s) AND room_id = 'records';
                DELETE FROM team_rooms WHERE team_id = (SELECT id FROM teams WHERE name = %s) AND room_id IN ('records', 'control');
                DELETE FROM submissions WHERE team_id = (SELECT id FROM teams WHERE name = %s) AND clue_id IN ('R2-02', 'R2-03', 'R2-04', 'R2-07', 'R1-01');
                UPDATE team_rounds 
                SET penalty_seconds = 0, clues_solved = 0, total_score = 0, last_solved_at = NULL, finished_at = NULL
                WHERE team_id = (SELECT id FROM teams WHERE name = %s) AND round IN (1, 2);
            """, (team_name, team_name, team_name, team_name, team_name, team_name))
            conn.commit()
        conn.close()

def insert_all_records_fragments(team_name="Team Cipher"):
    conn = get_db_connection()
    if conn:
        with conn.cursor() as cur:
            cur.execute("""
                INSERT INTO team_fragments (team_id, room_id, fragment_id, collected_at)
                SELECT (SELECT id FROM teams WHERE name = %s), 'records', id, NOW()
                FROM (VALUES 
                    ('ER01'), ('ER02'), ('ER03'), ('ER04'), ('ER05'), ('ER06'), 
                    ('ER07'), ('ER08'), ('ER09'), ('ER10'), ('XR01'), ('XR02')
                ) AS t(id)
                ON CONFLICT DO NOTHING;
            """, (team_name,))
            conn.commit()
        conn.close()

def ensure_round_2_started(team_name="Team Cipher"):
    now = datetime.now(timezone.utc) - timedelta(minutes=10)
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
    reset_records_team_db("Team Cipher")
    return {"x-session-token": token}

@pytest.fixture(scope="module")
def admin_cookie():
    res = client.post("/api/admin/login", json={
        "username": "admin",
        "password": "admin123"
    })
    return {"admin_session": res.cookies.get("admin_session")}

# =========================================================================
# ROOM 4 BACKEND COMPREHENSIVE TEST SUITE (40 TESTS)
# =========================================================================

# 1. State & Metadata
def test_r4_01_room4_state_returns_200(auth_headers):
    reset_records_team_db("Team Cipher")
    res = client.get("/api/game/room/records", headers=auth_headers)
    assert res.status_code == 200
    assert res.json()["ok"] is True

def test_r4_02_room4_id_and_title(auth_headers):
    res = client.get("/api/game/room/records", headers=auth_headers)
    data = res.json()
    assert data["room_id"] == "records"
    assert "Archive" in data["title"] or "records" in data["title"].lower()

def test_r4_03_room4_theme_and_ambient(auth_headers):
    res = client.get("/api/game/room/records", headers=auth_headers)
    data = res.json()
    assert "theme" in data
    assert "ambient" in data

def test_r4_04_room4_initial_flags_false(auth_headers):
    res = client.get("/api/game/room/records", headers=auth_headers)
    data = res.json()
    assert data["basket_unlocked"] is False
    assert data["is_completed"] is False

def test_r4_05_room4_total_fragments_count(auth_headers):
    res = client.get("/api/game/room/records", headers=auth_headers)
    assert res.json()["total_fragments_in_room"] == 12

def test_r4_06_room4_all_four_clues_projected(auth_headers):
    res = client.get("/api/game/room/records", headers=auth_headers)
    clue_ids = [c["id"] for c in res.json()["clues"]]
    assert "R2-02" in clue_ids
    assert "R2-03" in clue_ids
    assert "R2-04" in clue_ids
    assert "R2-07" in clue_ids

def test_r4_07_room4_clue_secret_hashes_hidden(auth_headers):
    res = client.get("/api/game/room/records", headers=auth_headers)
    for c in res.json()["clues"]:
        for stage in c.get("stages", []):
            assert "answer_hash" not in stage
            assert "answer_plain" not in stage

def test_r4_08_room4_objects_count_and_types(auth_headers):
    res = client.get("/api/game/room/records", headers=auth_headers)
    objects = res.json()["objects"]
    assert len(objects) >= 7
    obj_ids = [o["id"] for o in objects]
    assert "filing_cabinet_a" in obj_ids
    assert "microfilm_reader" in obj_ids
    assert "bulkhead_door" in obj_ids

# 2. Searching & Sequence Locking
def test_r4_09_search_missing_object_id_returns_400(auth_headers):
    res = client.post("/api/game/room/records/search", json={}, headers=auth_headers)
    assert res.status_code == 400

def test_r4_10_search_nonexistent_room_returns_404(auth_headers):
    res = client.post("/api/game/room/nonexistent_room_99/search", json={"object_id": "trunk"}, headers=auth_headers)
    assert res.status_code == 404

def test_r4_11_search_empty_prop_no_hidden_compartments(auth_headers):
    res = client.post("/api/game/room/records/search", json={"object_id": "cctv_junction"}, headers=auth_headers)
    assert res.status_code == 200
    assert res.json()["found"] is False

def test_r4_12_search_out_of_order_seq3_locked(auth_headers):
    reset_records_team_db("Team Cipher")
    res = client.post("/api/game/room/records/search", json={"object_id": "filing_cabinet_b"}, headers=auth_headers)
    assert res.status_code == 200
    data = res.json()
    assert data["found"] is False
    assert data.get("locked") is True

def test_r4_13_search_out_of_order_seq7_locked(auth_headers):
    res = client.post("/api/game/room/records/search", json={"object_id": "clerk_desk"}, headers=auth_headers)
    assert res.status_code == 200
    assert res.json().get("locked") is True

def test_r4_14_search_seq1_er01_success(auth_headers):
    reset_records_team_db("Team Cipher")
    res = client.post("/api/game/room/records/search", json={"object_id": "filing_cabinet_a"}, headers=auth_headers)
    assert res.status_code == 200
    data = res.json()
    assert data["found"] is True
    assert data["fragment_id"] == "ER01"

def test_r4_15_search_seq2_er02_from_same_prop(auth_headers):
    res = client.post("/api/game/room/records/search", json={"object_id": "filing_cabinet_a"}, headers=auth_headers)
    assert res.status_code == 200
    data = res.json()
    assert data["found"] is True
    assert data["fragment_id"] == "ER02"

def test_r4_16_search_already_collected_prop_exhausted(auth_headers):
    # Both ER01 and ER02 collected from filing_cabinet_a
    res = client.post("/api/game/room/records/search", json={"object_id": "filing_cabinet_a"}, headers=auth_headers)
    assert res.status_code == 200
    data = res.json()
    assert data["found"] is False
    assert data.get("already_collected") is True

def test_r4_17_search_seq3_er03_now_unlocked(auth_headers):
    res = client.post("/api/game/room/records/search", json={"object_id": "filing_cabinet_b"}, headers=auth_headers)
    assert res.status_code == 200
    assert res.json()["found"] is True
    assert res.json()["fragment_id"] == "ER03"

def test_r4_18_search_decoy_fragment_xr01_without_sequence_block(auth_headers):
    # XR01 has seq=None in waste_basket, unconstrained by chain sequence
    res = client.post("/api/game/room/records/search", json={"object_id": "waste_basket"}, headers=auth_headers)
    assert res.status_code == 200
    assert res.json()["found"] is True
    assert res.json()["fragment_id"] == "XR01"

# 3. Basket Unlocking & Secret Evidence
def test_r4_19_partial_fragments_keeps_basket_sealed(auth_headers):
    res = client.get("/api/game/room/records", headers=auth_headers)
    data = res.json()
    assert data["basket_unlocked"] is False
    for ev in data["evidence"]:
        assert ev["is_wrapped"] is True
        assert "secret" not in ev

def test_r4_20_all_12_fragments_auto_unlocks_basket(auth_headers):
    insert_all_records_fragments("Team Cipher")
    res = client.get("/api/game/room/records", headers=auth_headers)
    data = res.json()
    assert data["basket_unlocked"] is True
    assert len(data["collected_fragment_ids"]) == 12

def test_r4_21_unsealed_basket_reveals_secret_lines(auth_headers):
    res = client.get("/api/game/room/records", headers=auth_headers)
    data = res.json()
    assert len(data["evidence"]) == 12
    for ev in data["evidence"]:
        assert ev["is_wrapped"] is False
        assert "secret" in ev

# 4. Clue Submissions & Normalization
def test_r4_22_submit_clue_nonexistent_returns_404(auth_headers):
    res = client.post("/api/game/clue/NONEXISTENT/submit", json={"answer": "TEST"}, headers=auth_headers)
    assert res.status_code == 404

def test_r4_23_submit_r2_02_correct_date_award_points(auth_headers):
    res = client.post("/api/game/clue/R2-02/submit", json={"answer": "2001-02-10"}, headers=auth_headers)
    assert res.status_code == 200
    data = res.json()
    assert data["correct"] is True
    assert data["solved"] is True
    assert data["attempts"] == 1

def test_r4_24_submit_r2_02_duplicate_returns_already_solved(auth_headers):
    res = client.post("/api/game/clue/R2-02/submit", json={"answer": "2001-02-10"}, headers=auth_headers)
    assert res.status_code == 200
    assert res.json().get("already_solved") is True

def test_r4_25_submit_r2_03_correct_answer(auth_headers):
    res = client.post("/api/game/clue/R2-03/submit", json={"answer": "2001-02-10"}, headers=auth_headers)
    assert res.status_code == 200
    data = res.json()
    assert data["correct"] is True
    assert data["solved"] is True

def test_r4_26_submit_r2_03_case_insensitive_and_whitespace(auth_headers):
    # Already solved, but confirms status
    res = client.post("/api/game/clue/R2-03/submit", json={"answer": "  2001-02-10  "}, headers=auth_headers)
    assert res.status_code == 200
    assert res.json()["already_solved"] is True

def test_r4_27_clue_r2_04_wrong_attempt_1(auth_headers):
    res = client.post("/api/game/clue/R2-04/submit", json={"answer": "WRONG_A"}, headers=auth_headers)
    assert res.status_code == 200
    data = res.json()
    assert data["correct"] is False
    assert data["attempts"] == 1
    assert data["exhausted"] is False

def test_r4_28_clue_r2_04_wrong_attempt_2(auth_headers):
    res = client.post("/api/game/clue/R2-04/submit", json={"answer": "WRONG_B"}, headers=auth_headers)
    assert res.status_code == 200
    data = res.json()
    assert data["attempts"] == 2
    assert data["exhausted"] is False

def test_r4_29_clue_r2_04_burnout_attempt_3_adds_90s(auth_headers):
    res = client.post("/api/game/clue/R2-04/submit", json={"answer": "WRONG_C"}, headers=auth_headers)
    assert res.status_code == 200
    data = res.json()
    assert data["correct"] is False
    assert data["attempts"] == 3
    assert data["exhausted"] is True

    # Check 90s penalty in DB
    conn = get_db_connection()
    with conn.cursor() as cur:
        cur.execute("SELECT penalty_seconds FROM team_rounds WHERE team_id = (SELECT id FROM teams WHERE name = 'Team Cipher') AND round = 2")
        assert cur.fetchone()[0] == 90
    conn.close()

def test_r4_30_clue_r2_04_fourth_attempt_blocked_exhausted(auth_headers):
    res = client.post("/api/game/clue/R2-04/submit", json={"answer": "WRONG_D"}, headers=auth_headers)
    assert res.status_code == 200
    assert res.json()["exhausted"] is True

def test_r4_31_clue_r2_07_bulkhead_code_solve(auth_headers):
    res = client.post("/api/game/clue/R2-07/submit", json={"answer": "1357"}, headers=auth_headers)
    assert res.status_code == 200
    data = res.json()
    assert data["correct"] is True
    assert data["solved"] is True

def test_r4_32_room4_completion_under_all_clues_resolved_rule(auth_headers):
    # R2-02 (solved), R2-03 (solved), R2-04 (exhausted), R2-07 (solved) -> 4/4 resolved!
    res = client.get("/api/game/room/records", headers=auth_headers)
    assert res.status_code == 200
    assert res.json()["is_completed"] is True

# 5. Dual-Path Fork 1 Mechanics
def test_r4_33_fork1_initial_status_unresolved(auth_headers):
    res = client.get("/api/game/fork/fork_1/status", headers=auth_headers)
    assert res.status_code == 200
    data = res.json()
    assert data["ok"] is True
    assert data["resolved"] is False
    assert data["barred_choices"] == []

def test_r4_34_fork1_missing_choice_returns_400(auth_headers):
    res = client.post("/api/game/fork/fork_1/choose", json={}, headers=auth_headers)
    assert res.status_code == 400

def test_r4_35_fork1_invalid_choice_letter_returns_400(auth_headers):
    res = client.post("/api/game/fork/fork_1/choose", json={"choice": "C"}, headers=auth_headers)
    assert res.status_code == 400

def test_r4_36_fork1_wing_a_trap_penalty_60s(auth_headers):
    res = client.post("/api/game/fork/fork_1/choose", json={"choice": "A"}, headers=auth_headers)
    assert res.status_code == 200
    data = res.json()
    assert data["is_correct"] is False
    assert data["is_trap"] is True
    assert data["penalty_seconds"] == 60
    assert "A" in data["barred_choices"]

def test_r4_37_fork1_wing_a_reselect_is_barred(auth_headers):
    res = client.post("/api/game/fork/fork_1/choose", json={"choice": "A"}, headers=auth_headers)
    assert res.status_code == 200
    assert res.json()["ok"] is False
    assert res.json()["barred"] is True

def test_r4_38_fork1_wing_b_advances_and_unseals_room5(auth_headers):
    res = client.post("/api/game/fork/fork_1/choose", json={"choice": "B"}, headers=auth_headers)
    assert res.status_code == 200
    data = res.json()
    assert data["ok"] is True
    assert data["is_correct"] is True
    assert data["next_room"] == "control"

    # Confirms Room 5 control is in team_rooms
    conn = get_db_connection()
    with conn.cursor() as cur:
        cur.execute("SELECT room_id FROM team_rooms WHERE team_id = (SELECT id FROM teams WHERE name = 'Team Cipher') AND room_id = 'control'")
        assert cur.fetchone() is not None
    conn.close()

# 6. Leaderboard & Scoring Verification
def test_r4_39_leaderboard_r2_reports_exact_accumulated_penalties(admin_cookie):
    res = client.get("/api/admin/leaderboard?round_num=2", cookies=admin_cookie)
    assert res.status_code == 200
    data = res.json()
    team_cipher = next((t for t in data["leaderboard"] if t["team_name"] == "Team Cipher"), None)
    assert team_cipher is not None
    # 90s clue burnout + 60s wrong fork = 150s
    assert team_cipher["penalty_seconds"] == 150
    assert team_cipher["clues_solved"] == 3
    assert team_cipher["total_score"] == 300.0

def test_r4_40_round1_clue_burnout_penalty_applies_90s(auth_headers):
    # Burn 3 attempts on R1-01
    conn = get_db_connection()
    with conn.cursor() as cur:
        cur.execute("""
            DELETE FROM team_clues WHERE team_id = (SELECT id FROM teams WHERE name = 'Team Cipher') AND clue_id = 'R1-01';
            DELETE FROM submissions WHERE team_id = (SELECT id FROM teams WHERE name = 'Team Cipher') AND clue_id = 'R1-01';
            UPDATE team_rounds SET penalty_seconds = 0
            WHERE team_id = (SELECT id FROM teams WHERE name = 'Team Cipher') AND round = 1;
        """)
        conn.commit()
    conn.close()

    for i in range(3):
        client.post("/api/game/clue/R1-01/submit", json={"answer": f"WRONG_{i}"}, headers=auth_headers)

    conn = get_db_connection()
    with conn.cursor() as cur:
        cur.execute("SELECT penalty_seconds FROM team_rounds WHERE team_id = (SELECT id FROM teams WHERE name = 'Team Cipher') AND round = 1")
        assert cur.fetchone()[0] == 90
    conn.close()
