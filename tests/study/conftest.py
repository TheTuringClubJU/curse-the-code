"""Isolated real-PostgreSQL fixtures; no mocked authentication or SQL."""

import copy
import json
import uuid
from pathlib import Path

import bcrypt
import psycopg2
import pytest
from fastapi.testclient import TestClient
from psycopg2.extras import RealDictCursor

from app.config import DATABASE_URL
from app.game import routes
from app.main import app

TEST_CONTENT = json.loads(Path("content.test.json").read_text(encoding="utf-8"))


class StudyTeam:
    def __init__(self, content):
        self.content = content
        self.room = next(r for r in content["rooms"] if r["id"] == "study")
        self.id = None
        self.client = TestClient(app)
        self.name = f"Study QA {uuid.uuid4().hex[:16]}"
        hashed = bcrypt.hashpw(
            b"study-test-password", bcrypt.gensalt(rounds=4)
        ).decode()
        self.id = self.sql(
            "INSERT INTO teams (name, password_hash) VALUES (%s, %s) RETURNING id",
            self.name,
            hashed,
        )[0]["id"]
        login = self.client.post(
            "/api/auth/login",
            json={"team_name": self.name, "password": "study-test-password"},
        )
        assert login.status_code == 200
        self.token = login.cookies["team_session"]
        self.unlock_bedroom()

    def sql(self, statement, *params):
        conn = psycopg2.connect(DATABASE_URL)
        try:
            with conn, conn.cursor(cursor_factory=RealDictCursor) as cur:
                cur.execute(statement, params)
                return list(cur.fetchall()) if cur.description else []
        finally:
            conn.close()

    def unlock_bedroom(self):
        self.sql(
            """INSERT INTO team_rooms (team_id, room_id, is_completed) VALUES (%s, 'bedroom', TRUE)
                    ON CONFLICT (team_id, room_id) DO UPDATE SET is_completed = TRUE""",
            self.id,
        )
        bedroom = next(r for r in self.content["rooms"] if r["id"] == "bedroom")
        self.seed_fragments(bedroom["evidence"], "bedroom")
        for clue in self.content["clues"]:
            if clue.get("room") == "bedroom":
                self.sql(
                    """INSERT INTO team_clues (team_id, clue_id, room_id, round, solved, attempts, score, solved_at)
                            VALUES (%s, %s, 'bedroom', 1, TRUE, 1, 100, NOW()) ON CONFLICT DO NOTHING""",
                    self.id,
                    clue["id"],
                )
        self.sql(
            "UPDATE team_rounds SET total_score = 400, clues_solved = 4 WHERE team_id = %s AND round = 1",
            self.id,
        )

    def seed_fragments(self, evidence=None, room="study"):
        for ev in self.room["evidence"] if evidence is None else evidence:
            self.sql(
                """INSERT INTO team_fragments (team_id, room_id, fragment_id) VALUES (%s, %s, %s)
                        ON CONFLICT DO NOTHING""",
                self.id,
                room,
                ev["id"],
            )

    def state(self):
        response = self.client.get("/api/game/room/study")
        assert response.status_code == 200
        return response.json()

    def search(self, object_id):
        return self.client.post(
            "/api/game/room/study/search", json={"object_id": object_id}
        )

    def submit(self, clue_id="R1-05", answer="ALPHA"):
        return self.client.post(
            f"/api/game/clue/{clue_id}/submit", json={"answer": answer}
        )

    def clue(self, clue_id):
        return next(c for c in self.content["clues"] if c["id"] == clue_id)

    def progress(self, clue_id="R1-05"):
        return self.sql(
            "SELECT * FROM team_clues WHERE team_id = %s AND clue_id = %s",
            self.id,
            clue_id,
        )

    def snapshot(self):
        return {
            table: self.sql(f"SELECT * FROM {table} WHERE team_id = %s", self.id)
            for table in (
                "team_rooms",
                "team_fragments",
                "team_clues",
                "team_rounds",
                "submissions",
            )
        }

    def close(self):
        if self.id is not None:
            self.sql("DELETE FROM teams WHERE id = %s", self.id)
        self.client.close()


@pytest.fixture
def study(monkeypatch):
    content = copy.deepcopy(TEST_CONTENT)
    # Most tests exercise attempts without a wall-clock delay. The default
    # three-second cooldown is tested separately with timestamped database rows.
    content["meta"]["rules"]["answer_cooldown_sec"] = 0
    monkeypatch.setattr(routes, "get_content_data", lambda: content)
    team = StudyTeam(content)
    try:
        yield team
    finally:
        team.close()


@pytest.fixture
def ready(study):
    study.seed_fragments()
    return study


@pytest.fixture
def peer(study):
    team = StudyTeam(study.content)
    try:
        yield team
    finally:
        team.close()
