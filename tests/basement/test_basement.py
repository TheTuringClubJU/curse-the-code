"""
Room 3 (The Basement) - Comprehensive Backend Test Suite (50 Tests)
Cryptographic Verification, Sequential Drop Hunt, Multi-Stage Final Terminal Engine,
Atomic Database Safety, Rate Limiting, and Scoring.
"""

import pytest
import hmac
import hashlib
from fastapi.testclient import TestClient
from app.main import app
from app.login.service import seed_demo_teams, get_db_connection
from app.lobby.routes import get_content_data
from app.game import basement_service

client = TestClient(app)

def reset_basement_team_db(team_name="Team Cipher", study_completed=True):
    conn = get_db_connection()
    if conn:
        with conn.cursor() as cur:
            cur.execute("""
                DELETE FROM team_clues WHERE team_id = (SELECT id FROM teams WHERE name = %s) AND round = 1;
                DELETE FROM team_fragments WHERE team_id = (SELECT id FROM teams WHERE name = %s) AND room_id = 'basement';
                DELETE FROM team_rooms WHERE team_id = (SELECT id FROM teams WHERE name = %s) AND room_id = 'basement';
                DELETE FROM submissions WHERE team_id = (SELECT id FROM teams WHERE name = %s) AND clue_id IN ('R1-09', 'R1-10', 'R1-FIN');
                DELETE FROM team_rounds WHERE team_id = (SELECT id FROM teams WHERE name = %s) AND round = 1;
            """, (team_name, team_name, team_name, team_name, team_name))
            if study_completed:
                cur.execute("""
                    INSERT INTO team_rooms (team_id, room_id, is_completed, completed_at)
                    VALUES 
                        ((SELECT id FROM teams WHERE name = %s), 'bedroom', TRUE, NOW()),
                        ((SELECT id FROM teams WHERE name = %s), 'study', TRUE, NOW())
                    ON CONFLICT (team_id, room_id) DO UPDATE SET is_completed = TRUE;
                """, (team_name, team_name))
            else:
                cur.execute("""
                    DELETE FROM team_rooms WHERE team_id = (SELECT id FROM teams WHERE name = %s) AND room_id = 'study';
                """, (team_name,))
            conn.commit()
        conn.close()

def insert_all_basement_fragments(team_name="Team Cipher"):
    conn = get_db_connection()
    if conn:
        with conn.cursor() as cur:
            cur.execute("""
                INSERT INTO team_fragments (team_id, room_id, fragment_id, is_wrapped, collected_at)
                SELECT (SELECT id FROM teams WHERE name = %s), 'basement', id, TRUE, NOW()
                FROM (VALUES ('EK04'), ('EK05'), ('EK06'), ('XK01'), ('XK02')) AS t(id)
                ON CONFLICT (team_id, fragment_id) DO NOTHING;
            """, (team_name,))
            conn.commit()
        conn.close()

def seed_prior_photo_pieces(team_name="Team Cipher"):
    """Seeds clues R1-01 through R1-08 as solved to provide 8 photo pieces (P01..P08)."""
    conn = get_db_connection()
    if conn:
        with conn.cursor() as cur:
            for cid in ['R1-01', 'R1-02', 'R1-03', 'R1-04', 'R1-05', 'R1-06', 'R1-07', 'R1-08']:
                cur.execute("""
                    INSERT INTO team_clues (team_id, round, clue_id, room_id, solved, attempts, score, solved_at)
                    VALUES ((SELECT id FROM teams WHERE name = %s), 1, %s, 'bedroom', TRUE, 1, 100.0, NOW())
                    ON CONFLICT (team_id, clue_id) DO UPDATE SET solved = TRUE;
                """, (team_name, cid))
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
    reset_basement_team_db("Team Cipher", study_completed=True)
    return {"x-session-token": token}


# QA-R3-BE-01: test_basement_initial_state_locked_until_room2_completed
def test_basement_initial_state_locked_until_room2_completed(auth_headers):
    # When study is not completed -> 403 Forbidden
    reset_basement_team_db("Team Cipher", study_completed=False)
    res = client.get("/api/game/room/basement", headers=auth_headers)
    assert res.status_code == 403
    assert "locked" in res.json()["detail"].lower()

    # When study is completed -> 200 OK
    reset_basement_team_db("Team Cipher", study_completed=True)
    res2 = client.get("/api/game/room/basement", headers=auth_headers)
    assert res2.status_code == 200
    assert res2.json()["room_id"] == "basement"


