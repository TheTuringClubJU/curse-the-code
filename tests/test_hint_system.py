import pytest
from fastapi.testclient import TestClient
from app.main import app
from app.login.service import get_db_connection, hash_token
from psycopg2.extras import RealDictCursor

client = TestClient(app)

DEMO_TOKEN = "test_hint_session_token_123"
TEAM_ID = 99999


@pytest.fixture(autouse=True)
def setup_hint_test_team():
    with get_db_connection() as conn:
        with conn.cursor() as cur:
            # Ensure rounds exist
            cur.execute("INSERT INTO rounds (round, status) VALUES (1, 'live') ON CONFLICT (round) DO UPDATE SET status = 'live'")
            # Create or update test team
            cur.execute(
                """INSERT INTO teams (id, name, password_hash, members, contact)
                   VALUES (%s, 'Hint Test Team', 'hash', ARRAY['Alice']::text[], 'hint@test.com')
                   ON CONFLICT (id) DO UPDATE SET name = 'Hint Test Team'""",
                (TEAM_ID,),
            )
            cur.execute("DELETE FROM team_sessions WHERE team_id = %s", (TEAM_ID,))
            t_hash = hash_token(DEMO_TOKEN)
            cur.execute(
                """INSERT INTO team_sessions (team_id, token_hash, expires_at)
                   VALUES (%s, %s, NOW() + INTERVAL '1 day')""",
                (TEAM_ID, t_hash),
            )
            # Clean test team state
            cur.execute("DELETE FROM team_hints WHERE team_id = %s", (TEAM_ID,))
            cur.execute("DELETE FROM team_fragments WHERE team_id = %s", (TEAM_ID,))
            cur.execute("DELETE FROM team_clues WHERE team_id = %s", (TEAM_ID,))
            cur.execute("DELETE FROM team_rooms WHERE team_id = %s", (TEAM_ID,))
            cur.execute("DELETE FROM team_rounds WHERE team_id = %s", (TEAM_ID,))
            # Initialize round 1
            cur.execute(
                """INSERT INTO team_rounds (team_id, round, penalty_seconds, clues_solved, total_score)
                   VALUES (%s, 1, 0, 0, 0)
                   ON CONFLICT (team_id, round) DO UPDATE SET penalty_seconds = 0, clues_solved = 0, total_score = 0""",
                (TEAM_ID,),
            )
            conn.commit()
    yield
    with get_db_connection() as conn:
        with conn.cursor() as cur:
            cur.execute("DELETE FROM team_hints WHERE team_id = %s", (TEAM_ID,))
            cur.execute("DELETE FROM team_fragments WHERE team_id = %s", (TEAM_ID,))
            cur.execute("DELETE FROM team_clues WHERE team_id = %s", (TEAM_ID,))
            cur.execute("DELETE FROM team_rooms WHERE team_id = %s", (TEAM_ID,))
            cur.execute("DELETE FROM team_rounds WHERE team_id = %s", (TEAM_ID,))
            cur.execute("DELETE FROM team_sessions WHERE team_id = %s", (TEAM_ID,))
            cur.execute("DELETE FROM teams WHERE id = %s", (TEAM_ID,))
            conn.commit()


@pytest.fixture
def auth_headers():
    return {"x-session-token": DEMO_TOKEN}


def test_hint_status_initial(auth_headers):
    res = client.get("/api/game/hint/status", headers=auth_headers)
    assert res.status_code == 200
    data = res.json()
    assert data["total_budget"] == 15
    assert data["hints_used"] == 0
    assert data["hints_remaining"] == 15
    assert data["total_penalty_seconds"] == 0
    assert data["unlocked_hints"] == []


def test_phase1_fragment_hint_dispatches_sequential_and_applies_10s_penalty(auth_headers):
    # Team has 0 fragments in bedroom, request hint
    res = client.post("/api/game/hint", json={"room_id": "bedroom"}, headers=auth_headers)
    assert res.status_code == 200
    data = res.json()

    assert data["hint_category"] == "fragment"
    assert data["target_id"] == "EB01"
    assert "trunk" in data["hint_text"].lower()
    assert data["penalty_applied"] == 10
    assert data["is_free"] is False
    assert data["hints_used"] == 1
    assert data["hints_remaining"] == 14
    assert data["total_penalty_seconds"] == 10

    # Verify team_rounds penalty updated in DB
    with get_db_connection() as conn:
        with conn.cursor(cursor_factory=RealDictCursor) as cur:
            cur.execute("SELECT penalty_seconds FROM team_rounds WHERE team_id = %s AND round = 1", (TEAM_ID,))
            assert cur.fetchone()["penalty_seconds"] == 10


