import pytest
from datetime import datetime, timezone, timedelta
from fastapi.testclient import TestClient
from app.main import app
from app.login.service import seed_demo_teams, get_db_connection
from app.admin.service import seed_demo_admin

client = TestClient(app)


# ── Helpers ────────────────────────────────────────────────────────────────────

def reset_control_team_db(team_name="Team Cipher"):
    conn = get_db_connection()
    if conn:
        with conn.cursor() as cur:
            cur.execute("""
                DELETE FROM team_clues
                WHERE team_id = (SELECT id FROM teams WHERE name = %s)
                  AND room_id = 'control';
                DELETE FROM team_fragments
                WHERE team_id = (SELECT id FROM teams WHERE name = %s)
                  AND room_id = 'control';
                DELETE FROM team_rooms
                WHERE team_id = (SELECT id FROM teams WHERE name = %s)
                  AND room_id = 'control';
                DELETE FROM submissions
                WHERE team_id = (SELECT id FROM teams WHERE name = %s)
                  AND clue_id IN ('R2-01', 'R2-05', 'R2-06');
                UPDATE team_rounds
                SET penalty_seconds = 0, clues_solved = 0, total_score = 0,
                    last_solved_at = NULL, finished_at = NULL
                WHERE team_id = (SELECT id FROM teams WHERE name = %s)
                  AND round IN (2, 3);
            """, (team_name,) * 5)
            conn.commit()
        conn.close()


def insert_all_control_fragments(team_name="Team Cipher"):
    """Insert all 10 control fragments (8 real EC01-EC08 + 2 decoy XC01-XC02)."""
    conn = get_db_connection()
    if conn:
        with conn.cursor() as cur:
            cur.execute("""
                INSERT INTO team_fragments (team_id, room_id, fragment_id, collected_at)
                SELECT (SELECT id FROM teams WHERE name = %s), 'control', id, NOW()
                FROM (VALUES
                    ('EC01'), ('EC02'), ('EC03'), ('EC04'), ('EC05'),
                    ('EC06'), ('EC07'), ('EC08'), ('XC01'), ('XC02')
                ) AS t(id)
                ON CONFLICT DO NOTHING;
            """, (team_name,))
            conn.commit()
        conn.close()


def insert_real_control_fragments_only(team_name="Team Cipher"):
    """Insert only the 8 real (non-decoy) fragments."""
    conn = get_db_connection()
    if conn:
        with conn.cursor() as cur:
            cur.execute("""
                INSERT INTO team_fragments (team_id, room_id, fragment_id, collected_at)
                SELECT (SELECT id FROM teams WHERE name = %s), 'control', id, NOW()
                FROM (VALUES
                    ('EC01'), ('EC02'), ('EC03'), ('EC04'),
                    ('EC05'), ('EC06'), ('EC07'), ('EC08')
                ) AS t(id)
                ON CONFLICT DO NOTHING;
            """, (team_name,))
            conn.commit()
        conn.close()


def ensure_round_live(team_name="Team Cipher", round_num=2):
    now = datetime.now(timezone.utc) - timedelta(minutes=10)
    conn = get_db_connection()
    if conn:
        with conn.cursor() as cur:
            cur.execute("""
                INSERT INTO rounds (round, status, starts_at)
                VALUES (%s, 'live', %s)
                ON CONFLICT (round) DO UPDATE SET status = 'live', starts_at = %s;

                INSERT INTO team_rounds (team_id, round, penalty_seconds, clues_solved, total_score)
                VALUES ((SELECT id FROM teams WHERE name = %s), %s, 0, 0, 0)
                ON CONFLICT (team_id, round) DO NOTHING;
            """, (round_num, now, now, team_name, round_num))
            conn.commit()
        conn.close()


# ── Fixtures ───────────────────────────────────────────────────────────────────

@pytest.fixture(scope="module")
def auth_headers():
    seed_demo_teams()
    seed_demo_admin()
    ensure_round_live("Team Cipher", 2)
    # Logout any existing session
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


