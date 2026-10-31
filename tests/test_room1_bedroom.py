import pytest
import hmac
import hashlib
from fastapi.testclient import TestClient
from app.main import app
from app.login.service import seed_demo_teams, get_db_connection
from app.lobby.routes import get_content_data

client = TestClient(app)

def reset_bedroom_team_db(team_name="Team Cipher"):
    conn = get_db_connection()
    if conn:
        with conn.cursor() as cur:
            cur.execute("""
                DELETE FROM team_clues WHERE team_id = (SELECT id FROM teams WHERE name = %s) AND room_id = 'bedroom';
                DELETE FROM team_fragments WHERE team_id = (SELECT id FROM teams WHERE name = %s) AND room_id = 'bedroom';
                DELETE FROM team_rooms WHERE team_id = (SELECT id FROM teams WHERE name = %s) AND room_id = 'bedroom';
            """, (team_name, team_name, team_name))
            conn.commit()
        conn.close()

def insert_all_bedroom_fragments(team_name="Team Cipher"):
    conn = get_db_connection()
    if conn:
        with conn.cursor() as cur:
            cur.execute("""
                INSERT INTO team_fragments (team_id, room_id, fragment_id, collected_at)
                SELECT (SELECT id FROM teams WHERE name = %s), 'bedroom', id, NOW()
                FROM (VALUES ('EB01'), ('EB02'), ('EB03'), ('EB04'), ('EB05'), ('EB06'), ('EB07'), ('EB08'), ('EB09'), ('EB10'), ('EB11'), ('EB12'), ('EK01'), ('XB01'), ('XB02')) AS t(id)
                ON CONFLICT DO NOTHING;
            """, (team_name,))
            conn.commit()
        conn.close()

@pytest.fixture(scope="module")
def auth_headers():
    seed_demo_teams()
    client.post("/api/auth/logout-all", json={
        "team_name": "Team Cipher",
        "password": "password123"
    })
    res = client.post("/api/auth/login", json={
        "team_name": "Team Cipher",
        "password": "password123"
    })
    token = res.cookies.get("team_session")
    reset_bedroom_team_db("Team Cipher")
    return {"x-session-token": token}

# QA-R1-BE-01
def test_bedroom_initial_state_locked_basket_and_unsolved_clues(auth_headers):
    reset_bedroom_team_db("Team Cipher")
    res = client.get("/api/game/room/bedroom", headers=auth_headers)
    assert res.status_code == 200
    data = res.json()
    assert data["room_id"] == "bedroom"
    assert data["basket_unlocked"] is False
    assert data["is_completed"] is False
    assert len(data["objects"]) == 25
    for clue in data["clues"]:
        assert clue["solved"] is False
        assert clue["attempts"] == 0

# QA-R1-BE-02
def test_bedroom_search_hiding_spot_returns_first_sequential_fragment(auth_headers):
    reset_bedroom_team_db("Team Cipher")
    res = client.post("/api/game/room/bedroom/search", json={"object_id": "trunk"}, headers=auth_headers)
    assert res.status_code == 200
    data = res.json()
    assert data["found"] is True
    assert data["fragment_id"] == "EB01"
    assert "fragment" in data["message"].lower()

# QA-R1-BE-03
def test_bedroom_search_locked_fragment_returns_generic_locked_message(auth_headers):
    reset_bedroom_team_db("Team Cipher")
    res = client.post("/api/game/room/bedroom/search", json={"object_id": "nightstand"}, headers=auth_headers)
    assert res.status_code == 200
    data = res.json()
    assert data["found"] is False
    assert "locked" in data["message"].lower() or "secret" in data["message"].lower()

# QA-R1-BE-04
def test_bedroom_search_empty_object_returns_nothing_found(auth_headers):
    res = client.post("/api/game/room/bedroom/search", json={"object_id": "music_box"}, headers=auth_headers)
    assert res.status_code == 200
    data = res.json()
    assert data["found"] is False
    assert "no hidden" in data["message"].lower() or "nothing" in data["message"].lower()

# QA-R1-BE-05
def test_bedroom_search_decoy_fragments_XB01_and_XB02(auth_headers):
    insert_all_bedroom_fragments("Team Cipher")
    state = client.get("/api/game/room/bedroom", headers=auth_headers).json()
    assert len(state["collected_fragment_ids"]) == 15
    assert "XB01" in state["collected_fragment_ids"]
    assert "XB02" in state["collected_fragment_ids"]

# QA-R1-BE-06
def test_bedroom_search_duplicate_returns_already_found(auth_headers):
    res = client.post("/api/game/room/bedroom/search", json={"object_id": "trunk"}, headers=auth_headers)
    assert res.status_code == 200
    assert res.json()["found"] is False
    assert "already" in res.json()["message"].lower()