def test_free_reinspection_of_same_hint_costs_zero(auth_headers):
    # Request EB01 hint (+10s)
    res1 = client.post("/api/game/hint", json={"room_id": "bedroom"}, headers=auth_headers)
    assert res1.status_code == 200
    assert res1.json()["penalty_applied"] == 10

    # Request same hint again
    res2 = client.post("/api/game/hint", json={"room_id": "bedroom", "target_id": "EB01"}, headers=auth_headers)
    assert res2.status_code == 200
    data2 = res2.json()
    assert data2["target_id"] == "EB01"
    assert data2["penalty_applied"] == 0
    assert data2["is_free"] is True
    assert data2["hints_used"] == 1
    assert data2["hints_remaining"] == 14
    assert data2["total_penalty_seconds"] == 10


def test_phase2_clue_hint_when_basket_unlocked_applies_30s_penalty(auth_headers):
    # Unlock bedroom basket
    with get_db_connection() as conn:
        with conn.cursor() as cur:
            cur.execute(
                """INSERT INTO team_rooms (team_id, room_id, is_basket_unlocked)
                   VALUES (%s, 'bedroom', TRUE)
                   ON CONFLICT (team_id, room_id) DO UPDATE SET is_basket_unlocked = TRUE""",
                (TEAM_ID,),
            )
            conn.commit()

    # Request hint -> Phase 2 clue hint for R1-01
    res = client.post("/api/game/hint", json={"room_id": "bedroom"}, headers=auth_headers)
    assert res.status_code == 200
    data = res.json()

    assert data["hint_category"] == "clue"
    assert data["target_id"] == "R1-01"
    assert data["penalty_applied"] == 30
    assert data["is_free"] is False
    assert data["hints_used"] == 1
    assert data["hints_remaining"] == 14
    assert data["total_penalty_seconds"] == 30

    # Check rich details: location_prop, puzzle_type, guidance
    assert data["hint_details"] is not None
    assert "location_prop" in data["hint_details"]
    assert "puzzle_type" in data["hint_details"]
    assert "guidance" in data["hint_details"]
    assert "Caesar" in data["hint_details"]["puzzle_type"]


def test_phase2_advances_to_next_unsolved_clue(auth_headers):
    # Unlock bedroom basket and mark R1-01 solved
    with get_db_connection() as conn:
        with conn.cursor() as cur:
            cur.execute(
                """INSERT INTO team_rooms (team_id, room_id, is_basket_unlocked)
                   VALUES (%s, 'bedroom', TRUE)
                   ON CONFLICT (team_id, room_id) DO UPDATE SET is_basket_unlocked = TRUE""",
                (TEAM_ID,),
            )
            cur.execute(
                """INSERT INTO team_clues (team_id, round, clue_id, room_id, solved, attempts, score)
                   VALUES (%s, 1, 'R1-01', 'bedroom', TRUE, 1, 100)""",
                (TEAM_ID,),
            )
            conn.commit()

    # Hint should target R1-02
    res = client.post("/api/game/hint", json={"room_id": "bedroom"}, headers=auth_headers)
    assert res.status_code == 200
    data = res.json()
    assert data["hint_category"] == "clue"
    assert data["target_id"] == "R1-02"
    assert "Origami" in data["hint_details"]["puzzle_type"]


def test_tournament_hint_budget_exhaustion_at_15(auth_headers):
    # Seed 15 hints into team_hints
    with get_db_connection() as conn:
        with conn.cursor() as cur:
            for i in range(1, 16):
                cur.execute(
                    """INSERT INTO team_hints (team_id, round, room_id, hint_category, target_id, penalty_seconds, hint_text)
                       VALUES (%s, 1, 'bedroom', 'fragment', %s, 10, 'Test hint')""",
                    (TEAM_ID, f"FAKE_{i}"),
                )
            conn.commit()

    # 16th hint request must fail with 403 HINT_BUDGET_EXHAUSTED
    res = client.post("/api/game/hint", json={"room_id": "bedroom"}, headers=auth_headers)
    assert res.status_code == 403
    err = res.json()
    assert err["detail"]["code"] == "HINT_BUDGET_EXHAUSTED"
    assert "15/15" in err["detail"]["message"]

    # But re-inspection of an already unlocked hint still succeeds for 0 penalty!
    res_reinspect = client.post(
        "/api/game/hint",
        json={"room_id": "bedroom", "target_id": "FAKE_1"},
        headers=auth_headers,
    )
    assert res_reinspect.status_code == 200
    assert res_reinspect.json()["penalty_applied"] == 0
    assert res_reinspect.json()["is_free"] is True