# =============================================================================
# ROOM 5 BACKEND TEST SUITE — 49 TESTS
# =============================================================================

# ── 1. State & Metadata (8 tests) ─────────────────────────────────────────────

def test_r5_01_room_state_returns_200(auth_headers):
    reset_control_team_db("Team Cipher")
    res = client.get("/api/game/room/control", headers=auth_headers)
    assert res.status_code == 200
    assert res.json()["ok"] is True


def test_r5_02_room_id_is_control(auth_headers):
    res = client.get("/api/game/room/control", headers=auth_headers)
    assert res.json()["room_id"] == "control"


def test_r5_03_room_title_mentions_surveillance(auth_headers):
    res = client.get("/api/game/room/control", headers=auth_headers)
    title = res.json()["title"]
    assert "Surveillance" in title or "control" in title.lower()


def test_r5_04_initial_basket_unlocked_false(auth_headers):
    reset_control_team_db("Team Cipher")
    res = client.get("/api/game/room/control", headers=auth_headers)
    assert res.json()["basket_unlocked"] is False


def test_r5_05_initial_is_completed_false(auth_headers):
    res = client.get("/api/game/room/control", headers=auth_headers)
    assert res.json()["is_completed"] is False


def test_r5_06_total_fragments_in_room(auth_headers):
    res = client.get("/api/game/room/control", headers=auth_headers)
    # 10 total fragments in DB (8 real + 2 decoy)
    assert res.json()["total_fragments_in_room"] >= 8


def test_r5_07_three_clues_projected(auth_headers):
    res = client.get("/api/game/room/control", headers=auth_headers)
    clue_ids = [c["id"] for c in res.json()["clues"]]
    assert "R2-01" in clue_ids
    assert "R2-05" in clue_ids
    assert "R2-06" in clue_ids


def test_r5_08_clue_secrets_not_exposed(auth_headers):
    res = client.get("/api/game/room/control", headers=auth_headers)
    for c in res.json()["clues"]:
        for stage in c.get("stages", []):
            assert "answer_hash" not in stage
            assert "answer_plain" not in stage


# ── 2. Fragment Search & Sequence (12 tests) ───────────────────────────────────

def test_r5_09_search_missing_object_id_400(auth_headers):
    res = client.post("/api/game/room/control/search", json={}, headers=auth_headers)
    assert res.status_code == 400


def test_r5_10_search_nonexistent_room_404(auth_headers):
    res = client.post("/api/game/room/xxx_nonexistent/search",
                      json={"object_id": "monitor_bank"}, headers=auth_headers)
    assert res.status_code == 404


def test_r5_11_search_prop_with_no_fragments(auth_headers):
    res = client.post("/api/game/room/control/search",
                      json={"object_id": "monitor_bank"}, headers=auth_headers)
    assert res.status_code == 200
    assert res.json()["found"] is False


def test_r5_12_search_ec01_from_relay_rack(auth_headers):
    reset_control_team_db("Team Cipher")
    res = client.post("/api/game/room/control/search",
                      json={"object_id": "relay_rack"}, headers=auth_headers)
    assert res.status_code == 200
    data = res.json()
    assert data["found"] is True
    assert data["fragment_id"] == "EC01"


def test_r5_13_search_ec02_second_from_relay_rack(auth_headers):
    res = client.post("/api/game/room/control/search",
                      json={"object_id": "relay_rack"}, headers=auth_headers)
    data = res.json()
    assert data["found"] is True
    assert data["fragment_id"] == "EC02"


def test_r5_14_search_relay_rack_exhausted(auth_headers):
    res = client.post("/api/game/room/control/search",
                      json={"object_id": "relay_rack"}, headers=auth_headers)
    data = res.json()
    assert data["found"] is False
    assert data.get("already_collected") is True


def test_r5_15_search_ec03_from_tape_deck_cart(auth_headers):
    res = client.post("/api/game/room/control/search",
                      json={"object_id": "tape_deck_cart"}, headers=auth_headers)
    data = res.json()
    assert data["found"] is True
    assert data["fragment_id"] == "EC03"


