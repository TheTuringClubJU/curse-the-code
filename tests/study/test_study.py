"""The 50 backend checks listed as QA-R2-BE-01 through QA-R2-BE-50.

Each test owns a fresh team. Searches/submissions exercise FastAPI, real session
validation, and PostgreSQL; concurrency checks issue genuinely parallel requests.
"""

import hashlib
import hmac
from concurrent.futures import ThreadPoolExecutor
from threading import Barrier

from fastapi.testclient import TestClient

from app.main import app

ANSWERS = {"R1-05": "ALPHA", "R1-06": "SIGNAL", "R1-07": "ORBIT", "R1-08": "SRC-TEST9"}


def assert_drop(study, fragment_id):
    """Seed only preceding scraps; pick up the target via the real API."""
    evidence = study.room["evidence"]
    index = next(i for i, ev in enumerate(evidence) if ev["id"] == fragment_id)
    study.seed_fragments(evidence[:index])
    target = evidence[index]
    response = study.search(target["hiding"]["object_id"])
    assert response.status_code == 200
    assert response.json()["found"] is True
    assert response.json()["fragment_id"] == fragment_id
    saved = study.sql(
        "SELECT * FROM team_fragments WHERE team_id = %s AND fragment_id = %s",
        study.id,
        fragment_id,
    )
    assert len(saved) == 1 and saved[0]["room_id"] == "study"


def assert_hmac(ready, clue_id, raw=False):
    stage = ready.clue(clue_id)["stages"][0]
    stage["answer_plain"] = []  # A hash test must not silently pass via plaintext.
    answer = ANSWERS[clue_id]
    candidate = answer if raw else "".join(c for c in answer if c.isalnum())
    stage["answer_hash"] = hmac.new(
        ready.content["meta"]["answer_salt"].encode(),
        f"{clue_id}:1:{candidate}".encode(),
        hashlib.sha256,
    ).hexdigest()
    response = ready.submit(clue_id, answer)
    assert response.status_code == 200
    assert response.json()["correct"] is True
    assert ready.progress(clue_id)[0]["solved"] is True


def assert_plain(ready, clue_id):
    stage = ready.clue(clue_id)["stages"][0]
    stage["answer_hash"] = "0" * 64  # Prove the test-mode fallback is being used.
    stage["answer_plain"] = ["ANOTHER-TEST-VALUE", ANSWERS[clue_id]]
    response = ready.submit(clue_id, ANSWERS[clue_id])
    assert response.status_code == 200 and response.json()["correct"] is True


def assert_reward(ready, clue_id, piece):
    response = ready.submit(clue_id, ANSWERS[clue_id])
    assert response.status_code == 200
    assert response.json()["reward"]["photo_piece"] == piece
    assert ready.state()["photo_piece_ids"] == ["P01", "P02", "P03", "P04", piece]


def solve_all(ready):
    for clue_id, answer in ANSWERS.items():
        response = ready.submit(clue_id, answer)
        assert response.status_code == 200 and response.json()["correct"] is True
    return response.json()


# QA-R2-BE-01
def test_study_initial_state_locked_until_room1_completed(study):
    study.sql(
        "UPDATE team_rooms SET is_completed = FALSE WHERE team_id = %s AND room_id = 'bedroom'",
        study.id,
    )
    for response in (
        study.client.get("/api/game/room/study"),
        study.search("bookshelf"),
        study.submit(),
    ):
        assert response.status_code == 403
        assert response.json()["detail"]["code"] == "ROOM_LOCKED"
    assert not study.progress()
    study.unlock_bedroom()
    assert study.state()["basket_unlocked"] is False


# QA-R2-BE-02
def test_study_get_room_state_returns_20_objects(study):
    state = study.state()
    assert len(state["objects"]) == 20
    assert all(obj["visible"] for obj in state["objects"])
    assert len(state["clues"]) == 4
    assert state["total_fragments_in_room"] == 16
    assert state["is_completed"] is False
    assert all(not c["solved"] and c["attempts"] == 0 for c in state["clues"])


# QA-R2-BE-03 through QA-R2-BE-18: all scraps, including repeat props and decoys.
def test_study_search_bookshelf_drops_ES01(study):
    assert_drop(study, "ES01")


def test_study_search_corkboard_drops_ES02(study):
    assert_drop(study, "ES02")