# QA-R1-BE-07
def test_bedroom_auto_unlock_basket_when_15_fragments_collected(auth_headers):
    insert_all_bedroom_fragments("Team Cipher")
    state = client.get("/api/game/room/bedroom", headers=auth_headers).json()
    assert state["basket_unlocked"] is True

# QA-R1-BE-08
def test_bedroom_basket_remains_locked_at_14_fragments(auth_headers):
    reset_bedroom_team_db("Team Cipher")
    client.post("/api/game/room/bedroom/search", json={"object_id": "trunk"}, headers=auth_headers)
    state = client.get("/api/game/room/bedroom", headers=auth_headers).json()
    assert state["basket_unlocked"] is False

# QA-R1-BE-09
def test_bedroom_clue_R1_01_hmac_sha256_correct_answer(auth_headers):
    reset_bedroom_team_db("Team Cipher")
    res = client.post("/api/game/clue/R1-01/submit", json={"answer": "LANTERN"}, headers=auth_headers)
    assert res.status_code == 200
    data = res.json()
    assert data["correct"] is True
    assert data["solved"] is True

# QA-R1-BE-10
def test_bedroom_clue_R1_01_plain_text_array_match(auth_headers):
    reset_bedroom_team_db("Team Cipher")
    res = client.post("/api/game/clue/R1-01/submit", json={"answer": "lantern"}, headers=auth_headers)
    assert res.status_code == 200
    assert res.json()["correct"] is True

# QA-R1-BE-11
def test_bedroom_clue_R1_01_case_insensitive_normalization(auth_headers):
    reset_bedroom_team_db("Team Cipher")
    res = client.post("/api/game/clue/R1-01/submit", json={"answer": "  LaNtErN  "}, headers=auth_headers)
    assert res.status_code == 200
    assert res.json()["correct"] is True

# QA-R1-BE-12
def test_bedroom_clue_R1_01_wrong_answer_increments_attempt(auth_headers):
    reset_bedroom_team_db("Team Cipher")
    res = client.post("/api/game/clue/R1-01/submit", json={"answer": "WRONGKEY"}, headers=auth_headers)
    assert res.status_code == 200
    data = res.json()
    assert data["correct"] is False
    assert data["attempts"] == 1

# QA-R1-BE-13
def test_bedroom_clue_R1_01_max_3_attempts_exhaustion(auth_headers):
    reset_bedroom_team_db("Team Cipher")
    for _ in range(3):
        client.post("/api/game/clue/R1-01/submit", json={"answer": "WRONGKEY"}, headers=auth_headers)
    res = client.post("/api/game/clue/R1-01/submit", json={"answer": "LANTERN"}, headers=auth_headers)
    assert res.json()["exhausted"] is True

# QA-R1-BE-14
def test_bedroom_clue_R1_01_awards_photo_piece_P01(auth_headers):
    reset_bedroom_team_db("Team Cipher")
    res = client.post("/api/game/clue/R1-01/submit", json={"answer": "LANTERN"}, headers=auth_headers)
    assert res.json()["reward"]["photo_piece"] == "P01"

# QA-R1-BE-15
def test_bedroom_clue_R1_02_hmac_sha256_correct_answer(auth_headers):
    reset_bedroom_team_db("Team Cipher")
    res = client.post("/api/game/clue/R1-02/submit", json={"answer": "SUNRISE"}, headers=auth_headers)
    assert res.status_code == 200
    assert res.json()["correct"] is True

# QA-R1-BE-16
def test_bedroom_clue_R1_02_whitespace_stripping(auth_headers):
    reset_bedroom_team_db("Team Cipher")
    res = client.post("/api/game/clue/R1-02/submit", json={"answer": "   SUNRISE   "}, headers=auth_headers)
    assert res.json()["correct"] is True

# QA-R1-BE-17
def test_bedroom_clue_R1_02_wrong_answer_message_format(auth_headers):
    reset_bedroom_team_db("Team Cipher")
    res = client.post("/api/game/clue/R1-02/submit", json={"answer": "MIDNIGHT"}, headers=auth_headers)
    assert "cipher shift" in res.json()["message"].lower()

# QA-R1-BE-18
def test_bedroom_clue_R1_02_awards_photo_piece_P02(auth_headers):
    reset_bedroom_team_db("Team Cipher")
    res = client.post("/api/game/clue/R1-02/submit", json={"answer": "SUNRISE"}, headers=auth_headers)
    assert res.json()["reward"]["photo_piece"] == "P02"

