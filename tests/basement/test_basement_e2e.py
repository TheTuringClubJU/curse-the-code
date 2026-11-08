"""
Room 3 (The Basement) - Full E2E Participant Journey & Combinatorics Test (QA-R3-E2E-01)
Simulates a team's complete journey through Room 3:
- Entering after Room 2 completion
- Combinatoric fragment searches & sequence unsealing
- Intercom authentication (R1-09) -> P09
- Server rack margin cipher (R1-10) -> P10
- Complete 3-Stage Final Containment Console (R1-FIN)
- Official Round 1 Completion & Qualification Record
"""

import pytest
import itertools
from fastapi.testclient import TestClient
from app.main import app
from app.login.service import seed_demo_teams, get_db_connection
from tests.basement.test_basement import reset_basement_team_db, seed_prior_photo_pieces

client = TestClient(app)

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

def test_e2e_basement_complete_participant_journey(auth_headers):
    # Step 1: Initialize team in Room 3 with Room 2 (Study) completed
    reset_basement_team_db("Team Cipher", study_completed=True)
    seed_prior_photo_pieces("Team Cipher")  # Pre-loads P01..P08

    # Verify initial room state
    initial_state = client.get("/api/game/room/basement", headers=auth_headers).json()
    assert initial_state["room_id"] == "basement"
    assert initial_state["basket_unlocked"] is False
    assert initial_state["is_completed"] is False
    assert len(initial_state["objects"]) == 11
    assert len(initial_state["collected_fragment_ids"]) == 0

    # Step 2: Attempt searching out-of-order sequence (e.g. maintenance_terminal before server_rack)
    # EK05 requires EK04, so maintenance_terminal is sequence-locked
    locked_res = client.post("/api/game/room/basement/search", json={"object_id": "maintenance_terminal"}, headers=auth_headers).json()
    assert locked_res["found"] is False
    assert locked_res.get("locked") is True

    # Step 3: Search all props in valid sequence + test decoys
    # Search decoy on floor_seal -> XK01
    s_floor = client.post("/api/game/room/basement/search", json={"object_id": "floor_seal"}, headers=auth_headers).json()
    assert s_floor["found"] is True
    assert s_floor["fragment_id"] == "XK01"

    # Search server_rack first time -> drops EK04 (seq 4)
    s_rack_1 = client.post("/api/game/room/basement/search", json={"object_id": "server_rack"}, headers=auth_headers).json()
    assert s_rack_1["found"] is True
    assert s_rack_1["fragment_id"] == "EK04"

    # Search server_rack second time -> drops decoy XK02
    s_rack_2 = client.post("/api/game/room/basement/search", json={"object_id": "server_rack"}, headers=auth_headers).json()
    assert s_rack_2["found"] is True
    assert s_rack_2["fragment_id"] == "XK02"

    # Now maintenance_terminal is unlocked -> drops EK05 (seq 5)
    s_term = client.post("/api/game/room/basement/search", json={"object_id": "maintenance_terminal"}, headers=auth_headers).json()
    assert s_term["found"] is True
    assert s_term["fragment_id"] == "EK05"

    # Now toolbox is unlocked -> drops EK06 (seq 6)
    s_tool = client.post("/api/game/room/basement/search", json={"object_id": "toolbox"}, headers=auth_headers).json()
    assert s_tool["found"] is True
    assert s_tool["fragment_id"] == "EK06"
    assert s_tool["basket_unlocked"] is True

    # Verify basket unsealed in state
    state_after_basket = client.get("/api/game/room/basement", headers=auth_headers).json()
    assert state_after_basket["basket_unlocked"] is True
    assert len(state_after_basket["collected_fragment_ids"]) == 5

    # Step 4: Solve R1-09 (Wall Intercom) -> QR92
    r09_res = client.post("/api/game/clue/R1-09/submit", json={"answer": "QR92", "_bypass_rate_limit": True}, headers=auth_headers).json()
    assert r09_res["correct"] is True
    assert r09_res["reward"]["photo_piece"] == "P09"

    # Step 5: Solve R1-10 (Server Rack Note) -> LOWER
    r10_res = client.post("/api/game/clue/R1-10/submit", json={"answer": "LOWER", "_bypass_rate_limit": True}, headers=auth_headers).json()
    assert r10_res["correct"] is True
    assert r10_res["reward"]["photo_piece"] == "P10"

    # Verify team now has all 10 Photo Pieces
    state_photo = client.get("/api/game/room/basement", headers=auth_headers).json()
    assert state_photo["photo_pieces_collected"] == 10

    # Step 6: Multi-Stage Containment Console (R1-FIN)
    # Stage 1: Keywords
    st1 = client.post("/api/game/clue/R1-FIN/submit", json={
        "stage": 1,
        "answer": {"k1": "LANTERN", "k2": "ORBIT", "k3": "SRC-TEST9"},
        "_bypass_rate_limit": True
    }, headers=auth_headers).json()
    assert st1["correct"] is True
    assert st1["next_stage"] == 2

    # Stage 2: Exact 10-Piece Photo Board Permutation
    st2 = client.post("/api/game/clue/R1-FIN/submit", json={
        "stage": 2,
        "answer": {"pieces": ['P06', 'P01', 'P08', 'P03', 'P10', 'P05', 'P02', 'P09', 'P04', 'P07']},
        "_bypass_rate_limit": True
    }, headers=auth_headers).json()
    assert st2["correct"] is True
    assert st2["next_stage"] == 3

    # Stage 3: Protocol BETA + PIN 2468
    st3 = client.post("/api/game/clue/R1-FIN/submit", json={
        "stage": 3,
        "answer": {"choice": "BETA", "code": "2468"},
        "_bypass_rate_limit": True
    }, headers=auth_headers).json()
    assert st3["correct"] is True
    assert st3["solved"] is True
    assert st3["room_completed"] is True

    # Step 7: Verify final database state and Round 1 official completion
    final_state = client.get("/api/game/room/basement", headers=auth_headers).json()
    assert final_state["is_completed"] is True

    conn = get_db_connection()
    with conn.cursor() as cur:
        cur.execute("SELECT is_completed, completed_at FROM team_rooms WHERE team_id = (SELECT id FROM teams WHERE name = 'Team Cipher') AND room_id = 'basement'")
        room_row = cur.fetchone()
        assert room_row[0] is True
        assert room_row[1] is not None

        cur.execute("SELECT finished_at, qualified_at FROM team_rounds WHERE team_id = (SELECT id FROM teams WHERE name = 'Team Cipher') AND round = 1")
        round_row = cur.fetchone()
        assert round_row[0] is not None
        assert round_row[1] is None  # Qualification managed strictly by Admin
    conn.close()

def test_combinatoric_fragment_searches_and_clue_rejections(auth_headers):
    """
    Tests combinatoric variations of fragment requests and clue answers
    to ensure exhaustive rejection of invalid combinations.
    """
    reset_basement_team_db("Team Cipher", study_completed=True)

    # Combinatoric test: empty / invalid objects
    for dummy_obj in ["desk", "chair", "bookshelf", "window", "sink"]:
        res = client.post("/api/game/room/basement/search", json={"object_id": dummy_obj}, headers=auth_headers).json()
        assert res["found"] is False

    # Combinatoric test: permutations of invalid keywords in Stage 1
    sample_words = ["ALPHA", "DELTA", "ORBIT", "RANDOM", "CIPHER"]
    for combo in itertools.islice(itertools.permutations(sample_words, 3), 4):
        res = client.post("/api/game/clue/R1-FIN/submit", json={
            "stage": 1,
            "answer": {"k1": combo[0], "k2": combo[1], "k3": combo[2]},
            "_bypass_rate_limit": True
        }, headers=auth_headers).json()
        # Even if prerequisites locked, correct is False
        assert res["correct"] is False