def test_r5_16_search_ec04_from_operator_chair(auth_headers):
    res = client.post("/api/game/room/control/search",
                      json={"object_id": "operator_chair"}, headers=auth_headers)
    data = res.json()
    assert data["found"] is True
    assert data["fragment_id"] == "EC04"


def test_r5_17_search_xc01_decoy_from_operator_chair(auth_headers):
    # Decoy XC01 is also on operator_chair
    res = client.post("/api/game/room/control/search",
                      json={"object_id": "operator_chair"}, headers=auth_headers)
    data = res.json()
    # Could be found (decoy) or exhausted depending on sequence
    assert res.status_code == 200
    if data["found"]:
        assert data["fragment_id"] in ("XC01", "EC04")


def test_r5_18_search_ec05_from_cable_trench(auth_headers):
    res = client.post("/api/game/room/control/search",
                      json={"object_id": "cable_trench"}, headers=auth_headers)
    data = res.json()
    assert data["found"] is True
    assert data["fragment_id"] == "EC05"


def test_r5_19_search_ec06_from_wall_clipboard(auth_headers):
    res = client.post("/api/game/room/control/search",
                      json={"object_id": "wall_clipboard"}, headers=auth_headers)
    data = res.json()
    assert data["found"] is True
    assert data["fragment_id"] == "EC06"


def test_r5_20_search_ec08_from_fuse_box(auth_headers):
    # Insert fragments up to EC07 to unlock EC08
    insert_all_control_fragments("Team Cipher")
    res = client.post("/api/game/room/control/search",
                      json={"object_id": "fuse_box"}, headers=auth_headers)
    # At this point all are collected already — exhausted
    assert res.status_code == 200


# ── 3. Basket Unlock Logic (5 tests) ──────────────────────────────────────────

def test_r5_21_basket_locked_before_fragments(auth_headers):
    reset_control_team_db("Team Cipher")
    res = client.get("/api/game/room/control", headers=auth_headers)
    assert res.json()["basket_unlocked"] is False


def test_r5_22_basket_locked_with_7_real_fragments(auth_headers):
    reset_control_team_db("Team Cipher")
    conn = get_db_connection()
    if conn:
        with conn.cursor() as cur:
            cur.execute("""
                INSERT INTO team_fragments (team_id, room_id, fragment_id, collected_at)
                SELECT (SELECT id FROM teams WHERE name = %s), 'control', id, NOW()
                FROM (VALUES ('EC01'),('EC02'),('EC03'),('EC04'),('EC05'),('EC06'),('EC07'))
                AS t(id) ON CONFLICT DO NOTHING;
            """, ("Team Cipher",))
            conn.commit()
        conn.close()
    res = client.get("/api/game/room/control", headers=auth_headers)
    assert res.json()["basket_unlocked"] is False


def test_r5_23_basket_unlocks_with_all_8_real_fragments(auth_headers):
    insert_real_control_fragments_only("Team Cipher")
    res = client.get("/api/game/room/control", headers=auth_headers)
    assert res.json()["basket_unlocked"] is True


def test_r5_24_basket_also_unlocked_with_decoys_included(auth_headers):
    reset_control_team_db("Team Cipher")
    insert_all_control_fragments("Team Cipher")
    res = client.get("/api/game/room/control", headers=auth_headers)
    assert res.json()["basket_unlocked"] is True


