import pytest
from datetime import datetime, timezone, timedelta
from fastapi.testclient import TestClient
from app.main import app
from app.login.service import seed_demo_teams, get_db_connection
from app.admin.service import seed_demo_admin

client = TestClient(app)

def reset_control_team_db(team_name="Team Cipher"):
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
                SET penalty_seconds = 0, clues_solved = 0, total_score = 0, last_solved_at = NULL, finished_at = NULL
                WHERE team_id = (SELECT id FROM teams WHERE name = %s) AND round IN (1, 2);
            """, (team_name, team_name, team_name, team_name, team_name, team_name))
            conn.commit()
        conn.close()

def insert_all_control_fragments(team_name="Team Cipher"):
    conn = get_db_connection()
    if conn:
        with conn.cursor() as cur:
            cur.execute("""
                INSERT INTO team_fragments (team_id, room_id, fragment_id, collected_at)
                SELECT (SELECT id FROM teams WHERE name = %s), 'control', id, NOW()
                FROM (VALUES 
                    ('EC01'), ('EC02'), ('EC03'), ('EC04'), ('EC05'), ('EC06'), 
                    ('EC07'), ('EC08')
                ) AS t(id)
                ON CONFLICT DO NOTHING;

                INSERT INTO team_rooms (team_id, room_id, is_basket_unlocked)
                VALUES ((SELECT id FROM teams WHERE name = %s), 'control', TRUE)
                ON CONFLICT (team_id, room_id) DO UPDATE SET is_basket_unlocked = TRUE;
            """, (team_name, team_name))
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
    reset_control_team_db("Team Cipher")
    return {"x-session-token": token}

@pytest.fixture(scope="module")
def admin_cookie():
    res = client.post("/api/admin/login", json={
        "username": "admin",
        "password": "admin123"
    })
    return {"admin_session": res.cookies.get("admin_session")}

# =========================================================================
# ROOM 5 BACKEND COMPREHENSIVE TEST SUITE (49 TESTS)
# =========================================================================

# 1. State, Title, Ambient, and Initial Flags (01-09)
def test_r5_01_room5_state_returns_200(auth_headers):
    reset_control_team_db("Team Cipher")
    res = client.get("/api/game/room/control", headers=auth_headers)
    assert res.status_code == 200
    assert res.json()["ok"] is True

def test_r5_02_room5_state_alias_route(auth_headers):
    res = client.get("/api/game/room/control/state", headers=auth_headers)
    assert res.status_code == 200
    data = res.json()
    assert data["ok"] is True
    assert data["room_id"] == "control"

def test_r5_03_room5_id_and_title(auth_headers):
    res = client.get("/api/game/room/control", headers=auth_headers)
    data = res.json()
    assert data["room_id"] == "control"
    assert "Surveillance" in data["title"] or "Control" in data["title"]

def test_r5_04_room5_theme_and_ambient(auth_headers):
    res = client.get("/api/game/room/control", headers=auth_headers)
    data = res.json()
    assert "theme" in data
    assert "ambient" in data

def test_r5_05_room5_initial_flags_false(auth_headers):
    reset_control_team_db("Team Cipher")
    res = client.get("/api/game/room/control", headers=auth_headers)
    data = res.json()
    assert data["is_completed"] is False
    assert data["basket_unlocked"] is False

def test_r5_06_room5_total_fragments_count(auth_headers):
    res = client.get("/api/game/room/control", headers=auth_headers)
    data = res.json()
    assert data["total_fragments_in_room"] == 8

def test_r5_07_room5_all_three_clues_projected(auth_headers):
    res = client.get("/api/game/room/control", headers=auth_headers)
    clues = res.json()["clues"]
    clue_ids = [c["id"] for c in clues]
    assert "R2-01" in clue_ids
    assert "R2-05" in clue_ids
    assert "R2-06" in clue_ids

def test_r5_08_room5_clue_secret_hashes_hidden(auth_headers):
    res = client.get("/api/game/room/control", headers=auth_headers)
    for clue in res.json()["clues"]:
        for stage in clue.get("stages", []):
            assert "answer_hash" not in stage
            assert "answer_plain" not in stage

    # Verify hints endpoint for R2-01, R2-05, R2-06
    for cid in ["R2-01", "R2-05", "R2-06"]:
        h_res = client.get(f"/api/game/clue/{cid}/hints", headers=auth_headers)
        assert h_res.status_code == 200
        assert h_res.json()["ok"] is True
        assert len(h_res.json()["hints"]) > 0

def test_r5_09_room5_objects_count_and_types(auth_headers):
    res = client.get("/api/game/room/control", headers=auth_headers)
    objects = res.json()["objects"]
    obj_ids = [o["id"] for o in objects]
    expected_props = ["relay_rack", "tape_deck_cart", "operator_chair", "cable_trench", "wall_clipboard", "fuse_box"]
    for p in expected_props:
        assert p in obj_ids

# 2. Sequential Search & Decoy Handling (10-20)
def test_r5_10_search_missing_object_id_returns_400(auth_headers):
    res = client.post("/api/game/room/control/search", json={}, headers=auth_headers)
    assert res.status_code == 400

def test_r5_11_search_nonexistent_room_returns_404(auth_headers):
    res = client.post("/api/game/room/nonexistent_chamber/search", json={"object_id": "relay_rack"}, headers=auth_headers)
    assert res.status_code == 404

def test_r5_12_search_empty_prop_no_hidden_compartments(auth_headers):
    reset_control_team_db("Team Cipher")
    res = client.post("/api/game/room/control/search", json={"object_id": "dead_intercom"}, headers=auth_headers)
    assert res.status_code == 200
    assert res.json()["found"] is False

def test_r5_13_search_out_of_order_cable_trench_free_unlock(auth_headers):
    reset_control_team_db("Team Cipher")
    # Free-order exploration: cable_trench (EC06) is immediately collectible
    res = client.post("/api/game/room/control/search", json={"object_id": "cable_trench"}, headers=auth_headers)
    assert res.status_code == 200
    data = res.json()
    assert data["found"] is True
    assert data["fragment_id"] == "EC06"

def test_r5_14_search_out_of_order_fuse_box_free_unlock(auth_headers):
    # Free-order exploration: fuse_box (EC08) is immediately collectible
    res = client.post("/api/game/room/control/search", json={"object_id": "fuse_box"}, headers=auth_headers)
    assert res.status_code == 200
    data = res.json()
    assert data["found"] is True
    assert data["fragment_id"] == "EC08"

def test_r5_15_search_relay_rack_sweeps_ec01_and_ec02_once(auth_headers):
    # Single-press sweep collects both EC01 and EC02 from relay_rack at once
    res = client.post("/api/game/room/control/search", json={"object_id": "relay_rack"}, headers=auth_headers)
    assert res.status_code == 200
    data = res.json()
    assert data["found"] is True
    assert set(data["newly_collected"]) == {"EC01", "EC02"}

def test_r5_16_search_tape_deck_cart_sweeps_ec03_and_ec04_once(auth_headers):
    # Single-press sweep collects both EC03 and EC04 from tape_deck_cart at once
    res = client.post("/api/game/room/control/search", json={"object_id": "tape_deck_cart"}, headers=auth_headers)
    assert res.status_code == 200
    data = res.json()
    assert data["found"] is True
    assert set(data["newly_collected"]) == {"EC03", "EC04"}

def test_r5_17_search_already_collected_prop_exhausted(auth_headers):
    # Re-searching relay_rack has no further fragments
    res = client.post("/api/game/room/control/search", json={"object_id": "relay_rack"}, headers=auth_headers)
    assert res.status_code == 200
    assert res.json().get("already_collected") is True

def test_r5_18_search_operator_chair_ec05_direct(auth_headers):
    # operator_chair yields EC05 directly with decoys removed
    res = client.post("/api/game/room/control/search", json={"object_id": "operator_chair"}, headers=auth_headers)
    assert res.status_code == 200
    data = res.json()
    assert data["found"] is True
    assert data["fragment_id"] == "EC05"

def test_r5_19_search_wall_clipboard_ec07_unlocks_room(auth_headers):
    # wall_clipboard yields final fragment EC07 (8/8) and unlocks clue terminals
    res = client.post("/api/game/room/control/search", json={"object_id": "wall_clipboard"}, headers=auth_headers)
    assert res.status_code == 200
    data = res.json()
    assert data["found"] is True
    assert data["fragment_id"] == "EC07"
    assert data["total_collected"] == 8
    assert data["basket_unlocked"] is True

def test_r5_20_search_all_props_already_collected_after_sweep(auth_headers):
    for obj in ["relay_rack", "tape_deck_cart", "operator_chair", "cable_trench", "wall_clipboard", "fuse_box"]:
        res = client.post("/api/game/room/control/search", json={"object_id": obj}, headers=auth_headers)
        assert res.status_code == 200
        assert res.json().get("already_collected") is True

# 3. Basket Unwrapped Docs & Input Gates (21-27)
def test_r5_21_partial_fragments_keeps_terminal_gate_locked(auth_headers):
    reset_control_team_db("Team Cipher")
    # Collect relay_rack (EC01, EC02 = 2/8)
    client.post("/api/game/room/control/search", json={"object_id": "relay_rack"}, headers=auth_headers)
    res = client.get("/api/game/room/control/basket", headers=auth_headers)
    assert res.status_code == 200
    data = res.json()
    assert data["basket_unlocked"] is False
    assert data["collected_count"] == 2
    assert data["fragments"][0]["is_wrapped"] is False

def test_r5_22_all_8_fragments_auto_unlocks_basket(auth_headers):
    insert_all_control_fragments("Team Cipher")
    res = client.get("/api/game/room/control/basket", headers=auth_headers)
    assert res.status_code == 200
    data = res.json()
    assert data["basket_unlocked"] is True
    assert data["collected_count"] == 8

def test_r5_23_basket_endpoint_returns_unwrapped_items_partially(auth_headers):
    reset_control_team_db("Team Cipher")
    client.post("/api/game/room/control/search", json={"object_id": "relay_rack"}, headers=auth_headers)
    res = client.get("/api/game/room/control/basket", headers=auth_headers)
    items = res.json()["fragments"]
    for item in items:
        assert item["is_wrapped"] is False
        assert "secret" in item

def test_r5_24_basket_endpoint_returns_unwrapped_secrets_when_unsealed(auth_headers):
    insert_all_control_fragments("Team Cipher")
    res = client.get("/api/game/room/control/basket", headers=auth_headers)
    items = res.json()["fragments"]
    for item in items:
        assert item["is_wrapped"] is False
        assert "secret" in item

def test_r5_25_input_gate_blocks_r2_01_when_basket_sealed(auth_headers):
    reset_control_team_db("Team Cipher")
    res = client.post("/api/game/clue/R2-01/submit", json={"answer": "BDG-9001"}, headers=auth_headers)
    assert res.status_code == 403
    assert "Arcane seal" in res.json()["detail"]

def test_r5_26_input_gate_blocks_r2_05_when_basket_sealed(auth_headers):
    reset_control_team_db("Team Cipher")
    res = client.post("/api/game/clue/R2-05/submit", json={"answer": "VM-A"}, headers=auth_headers)
    assert res.status_code == 403
    assert "Arcane seal" in res.json()["detail"]

def test_r5_27_input_gate_blocks_r2_06_when_basket_sealed(auth_headers):
    reset_control_team_db("Team Cipher")
    res = client.post("/api/game/clue/R2-06/submit", json={"answer": "8140"}, headers=auth_headers)
    assert res.status_code == 403
    assert "Arcane seal" in res.json()["detail"]

# 4. Clue Submissions, Verification, and Feedback (28-37)
def test_r5_28_submit_r2_01_correct_badge_id(auth_headers):
    insert_all_control_fragments("Team Cipher")
    res = client.post("/api/game/clue/R2-01/submit", json={"answer": "BDG-9001"}, headers=auth_headers)
    assert res.status_code == 200
    data = res.json()
    assert data["correct"] is True
    assert data["solved"] is True
    assert data["attempts"] == 1

def test_r5_29_submit_r2_01_case_insensitive_and_whitespace(auth_headers):
    conn = get_db_connection()
    with conn.cursor() as cur:
        cur.execute("DELETE FROM team_clues WHERE clue_id = 'R2-01' AND team_id = (SELECT id FROM teams WHERE name = 'Team Cipher')")
        conn.commit()
    conn.close()
    res = client.post("/api/game/clue/R2-01/submit", json={"answer": "  bdg-9001  "}, headers=auth_headers)
    assert res.status_code == 200
    assert res.json()["correct"] is True

def test_r5_30_submit_r2_01_duplicate_returns_already_solved(auth_headers):
    res = client.post("/api/game/clue/R2-01/submit", json={"answer": "BDG-9001"}, headers=auth_headers)
    assert res.status_code == 200
    assert res.json().get("already_solved") is True

def test_r5_31_submit_r2_01_wrong_custom_feedback(auth_headers):
    conn = get_db_connection()
    with conn.cursor() as cur:
        cur.execute("DELETE FROM team_clues WHERE clue_id = 'R2-01' AND team_id = (SELECT id FROM teams WHERE name = 'Team Cipher')")
        conn.commit()
    conn.close()
    res = client.post("/api/game/clue/R2-01/submit", json={"answer": "BDG-9999"}, headers=auth_headers)
    assert res.status_code == 200
    data = res.json()
    assert data["correct"] is False
    assert "Incorrect badge ID" in data["message"]

def test_r5_32_submit_r2_05_correct_transmission(auth_headers):
    insert_all_control_fragments("Team Cipher")
    res = client.post("/api/game/clue/R2-05/submit", json={"answer": "VM-A"}, headers=auth_headers)
    assert res.status_code == 200
    data = res.json()
    assert data["correct"] is True
    assert data["solved"] is True

def test_r5_33_submit_r2_05_case_insensitive_and_whitespace(auth_headers):
    conn = get_db_connection()
    with conn.cursor() as cur:
        cur.execute("DELETE FROM team_clues WHERE clue_id = 'R2-05' AND team_id = (SELECT id FROM teams WHERE name = 'Team Cipher')")
        conn.commit()
    conn.close()
    res = client.post("/api/game/clue/R2-05/submit", json={"answer": "  vm-a  "}, headers=auth_headers)
    assert res.status_code == 200
    assert res.json()["correct"] is True

def test_r5_34_submit_r2_05_wrong_custom_feedback(auth_headers):
    conn = get_db_connection()
    with conn.cursor() as cur:
        cur.execute("DELETE FROM team_clues WHERE clue_id = 'R2-05' AND team_id = (SELECT id FROM teams WHERE name = 'Team Cipher')")
        conn.commit()
    conn.close()
    res = client.post("/api/game/clue/R2-05/submit", json={"answer": "VM-X"}, headers=auth_headers)
    assert res.status_code == 200
    data = res.json()
    assert data["correct"] is False
    assert "Incorrect transmission file" in data["message"]

def test_r5_35_submit_r2_06_correct_spectrogram_code(auth_headers):
    insert_all_control_fragments("Team Cipher")
    res = client.post("/api/game/clue/R2-06/submit", json={"answer": "8140"}, headers=auth_headers)
    assert res.status_code == 200
    data = res.json()
    assert data["correct"] is True
    assert data["solved"] is True

def test_r5_36_submit_r2_06_whitespace_normalized(auth_headers):
    conn = get_db_connection()
    with conn.cursor() as cur:
        cur.execute("DELETE FROM team_clues WHERE clue_id = 'R2-06' AND team_id = (SELECT id FROM teams WHERE name = 'Team Cipher')")
        conn.commit()
    conn.close()
    res = client.post("/api/game/clue/R2-06/submit", json={"answer": " 8140 "}, headers=auth_headers)
    assert res.status_code == 200
    assert res.json()["correct"] is True

def test_r5_37_submit_r2_06_wrong_custom_feedback(auth_headers):
    conn = get_db_connection()
    with conn.cursor() as cur:
        cur.execute("DELETE FROM team_clues WHERE clue_id = 'R2-06' AND team_id = (SELECT id FROM teams WHERE name = 'Team Cipher')")
        conn.commit()
    conn.close()
    res = client.post("/api/game/clue/R2-06/submit", json={"answer": "9999"}, headers=auth_headers)
    assert res.status_code == 200
    data = res.json()
    assert data["correct"] is False
    assert "Incorrect spectrogram code" in data["message"]

# 5. Attempt Counters, Burnout Penalty, and Room Completion (38-42)
def test_r5_38_clue_burnout_wrong_attempt_1_and_2(auth_headers):
    conn = get_db_connection()
    with conn.cursor() as cur:
        cur.execute("DELETE FROM team_clues WHERE clue_id = 'R2-06' AND team_id = (SELECT id FROM teams WHERE name = 'Team Cipher')")
        cur.execute("UPDATE team_rounds SET penalty_seconds = 0 WHERE round = 2 AND team_id = (SELECT id FROM teams WHERE name = 'Team Cipher')")
        conn.commit()
    conn.close()

    r1 = client.post("/api/game/clue/R2-06/submit", json={"answer": "0001"}, headers=auth_headers)
    assert r1.status_code == 200
    assert r1.json()["attempts"] == 1
    assert r1.json()["exhausted"] is False

    r2 = client.post("/api/game/clue/R2-06/submit", json={"answer": "0002"}, headers=auth_headers)
    assert r2.status_code == 200
    assert r2.json()["attempts"] == 2
    assert r2.json()["exhausted"] is False

def test_r5_39_clue_burnout_attempt_3_adds_90s_penalty(auth_headers):
    r3 = client.post("/api/game/clue/R2-06/submit", json={"answer": "0003"}, headers=auth_headers)
    assert r3.status_code == 200
    data = r3.json()
    assert data["attempts"] == 3
    assert data["exhausted"] is True

    conn = get_db_connection()
    with conn.cursor() as cur:
        cur.execute("SELECT penalty_seconds FROM team_rounds WHERE round = 2 AND team_id = (SELECT id FROM teams WHERE name = 'Team Cipher')")
        penalty = cur.fetchone()[0]
    conn.close()
    assert penalty == 90

def test_r5_40_clue_burnout_attempt_4_blocked_exhausted(auth_headers):
    r4 = client.post("/api/game/clue/R2-06/submit", json={"answer": "8140"}, headers=auth_headers)
    assert r4.status_code == 200
    assert r4.json()["exhausted"] is True

def test_r5_41_room5_completion_all_clues_resolved_when_solved(auth_headers):
    insert_all_control_fragments("Team Cipher")
    conn = get_db_connection()
    with conn.cursor() as cur:
        cur.execute("DELETE FROM team_clues WHERE room_id = 'control' AND team_id = (SELECT id FROM teams WHERE name = 'Team Cipher')")
        conn.commit()
    conn.close()

    client.post("/api/game/clue/R2-01/submit", json={"answer": "BDG-9001"}, headers=auth_headers)
    client.post("/api/game/clue/R2-05/submit", json={"answer": "VM-A"}, headers=auth_headers)
    client.post("/api/game/clue/R2-06/submit", json={"answer": "8140"}, headers=auth_headers)

    res = client.get("/api/game/room/control", headers=auth_headers)
    assert res.json()["is_completed"] is True

def test_r5_42_room5_completion_all_clues_resolved_with_exhaustion(auth_headers):
    insert_all_control_fragments("Team Cipher")
    conn = get_db_connection()
    with conn.cursor() as cur:
        cur.execute("DELETE FROM team_clues WHERE room_id = 'control' AND team_id = (SELECT id FROM teams WHERE name = 'Team Cipher')")
        cur.execute("UPDATE team_rooms SET is_completed = FALSE WHERE room_id = 'control' AND team_id = (SELECT id FROM teams WHERE name = 'Team Cipher')")
        conn.commit()
    conn.close()

    client.post("/api/game/clue/R2-01/submit", json={"answer": "BDG-9001"}, headers=auth_headers)
    client.post("/api/game/clue/R2-05/submit", json={"answer": "VM-A"}, headers=auth_headers)
    # Burn R2-06
    for i in range(3):
        client.post("/api/game/clue/R2-06/submit", json={"answer": f"WRONG_{i}"}, headers=auth_headers)

    res = client.get("/api/game/room/control", headers=auth_headers)
    assert res.json()["is_completed"] is True

# 6. Fork 2 & Case Dossier (43-49)
def test_r5_43_fork2_initial_status_unresolved(auth_headers):
    conn = get_db_connection()
    with conn.cursor() as cur:
        cur.execute("DELETE FROM team_forks WHERE team_id = (SELECT id FROM teams WHERE name = 'Team Cipher') AND fork_id = 'fork_2'")
        conn.commit()
    conn.close()

    res = client.get("/api/game/round/2/fork/airlock/status", headers=auth_headers)
    assert res.status_code == 200
    data = res.json()
    assert data["resolved"] is False
    assert data["barred_choices"] == []

def test_r5_44_fork2_missing_choice_returns_400(auth_headers):
    res = client.post("/api/game/round/2/fork/airlock/choose", json={}, headers=auth_headers)
    assert res.status_code == 400

def test_r5_45_fork2_invalid_choice_returns_400(auth_headers):
    res = client.post("/api/game/round/2/fork/airlock/choose", json={"choice": "Z"}, headers=auth_headers)
    assert res.status_code == 400

def test_r5_46_fork2_valve_a_trap_penalty_60s(auth_headers):
    conn = get_db_connection()
    with conn.cursor() as cur:
        cur.execute("UPDATE team_rounds SET penalty_seconds = 0 WHERE round = 2 AND team_id = (SELECT id FROM teams WHERE name = 'Team Cipher')")
        conn.commit()
    conn.close()

    res = client.post("/api/game/round/2/fork/airlock/choose", json={"choice": "A"}, headers=auth_headers)
    assert res.status_code == 200
    data = res.json()
    assert data["is_correct"] is False
    assert data["penalty_seconds"] == 60
    assert "A" in data["barred_choices"]

    conn = get_db_connection()
    with conn.cursor() as cur:
        cur.execute("SELECT penalty_seconds FROM team_rounds WHERE round = 2 AND team_id = (SELECT id FROM teams WHERE name = 'Team Cipher')")
        total_pen = cur.fetchone()[0]
    conn.close()
    assert total_pen == 60

def test_r5_47_fork2_valve_a_reselect_is_barred(auth_headers):
    res = client.post("/api/game/round/2/fork/airlock/choose", json={"choice": "A"}, headers=auth_headers)
    assert res.status_code == 200
    assert res.json()["ok"] is False
    assert res.json()["barred"] is True

def test_r5_48_fork2_valve_b_advances_and_unseals_room6(auth_headers):
    res = client.post("/api/game/round/2/fork/airlock/choose", json={"choice": "B"}, headers=auth_headers)
    assert res.status_code == 200
    data = res.json()
    assert data["is_correct"] is True
    assert data["next_room"] == "vault"

    # Verify team_rooms unseals vault
    conn = get_db_connection()
    with conn.cursor() as cur:
        cur.execute("SELECT room_id FROM team_rooms WHERE team_id = (SELECT id FROM teams WHERE name = 'Team Cipher') AND room_id = 'vault'")
        assert cur.fetchone() is not None
    conn.close()

def test_r5_49_dossier_endpoint_returns_solved_records(auth_headers):
    res = client.get("/api/game/round/2/dossier", headers=auth_headers)
    assert res.status_code == 200
    data = res.json()
    assert data["ok"] is True
    assert data["round"] == 2
    assert "records" in data
    assert data["total_records"] >= 3