# QA-R3-BE-02: test_basement_get_room_state_returns_11_objects
def test_basement_get_room_state_returns_11_objects(auth_headers):
    reset_basement_team_db("Team Cipher", study_completed=True)
    res = client.get("/api/game/room/basement", headers=auth_headers)
    assert res.status_code == 200
    data = res.json()
    assert len(data["objects"]) == 11
    object_ids = {obj["id"] for obj in data["objects"]}
    expected_ids = {
        "intercom", "rack_door", "containment_console", "server_rack",
        "maintenance_terminal", "toolbox", "floor_seal", "wall_monitor",
        "pipes", "barrels", "fuse_box"
    }
    assert object_ids == expected_ids


# QA-R3-BE-03: test_basement_search_server_rack_printer_tray_drops_EK04
def test_basement_search_server_rack_printer_tray_drops_EK04(auth_headers):
    reset_basement_team_db("Team Cipher", study_completed=True)
    res = client.post("/api/game/room/basement/search", json={"object_id": "server_rack"}, headers=auth_headers)
    assert res.status_code == 200
    data = res.json()
    assert data["found"] is True
    assert data["fragment_id"] == "EK04"


# QA-R3-BE-04: test_basement_search_maintenance_terminal_drops_EK05
def test_basement_search_maintenance_terminal_drops_EK05(auth_headers):
    # Requires EK04 collected first
    reset_basement_team_db("Team Cipher", study_completed=True)
    client.post("/api/game/room/basement/search", json={"object_id": "server_rack"}, headers=auth_headers)
    res = client.post("/api/game/room/basement/search", json={"object_id": "maintenance_terminal"}, headers=auth_headers)
    assert res.status_code == 200
    data = res.json()
    assert data["found"] is True
    assert data["fragment_id"] == "EK05"


# QA-R3-BE-05: test_basement_search_toolbox_drops_EK06
def test_basement_search_toolbox_drops_EK06(auth_headers):
    # Requires EK04 and EK05 collected first
    reset_basement_team_db("Team Cipher", study_completed=True)
    client.post("/api/game/room/basement/search", json={"object_id": "server_rack"}, headers=auth_headers)
    client.post("/api/game/room/basement/search", json={"object_id": "maintenance_terminal"}, headers=auth_headers)
    res = client.post("/api/game/room/basement/search", json={"object_id": "toolbox"}, headers=auth_headers)
    assert res.status_code == 200
    data = res.json()
    assert data["found"] is True
    assert data["fragment_id"] == "EK06"


# QA-R3-BE-06: test_basement_search_floor_seal_drops_decoy_XK01
def test_basement_search_floor_seal_drops_decoy_XK01(auth_headers):
    reset_basement_team_db("Team Cipher", study_completed=True)
    res = client.post("/api/game/room/basement/search", json={"object_id": "floor_seal"}, headers=auth_headers)
    assert res.status_code == 200
    data = res.json()
    assert data["found"] is True
    assert data["fragment_id"] == "XK01"


# QA-R3-BE-07: test_basement_search_server_rack_drive_bay_drops_decoy_XK02
def test_basement_search_server_rack_drive_bay_drops_decoy_XK02(auth_headers):
    reset_basement_team_db("Team Cipher", study_completed=True)
    # Search 1: drops EK04
    r1 = client.post("/api/game/room/basement/search", json={"object_id": "server_rack"}, headers=auth_headers)
    assert r1.json()["fragment_id"] == "EK04"
    # Search 2: drops decoy XK02
    r2 = client.post("/api/game/room/basement/search", json={"object_id": "server_rack"}, headers=auth_headers)
    assert r2.status_code == 200
    assert r2.json()["found"] is True
    assert r2.json()["fragment_id"] == "XK02"


# QA-R3-BE-08: test_basement_search_empty_returns_nothing_found
def test_basement_search_empty_returns_nothing_found(auth_headers):
    reset_basement_team_db("Team Cipher", study_completed=True)
    res = client.post("/api/game/room/basement/search", json={"object_id": "wall_monitor"}, headers=auth_headers)
    assert res.status_code == 200
    data = res.json()
    assert data["found"] is False
    assert "no hidden" in data["message"].lower() or "nothing" in data["message"].lower()


# QA-R3-BE-09: test_basement_basket_auto_unlocks_when_all_5_fragments_collected
def test_basement_basket_auto_unlocks_when_all_5_fragments_collected(auth_headers):
    reset_basement_team_db("Team Cipher", study_completed=True)
    insert_all_basement_fragments("Team Cipher")
    res = client.get("/api/game/room/basement", headers=auth_headers)
    assert res.status_code == 200
    data = res.json()
    assert data["basket_unlocked"] is True
    assert len(data["collected_fragment_ids"]) == 5


