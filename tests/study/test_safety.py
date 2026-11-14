"""Additional regressions for trust boundaries, rollback and multi-device play.

The walkthrough here is an API integration test, not a browser/Three.js E2E test.
"""

import hashlib
import hmac
import os
import subprocess
import sys
from concurrent.futures import ThreadPoolExecutor
from threading import Barrier

import psycopg2
import pytest
from fastapi import HTTPException
from fastapi.testclient import TestClient

from app.game import study_service
from app.main import app


def test_unauthenticated_and_invalid_tokens_cannot_access_study(study):
    with TestClient(app) as client:
        for headers in ({}, {"x-session-token": "invalid-token"}):
            for response in (
                client.get("/api/game/room/study", headers=headers),
                client.post(
                    "/api/game/room/study/search",
                    json={"object_id": "window"},
                    headers=headers,
                ),
                client.post(
                    "/api/game/clue/R1-05/submit",
                    json={"answer": "WRONG"},
                    headers=headers,
                ),
            ):
                assert response.status_code == 401
    assert not study.progress()


@pytest.mark.parametrize("answer", [None, 42, True, [], {}, "", "   ", "X" * 61])
def test_invalid_answers_do_not_consume_attempts_or_write_data(ready, answer):
    before = ready.snapshot()
    assert ready.submit(answer=answer).status_code == 422
    assert ready.snapshot() == before


@pytest.mark.parametrize(
    "object_id", [None, [], {}, 42, "", "   ", "not-a-real-object"]
)
def test_invalid_searches_are_rejected_without_writes(study, object_id):
    before = study.snapshot()
    assert study.search(object_id).status_code in (400, 404, 422)
    assert study.snapshot() == before


def test_unknown_room_and_clue_return_404(study):
    assert study.client.get("/api/game/room/missing").status_code == 404
    assert (
        study.client.post(
            "/api/game/room/missing/search", json={"object_id": "window"}
        ).status_code
        == 404
    )
    assert study.submit("R1-MISSING", "WRONG").status_code == 404


def test_search_and_submission_cannot_target_another_team(ready, peer):
    before = peer.snapshot()
    response = ready.client.post(
        "/api/game/clue/R1-05/submit", json={"answer": "ALPHA", "team_id": peer.id}
    )
    assert response.status_code == 200 and response.json()["correct"] is True
    assert peer.snapshot() == before
    assert peer.state()["collected_fragment_ids"] == []
    assert peer.state()["photo_pieces_collected"] == 4


def test_strict_fragment_order_and_repeat_searches(study):
    before = study.snapshot()
    assert study.search("corkboard").json()["locked"] is True
    assert study.snapshot() == before
    assert study.search("bookshelf").json()["fragment_id"] == "ES01"
    assert study.search("corkboard").json()["fragment_id"] == "ES02"
    assert study.search("corkboard").json()["locked"] is True
    assert study.state()["collected_fragment_ids"] == ["ES01", "ES02"]


def test_shared_basement_chain_requires_bedroom_key_fragment(study):
    study.sql(
        "DELETE FROM team_fragments WHERE team_id = %s AND fragment_id = 'EK01'",
        study.id,
    )
    study.seed_fragments(study.room["evidence"][:12])
    assert study.search("reel_recorder").json()["locked"] is True
    bedroom = next(r for r in study.content["rooms"] if r["id"] == "bedroom")
    study.seed_fragments(
        [ev for ev in bedroom["evidence"] if ev["id"] == "EK01"], "bedroom"
    )
    assert study.search("reel_recorder").json()["fragment_id"] == "EK02"
    assert study.search("bookshelf").json()["fragment_id"] == "EK03"


def test_explicit_fragment_requirements_are_enforced(study):
    study.room["evidence"][0]["requires"]["fragments"] = ["XS01"]
    assert study.search("bookshelf").json()["locked"] is True
    assert study.search("window").json()["found"] is True
    assert study.search("bookshelf").json()["fragment_id"] == "ES01"


def test_unknown_fragment_rows_cannot_unlock_basket(study):
    study.seed_fragments([{"id": f"UNKNOWN-{i}"} for i in range(16)])
    assert study.state()["basket_unlocked"] is False
    assert study.state()["collected_fragment_ids"] == []
    assert study.submit().status_code == 409
    assert not study.progress()


def test_cooldown_is_shared_between_clues_without_sleeping(ready):
    ready.content["meta"]["rules"]["answer_cooldown_sec"] = 3
    assert ready.submit(answer="WRONG").status_code == 200
    before = ready.snapshot()
    response = ready.submit("R1-06", "SIGNAL")
    assert response.status_code == 429 and "Retry-After" in response.headers
    assert ready.snapshot() == before
    ready.sql(
        "UPDATE submissions SET created_at = NOW() - INTERVAL '4 seconds' WHERE team_id = %s",
        ready.id,
    )
    assert ready.submit("R1-06", "SIGNAL").json()["correct"] is True