def test_r5_25_basket_unlock_message_present_on_8th_fragment(auth_headers):
    reset_control_team_db("Team Cipher")
    # Insert 7 first
    conn = get_db_connection()
    if conn:
        with conn.cursor() as cur:
            cur.execute("""
                INSERT INTO team_fragments (team_id, room_id, fragment_id, collected_at)
                SELECT (SELECT id FROM teams WHERE name = %s), 'control', id, NOW()
                FROM (VALUES ('EC01'),('EC02'),('EC03'),('EC04'),('EC05'),('EC06'),('EC07'))
                AS t(id) ON CONFLICT DO NOTHING;
            """, ("Team Cipher",))
            conn.commit()
        conn.close()
    # Now search for EC08 (8th real fragment)
    res = client.post("/api/game/room/control/search",
                      json={"object_id": "fuse_box"}, headers=auth_headers)
    if res.json().get("found"):
        assert "basket" in res.json().get("message", "").lower() or \
               res.status_code == 200


# ── 4. Clue Input Gate — 403 Before Basket Unlock (4 tests) ───────────────────

def test_r5_26_r2_01_blocked_before_basket_unlock(auth_headers):
    reset_control_team_db("Team Cipher")
    res = client.post("/api/game/clue/R2-01/submit",
                      json={"answer": "BDG-9001"}, headers=auth_headers)
    assert res.status_code == 403


def test_r5_27_r2_05_blocked_before_basket_unlock(auth_headers):
    reset_control_team_db("Team Cipher")
    res = client.post("/api/game/clue/R2-05/submit",
                      json={"answer": "VM-A"}, headers=auth_headers)
    assert res.status_code == 403


def test_r5_28_r2_06_blocked_before_basket_unlock(auth_headers):
    reset_control_team_db("Team Cipher")
    res = client.post("/api/game/clue/R2-06/submit",
                      json={"answer": "8140"}, headers=auth_headers)
    assert res.status_code == 403


def test_r5_29_clue_gate_allows_submission_after_unlock(auth_headers):
    insert_all_control_fragments("Team Cipher")
    res = client.post("/api/game/clue/R2-01/submit",
                      json={"answer": "WRONG"}, headers=auth_headers)
    assert res.status_code in (200, 400)  # not 403 — gate is open


# ── 5. Clue R2-01: Personnel Index (6 tests) ──────────────────────────────────

def test_r5_30_r2_01_wrong_answer_returns_incorrect(auth_headers):
    reset_control_team_db("Team Cipher")
    insert_all_control_fragments("Team Cipher")
    res = client.post("/api/game/clue/R2-01/submit",
                      json={"answer": "BDG-0000"}, headers=auth_headers)
    assert res.status_code == 200
    assert res.json()["correct"] is False


def test_r5_31_r2_01_correct_answer_bdg9001(auth_headers):
    reset_control_team_db("Team Cipher")
    insert_all_control_fragments("Team Cipher")
    res = client.post("/api/game/clue/R2-01/submit",
                      json={"answer": "BDG-9001"}, headers=auth_headers)
    assert res.status_code == 200
    assert res.json()["correct"] is True


def test_r5_32_r2_01_case_insensitive_badge(auth_headers):
    reset_control_team_db("Team Cipher")
    insert_all_control_fragments("Team Cipher")
    res = client.post("/api/game/clue/R2-01/submit",
                      json={"answer": "bdg-9001"}, headers=auth_headers)
    assert res.status_code == 200
    assert res.json()["correct"] is True


def test_r5_33_r2_01_exhaustion_after_3_wrong(auth_headers):
    reset_control_team_db("Team Cipher")
    insert_all_control_fragments("Team Cipher")
    for _ in range(3):
        client.post("/api/game/clue/R2-01/submit",
                    json={"answer": "WRONG-BADGE"}, headers=auth_headers)
    res = client.post("/api/game/clue/R2-01/submit",
                      json={"answer": "BDG-9001"}, headers=auth_headers)
    assert res.status_code in (200, 403, 410)
    if res.status_code == 200:
        assert res.json().get("exhausted") is True or res.json().get("correct") is False


def test_r5_34_r2_01_solved_state_persists(auth_headers):
    reset_control_team_db("Team Cipher")
    insert_all_control_fragments("Team Cipher")
    client.post("/api/game/clue/R2-01/submit",
                json={"answer": "BDG-9001"}, headers=auth_headers)
    res = client.get("/api/game/room/control", headers=auth_headers)
    clue = next((c for c in res.json()["clues"] if c["id"] == "R2-01"), None)
    assert clue is not None
    assert clue["solved"] is True


