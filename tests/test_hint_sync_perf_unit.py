from unittest.mock import MagicMock, patch
from app.lobby.routes import get_content_data, _content_cache
from app.game import hint_service


def test_content_data_cache_reuses_parsed_json(tmp_path, monkeypatch):
    sample = tmp_path / "content.sample.json"
    sample.write_text('{"meta": {"event_name": "CTC"}, "rooms": []}', encoding="utf-8")

    _content_cache["path"] = None
    _content_cache["mtime"] = None
    _content_cache["data"] = None
    monkeypatch.setattr("app.lobby.routes.CONTENT_FILE", str(sample))

    first = get_content_data()
    second = get_content_data()
    assert first is second
    assert first["meta"]["event_name"] == "CTC"


def test_enrich_hint_status_separates_active_and_archived():
    cur = MagicMock()
    cur.fetchall.side_effect = [
        [
            {
                "id": 1,
                "room_id": "bedroom",
                "hint_category": "fragment",
                "target_id": "EB01",
                "penalty_seconds": 10,
                "hint_text": "Check trunk",
                "created_at": None,
            },
            {
                "id": 2,
                "room_id": "bedroom",
                "hint_category": "fragment",
                "target_id": "EB02",
                "penalty_seconds": 10,
                "hint_text": "Check nightstand",
                "created_at": None,
            },
            {
                "id": 3,
                "room_id": "bedroom",
                "hint_category": "clue",
                "target_id": "R1-01",
                "penalty_seconds": 30,
                "hint_text": "Diary shift",
                "created_at": None,
            },
        ],
        [
            {"room_id": "bedroom", "fragment_id": "EB01"},
        ],
        [
            {"clue_id": "R1-01", "solved": True, "attempts": 1},
        ],
    ]
    cur.fetchone.return_value = {"penalty_seconds": 50}

    content = {
        "rooms": [
            {
                "id": "bedroom",
                "evidence": [
                    {"id": "EB01", "display": {"title": "Trunk Note"}},
                    {"id": "EB02", "display": {"title": "Nightstand Note"}},
                ],
            }
        ],
        "clues": [
            {"id": "R1-01", "title": "Lena's Diary", "attempts_max": 3}
        ],
    }

    res = hint_service._enrich_hint_status(cur, team_id=42, target_round=1, content=content)
    assert res["hints_used"] == 3
    assert res["hints_remaining"] == 12
    assert res["total_penalty_seconds"] == 50
    assert [h["target_id"] for h in res["active_hints"]] == ["EB02"]
    assert [h["target_id"] for h in res["archived_hints"]] == ["EB01", "R1-01"]


def test_request_hint_handles_teammate_concurrent_insert_without_double_penalty():
    fake_cur = MagicMock()
    fake_conn = MagicMock()
    fake_conn.__enter__.return_value = fake_conn
    fake_conn.cursor.return_value.__enter__.return_value = fake_cur

    # Fast 2-query path:
    # 1. _fetch_hint_bundle -> empty state (race window)
    # 2. _atomic_insert_hint CTE -> inserted_hint=None (concurrent teammate won!)
    # 3. _fetch_hint_bundle re-fetch -> shows teammate's committed EB01 hint
    fake_cur.fetchone.side_effect = [
        {
            "total_penalty": 0,
            "hints": [],
            "fragments": [],
            "clues": [],
            "rooms": [],
        },
        {
            "inserted_hint": None,
            "new_total_penalty": None,
        },
        {
            "total_penalty": 10,
            "hints": [
                {
                    "id": 101,
                    "room_id": "bedroom",
                    "hint_category": "fragment",
                    "target_id": "EB01",
                    "penalty_seconds": 10,
                    "hint_text": "Check trunk",
                    "created_at": None,
                }
            ],
            "fragments": [],
            "clues": [],
            "rooms": [],
        },
    ]

    content = {
        "rooms": [
            {
                "id": "bedroom",
                "evidence": [{"id": "EB01", "locate_hint": "Check trunk"}],
            }
        ],
        "clues": [],
    }

    with patch("app.game.hint_service.get_content_data", return_value=content), \
         patch("app.game.hint_service.get_db_connection", return_value=fake_conn):
        res = hint_service.request_hint(team_id=77, room_id="bedroom")

    assert res["success"] is True
    assert res["is_free"] is True
    assert res["penalty_applied"] == 0
    assert res["target_id"] == "EB01"
    assert res["hints_used"] == 1
    assert res["total_penalty_seconds"] == 10
    assert fake_cur.execute.call_count == 3