def test_rate_limit_is_per_team_and_counts_previous_room_submissions(ready, peer):
    ready.sql(
        """INSERT INTO submissions (team_id, clue_id, submitted_answer, is_correct)
                 SELECT %s, 'R1-01', 'WRONG', FALSE FROM generate_series(1, 30)""",
        ready.id,
    )
    assert ready.submit().status_code == 429
    peer.seed_fragments()
    assert peer.submit().json()["correct"] is True


def test_plaintext_fallback_is_disabled_for_live_content(ready, monkeypatch):
    stage = ready.clue("R1-05")["stages"][0]
    stage["answer_hash"] = "0" * 64
    stage["answer_plain"] = ["ALPHA"]
    monkeypatch.setattr(study_service, "CONTENT_FILE", "content.live.json")
    assert ready.submit().json()["correct"] is False


def test_live_hash_verification_works_without_plain_answers(ready, monkeypatch):
    stage = ready.clue("R1-05")["stages"][0]
    stage.pop("answer_plain", None)
    stage["answer_hash"] = hmac.new(
        ready.content["meta"]["answer_salt"].encode(), b"R1-05:1:ALPHA", hashlib.sha256
    ).hexdigest()
    monkeypatch.setattr(study_service, "CONTENT_FILE", "content.live.json")
    assert ready.submit(answer="WRONG").json()["correct"] is False
    assert ready.submit().json()["correct"] is True


def test_hmac_alphanumeric_variant_accepts_source_without_hyphen(ready):
    stage = ready.clue("R1-08")["stages"][0]
    stage["answer_plain"] = []
    stage["answer_hash"] = hmac.new(
        ready.content["meta"]["answer_salt"].encode(),
        b"R1-08:1:SRCTEST9",
        hashlib.sha256,
    ).hexdigest()
    assert ready.submit("R1-08", "src-test9").json()["correct"] is True


def test_content_metadata_is_loaded_dynamically(study):
    study.room["title"] = "Study QA changed title"
    study.room["objects"].append(
        {"id": "new_prop", "label": "New prop", "kind": "decor", "visible": True}
    )
    state = study.state()
    assert state["title"] == "Study QA changed title" and len(state["objects"]) == 21
    assert study.search("new_prop").json()["found"] is False


def test_database_failure_after_submission_rolls_back_every_write(
    ready, monkeypatch, caplog
):
    before = ready.snapshot()

    def fail(*args):
        raise psycopg2.OperationalError("sensitive-database-sentinel")

    monkeypatch.setattr(study_service, "_recompute_score", fail)
    response = ready.submit()
    assert response.status_code == 503
    assert ready.snapshot() == before
    assert "sensitive-database-sentinel" not in response.text + caplog.text
    assert ready.content["meta"]["answer_salt"] not in response.text + caplog.text


def test_failure_after_pickup_rolls_back_fragment_and_unlock(study, monkeypatch):
    study.seed_fragments(study.room["evidence"][:-1])
    before = study.snapshot()

    def fail(*args):
        raise psycopg2.OperationalError("test transaction failure")

    monkeypatch.setattr(study_service, "_unlock_basket", fail)
    assert study.search("radiator").status_code == 503
    assert study.snapshot() == before


def test_unavailable_database_returns_503(ready, monkeypatch):
    monkeypatch.setattr(study_service, "get_db_connection", lambda: None)
    assert ready.client.get("/api/game/room/study").status_code == 503
    assert ready.search("window").status_code == 503
    assert ready.submit().status_code == 503


def test_disconnection_during_commit_preserves_safe_error_and_rolls_back(
    ready, monkeypatch
):
    before = ready.snapshot()
    connect = study_service.get_db_connection

    class BrokenCommit:
        def __init__(self):
            self.conn = connect()

        def cursor(self, **kwargs):
            return self.conn.cursor(**kwargs)

        def commit(self):
            raise psycopg2.OperationalError("sensitive-commit-error")

        def rollback(self):
            self.conn.rollback()
            raise psycopg2.OperationalError("sensitive-rollback-error")

        def close(self):
            self.conn.close()

    monkeypatch.setattr(study_service, "get_db_connection", BrokenCommit)
    response = ready.submit()
    assert response.status_code == 503
    assert "sensitive" not in response.text
    assert ready.snapshot() == before


@pytest.mark.parametrize(
    "database_url",
    [
        "postgresql://test:test@db.example.invalid/ctc_test",
        "postgresql://test:test@127.0.0.1/club_production",
        "postgresql://test:test@localhost/ctc_test?host=db.example.invalid",
        "postgresql://test:test@localhost/ctc_test?hostaddr=192.0.2.1",
        "postgresql://test:test@localhost/ctc_test?dbname=club_production",
    ],
)
def test_harness_rejects_unsafe_database_before_importing_seeders(database_url):
    result = subprocess.run(
        [
            sys.executable,
            "-m",
            "pytest",
            "--collect-only",
            "-q",
            "tests/study/test_study.py",
        ],
        env={
            **os.environ,
            "DATABASE_URL": database_url,
            "CONTENT_FILE": "content.test.json",
        },
        capture_output=True,
        check=False,
        text=True,
        timeout=30,
    )
    assert result.returncode == 4
    assert "Tests require local PostgreSQL" in result.stdout + result.stderr