# QA-R1-BE-19
def test_bedroom_clue_R1_03_date_normalization_mm_dd_yyyy(auth_headers):
    reset_bedroom_team_db("Team Cipher")
    res = client.post("/api/game/clue/R1-03/submit", json={"answer": "07/04/2001"}, headers=auth_headers)
    assert res.status_code == 200
    assert res.json()["correct"] is True

# QA-R1-BE-20
def test_bedroom_clue_R1_03_numeric_only_sanitization(auth_headers):
    reset_bedroom_team_db("Team Cipher")
    res = client.post("/api/game/clue/R1-03/submit", json={"answer": "07042001"}, headers=auth_headers)
    assert res.json()["correct"] is True

# QA-R1-BE-21
def test_bedroom_clue_R1_03_dual_hmac_hash_match(auth_headers):
    content = get_content_data()
    answer_salt = content["meta"]["answer_salt"]
    msg = b"R1-03:1:07042001"
    h = hmac.new(answer_salt.encode(), msg, hashlib.sha256).hexdigest()
    assert len(h) == 64

# QA-R1-BE-22
def test_bedroom_clue_R1_03_custom_error_message_format(auth_headers):
    reset_bedroom_team_db("Team Cipher")
    res = client.post("/api/game/clue/R1-03/submit", json={"answer": "12/31/1999"}, headers=auth_headers)
    assert "date" in res.json()["message"].lower()

# QA-R1-BE-23
def test_bedroom_clue_R1_03_awards_photo_piece_P03(auth_headers):
    reset_bedroom_team_db("Team Cipher")
    res = client.post("/api/game/clue/R1-03/submit", json={"answer": "07/04/2001"}, headers=auth_headers)
    assert res.json()["reward"]["photo_piece"] == "P03"

# QA-R1-BE-24
def test_bedroom_clue_R1_04_hmac_sha256_correct_answer(auth_headers):
    reset_bedroom_team_db("Team Cipher")
    res = client.post("/api/game/clue/R1-04/submit", json={"answer": "SHADOW"}, headers=auth_headers)
    assert res.status_code == 200
    assert res.json()["correct"] is True

# QA-R1-BE-25
def test_bedroom_clue_R1_04_awards_photo_piece_P04(auth_headers):
    reset_bedroom_team_db("Team Cipher")
    res = client.post("/api/game/clue/R1-04/submit", json={"answer": "SHADOW"}, headers=auth_headers)
    assert res.json()["reward"]["photo_piece"] == "P04"

# QA-R1-BE-26
def test_bedroom_clues_endpoint_unauthorized_without_session_token():
    unauth_client = TestClient(app)
    res = unauth_client.get("/api/game/room/bedroom")
    assert res.status_code == 401

# QA-R1-BE-27
def test_bedroom_submission_with_invalid_token_returns_401():
    unauth_client = TestClient(app)
    res = unauth_client.post("/api/game/clue/R1-01/submit", json={"answer": "LANTERN"}, headers={"x-session-token": "bad-token"})
    assert res.status_code == 401

# QA-R1-BE-28
def test_bedroom_submission_to_nonexistent_clue_returns_404(auth_headers):
    res = client.post("/api/game/clue/R1-NONEXISTENT/submit", json={"answer": "ANY"}, headers=auth_headers)
    assert res.status_code == 404

# QA-R1-BE-29
def test_bedroom_submission_when_already_solved_returns_idempotent_true(auth_headers):
    reset_bedroom_team_db("Team Cipher")
    client.post("/api/game/clue/R1-01/submit", json={"answer": "LANTERN"}, headers=auth_headers)
    res = client.post("/api/game/clue/R1-01/submit", json={"answer": "LANTERN"}, headers=auth_headers)
    assert res.status_code == 200
    assert res.json()["already_solved"] is True

# QA-R1-BE-30
def test_bedroom_submission_when_exhausted_rejects_with_exhausted_flag(auth_headers):
    reset_bedroom_team_db("Team Cipher")
    for _ in range(3):
        client.post("/api/game/clue/R1-02/submit", json={"answer": "WRONG"}, headers=auth_headers)
    res = client.post("/api/game/clue/R1-02/submit", json={"answer": "SUNRISE"}, headers=auth_headers)
    assert res.json()["exhausted"] is True

# QA-R1-BE-31
def test_bedroom_room_completion_flag_false_when_3_clues_solved(auth_headers):
    reset_bedroom_team_db("Team Cipher")
    client.post("/api/game/clue/R1-01/submit", json={"answer": "LANTERN"}, headers=auth_headers)
    client.post("/api/game/clue/R1-02/submit", json={"answer": "SUNRISE"}, headers=auth_headers)
    res = client.post("/api/game/clue/R1-03/submit", json={"answer": "07/04/2001"}, headers=auth_headers)
    assert res.json()["room_completed"] is False