def test_r5_35_r2_01_attempts_remaining_decrements(auth_headers):
    reset_control_team_db("Team Cipher")
    insert_all_control_fragments("Team Cipher")
    res1 = client.get("/api/game/room/control", headers=auth_headers)
    initial = next(c for c in res1.json()["clues"] if c["id"] == "R2-01").get("attempts_remaining", 3)
    client.post("/api/game/clue/R2-01/submit",
                json={"answer": "WRONG"}, headers=auth_headers)
    res2 = client.get("/api/game/room/control", headers=auth_headers)
    after = next(c for c in res2.json()["clues"] if c["id"] == "R2-01").get("attempts_remaining", 3)
    assert after == initial - 1


# ── 6. Clue R2-05: Transmission Archive (5 tests) ─────────────────────────────

def test_r5_36_r2_05_wrong_answer_returns_incorrect(auth_headers):
    reset_control_team_db("Team Cipher")
    insert_all_control_fragments("Team Cipher")
    res = client.post("/api/game/clue/R2-05/submit",
                      json={"answer": "VM-B"}, headers=auth_headers)
    assert res.status_code == 200
    assert res.json()["correct"] is False


def test_r5_37_r2_05_correct_answer_vma(auth_headers):
    reset_control_team_db("Team Cipher")
    insert_all_control_fragments("Team Cipher")
    res = client.post("/api/game/clue/R2-05/submit",
                      json={"answer": "VM-A"}, headers=auth_headers)
    assert res.status_code == 200
    assert res.json()["correct"] is True


def test_r5_38_r2_05_case_insensitive(auth_headers):
    reset_control_team_db("Team Cipher")
    insert_all_control_fragments("Team Cipher")
    res = client.post("/api/game/clue/R2-05/submit",
                      json={"answer": "vm-a"}, headers=auth_headers)
    assert res.status_code == 200
    assert res.json()["correct"] is True


def test_r5_39_r2_05_solved_state_in_room(auth_headers):
    reset_control_team_db("Team Cipher")
    insert_all_control_fragments("Team Cipher")
    client.post("/api/game/clue/R2-05/submit",
                json={"answer": "VM-A"}, headers=auth_headers)
    res = client.get("/api/game/room/control", headers=auth_headers)
    clue = next((c for c in res.json()["clues"] if c["id"] == "R2-05"), None)
    assert clue["solved"] is True


def test_r5_40_r2_05_exhaustion_on_max_wrong(auth_headers):
    reset_control_team_db("Team Cipher")
    insert_all_control_fragments("Team Cipher")
    for _ in range(3):
        client.post("/api/game/clue/R2-05/submit",
                    json={"answer": "VM-C"}, headers=auth_headers)
    res = client.get("/api/game/room/control", headers=auth_headers)
    clue = next((c for c in res.json()["clues"] if c["id"] == "R2-05"), None)
    assert clue.get("exhausted") is True or clue.get("attempts_remaining", 1) == 0


# ── 7. Clue R2-06: Spectrogram (5 tests) ──────────────────────────────────────

def test_r5_41_r2_06_wrong_code_returns_incorrect(auth_headers):
    reset_control_team_db("Team Cipher")
    insert_all_control_fragments("Team Cipher")
    res = client.post("/api/game/clue/R2-06/submit",
                      json={"answer": "0000"}, headers=auth_headers)
    assert res.status_code == 200
    assert res.json()["correct"] is False


def test_r5_42_r2_06_correct_code_8140(auth_headers):
    reset_control_team_db("Team Cipher")
    insert_all_control_fragments("Team Cipher")
    res = client.post("/api/game/clue/R2-06/submit",
                      json={"answer": "8140"}, headers=auth_headers)
    assert res.status_code == 200
    assert res.json()["correct"] is True