def test_request_hint_new_unlock_executes_only_two_sql_roundtrips():
    fake_cur = MagicMock()
    fake_conn = MagicMock()
    fake_conn.__enter__.return_value = fake_conn
    fake_conn.cursor.return_value.__enter__.return_value = fake_cur

    fake_cur.fetchone.side_effect = [
        {
            "total_penalty": 0,
            "hints": [],
            "fragments": [],
            "clues": [],
            "rooms": [],
        },
        {
            "inserted_hint": {
                "id": 10,
                "room_id": "bedroom",
                "hint_category": "fragment",
                "target_id": "EB01",
                "penalty_seconds": 10,
                "hint_text": "Check the trunk.",
                "created_at": "2026-11-22T14:00:00Z",
            },
            "new_total_penalty": 10,
        },
    ]

    content = {
        "rooms": [
            {
                "id": "bedroom",
                "evidence": [{"id": "EB01", "locate_hint": "Check the trunk."}],
            }
        ],
        "clues": [],
    }

    with patch("app.game.hint_service.get_content_data", return_value=content), \
         patch("app.game.hint_service.get_db_connection", return_value=fake_conn):
        res = hint_service.request_hint(team_id=88, room_id="bedroom")

    assert res["success"] is True
    assert res["target_id"] == "EB01"
    assert res["hints_used"] == 1
    assert res["hints_remaining"] == 14
    assert res["total_penalty_seconds"] == 10
    assert len(res["active_hints"]) == 1
    # Only 2 SQL round-trips: 1 bundle read + 1 atomic CTE write (no redundant re-enrichment queries)
    assert fake_cur.execute.call_count == 2


def test_in_memory_hint_service_advances_fragments_and_status():
    from app.game import memory_store

    memory_store.IN_MEMORY_HINTS.clear()
    memory_store.IN_MEMORY_FRAGMENTS.clear()
    memory_store.IN_MEMORY_ROOMS.clear()
    memory_store.IN_MEMORY_CLUES.clear()
    memory_store.IN_MEMORY_ROUND_PENALTIES.clear()

    content = {
        "rooms": [
            {
                "id": "bedroom",
                "evidence": [
                    {"id": "EB01", "locate_hint": "Trunk hint"},
                    {"id": "EB02", "locate_hint": "Nightstand hint"},
                ],
            }
        ],
        "clues": [{"id": "R1-01", "title": "Lena's Diary", "attempts_max": 3}],
    }

    with patch("app.game.hint_service.get_content_data", return_value=content), \
         patch("app.game.hint_service.get_db_connection", return_value=None):
        r1 = hint_service.request_hint(team_id=55, room_id="bedroom")
        assert r1["target_id"] == "EB01"
        assert r1["hints_used"] == 1
        assert r1["total_penalty_seconds"] == 10

        # Collect EB01 -> next request must advance cleanly to EB02
        memory_store.IN_MEMORY_FRAGMENTS.append({"team_id": 55, "room_id": "bedroom", "fragment_id": "EB01"})
        r2 = hint_service.request_hint(team_id=55, room_id="bedroom")
        assert r2["target_id"] == "EB02"
        assert r2["hints_used"] == 2
        assert r2["total_penalty_seconds"] == 20
        assert [h["target_id"] for h in r2["archived_hints"]] == ["EB01"]
        assert [h["target_id"] for h in r2["active_hints"]] == ["EB02"]

        # Collect EB02 -> Phase 2 unlocks clue R1-01 (+30s)
        memory_store.IN_MEMORY_FRAGMENTS.append({"team_id": 55, "room_id": "bedroom", "fragment_id": "EB02"})
        r3 = hint_service.request_hint(team_id=55, room_id="bedroom")
        assert r3["target_id"] == "R1-01"
        assert r3["hint_category"] == "clue"
        assert r3["total_penalty_seconds"] == 50

        st = hint_service.get_hint_status(team_id=55, room_id="bedroom")
        assert st["hints_used"] == 3
        assert st["hints_remaining"] == 12
        assert [h["target_id"] for h in st["active_hints"]] == ["R1-01"]
        assert [h["target_id"] for h in st["archived_hints"]] == ["EB01", "EB02"]
