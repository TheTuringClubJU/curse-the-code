"""PR #7 regressions: resolved clues open doors; only solves earn rewards."""

from concurrent.futures import ThreadPoolExecutor
from itertools import product
from threading import Barrier

import psycopg2
import pytest
from fastapi.testclient import TestClient

from app.game import study_service
from app.main import app

ANSWERS = {"R1-05": "ALPHA", "R1-06": "SIGNAL", "R1-07": "ORBIT", "R1-08": "SRC-TEST9"}


def resolve(team, clue_id, solved):
    for attempt in range(1 if solved else 3):
        response = team.submit(clue_id, ANSWERS[clue_id] if solved else "WRONG")
        assert response.status_code == 200
        data = response.json()
        assert data["correct"] is solved
        assert data["exhausted"] is (not solved and attempt == 2)
        assert (data["reward"] is not None) is solved
    return data


@pytest.mark.parametrize("outcomes", list(product((False, True), repeat=4)))
def test_every_solved_exhausted_combination_opens_exit_without_extra_rewards(
    ready, outcomes
):
    for index, (clue_id, solved) in enumerate(zip(ANSWERS, outcomes)):
        data = resolve(ready, clue_id, solved)
        assert data["room_completed"] is (index == 3)
        assert ready.state()["is_completed"] is (index == 3)
        assert ready.client.get("/api/game/room/basement").status_code == (
            200 if index == 3 else 403
        )

    expected_photos = ["P01", "P02", "P03", "P04"] + [
        f"P{index:02}" for index, solved in enumerate(outcomes, start=5) if solved
    ]
    state = ready.state()
    assert state["photo_piece_ids"] == expected_photos
    assert state["photo_pieces_collected"] == len(expected_photos)
    score = ready.sql(
        "SELECT * FROM team_rounds WHERE team_id = %s AND round = 1", ready.id
    )[0]
    assert score["total_score"] == 400 + 100 * sum(outcomes)
    assert score["clues_solved"] == 4 + sum(outcomes)
    assert score["finished_at"] is None and score["qualified_at"] is None
    for clue_id, solved in zip(ANSWERS, outcomes):
        progress = ready.progress(clue_id)[0]
        assert progress["solved"] is solved
        assert progress["attempts"] == (1 if solved else 3)
        assert progress["score"] == (100 if solved else 0)
        assert (progress["solved_at"] is not None) is solved
    audit = ready.sql("SELECT * FROM submissions WHERE team_id = %s", ready.id)
    assert len(audit) == sum(1 if solved else 3 for solved in outcomes)
    assert sum(row["points_awarded"] for row in audit) == 100 * sum(outcomes)
    assert (
        ready.client.post(
            "/api/game/room/basement/search", json={"object_id": "server_rack"}
        ).status_code
        == 200
    )
    # Entering Basement neither completes that room nor qualifies the team.
    assert ready.client.get("/api/game/room/basement").json()["is_completed"] is False

    before = ready.snapshot()
    for clue_id, solved in zip(ANSWERS, outcomes):
        data = ready.submit(clue_id, ANSWERS[clue_id]).json()
        assert data["room_completed"] is True
        assert data["correct"] is solved
        assert (data["reward"] is not None) is solved
    assert ready.snapshot() == before


@pytest.mark.parametrize("attempts", [0, 1, 2])
def test_unresolved_last_clue_keeps_door_locked(ready, attempts):
    for clue_id in list(ANSWERS)[:-1]:
        resolve(ready, clue_id, False)
    for _ in range(attempts):
        assert ready.submit("R1-08", "WRONG").json()["room_completed"] is False
    assert ready.state()["is_completed"] is False
    assert ready.client.get("/api/game/room/basement").status_code == 403


def test_completion_uses_each_clues_configured_attempt_limit(ready):
    for clue_id in list(ANSWERS)[:-1]:
        resolve(ready, clue_id, True)
    ready.clue("R1-08")["attempts_max"] = 2
    assert ready.submit("R1-08", "WRONG").json()["room_completed"] is False
    data = ready.submit("R1-08", "WRONG").json()
    assert data["exhausted"] is True and data["room_completed"] is True
    assert data["reward"] is None
    assert ready.state()["photo_pieces_collected"] == 7