def test_study_search_desk_blotter_drops_ES03(study):
    assert_drop(study, "ES03")


def test_study_search_filing_cabinet_drops_ES04(study):
    assert_drop(study, "ES04")


def test_study_search_sticky_wall_drops_ES05(study):
    assert_drop(study, "ES05")


def test_study_search_armchair_drops_ES06(study):
    assert_drop(study, "ES06")


def test_study_search_reel_recorder_drops_ES07(study):
    assert_drop(study, "ES07")


def test_study_search_cable_bundle_drops_ES08(study):
    assert_drop(study, "ES08")


def test_study_search_corkboard_second_spot_drops_ES09(study):
    assert_drop(study, "ES09")


def test_study_search_filing_cabinet_second_spot_drops_ES10(study):
    assert_drop(study, "ES10")


def test_study_search_floor_lamp_drops_ES11(study):
    assert_drop(study, "ES11")


def test_study_search_wastebin_drops_ES12(study):
    assert_drop(study, "ES12")


def test_study_search_reel_recorder_case_drops_EK02(study):
    assert_drop(study, "EK02")


def test_study_search_bookshelf_row_drops_EK03(study):
    assert_drop(study, "EK03")


def test_study_search_window_drops_decoy_XS01(study):
    assert_drop(study, "XS01")


def test_study_search_radiator_drops_decoy_XS02(study):
    assert_drop(study, "XS02")


# QA-R2-BE-19
def test_study_search_empty_returns_nothing_found(study):
    before = study.snapshot()
    response = study.search("desk")
    assert response.status_code == 200 and response.json()["found"] is False
    assert "nothing" in response.json()["message"].lower()
    assert study.snapshot() == before


# QA-R2-BE-20
def test_study_search_duplicate_returns_already_collected(study):
    assert study.search("window").json()["found"] is True
    before = study.snapshot()
    response = study.search("window")
    assert response.json()["already_collected"] is True
    assert response.json()["found"] is False
    assert study.snapshot() == before


# QA-R2-BE-21: real sequential API hunt, including returning to four props.
def test_study_basket_auto_unlocks_when_all_16_fragments_collected(study):
    for index, ev in enumerate(study.room["evidence"]):
        response = study.search(ev["hiding"]["object_id"])
        assert response.status_code == 200
        assert response.json()["fragment_id"] == ev["id"]
        assert response.json()["basket_unlocked"] is (index == 15)
    state = study.state()
    assert state["basket_unlocked"] is True and len(state["evidence"]) == 16
    assert all(not ev["is_wrapped"] for ev in state["evidence"])
    assert all(
        not row["is_wrapped"]
        for row in study.sql(
            "SELECT is_wrapped FROM team_fragments WHERE team_id = %s AND room_id = 'study'",
            study.id,
        )
    )


# QA-R2-BE-22
def test_study_basket_locked_when_15_of_16_collected(study):
    study.seed_fragments(study.room["evidence"][:-1])
    state = study.state()
    assert state["basket_unlocked"] is False
    assert len(state["evidence"]) == 15
    assert all(
        ev["is_wrapped"] and "secret" not in ev and "lines" not in ev["display"]
        for ev in state["evidence"]
    )
    before = study.snapshot()
    assert study.submit().status_code == 409
    assert study.snapshot() == before


# QA-R2-BE-23 through QA-R2-BE-35: hash-only and test plaintext paths separately.
def test_study_clue_R1_05_hmac_sha256_correct_answer(ready):
    assert_hmac(ready, "R1-05")


def test_study_clue_R1_05_plain_text_array_match_ALPHA(ready):
    assert_plain(ready, "R1-05")


def test_study_clue_R1_05_case_insensitive_handling(ready):
    assert ready.submit(answer="  aLpHa  ").json()["correct"] is True


def test_study_clue_R1_05_awards_photo_piece_P05(ready):
    assert_reward(ready, "R1-05", "P05")


def test_study_clue_R1_06_hmac_sha256_correct_answer(ready):
    assert_hmac(ready, "R1-06")


def test_study_clue_R1_06_plain_text_array_match_SIGNAL(ready):
    assert_plain(ready, "R1-06")


def test_study_clue_R1_06_awards_photo_piece_P06(ready):
    assert_reward(ready, "R1-06", "P06")