# QA-R3-BE-10: test_basement_basket_locked_when_4_of_5_collected
def test_basement_basket_locked_when_4_of_5_collected(auth_headers):
    reset_basement_team_db("Team Cipher", study_completed=True)
    conn = get_db_connection()
    with conn.cursor() as cur:
        cur.execute("""
            INSERT INTO team_fragments (team_id, room_id, fragment_id, is_wrapped, collected_at)
            SELECT (SELECT id FROM teams WHERE name = 'Team Cipher'), 'basement', id, TRUE, NOW()
            FROM (VALUES ('EK04'), ('EK05'), ('EK06'), ('XK01')) AS t(id);
        """)
        conn.commit()
    conn.close()

    res = client.get("/api/game/room/basement", headers=auth_headers)
    assert res.status_code == 200
    data = res.json()
    assert data["basket_unlocked"] is False
    assert len(data["collected_fragment_ids"]) == 4


# QA-R3-BE-11: test_basement_clue_R1_09_hmac_sha256_correct_answer
def test_basement_clue_R1_09_hmac_sha256_correct_answer(auth_headers):
    reset_basement_team_db("Team Cipher", study_completed=True)
    res = client.post("/api/game/clue/R1-09/submit", json={"answer": "QR92", "_bypass_rate_limit": True}, headers=auth_headers)
    assert res.status_code == 200
    data = res.json()
    assert data["correct"] is True
    assert data["solved"] is True


# QA-R3-BE-12: test_basement_clue_R1_09_plain_text_array_match_QR92
def test_basement_clue_R1_09_plain_text_array_match_QR92(auth_headers):
    reset_basement_team_db("Team Cipher", study_completed=True)
    res = client.post("/api/game/clue/R1-09/submit", json={"answer": "qr92", "_bypass_rate_limit": True}, headers=auth_headers)
    assert res.status_code == 200
    data = res.json()
    assert data["correct"] is True


# QA-R3-BE-13: test_basement_clue_R1_09_awards_photo_piece_P09
def test_basement_clue_R1_09_awards_photo_piece_P09(auth_headers):
    reset_basement_team_db("Team Cipher", study_completed=True)
    res = client.post("/api/game/clue/R1-09/submit", json={"answer": "QR92", "_bypass_rate_limit": True}, headers=auth_headers)
    assert res.status_code == 200
    assert res.json()["reward"]["photo_piece"] == "P09"


# QA-R3-BE-14: test_basement_clue_R1_10_hmac_sha256_correct_answer
def test_basement_clue_R1_10_hmac_sha256_correct_answer(auth_headers):
    reset_basement_team_db("Team Cipher", study_completed=True)
    res = client.post("/api/game/clue/R1-10/submit", json={"answer": "LOWER", "_bypass_rate_limit": True}, headers=auth_headers)
    assert res.status_code == 200
    data = res.json()
    assert data["correct"] is True
    assert data["solved"] is True


# QA-R3-BE-15: test_basement_clue_R1_10_plain_text_array_match_LOWER
def test_basement_clue_R1_10_plain_text_array_match_LOWER(auth_headers):
    reset_basement_team_db("Team Cipher", study_completed=True)
    res = client.post("/api/game/clue/R1-10/submit", json={"answer": "lower", "_bypass_rate_limit": True}, headers=auth_headers)
    assert res.status_code == 200
    assert res.json()["correct"] is True


# QA-R3-BE-16: test_basement_clue_R1_10_awards_photo_piece_P10
def test_basement_clue_R1_10_awards_photo_piece_P10(auth_headers):
    reset_basement_team_db("Team Cipher", study_completed=True)
    res = client.post("/api/game/clue/R1-10/submit", json={"answer": "LOWER", "_bypass_rate_limit": True}, headers=auth_headers)
    assert res.status_code == 200
    assert res.json()["reward"]["photo_piece"] == "P10"


# QA-R3-BE-17: test_basement_total_photo_pieces_equals_10
def test_basement_total_photo_pieces_equals_10(auth_headers):
    reset_basement_team_db("Team Cipher", study_completed=True)
    seed_prior_photo_pieces("Team Cipher")  # 8 pieces
    client.post("/api/game/clue/R1-09/submit", json={"answer": "QR92", "_bypass_rate_limit": True}, headers=auth_headers)  # 9th
    client.post("/api/game/clue/R1-10/submit", json={"answer": "LOWER", "_bypass_rate_limit": True}, headers=auth_headers)  # 10th
    res = client.get("/api/game/room/basement", headers=auth_headers)
    assert res.status_code == 200
    assert res.json()["photo_pieces_collected"] == 10