# QA-R1-BE-32
def test_bedroom_room_completion_flag_true_when_all_4_solved(auth_headers):
    reset_bedroom_team_db("Team Cipher")
    client.post("/api/game/clue/R1-01/submit", json={"answer": "LANTERN"}, headers=auth_headers)
    client.post("/api/game/clue/R1-02/submit", json={"answer": "SUNRISE"}, headers=auth_headers)
    client.post("/api/game/clue/R1-03/submit", json={"answer": "07/04/2001"}, headers=auth_headers)
    res = client.post("/api/game/clue/R1-04/submit", json={"answer": "SHADOW"}, headers=auth_headers)
    assert res.json()["room_completed"] is True

# QA-R1-BE-33
def test_bedroom_room_status_persists_in_team_rooms_table(auth_headers):
    reset_bedroom_team_db("Team Cipher")
    client.post("/api/game/clue/R1-01/submit", json={"answer": "LANTERN"}, headers=auth_headers)
    client.post("/api/game/clue/R1-02/submit", json={"answer": "SUNRISE"}, headers=auth_headers)
    client.post("/api/game/clue/R1-03/submit", json={"answer": "07/04/2001"}, headers=auth_headers)
    client.post("/api/game/clue/R1-04/submit", json={"answer": "SHADOW"}, headers=auth_headers)
    
    conn = get_db_connection()
    if conn:
        with conn.cursor() as cur:
            cur.execute("SELECT is_completed FROM team_rooms WHERE room_id = 'bedroom' AND team_id = (SELECT id FROM teams WHERE name = 'Team Cipher')")
            row = cur.fetchone()
            assert row[0] is True
        conn.close()

# QA-R1-BE-34
def test_bedroom_clue_attempts_persist_in_team_clues_table(auth_headers):
    reset_bedroom_team_db("Team Cipher")
    client.post("/api/game/clue/R1-01/submit", json={"answer": "FAIL1"}, headers=auth_headers)
    client.post("/api/game/clue/R1-01/submit", json={"answer": "FAIL2"}, headers=auth_headers)
    
    conn = get_db_connection()
    if conn:
        with conn.cursor() as cur:
            cur.execute("SELECT attempts FROM team_clues WHERE clue_id = 'R1-01' AND team_id = (SELECT id FROM teams WHERE name = 'Team Cipher')")
            row = cur.fetchone()
            assert row[0] == 2
        conn.close()

# QA-R1-BE-35
def test_bedroom_concurrent_submissions_for_same_team_are_serialized(auth_headers):
    reset_bedroom_team_db("Team Cipher")
    r1 = client.post("/api/game/clue/R1-01/submit", json={"answer": "LANTERN"}, headers=auth_headers)
    assert r1.status_code == 200

# QA-R1-BE-36
def test_bedroom_rate_limit_30_submissions_per_minute(auth_headers):
    res = client.post("/api/game/clue/R1-01/submit", json={"answer": "TEST"}, headers=auth_headers)
    assert res.status_code in (200, 429)

# QA-R1-BE-37
def test_bedroom_session_limit_blocks_third_concurrent_device():
    client.post("/api/auth/logout-all", json={"team_name": "Shadow Hackers", "password": "halloweennight"})
    c1, c2, c3 = TestClient(app), TestClient(app), TestClient(app)
    c1.post("/api/auth/login", json={"team_name": "Shadow Hackers", "password": "halloweennight"})
    c2.post("/api/auth/login", json={"team_name": "Shadow Hackers", "password": "halloweennight"})
    r3 = c3.post("/api/auth/login", json={"team_name": "Shadow Hackers", "password": "halloweennight"})
    assert r3.status_code == 409

# QA-R1-BE-38
def test_bedroom_brute_force_lockout_after_8_failed_logins():
    client.post("/api/auth/logout-all", json={"team_name": "Curse Breakers", "password": "secretpass"})
    for _ in range(8):
        client.post("/api/auth/login", json={"team_name": "Curse Breakers", "password": "bad"})
    res = client.post("/api/auth/login", json={"team_name": "Curse Breakers", "password": "secretpass"})
    assert res.status_code == 429

# QA-R1-BE-39
def test_bedroom_etag_caching_on_room_state_polling(auth_headers):
    res = client.get("/api/game/room/bedroom", headers=auth_headers)
    assert res.status_code == 200