def test_clue_hint_point_deduction_15_points_and_finale_30_points():
    """Verify clue hint deduction: 15 pts for standard clues, 30 pts for R1-FIN, 0 for clean solve."""
    from app.game.hint_service import get_clue_hint_point_deduction

    with get_db_connection() as conn:
        with conn.cursor() as cur:
            # Clean test team hints
            cur.execute("DELETE FROM team_hints WHERE team_id = %s", (TEAM_ID,))
            
            # No hints unlocked yet: 0.0 deduction
            assert get_clue_hint_point_deduction(cur, TEAM_ID, "R1-01") == 0.0
            assert get_clue_hint_point_deduction(cur, TEAM_ID, "R1-FIN") == 0.0

            # Unlock a fragment hint for EB01: should NOT deduct from clue points
            cur.execute(
                """INSERT INTO team_hints (team_id, round, room_id, hint_category, target_id, penalty_seconds, hint_text)
                   VALUES (%s, 1, 'bedroom', 'fragment', 'EB01', 10, 'Trunk hint')""",
                (TEAM_ID,),
            )
            assert get_clue_hint_point_deduction(cur, TEAM_ID, "R1-01") == 0.0

            # Unlock clue hint for R1-01: should deduct 15.0 pts
            cur.execute(
                """INSERT INTO team_hints (team_id, round, room_id, hint_category, target_id, penalty_seconds, hint_text)
                   VALUES (%s, 1, 'bedroom', 'clue', 'R1-01', 30, 'Diary hint')""",
                (TEAM_ID,),
            )
            assert get_clue_hint_point_deduction(cur, TEAM_ID, "R1-01") == 15.0
            assert get_clue_hint_point_deduction(cur, TEAM_ID, "R1-02") == 0.0

            # Unlock clue hint for R1-FIN: should deduct 30.0 pts
            cur.execute(
                """INSERT INTO team_hints (team_id, round, room_id, hint_category, target_id, penalty_seconds, hint_text)
                   VALUES (%s, 1, 'basement', 'clue', 'R1-FIN', 30, 'Containment terminal hint')""",
                (TEAM_ID,),
            )
            assert get_clue_hint_point_deduction(cur, TEAM_ID, "R1-FIN") == 30.0
            conn.commit()


def test_control_room_hint_phases_and_round2_penalty(auth_headers):
    """Verify Room 5 (control) supports Phase 1 fragment hints and Phase 2 R2 clue hints in Round 2."""
    with get_db_connection() as conn:
        with conn.cursor() as cur:
            cur.execute("DELETE FROM team_hints WHERE team_id = %s", (TEAM_ID,))
            cur.execute("DELETE FROM team_fragments WHERE team_id = %s AND room_id = 'control'", (TEAM_ID,))
            cur.execute("DELETE FROM team_rooms WHERE team_id = %s AND room_id = 'control'", (TEAM_ID,))
            cur.execute("DELETE FROM team_clues WHERE team_id = %s AND round = 2", (TEAM_ID,))
            cur.execute("UPDATE team_rounds SET penalty_seconds = 0 WHERE team_id = %s AND round = 2", (TEAM_ID,))
            conn.commit()

    # Phase 1: EC01 fragment hint (+10s in Round 2)
    res_p1 = client.post("/api/game/hint", json={"room_id": "control"}, headers=auth_headers)
    assert res_p1.status_code == 200
    d1 = res_p1.json()
    assert d1["hint_category"] == "fragment"
    assert d1["target_id"] == "EC01"
    assert d1["room_id"] == "control"
    assert d1["penalty_applied"] == 10

    status_res = client.get("/api/game/hint/status?room_id=control", headers=auth_headers)
    assert status_res.status_code == 200
    assert status_res.json()["hints_used"] == 1
    assert status_res.json()["total_penalty_seconds"] == 10

    # Unlock control basket -> Phase 2 clue hint for R2-01 (+30s)
    with get_db_connection() as conn:
        with conn.cursor() as cur:
            cur.execute(
                """INSERT INTO team_rooms (team_id, room_id, is_basket_unlocked)
                   VALUES (%s, 'control', TRUE)
                   ON CONFLICT (team_id, room_id) DO UPDATE SET is_basket_unlocked = TRUE""",
                (TEAM_ID,),
            )
            conn.commit()

    res_p2 = client.post("/api/game/hint", json={"room_id": "control"}, headers=auth_headers)
    assert res_p2.status_code == 200
    d2 = res_p2.json()
    assert d2["hint_category"] == "clue"
    assert d2["target_id"] == "R2-01"
    assert d2["penalty_applied"] == 30
    assert "Unix Epoch" in d2["hint_details"]["puzzle_type"]
    assert d2["total_penalty_seconds"] == 40