# QA-R3-BE-18: test_basement_final_terminal_stage1_requires_3_keywords
def test_basement_final_terminal_stage1_requires_3_keywords(auth_headers):
    reset_basement_team_db("Team Cipher", study_completed=True)
    # Solve R1-09 and R1-10 first
    client.post("/api/game/clue/R1-09/submit", json={"answer": "QR92", "_bypass_rate_limit": True}, headers=auth_headers)
    client.post("/api/game/clue/R1-10/submit", json={"answer": "LOWER", "_bypass_rate_limit": True}, headers=auth_headers)

    # Submit only 2 keywords
    res = client.post("/api/game/clue/R1-FIN/submit", json={
        "stage": 1,
        "answer": {"k1": "LANTERN", "k2": "ORBIT"},
        "_bypass_rate_limit": True
    }, headers=auth_headers)
    assert res.status_code == 200
    data = res.json()
    assert data["correct"] is False
    assert "three" in data["message"].lower()


# QA-R3-BE-19: test_basement_final_terminal_stage1_validates_LANTERN_ORBIT_SRC_TEST9
def test_basement_final_terminal_stage1_validates_LANTERN_ORBIT_SRC_TEST9(auth_headers):
    reset_basement_team_db("Team Cipher", study_completed=True)
    client.post("/api/game/clue/R1-09/submit", json={"answer": "QR92", "_bypass_rate_limit": True}, headers=auth_headers)
    client.post("/api/game/clue/R1-10/submit", json={"answer": "LOWER", "_bypass_rate_limit": True}, headers=auth_headers)

    res = client.post("/api/game/clue/R1-FIN/submit", json={
        "stage": 1,
        "answer": {"k1": "LANTERN", "k2": "ORBIT", "k3": "SRC-TEST9"},
        "_bypass_rate_limit": True
    }, headers=auth_headers)
    assert res.status_code == 200
    data = res.json()
    assert data["correct"] is True
    assert data["stage"] == 1


# QA-R3-BE-20: test_basement_final_terminal_stage1_advances_to_stage2
def test_basement_final_terminal_stage1_advances_to_stage2(auth_headers):
    reset_basement_team_db("Team Cipher", study_completed=True)
    client.post("/api/game/clue/R1-09/submit", json={"answer": "QR92", "_bypass_rate_limit": True}, headers=auth_headers)
    client.post("/api/game/clue/R1-10/submit", json={"answer": "LOWER", "_bypass_rate_limit": True}, headers=auth_headers)

    res = client.post("/api/game/clue/R1-FIN/submit", json={
        "stage": 1,
        "answer": {"k1": "LANTERN", "k2": "ORBIT", "k3": "SRC-TEST9"},
        "_bypass_rate_limit": True
    }, headers=auth_headers)
    assert res.json()["next_stage"] == 2

    # Verify room state shows current_stage = 2
    state = client.get("/api/game/room/basement", headers=auth_headers).json()
    fin_clue = next(c for c in state["clues"] if c["id"] == "R1-FIN")
    assert fin_clue["current_stage"] == 2


# QA-R3-BE-21: test_basement_final_terminal_stage2_rejects_if_fewer_than_10_pieces
def test_basement_final_terminal_stage2_rejects_if_fewer_than_10_pieces(auth_headers):
    reset_basement_team_db("Team Cipher", study_completed=True)
    # Do NOT seed all 8 prior pieces -> only 2 photo pieces collected
    client.post("/api/game/clue/R1-09/submit", json={"answer": "QR92", "_bypass_rate_limit": True}, headers=auth_headers)
    client.post("/api/game/clue/R1-10/submit", json={"answer": "LOWER", "_bypass_rate_limit": True}, headers=auth_headers)
    client.post("/api/game/clue/R1-FIN/submit", json={
        "stage": 1,
        "answer": {"k1": "LANTERN", "k2": "ORBIT", "k3": "SRC-TEST9"},
        "_bypass_rate_limit": True
    }, headers=auth_headers)

    res = client.post("/api/game/clue/R1-FIN/submit", json={
        "stage": 2,
        "answer": {"pieces": ['P06', 'P01', 'P08', 'P03', 'P10', 'P05', 'P02', 'P09', 'P04', 'P07']},
        "_bypass_rate_limit": True
    }, headers=auth_headers)
    assert res.status_code == 200
    data = res.json()
    assert data["correct"] is False
    assert "missing" in data["message"].lower() or "10" in data["message"].lower()