def test_team_deleted_between_authentication_and_transaction_is_rejected(study):
    with pytest.raises(HTTPException) as exc:
        study_service.get_room_state(-1, study.content)
    assert exc.value.status_code == 401


def test_missing_study_content_returns_404(study):
    study.content["rooms"] = [r for r in study.content["rooms"] if r["id"] != "study"]
    assert study.client.get("/api/game/room/study").status_code == 404


def parallel_posts(team, path, payload, count=6):
    barrier = Barrier(count)

    def post(_):
        with TestClient(app) as client:
            barrier.wait(timeout=10)
            return client.post(
                path, json=payload, headers={"x-session-token": team.token}
            )

    with ThreadPoolExecutor(max_workers=count) as executor:
        return list(executor.map(post, range(count)))


def test_parallel_wrong_answers_stop_at_three_attempts(ready):
    responses = parallel_posts(
        ready, "/api/game/clue/R1-05/submit", {"answer": "WRONG"}
    )
    assert all(r.status_code == 200 for r in responses)
    assert ready.progress()[0]["attempts"] == 3
    assert len(ready.sql("SELECT * FROM submissions WHERE team_id = %s", ready.id)) == 3
    assert not ready.progress()[0]["solved"]


def test_parallel_searches_award_one_fragment(study):
    responses = parallel_posts(
        study, "/api/game/room/study/search", {"object_id": "window"}
    )
    assert all(r.status_code == 200 for r in responses)
    assert sum(r.json()["found"] for r in responses) == 1
    assert study.state()["collected_fragment_ids"] == ["XS01"]


def test_parallel_solves_of_distinct_clues_complete_the_room(ready):
    answers = [
        ("R1-05", "ALPHA"),
        ("R1-06", "SIGNAL"),
        ("R1-07", "ORBIT"),
        ("R1-08", "SRC-TEST9"),
    ]
    barrier = Barrier(4)

    def solve(item):
        clue_id, answer = item
        with TestClient(app) as client:
            barrier.wait(timeout=10)
            return client.post(
                f"/api/game/clue/{clue_id}/submit",
                json={"answer": answer, "_bypass_sequence": True},
                headers={"x-session-token": ready.token},
            )

    with ThreadPoolExecutor(max_workers=4) as executor:
        responses = list(executor.map(solve, answers))
    assert all(r.status_code == 200 and r.json()["correct"] for r in responses)
    assert sum(r.json()["room_completed"] for r in responses) == 1
    assert ready.state()["is_completed"] is True
    score = ready.sql(
        "SELECT * FROM team_rounds WHERE team_id = %s AND round = 1", ready.id
    )[0]
    assert score["total_score"] == 800 and score["clues_solved"] == 8


def test_api_walkthrough_bedroom_to_study_to_basement(study):
    # Remove fixture prerequisites, then earn them through the actual game API.
    for table in ("team_rooms", "team_fragments", "team_clues"):
        study.sql(f"DELETE FROM {table} WHERE team_id = %s", study.id)
    study.sql(
        "UPDATE team_rounds SET total_score = 0, clues_solved = 0 WHERE team_id = %s",
        study.id,
    )
    assert study.client.get("/api/game/room/study").status_code == 403
    bedroom = next(r for r in study.content["rooms"] if r["id"] == "bedroom")
    for ev in bedroom["evidence"]:
        response = study.client.post(
            "/api/game/room/bedroom/search",
            json={"object_id": ev["hiding"]["object_id"]},
        )
        assert response.status_code == 200 and response.json()["found"] is True
    for clue_id, answer in (
        ("R1-01", "LANTERN"),
        ("R1-02", "SUNRISE"),
        ("R1-03", "07/04/2001"),
        ("R1-04", "SHADOW"),
    ):
        assert study.submit(clue_id, answer).json()["correct"] is True
    assert study.state()["photo_pieces_collected"] == 4
    for ev in study.room["evidence"]:
        assert study.search(ev["hiding"]["object_id"]).json()["fragment_id"] == ev["id"]
    assert study.state()["basket_unlocked"] is True
    for clue_id, answer in (
        ("R1-05", "ALPHA"),
        ("R1-06", "SIGNAL"),
        ("R1-07", "ORBIT"),
        ("R1-08", "SRC-TEST9"),
    ):
        response = study.submit(clue_id, answer)
        assert response.status_code == 200 and response.json()["correct"] is True
    assert response.json()["room_completed"] is True
    assert study.state()["photo_pieces_collected"] == 8
    assert study.client.get("/api/game/room/basement").status_code == 200