def test_study_clue_R1_07_hmac_sha256_correct_answer(ready):
    assert_hmac(ready, "R1-07")


def test_study_clue_R1_07_plain_text_array_match_ORBIT(ready):
    assert_plain(ready, "R1-07")


def test_study_clue_R1_07_awards_photo_piece_P07(ready):
    assert_reward(ready, "R1-07", "P07")


def test_study_clue_R1_08_hmac_sha256_correct_answer(ready):
    assert_hmac(ready, "R1-08", raw=True)


def test_study_clue_R1_08_plain_text_array_match_SRC_TEST9(ready):
    assert_plain(ready, "R1-08")


def test_study_clue_R1_08_awards_photo_piece_P08(ready):
    assert_reward(ready, "R1-08", "P08")


# QA-R2-BE-36
def test_study_clues_max_attempts_3_enforced(ready):
    for clue_id, answer in ANSWERS.items():
        for count in range(1, 4):
            response = ready.submit(clue_id, "WRONG")
            assert response.json()["attempts"] == count
            assert response.json()["exhausted"] is (count == 3)
        assert ready.submit(clue_id, answer).json()["exhausted"] is True
        assert ready.progress(clue_id)[0]["attempts"] == 3
    state = ready.state()
    assert state["is_completed"] is True
    assert state["photo_pieces_collected"] == 4
    assert state["photo_piece_ids"] == ["P01", "P02", "P03", "P04"]
    assert ready.client.get("/api/game/room/basement").status_code == 200


# QA-R2-BE-37
def test_study_clues_wrong_attempt_increments_count(ready):
    response = ready.submit(answer="WRONG")
    assert response.json()["attempts"] == 1 and response.json()["correct"] is False
    saved = ready.progress()[0]
    assert saved["attempts"] == 1 and saved["score"] == 0 and saved["solved_at"] is None
    audit = ready.sql("SELECT * FROM submissions WHERE team_id = %s", ready.id)
    assert len(audit) == 1 and audit[0]["is_correct"] is False


# QA-R2-BE-38
def test_study_clues_exhausted_rejects_further_answers(ready):
    for _ in range(3):
        ready.submit(answer="WRONG")
    before = ready.snapshot()
    for answer in ("ALPHA", "WRONG"):
        data = ready.submit(answer=answer).json()
        assert data["exhausted"] is True and data["correct"] is False
        assert data["reward"] is None and data["attempts"] == 3
    assert ready.snapshot() == before


# QA-R2-BE-39
def test_study_room_completion_flag_true_when_4_clues_solved(ready):
    for index, (clue_id, answer) in enumerate(ANSWERS.items()):
        data = ready.submit(clue_id, answer).json()
        assert data["room_completed"] is (index == 3)
    assert ready.state()["is_completed"] is True


# QA-R2-BE-40
def test_study_exit_door_unlatched_in_database_upon_completion(ready):
    assert ready.client.get("/api/game/room/basement").status_code == 403
    assert (
        ready.client.post(
            "/api/game/room/basement/search", json={"object_id": "server_rack"}
        ).status_code
        == 403
    )
    assert ready.submit("R1-09", "WRONG").status_code == 403
    solve_all(ready)
    row = ready.sql(
        "SELECT * FROM team_rooms WHERE team_id = %s AND room_id = 'study'", ready.id
    )[0]
    assert row["is_completed"] is True and row["completed_at"] is not None
    assert ready.client.get("/api/game/room/basement").status_code == 200
    ready.submit()
    assert (
        ready.sql(
            "SELECT completed_at FROM team_rooms WHERE team_id = %s AND room_id = 'study'",
            ready.id,
        )[0]["completed_at"]
        == row["completed_at"]
    )


# QA-R2-BE-41
def test_study_backward_door_persists_state_when_revisiting_bedroom(ready):
    before = ready.client.get("/api/game/room/bedroom").json()
    ready.submit()
    after = ready.client.get("/api/game/room/bedroom").json()
    for field in ("collected_fragment_ids", "clues", "is_completed", "basket_unlocked"):
        assert after[field] == before[field]
    assert ready.state()["clues"][0]["solved"] is True