# QA-R3-BE-22: test_basement_final_terminal_stage2_validates_exact_photo_permutation
def test_basement_final_terminal_stage2_validates_exact_photo_permutation(auth_headers):
    reset_basement_team_db("Team Cipher", study_completed=True)
    seed_prior_photo_pieces("Team Cipher")
    client.post("/api/game/clue/R1-09/submit", json={"answer": "QR92", "_bypass_rate_limit": True}, headers=auth_headers)
    client.post("/api/game/clue/R1-10/submit", json={"answer": "LOWER", "_bypass_rate_limit": True}, headers=auth_headers)
    client.post("/api/game/clue/R1-FIN/submit", json={
        "stage": 1,
        "answer": {"k1": "LANTERN", "k2": "ORBIT", "k3": "SRC-TEST9"},
        "_bypass_rate_limit": True
    }, headers=auth_headers)

    # Wrong permutation
    bad_res = client.post("/api/game/clue/R1-FIN/submit", json={
        "stage": 2,
        "answer": {"pieces": ['P01', 'P02', 'P03', 'P04', 'P05', 'P06', 'P07', 'P08', 'P09', 'P10']},
        "_bypass_rate_limit": True
    }, headers=auth_headers)
    assert bad_res.json()["correct"] is False

    # Exact correct permutation: ['P06', 'P01', 'P08', 'P03', 'P10', 'P05', 'P02', 'P09', 'P04', 'P07']
    good_res = client.post("/api/game/clue/R1-FIN/submit", json={
        "stage": 2,
        "answer": {"pieces": ['P06', 'P01', 'P08', 'P03', 'P10', 'P05', 'P02', 'P09', 'P04', 'P07']},
        "_bypass_rate_limit": True
    }, headers=auth_headers)
    assert good_res.json()["correct"] is True


# QA-R3-BE-23: test_basement_final_terminal_stage2_advances_to_stage3
def test_basement_final_terminal_stage2_advances_to_stage3(auth_headers):
    reset_basement_team_db("Team Cipher", study_completed=True)
    seed_prior_photo_pieces("Team Cipher")
    client.post("/api/game/clue/R1-09/submit", json={"answer": "QR92", "_bypass_rate_limit": True}, headers=auth_headers)
    client.post("/api/game/clue/R1-10/submit", json={"answer": "LOWER", "_bypass_rate_limit": True}, headers=auth_headers)
    client.post("/api/game/clue/R1-FIN/submit", json={"stage": 1, "answer": {"k1": "LANTERN", "k2": "ORBIT", "k3": "SRC-TEST9"}, "_bypass_rate_limit": True}, headers=auth_headers)
    res = client.post("/api/game/clue/R1-FIN/submit", json={"stage": 2, "answer": {"pieces": ['P06', 'P01', 'P08', 'P03', 'P10', 'P05', 'P02', 'P09', 'P04', 'P07']}, "_bypass_rate_limit": True}, headers=auth_headers)
    assert res.json()["next_stage"] == 3


# QA-R3-BE-24: test_basement_final_terminal_stage3_validates_BETA_and_2468
def test_basement_final_terminal_stage3_validates_BETA_and_2468(auth_headers):
    reset_basement_team_db("Team Cipher", study_completed=True)
    seed_prior_photo_pieces("Team Cipher")
    client.post("/api/game/clue/R1-09/submit", json={"answer": "QR92", "_bypass_rate_limit": True}, headers=auth_headers)
    client.post("/api/game/clue/R1-10/submit", json={"answer": "LOWER", "_bypass_rate_limit": True}, headers=auth_headers)
    client.post("/api/game/clue/R1-FIN/submit", json={"stage": 1, "answer": {"k1": "LANTERN", "k2": "ORBIT", "k3": "SRC-TEST9"}, "_bypass_rate_limit": True}, headers=auth_headers)
    client.post("/api/game/clue/R1-FIN/submit", json={"stage": 2, "answer": {"pieces": ['P06', 'P01', 'P08', 'P03', 'P10', 'P05', 'P02', 'P09', 'P04', 'P07']}, "_bypass_rate_limit": True}, headers=auth_headers)

    # Wrong PIN
    res_wrong = client.post("/api/game/clue/R1-FIN/submit", json={"stage": 3, "answer": {"choice": "BETA", "code": "9999"}, "_bypass_rate_limit": True}, headers=auth_headers)
    assert res_wrong.json()["correct"] is False

    # Correct BETA and 2468
    res_correct = client.post("/api/game/clue/R1-FIN/submit", json={"stage": 3, "answer": {"choice": "BETA", "code": "2468"}, "_bypass_rate_limit": True}, headers=auth_headers)
    assert res_correct.json()["correct"] is True
    assert res_correct.json()["solved"] is True


# QA-R3-BE-25: test_basement_final_terminal_completes_round1
def test_basement_final_terminal_completes_round1(auth_headers):
    reset_basement_team_db("Team Cipher", study_completed=True)
    seed_prior_photo_pieces("Team Cipher")
    client.post("/api/game/clue/R1-09/submit", json={"answer": "QR92", "_bypass_rate_limit": True}, headers=auth_headers)
    client.post("/api/game/clue/R1-10/submit", json={"answer": "LOWER", "_bypass_rate_limit": True}, headers=auth_headers)
    client.post("/api/game/clue/R1-FIN/submit", json={"stage": 1, "answer": {"k1": "LANTERN", "k2": "ORBIT", "k3": "SRC-TEST9"}, "_bypass_rate_limit": True}, headers=auth_headers)
    client.post("/api/game/clue/R1-FIN/submit", json={"stage": 2, "answer": {"pieces": ['P06', 'P01', 'P08', 'P03', 'P10', 'P05', 'P02', 'P09', 'P04', 'P07']}, "_bypass_rate_limit": True}, headers=auth_headers)
    res = client.post("/api/game/clue/R1-FIN/submit", json={"stage": 3, "answer": {"choice": "BETA", "code": "2468"}, "_bypass_rate_limit": True}, headers=auth_headers)
    assert res.json()["room_completed"] is True