def test_unlimited_clue_must_be_solved_and_never_exhausts(ready):
    for clue_id in list(ANSWERS)[:-1]:
        resolve(ready, clue_id, False)
    ready.clue("R1-08")["attempts_max"] = None
    for _ in range(4):
        response = ready.submit("R1-08", "WRONG")
        assert response.status_code == 200
        data = response.json()
        assert data["exhausted"] is False and data["room_completed"] is False
    assert ready.client.get("/api/game/room/basement").status_code == 403
    assert ready.submit("R1-08", ANSWERS["R1-08"]).json()["room_completed"] is True
    assert ready.state()["photo_piece_ids"] == ["P01", "P02", "P03", "P04", "P08"]


@pytest.mark.parametrize("recovery", ["refresh", "retry"])
def test_old_exhausted_progress_repairs_completion_without_new_attempts(
    ready, recovery
):
    # Model progress left by the old implementation, which never opened the door.
    for clue_id in ANSWERS:
        ready.sql(
            """INSERT INTO team_clues (team_id, clue_id, room_id, round, solved, attempts, score)
                     VALUES (%s, %s, 'study', 1, FALSE, 3, 0)""",
            ready.id,
            clue_id,
        )
    ready.sql(
        """INSERT INTO team_rooms (team_id, room_id, is_completed)
                 VALUES (%s, 'study', FALSE)""",
        ready.id,
    )
    before = ready.snapshot()
    if recovery == "refresh":
        assert ready.state()["is_completed"] is True
    else:
        data = ready.submit().json()
        assert data["room_completed"] is True and data["reward"] is None
    assert ready.client.get("/api/game/room/basement").status_code == 200
    after = ready.snapshot()
    for table in ("team_clues", "team_rounds", "submissions"):
        assert after[table] == before[table]
    assert ready.state()["photo_pieces_collected"] == 4


def test_parallel_last_wrong_attempts_unlock_once_without_rewards(ready):
    for clue_id in list(ANSWERS)[:-1]:
        resolve(ready, clue_id, False)
    for _ in range(2):
        ready.submit("R1-08", "WRONG")
    barrier = Barrier(4)

    def submit(_):
        with TestClient(app) as client:
            barrier.wait(timeout=10)
            return client.post(
                "/api/game/clue/R1-08/submit",
                json={"answer": "WRONG"},
                headers={"x-session-token": ready.token},
            )

    with ThreadPoolExecutor(max_workers=4) as executor:
        responses = list(executor.map(submit, range(4)))
    assert all(r.status_code == 200 and r.json()["room_completed"] for r in responses)
    assert all(r.json()["reward"] is None for r in responses)
    assert ready.progress("R1-08")[0]["attempts"] == 3
    assert (
        len(ready.sql("SELECT * FROM submissions WHERE team_id = %s", ready.id)) == 12
    )
    assert ready.state()["photo_pieces_collected"] == 4
    assert ready.client.get("/api/game/room/basement").status_code == 200


def test_completion_write_failure_rolls_back_final_exhausted_attempt(
    ready, monkeypatch
):
    for clue_id in list(ANSWERS)[:-1]:
        resolve(ready, clue_id, True)
    for _ in range(2):
        ready.submit("R1-08", "WRONG")
    before = ready.snapshot()
    connect = study_service.get_db_connection

    class FailingCursor:
        def __init__(self, cursor):
            self.cursor = cursor

        def __enter__(self):
            self.cursor.__enter__()
            return self

        def __exit__(self, *args):
            return self.cursor.__exit__(*args)

        def execute(self, sql, params=None):
            if "INSERT INTO team_rooms" in sql and "completed_at" in sql:
                raise psycopg2.OperationalError("injected completion write failure")
            return self.cursor.execute(sql, params)

        def __getattr__(self, name):
            return getattr(self.cursor, name)

    class FailingConnection:
        def __init__(self):
            self.conn = connect()

        def cursor(self, **kwargs):
            return FailingCursor(self.conn.cursor(**kwargs))

        def __getattr__(self, name):
            return getattr(self.conn, name)

    with monkeypatch.context() as patch:
        patch.setattr(study_service, "get_db_connection", FailingConnection)
        assert ready.submit("R1-08", "WRONG").status_code == 503
    assert ready.snapshot() == before
    assert ready.client.get("/api/game/room/basement").status_code == 403
    assert ready.submit("R1-08", "WRONG").json()["room_completed"] is True