# QA-R2-BE-42
def test_study_photo_pieces_accumulate_to_8_total(ready):
    assert ready.state()["photo_pieces_collected"] == 4
    solve_all(ready)
    assert ready.state()["photo_piece_ids"] == [f"P{i:02}" for i in range(1, 9)]
    assert ready.state()["photo_pieces_collected"] == 8
    ready.submit()
    assert ready.state()["photo_pieces_collected"] == 8


# QA-R2-BE-43: synchronize starts, verify records AND aggregate, not just HTTP 200.
def test_study_atomic_database_transactions_on_concurrent_submits(ready):
    barrier = Barrier(6)

    def submit():
        with TestClient(app) as client:
            barrier.wait(timeout=10)
            return client.post(
                "/api/game/clue/R1-05/submit",
                json={"answer": "ALPHA"},
                headers={"x-session-token": ready.token},
            )

    with ThreadPoolExecutor(max_workers=6) as executor:
        responses = list(executor.map(lambda _: submit(), range(6)))
    assert all(r.status_code == 200 and r.json()["correct"] for r in responses)
    assert sum(not r.json().get("already_solved", False) for r in responses) == 1
    assert ready.progress()[0]["attempts"] == 1
    assert len(ready.sql("SELECT * FROM submissions WHERE team_id = %s", ready.id)) == 1
    score = ready.sql(
        "SELECT * FROM team_rounds WHERE team_id = %s AND round = 1", ready.id
    )[0]
    assert score["total_score"] == 500 and score["clues_solved"] == 5


# QA-R2-BE-44
def test_study_rate_limit_enforced_across_study_clues(ready):
    ready.sql(
        """INSERT INTO submissions (team_id, clue_id, submitted_answer, is_correct)
                 SELECT %s, 'R1-06', 'WRONG', FALSE FROM generate_series(1, 30)""",
        ready.id,
    )
    before = ready.snapshot()
    response = ready.submit()
    assert response.status_code == 429 and int(response.headers["Retry-After"]) >= 1
    assert ready.snapshot() == before
    ready.sql(
        "UPDATE submissions SET created_at = NOW() - INTERVAL '61 seconds' WHERE team_id = %s",
        ready.id,
    )
    assert ready.submit().json()["correct"] is True


# QA-R2-BE-45
def test_study_security_no_passwords_or_hashes_in_json(ready):
    stage = ready.clue("R1-05")["stages"][0]
    stage["fields"][0]["answer_hash"] = "sentinel-hash"
    ready.clue("R1-05")["payload"]["nested"] = {
        "answer_plain": ["sentinel-answer"],
        "password": "sentinel-password",
    }
    state = ready.state()

    def check(value):
        if isinstance(value, dict):
            for key, child in value.items():
                assert (
                    not key.startswith(("answer_", "password")) and key != "token_hash"
                )
                check(child)
        elif isinstance(value, list):
            for child in value:
                check(child)

    check(state)
    assert "is_decoy" not in str(state)
    assert ready.content["meta"]["answer_salt"] not in str(state)


# QA-R2-BE-46 through QA-R2-BE-49
def test_study_custom_error_message_for_tablet_cipher(ready):
    assert "binary byte groups" in ready.submit(answer="WRONG").json()["message"]


def test_study_custom_error_message_for_email_cipher(ready):
    assert "base64 padding" in ready.submit("R1-06", "WRONG").json()["message"]


def test_study_custom_error_message_for_crash_dump(ready):
    assert "hex crash dump" in ready.submit("R1-07", "WRONG").json()["message"]


def test_study_custom_error_message_for_printer_log(ready):
    assert "timestamp timezone" in ready.submit("R1-08", "WRONG").json()["message"]


# QA-R2-BE-50
def test_study_recompute_score_accurately_reflects_all_solved_clues(ready):
    ready.sql(
        "UPDATE team_rounds SET total_score = 9999, clues_solved = 99 WHERE team_id = %s AND round = 1",
        ready.id,
    )
    ready.submit(answer="WRONG")
    solve_all(ready)
    score = ready.sql(
        "SELECT * FROM team_rounds WHERE team_id = %s AND round = 1", ready.id
    )[0]
    assert score["total_score"] == 800 and score["clues_solved"] == 8
    assert (
        score["last_solved_at"]
        == ready.sql(
            "SELECT MAX(solved_at) AS last FROM team_clues WHERE team_id = %s", ready.id
        )[0]["last"]
    )