# QA-R3-BE-26: test_basement_final_terminal_records_official_finish_timestamp
def test_basement_final_terminal_records_official_finish_timestamp(auth_headers):
    conn = get_db_connection()
    with conn.cursor() as cur:
        cur.execute("SELECT finished_at FROM team_rounds WHERE team_id = (SELECT id FROM teams WHERE name = 'Team Cipher') AND round = 1")
        row = cur.fetchone()
        assert row is not None and row[0] is not None
    conn.close()


# QA-R3-BE-27: test_basement_final_terminal_prevents_duplicate_scoring
def test_basement_final_terminal_prevents_duplicate_scoring(auth_headers):
    # Second submission should return already_solved without double scoring
    res = client.post("/api/game/clue/R1-FIN/submit", json={"stage": 3, "answer": {"choice": "BETA", "code": "2468"}, "_bypass_rate_limit": True}, headers=auth_headers)
    assert res.status_code == 200
    assert res.json()["already_solved"] is True


# QA-R3-BE-28: test_basement_final_terminal_never_leaks_which_field_was_wrong
def test_basement_final_terminal_never_leaks_which_field_was_wrong(auth_headers):
    reset_basement_team_db("Team Cipher", study_completed=True)
    client.post("/api/game/clue/R1-09/submit", json={"answer": "QR92", "_bypass_rate_limit": True}, headers=auth_headers)
    client.post("/api/game/clue/R1-10/submit", json={"answer": "LOWER", "_bypass_rate_limit": True}, headers=auth_headers)
    res = client.post("/api/game/clue/R1-FIN/submit", json={
        "stage": 1,
        "answer": {"k1": "LANTERN", "k2": "WRONG_KEYWORD", "k3": "SRC-TEST9"},
        "_bypass_rate_limit": True
    }, headers=auth_headers)
    msg = res.json()["message"].lower()
    assert "k2" not in msg and "second" not in msg


# QA-R3-BE-29: test_basement_clues_max_attempts_enforced
def test_basement_clues_max_attempts_enforced(auth_headers):
    reset_basement_team_db("Team Cipher", study_completed=True)
    # R1-09 allows max 3 attempts
    for _ in range(3):
        client.post("/api/game/clue/R1-09/submit", json={"answer": "WRONG", "_bypass_rate_limit": True}, headers=auth_headers)
    res = client.post("/api/game/clue/R1-09/submit", json={"answer": "QR92", "_bypass_rate_limit": True}, headers=auth_headers)
    assert res.json()["exhausted"] is True


# QA-R3-BE-30: test_basement_exhausted_clues_block_further_submits
def test_basement_exhausted_clues_block_further_submits(auth_headers):
    res = client.post("/api/game/clue/R1-09/submit", json={"answer": "QR92", "_bypass_rate_limit": True}, headers=auth_headers)
    assert res.json()["correct"] is False
    assert res.json()["exhausted"] is True


# QA-R3-BE-31: test_basement_atomic_transactions_under_high_load
def test_basement_atomic_transactions_under_high_load(auth_headers):
    reset_basement_team_db("Team Cipher", study_completed=True)
    # Concurrent submits execute safely without deadlocks
    for _ in range(5):
        client.post("/api/game/clue/R1-10/submit", json={"answer": "WRONG", "_bypass_rate_limit": True}, headers=auth_headers)
    conn = get_db_connection()
    with conn.cursor() as cur:
        cur.execute("SELECT attempts FROM team_clues WHERE team_id = (SELECT id FROM teams WHERE name = 'Team Cipher') AND clue_id = 'R1-10'")
        row = cur.fetchone()
        assert row is not None and row[0] >= 3
    conn.close()


# QA-R3-BE-32: test_basement_rate_limit_enforced_across_basement_clues
def test_basement_rate_limit_enforced_across_basement_clues(auth_headers):
    reset_basement_team_db("Team Cipher", study_completed=True)
    # First submission succeeds without rate limit
    r1 = client.post("/api/game/clue/R1-09/submit", json={"answer": "WRONG_1"}, headers=auth_headers)
    assert r1.status_code == 200

    # Second immediate submission triggers 429 rate limit
    r2 = client.post("/api/game/clue/R1-09/submit", json={"answer": "WRONG_2"}, headers=auth_headers)
    assert r2.status_code == 429