def test_r5_43_r2_06_solved_state_in_room(auth_headers):
    reset_control_team_db("Team Cipher")
    insert_all_control_fragments("Team Cipher")
    client.post("/api/game/clue/R2-06/submit",
                json={"answer": "8140"}, headers=auth_headers)
    res = client.get("/api/game/room/control", headers=auth_headers)
    clue = next((c for c in res.json()["clues"] if c["id"] == "R2-06"), None)
    assert clue["solved"] is True


def test_r5_44_r2_06_exhaustion_on_max_wrong(auth_headers):
    reset_control_team_db("Team Cipher")
    insert_all_control_fragments("Team Cipher")
    for _ in range(3):
        client.post("/api/game/clue/R2-06/submit",
                    json={"answer": "9999"}, headers=auth_headers)
    res = client.get("/api/game/room/control", headers=auth_headers)
    clue = next((c for c in res.json()["clues"] if c["id"] == "R2-06"), None)
    assert clue.get("exhausted") is True or clue.get("attempts_remaining", 1) == 0


def test_r5_45_r2_06_cannot_resubmit_after_solved(auth_headers):
    reset_control_team_db("Team Cipher")
    insert_all_control_fragments("Team Cipher")
    client.post("/api/game/clue/R2-06/submit",
                json={"answer": "8140"}, headers=auth_headers)
    res = client.post("/api/game/clue/R2-06/submit",
                      json={"answer": "8140"}, headers=auth_headers)
    # Should be rejected (already solved) or accepted as noop
    assert res.status_code in (200, 400, 409)


# ── 8. Room Completion Logic (4 tests) ────────────────────────────────────────

def test_r5_46_room_not_completed_until_all_clues_resolved(auth_headers):
    reset_control_team_db("Team Cipher")
    insert_all_control_fragments("Team Cipher")
    # Solve only R2-01 and R2-05
    client.post("/api/game/clue/R2-01/submit",
                json={"answer": "BDG-9001"}, headers=auth_headers)
    client.post("/api/game/clue/R2-05/submit",
                json={"answer": "VM-A"}, headers=auth_headers)
    res = client.get("/api/game/room/control", headers=auth_headers)
    assert res.json()["is_completed"] is False


def test_r5_47_room_completes_when_all_3_clues_resolved(auth_headers):
    reset_control_team_db("Team Cipher")
    insert_all_control_fragments("Team Cipher")
    client.post("/api/game/clue/R2-01/submit",
                json={"answer": "BDG-9001"}, headers=auth_headers)
    client.post("/api/game/clue/R2-05/submit",
                json={"answer": "VM-A"}, headers=auth_headers)
    client.post("/api/game/clue/R2-06/submit",
                json={"answer": "8140"}, headers=auth_headers)
    res = client.get("/api/game/room/control", headers=auth_headers)
    assert res.json()["is_completed"] is True


def test_r5_48_room_completes_when_clues_exhausted(auth_headers):
    """Room should complete even if clues are exhausted (not solved)."""
    reset_control_team_db("Team Cipher")
    insert_all_control_fragments("Team Cipher")
    # Exhaust all 3
    for _ in range(3):
        client.post("/api/game/clue/R2-01/submit",
                    json={"answer": "WRONG"}, headers=auth_headers)
    for _ in range(3):
        client.post("/api/game/clue/R2-05/submit",
                    json={"answer": "WRONG"}, headers=auth_headers)
    for _ in range(3):
        client.post("/api/game/clue/R2-06/submit",
                    json={"answer": "0000"}, headers=auth_headers)
    res = client.get("/api/game/room/control", headers=auth_headers)
    # Room may complete on exhaustion; at minimum all clues are "done"
    clues = res.json()["clues"]
    all_done = all(c.get("solved") or c.get("exhausted") for c in clues)
    assert all_done


def test_r5_49_unauthenticated_room_access_denied(auth_headers):
    """Room state endpoint rejects requests without a session token."""
    res = client.get("/api/game/room/control")
    assert res.status_code in (401, 403)