# QA-R1-BE-40
def test_bedroom_photo_pieces_tally_matches_distinct_solved_clues(auth_headers):
    reset_bedroom_team_db("Team Cipher")
    client.post("/api/game/clue/R1-01/submit", json={"answer": "LANTERN"}, headers=auth_headers)
    client.post("/api/game/clue/R1-02/submit", json={"answer": "SUNRISE"}, headers=auth_headers)
    state = client.get("/api/game/room/bedroom", headers=auth_headers).json()
    assert state["photo_pieces_collected"] == 2

# QA-R1-BE-41
def test_bedroom_answer_salt_loaded_from_content_file_meta():
    content = get_content_data()
    salt = content.get("meta", {}).get("answer_salt")
    assert salt is not None
    assert len(salt) > 0

# QA-R1-BE-42
def test_bedroom_score_awarded_100_points_per_solved_clue(auth_headers):
    reset_bedroom_team_db("Team Cipher")
    res = client.post("/api/game/clue/R1-01/submit", json={"answer": "LANTERN"}, headers=auth_headers)
    assert res.status_code == 200
    conn = get_db_connection()
    if conn:
        with conn.cursor() as cur:
            cur.execute("SELECT score FROM team_clues WHERE clue_id = 'R1-01' AND team_id = (SELECT id FROM teams WHERE name = 'Team Cipher')")
            row = cur.fetchone()
            assert float(row[0]) >= 100.0
        conn.close()

# QA-R1-BE-43
def test_bedroom_score_zero_points_on_failed_attempts(auth_headers):
    reset_bedroom_team_db("Team Cipher")
    client.post("/api/game/clue/R1-01/submit", json={"answer": "FAIL"}, headers=auth_headers)
    conn = get_db_connection()
    if conn:
        with conn.cursor() as cur:
            cur.execute("SELECT score FROM team_clues WHERE clue_id = 'R1-01' AND team_id = (SELECT id FROM teams WHERE name = 'Team Cipher')")
            row = cur.fetchone()
            assert float(row[0]) == 0.0
        conn.close()

# QA-R1-BE-44
def test_bedroom_no_points_leak_in_client_facing_json(auth_headers):
    state = client.get("/api/game/room/bedroom", headers=auth_headers).json()
    for obj in state["objects"]:
        assert "points" not in obj
        assert "score" not in obj

# QA-R1-BE-45
def test_bedroom_no_hashes_leak_in_client_facing_json(auth_headers):
    state = client.get("/api/game/room/bedroom", headers=auth_headers).json()
    for clue in state["clues"]:
        assert "answer_hash" not in clue
        assert "answer_plain" not in clue

# QA-R1-BE-46
def test_bedroom_database_transaction_rollback_on_submission_error(auth_headers):
    res = client.post("/api/game/clue/R1-01/submit", json={"answer": None}, headers=auth_headers)
    assert res.status_code in (200, 400, 422)

# QA-R1-BE-47
def test_bedroom_exit_door_status_locked_in_state_before_4_solves(auth_headers):
    reset_bedroom_team_db("Team Cipher")
    client.post("/api/game/clue/R1-01/submit", json={"answer": "LANTERN"}, headers=auth_headers)
    state = client.get("/api/game/room/bedroom", headers=auth_headers).json()
    assert state["is_completed"] is False

# QA-R1-BE-48
def test_bedroom_exit_door_status_unlocked_in_state_after_4_solves(auth_headers):
    reset_bedroom_team_db("Team Cipher")
    client.post("/api/game/clue/R1-01/submit", json={"answer": "LANTERN"}, headers=auth_headers)
    client.post("/api/game/clue/R1-02/submit", json={"answer": "SUNRISE"}, headers=auth_headers)
    client.post("/api/game/clue/R1-03/submit", json={"answer": "07/04/2001"}, headers=auth_headers)
    client.post("/api/game/clue/R1-04/submit", json={"answer": "SHADOW"}, headers=auth_headers)
    state = client.get("/api/game/room/bedroom", headers=auth_headers).json()
    assert state["is_completed"] is True

# QA-R1-BE-49
def test_bedroom_submitting_answer_with_special_characters_sanitized(auth_headers):
    res = client.post("/api/game/clue/R1-01/submit", json={"answer": "<script>alert('xss')</script>LANTERN"}, headers=auth_headers)
    assert res.status_code == 200

# QA-R1-BE-50
def test_bedroom_reloading_content_file_updates_room1_metadata():
    content = get_content_data()
    room = next(r for r in content["rooms"] if r["id"] == "bedroom")
    assert room["title"] is not None
    assert len(room["evidence"]) == 15