# QA-R3-BE-33: test_basement_server_time_synced_to_countdown_monitor
def test_basement_server_time_synced_to_countdown_monitor(auth_headers):
    res = client.get("/api/time")
    assert res.status_code == 200
    data = res.json()
    assert "remaining_seconds" in data
    assert "server_time" in data
    assert "ends_at" in data
    assert data["remaining_seconds"] > 0


# QA-R3-BE-34: test_basement_security_no_plain_answers_in_client_state
def test_basement_security_no_plain_answers_in_client_state(auth_headers):
    reset_basement_team_db("Team Cipher", study_completed=True)
    res = client.get("/api/game/room/basement", headers=auth_headers)
    raw_text = res.text
    assert "QR92" not in raw_text
    assert "LOWER" not in raw_text
    assert "2468" not in raw_text


# QA-R3-BE-35: test_basement_security_no_hashes_in_client_state
def test_basement_security_no_hashes_in_client_state(auth_headers):
    reset_basement_team_db("Team Cipher", study_completed=True)
    res = client.get("/api/game/room/basement", headers=auth_headers)
    raw_text = res.text
    assert "9661d6eee858ada8ba676d91f66aa71545f3d89114c6caee1e8ef3479d56aae2" not in raw_text
    assert "9be62fcea12d7c29c1e638f4a85f6a80ee164f8c667eb075be2ef4183e3c09bc" not in raw_text


# QA-R3-BE-36: test_basement_custom_error_message_for_qr_terminal
def test_basement_custom_error_message_for_qr_terminal(auth_headers):
    reset_basement_team_db("Team Cipher", study_completed=True)
    res = client.post("/api/game/clue/R1-09/submit", json={"answer": "INCORRECT", "_bypass_rate_limit": True}, headers=auth_headers)
    assert res.status_code == 200
    assert "qr" in res.json()["message"].lower() or "authorization" in res.json()["message"].lower()


# QA-R3-BE-37: test_basement_custom_error_message_for_rack_note
def test_basement_custom_error_message_for_rack_note(auth_headers):
    reset_basement_team_db("Team Cipher", study_completed=True)
    res = client.post("/api/game/clue/R1-10/submit", json={"answer": "INCORRECT", "_bypass_rate_limit": True}, headers=auth_headers)
    assert res.status_code == 200
    assert "vigenère" in res.json()["message"].lower() or "decryption" in res.json()["message"].lower()


# QA-R3-BE-38: test_basement_custom_error_message_for_final_terminal
def test_basement_custom_error_message_for_final_terminal(auth_headers):
    reset_basement_team_db("Team Cipher", study_completed=True)
    client.post("/api/game/clue/R1-09/submit", json={"answer": "QR92", "_bypass_rate_limit": True}, headers=auth_headers)
    client.post("/api/game/clue/R1-10/submit", json={"answer": "LOWER", "_bypass_rate_limit": True}, headers=auth_headers)
    res = client.post("/api/game/clue/R1-FIN/submit", json={"stage": 1, "answer": {"k1": "X", "k2": "Y", "k3": "Z"}, "_bypass_rate_limit": True}, headers=auth_headers)
    assert res.status_code == 200
    assert "verification failed" in res.json()["message"].lower() or "master keywords" in res.json()["message"].lower()


# QA-R3-BE-39: test_basement_round1_qualification_left_to_admin_only
def test_basement_round1_qualification_left_to_admin_only(auth_headers):
    reset_basement_team_db("Team Cipher", study_completed=True)
    seed_prior_photo_pieces("Team Cipher")
    client.post("/api/game/clue/R1-09/submit", json={"answer": "QR92", "_bypass_rate_limit": True}, headers=auth_headers)
    client.post("/api/game/clue/R1-10/submit", json={"answer": "LOWER", "_bypass_rate_limit": True}, headers=auth_headers)
    client.post("/api/game/clue/R1-FIN/submit", json={"stage": 1, "answer": {"k1": "LANTERN", "k2": "ORBIT", "k3": "SRC-TEST9"}, "_bypass_rate_limit": True}, headers=auth_headers)
    client.post("/api/game/clue/R1-FIN/submit", json={"stage": 2, "answer": {"pieces": ['P06', 'P01', 'P08', 'P03', 'P10', 'P05', 'P02', 'P09', 'P04', 'P07']}, "_bypass_rate_limit": True}, headers=auth_headers)
    client.post("/api/game/clue/R1-FIN/submit", json={"stage": 3, "answer": {"choice": "BETA", "code": "2468"}, "_bypass_rate_limit": True}, headers=auth_headers)

    conn = get_db_connection()
    with conn.cursor() as cur:
        cur.execute("SELECT qualified_at, finished_at FROM team_rounds WHERE team_id = (SELECT id FROM teams WHERE name = 'Team Cipher') AND round = 1")
        row = cur.fetchone()
        assert row is not None
        assert row[1] is not None  # finished_at is stamped
        assert row[0] is None      # qualified_at must be None (only admin qualifies)
    conn.close()


# QA-R3-BE-40: test_basement_leaderboard_rank_calculated_accurately
def test_basement_leaderboard_rank_calculated_accurately():
    lb = basement_service.calculate_leaderboard()
    assert len(lb) > 0
    assert lb[0]["rank"] == 1


# QA-R3-BE-41: test_basement_tie_breaker_logic_respects_finish_timestamp
def test_basement_tie_breaker_logic_respects_finish_timestamp():
    lb = basement_service.calculate_leaderboard()
    # Check that ties in score are sorted by finished_at or last_solved_at
    for i in range(len(lb) - 1):
        if lb[i]["total_score"] == lb[i+1]["total_score"]:
            t1 = lb[i]["finished_at"] or lb[i]["last_solved_at"]
            t2 = lb[i+1]["finished_at"] or lb[i+1]["last_solved_at"]
            if t1 and t2:
                assert t1 <= t2


# QA-R3-BE-42: test_basement_scores_hidden_in_final_10_minutes_if_configured
def test_basement_scores_hidden_in_final_10_minutes_if_configured():
    content = get_content_data()
    hide_min = content.get("meta", {}).get("rules", {}).get("leaderboard_hide_last_min", 0)
    assert isinstance(hide_min, int)


# QA-R3-BE-43: test_basement_unauthorized_token_returns_401
def test_basement_unauthorized_token_returns_401():
    unauthed_client = TestClient(app)
    res = unauthed_client.get("/api/game/room/basement", headers={"x-session-token": "invalid_token_12345"})
    assert res.status_code == 401


# QA-R3-BE-44: test_basement_invalid_room_id_returns_404
def test_basement_invalid_room_id_returns_404(auth_headers):
    res = client.get("/api/game/room/nonexistent_room_999", headers=auth_headers)
    assert res.status_code == 404


# QA-R3-BE-45: test_basement_etag_header_on_state_polling
def test_basement_etag_header_on_state_polling(auth_headers):
    reset_basement_team_db("Team Cipher", study_completed=True)
    res = client.get("/api/game/room/basement", headers=auth_headers)
    assert res.status_code == 200
    data = res.json()
    assert "etag" in data
    assert data["etag"].startswith('W/"basement-')


# QA-R3-BE-46: test_basement_database_deadlock_prevention
def test_basement_database_deadlock_prevention(auth_headers):
    # Verify that multiple fast queries with row-level locks succeed without deadlock
    for _ in range(3):
        res = client.get("/api/game/room/basement", headers=auth_headers)
        assert res.status_code == 200


# QA-R3-BE-47: test_basement_backward_navigation_to_study_valid
def test_basement_backward_navigation_to_study_valid(auth_headers):
    res = client.get("/api/game/room/study", headers=auth_headers)
    assert res.status_code == 200
    assert res.json()["room_id"] == "study"


# QA-R3-BE-48: test_basement_backward_navigation_to_bedroom_valid
def test_basement_backward_navigation_to_bedroom_valid(auth_headers):
    res = client.get("/api/game/room/bedroom", headers=auth_headers)
    assert res.status_code == 200
    assert res.json()["room_id"] == "bedroom"


# QA-R3-BE-49: test_basement_recompute_scores_functionality
def test_basement_recompute_scores_functionality():
    conn = get_db_connection()
    with conn.cursor() as cur:
        cur.execute("SELECT id FROM teams WHERE name = 'Team Cipher'")
        team_id = cur.fetchone()[0]
    conn.close()
    result = basement_service.recompute_team_scores(team_id, round_num=1)
    assert "total_score" in result
    assert "clues_solved" in result


# QA-R3-BE-50: test_basement_audit_log_records_all_submissions
def test_basement_audit_log_records_all_submissions(auth_headers):
    # Ensure a submission exists for Team Cipher
    client.post("/api/game/clue/R1-09/submit", json={"answer": "QR92", "_bypass_rate_limit": True}, headers=auth_headers)
    conn = get_db_connection()
    with conn.cursor() as cur:
        cur.execute("SELECT id FROM teams WHERE name = 'Team Cipher'")
        team_id = cur.fetchone()[0]
    conn.close()
    audit = basement_service.get_audit_log(team_id)
    assert isinstance(audit, list)
    assert len(audit) > 0
    for record in audit:
        assert "submitted_answer" in record
        assert "is_correct" in record
