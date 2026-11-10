"""Daniel's Study: content-driven rules and atomic, team-scoped persistence.

Keep the existing game API contract so the Study frontend can reuse Room 1's
modals. All mutations for one team lock the same existing teams row, including
the first request before any progress rows exist. Other teams remain independent.
"""

import hashlib
import hmac
import logging
import math
from contextlib import contextmanager
from pathlib import Path

import psycopg2
from fastapi import HTTPException
from psycopg2.extras import RealDictCursor

from app.config import CONTENT_FILE
from app.db import get_db_connection
from app.game import hint_service

logger = logging.getLogger(__name__)
ROOM_ID = "study"
SUBMISSIONS_PER_MINUTE = 30

FAILURE_MESSAGES = {
    "tablet_drawer": "Incorrect passcode. Check your binary byte groups.",
    "crt_monitor": "Incorrect word. Check the base64 padding and fragment order.",
    "terminal_pc": "Incorrect process. Decode the hex crash dump and identify the halted process.",
    "line_printer": "Incorrect source. Verify the timestamp timezone and compare the login, token and policy sheets.",
}


def _rollback(conn):
    try:
        conn.rollback()
    except psycopg2.Error:
        # A dropped socket may also make rollback fail. Preserve the safe 503
        # response instead of exposing a second database exception.
        pass


@contextmanager
def _transaction(team_id):
    conn = get_db_connection()
    if conn is None:
        raise HTTPException(503, "Game storage is temporarily unavailable.")
    try:
        with conn.cursor(cursor_factory=RealDictCursor) as cur:
            cur.execute(
                "SELECT id FROM teams WHERE id = %s AND is_active = TRUE FOR UPDATE",
                (team_id,),
            )
            if cur.fetchone() is None:
                raise HTTPException(401, "Invalid team session.")
            yield cur
        conn.commit()
    except psycopg2.Error:
        _rollback(conn)
        # Do not log SQL parameters, submitted answers, salts or connection strings.
        logger.error("Study transaction failed; changes rolled back.")
        raise HTTPException(503, "Game storage is temporarily unavailable.") from None
    except BaseException:
        _rollback(conn)
        raise
    finally:
        conn.close()


def _room(content):
    room = next((r for r in content.get("rooms", []) if r["id"] == ROOM_ID), None)
    if room is None:
        raise HTTPException(404, "Room not found")
    return room


def _require_access(cur, team_id, room):
    required = room.get("unlock", {}).get("all_clues_resolved", [])
    if required:
        cur.execute(
            "SELECT room_id FROM team_rooms WHERE team_id = %s AND is_completed = TRUE",
            (team_id,),
        )
        completed = {row["room_id"] for row in cur.fetchall()}
        if not set(required).issubset(completed):
            raise HTTPException(
                403,
                detail={
                    "code": "ROOM_LOCKED",
                    "message": "Complete the previous room first.",
                },
            )


def check_room_access(team_id, room):
    """Enforce the Study exit prerequisite on the existing Basement routes too."""
    with _transaction(team_id) as cur:
        _require_access(cur, team_id, room)


def _fragments(cur, team_id):
    cur.execute(
        "SELECT room_id, fragment_id FROM team_fragments WHERE team_id = %s ORDER BY collected_at, fragment_id",
        (team_id,),
    )
    return cur.fetchall()


def _unlock_basket(cur, team_id, room, collected):
    required = {ev["id"] for ev in room.get("evidence", [])}
    unlocked = bool(required) and required.issubset(collected)
    if unlocked:
        cur.execute(
            """INSERT INTO team_rooms (team_id, room_id, is_basket_unlocked)
               VALUES (%s, %s, TRUE)
               ON CONFLICT (team_id, room_id) DO UPDATE SET is_basket_unlocked = TRUE""",
            (team_id, ROOM_ID),
        )
        cur.execute(
            "UPDATE team_fragments SET is_wrapped = FALSE WHERE team_id = %s AND room_id = %s AND is_wrapped = TRUE",
            (team_id, ROOM_ID),
        )
    return unlocked


def _public(value):
    """Strip verification material even when nested in a content payload/asset."""
    if isinstance(value, dict):
        return {
            k: _public(v)
            for k, v in value.items()
            if not k.startswith(("answer_", "password"))
            and k not in {"secret", "solution", "token_hash"}
        }
    if isinstance(value, list):
        return [_public(v) for v in value]
    return value


def _photo_pieces(content, solved_ids):
    return list(
        dict.fromkeys(
            c["reward"]["photo_piece"]
            for c in content.get("clues", [])
            if c["id"] in solved_ids and c.get("reward", {}).get("photo_piece")
        )
    )


def get_room_state(team_id, content):
    room = _room(content)
    with _transaction(team_id) as cur:
        _require_access(cur, team_id, room)
        collected = {
            f["fragment_id"]
            for f in _fragments(cur, team_id)
            if f["room_id"] == ROOM_ID
        }
        basket_unlocked = _unlock_basket(cur, team_id, room, collected)
        # Repair progress left incomplete by the former all-solved rule.
        _update_room_completion(
            cur,
            team_id,
            [c for c in content.get("clues", []) if c.get("room") == ROOM_ID],
        )
        cur.execute(
            "SELECT is_completed FROM team_rooms WHERE team_id = %s AND room_id = %s",
            (team_id, ROOM_ID),
        )
        status = cur.fetchone()
        cur.execute(
            "SELECT clue_id, solved, attempts, score FROM team_clues WHERE team_id = %s",
            (team_id,),
        )
        progress = {r["clue_id"]: r for r in cur.fetchall()}

    clues = []
    STUDY_CLUES = ["R1-05", "R1-06", "R1-07", "R1-08"]
    for clue in content.get("clues", []):
        if clue.get("room") != ROOM_ID:
            continue
        saved = progress.get(clue["id"], {"solved": False, "attempts": 0})
        
        is_locked = False
        lock_reason = None
        if not basket_unlocked:
            is_locked = True
            lock_reason = "Find and recover all room fragments to unlock the evidence basket first."
        elif clue["id"] in STUDY_CLUES:
            c_idx = STUDY_CLUES.index(clue["id"])
            if c_idx > 0:
                prev_id = STUDY_CLUES[c_idx - 1]
                prev_saved = progress.get(prev_id, {})
                prev_def = next((c for c in content.get("clues", []) if c["id"] == prev_id), {})
                prev_max = prev_def.get("attempts_max", 3)
                prev_resolved = bool(prev_saved.get("solved") or (prev_max is not None and prev_saved.get("attempts", 0) >= prev_max))
                if not prev_resolved:
                    is_locked = True
                    lock_reason = f"Previous clue '{prev_id}' in this sequence must be solved first."

        clues.append(
            {
                **{
                    key: _public(clue.get(key, default))
                    for key, default in (
                        ("id", ""),
                        ("title", ""),
                        ("object_id", None),
                        ("scene_text", ""),
                        ("assembly", None),
                        ("payload", {}),
                        ("assets", []),
                    )
                },
                "solved": saved["solved"],
                "attempts": saved["attempts"],
                "attempts_max": clue.get("attempts_max", 3),
                "is_locked": is_locked,
                "lock_reason": lock_reason,
                "solution_method": clue.get("solution", {}).get("method"),
                "stages": [
                    {
                        k: _public(s.get(k, default))
                        for k, default in (
                            ("index", 1),
                            ("type", "fields"),
                            ("prompt", ""),
                            ("fields", []),
                        )
                    }
                    for s in clue.get("stages", [])
                ],
            }
        )
    evidence = []
    for ev in room.get("evidence", []):
        if ev["id"] not in collected:
            continue
        if basket_unlocked:
            evidence.append(
                {
                    "id": ev["id"],
                    "clue_id": ev.get("clue_id"),
                    "part": ev.get("part"),
                    "is_wrapped": False,
                    "display": _public(ev.get("display", {})),
                    # These are the recoverable puzzle scraps, never verification data.
                    "secret": {
                        k: _public(v)
                        for k, v in ev.get("secret", {}).items()
                        if k in {"chunk", "note"}
                    },
                }
            )
        else:
            evidence.append(
                {
                    "id": ev["id"],
                    "is_wrapped": True,
                    "display": {
                        "title": "Wrapped Fragment",
                        "style": _public(ev.get("display", {}).get("style", {})),
                    },
                }
            )
    photos = _photo_pieces(
        content, {cid for cid, row in progress.items() if row["solved"]}
    )
    return {
        "ok": True,
        "room_id": ROOM_ID,
        "title": room.get("title", ""),
        "theme": _public(room.get("theme", {})),
        "ambient": _public(room.get("ambient", {})),
        "objects": [
            {
                "id": obj["id"],
                "label": obj.get("label") or obj.get("name") or obj["id"],
                "kind": obj.get("kind", "hiding"),
                "clue_id": obj.get("clue_id"),
                "visible": bool(obj.get("visible", True)),
            }
            for obj in room.get("objects", [])
        ],
        "collected_fragment_ids": [
            ev["id"] for ev in room.get("evidence", []) if ev["id"] in collected
        ],
        "total_fragments_in_room": len(room.get("evidence", [])),
        "basket_unlocked": basket_unlocked,
        "is_completed": bool(status and status["is_completed"]),
        "clues": clues,
        "evidence": evidence,
        "photo_pieces_collected": len(photos),
        "photo_piece_ids": photos,
    }


def search_object(team_id, content, object_id):
    if not isinstance(object_id, str) or not object_id.strip():
        raise HTTPException(422, "object_id must be a nonempty string.")
    room = _room(content)
    if object_id not in {obj["id"] for obj in room.get("objects", [])}:
        raise HTTPException(404, "Object not found")
    with _transaction(team_id) as cur:
        _require_access(cur, team_id, room)
        fragments = _fragments(cur, team_id)
        collected = {f["fragment_id"] for f in fragments}
        attached = [
            ev
            for ev in room.get("evidence", [])
            if ev.get("hiding", {}).get("object_id") == object_id
        ]
        if not attached:
            return {
                "found": False,
                "message": "You search carefully, but find nothing hidden here.",
            }
        pending = [ev for ev in attached if ev["id"] not in collected]
        if not pending:
            return {
                "found": False,
                "already_collected": True,
                "message": "You have already collected every fragment here.",
            }
        all_evidence = [
            ev for r in content.get("rooms", []) for ev in r.get("evidence", [])
        ]
        target = None
        for ev in pending:
            needed = set(ev.get("requires", {}).get("fragments", []))
            if ev.get("chain") and ev.get("seq") is not None:
                needed.update(
                    prev["id"]
                    for prev in all_evidence
                    if prev.get("chain") == ev["chain"]
                    and prev.get("seq") is not None
                    and prev["seq"] < ev["seq"]
                )
            if needed.issubset(collected):
                target = ev
                break
        if target is None:
            return {
                "found": False,
                "locked": True,
                "message": "Locked for now. Follow the investigation trail in order.",
            }
        cur.execute(
            """INSERT INTO team_fragments (team_id, room_id, fragment_id, is_wrapped)
               VALUES (%s, %s, %s, TRUE)""",
            (team_id, ROOM_ID, target["id"]),
        )
        collected_in_room = {
            f["fragment_id"] for f in fragments if f["room_id"] == ROOM_ID
        } | {target["id"]}
        basket_unlocked = _unlock_basket(cur, team_id, room, collected_in_room)
        if basket_unlocked:
            cur.execute(
                """INSERT INTO team_clues (team_id, round, clue_id, room_id, is_unlocked, unlocked_at)
                   VALUES (%s, 1, 'R1-05', %s, TRUE, NOW())
                   ON CONFLICT (team_id, clue_id) DO UPDATE SET is_unlocked = TRUE, unlocked_at = COALESCE(team_clues.unlocked_at, NOW())""",
                (team_id, ROOM_ID),
            )
        return {
            "found": True,
            "fragment_id": target["id"],
            "message": "You discovered a wrapped fragment! It has been placed in your basket.",
            "total_collected": len(
                {ev["id"] for ev in room["evidence"]} & collected_in_room
            ),
            "total_in_room": len(room["evidence"]),
            "basket_unlocked": basket_unlocked,
        }


def _normalize(answer, rule):
    if rule == "digits":
        return "".join(c for c in answer if c.isdigit())
    if rule == "alnum":
        return "".join(c for c in answer.upper() if c.isalnum())
    return answer.strip().upper()


def _verify_answer(content, clue, answer):
    stage = clue["stages"][0]
    rule = stage.get("fields", [{}])[0].get("normalize", "alnum")
    normalized = _normalize(answer, rule)
    expected = stage.get("answer_hash")
    salt = content.get("meta", {}).get("answer_salt")
    if expected and salt:
        for candidate in (normalized, answer.strip().upper()):
            message = f"{clue['id']}:{stage['index']}:{candidate}".encode()
            calculated = hmac.new(
                salt.encode("utf-8"), message, hashlib.sha256
            ).hexdigest()
            if hmac.compare_digest(calculated, expected):
                return True
    # Plain answers are a development fallback only, never a live-content bypass.
    test_mode = (
        Path(CONTENT_FILE).name == "content.test.json"
        and content.get("meta", {}).get("pack_label") == "test"
    )
    if test_mode:
        return any(
            normalized == _normalize(p, rule)
            for p in stage.get("answer_plain", [])
            if isinstance(p, str)
        )
    return False


def _check_rate_limit(cur, team_id, content):
    cur.execute(
        """SELECT COUNT(*) AS count,
                  EXTRACT(EPOCH FROM (clock_timestamp() - MAX(created_at))) AS elapsed,
                  EXTRACT(EPOCH FROM (clock_timestamp() - MIN(created_at))) AS oldest
           FROM submissions WHERE team_id = %s AND created_at > clock_timestamp() - INTERVAL '1 minute'""",
        (team_id,),
    )
    recent = cur.fetchone()
    cooldown = content.get("meta", {}).get("rules", {}).get("answer_cooldown_sec", 0)
    retry_after = 0
    if recent["count"] >= SUBMISSIONS_PER_MINUTE:
        retry_after = max(1, math.ceil(60 - recent["oldest"]))
    elif cooldown and recent["elapsed"] is not None and recent["elapsed"] < cooldown:
        retry_after = max(1, math.ceil(cooldown - recent["elapsed"]))
    if retry_after:
        raise HTTPException(
            429,
            "Please wait before submitting another answer.",
            headers={"Retry-After": str(retry_after)},
        )


def _room_completed(cur, team_id, clues):
    """Door progression requires resolution; only correct solves earn rewards."""
    cur.execute(
        "SELECT clue_id, solved, attempts FROM team_clues WHERE team_id = %s AND room_id = %s",
        (team_id, ROOM_ID),
    )
    progress = {row["clue_id"]: row for row in cur.fetchall()}
    if not clues:
        return False
    for clue in clues:
        saved = progress.get(clue["id"])
        if not saved:
            return False
        attempts_max = clue.get("attempts_max", 3)
        if not saved["solved"] and (
            attempts_max is None or saved["attempts"] < attempts_max
        ):
            return False
    return True


def _update_room_completion(cur, team_id, clues):
    completed = _room_completed(cur, team_id, clues)
    if completed:
        cur.execute(
            """INSERT INTO team_rooms (team_id, room_id, is_completed, completed_at)
               VALUES (%s, %s, TRUE, NOW()) ON CONFLICT (team_id, room_id) DO UPDATE SET
               is_completed = TRUE, completed_at = COALESCE(team_rooms.completed_at, EXCLUDED.completed_at)
               WHERE team_rooms.is_completed IS DISTINCT FROM TRUE OR team_rooms.completed_at IS NULL""",
            (team_id, ROOM_ID),
        )
    return completed


def _recompute_score(cur, team_id, round_num):
    cur.execute(
        """INSERT INTO team_rounds (team_id, round, total_score, clues_solved, last_solved_at)
           SELECT %s, %s, COALESCE(SUM(score), 0), COUNT(*), MAX(solved_at)
           FROM team_clues WHERE team_id = %s AND round = %s AND solved = TRUE
           ON CONFLICT (team_id, round) DO UPDATE SET
               total_score = EXCLUDED.total_score, clues_solved = EXCLUDED.clues_solved,
               last_solved_at = EXCLUDED.last_solved_at, updated_at = NOW()""",
        (team_id, round_num, team_id, round_num),
    )


def submit_clue_answer(team_id, content, clue, answer, bypass_sequence=False):
    room = _room(content)
    stage = clue["stages"][0]
    max_len = min(
        content.get("meta", {}).get("rules", {}).get("max_field_len", 200),
        stage.get("fields", [{}])[0].get("max_len", 200),
    )
    if not isinstance(answer, str) or not answer.strip() or len(answer) > max_len:
        raise HTTPException(
            422, "answer must be a nonempty string within the field length limit."
        )
    room_clues = [c for c in content.get("clues", []) if c.get("room") == ROOM_ID]
    attempts_max = clue.get("attempts_max", 3)
    with _transaction(team_id) as cur:
        _require_access(cur, team_id, room)
        cur.execute(
            "SELECT solved, attempts FROM team_clues WHERE team_id = %s AND clue_id = %s",
            (team_id, clue["id"]),
        )
        saved = cur.fetchone() or {"solved": False, "attempts": 0}
        if saved["solved"] or (
            attempts_max is not None and saved["attempts"] >= attempts_max
        ):
            return {
                "correct": saved["solved"],
                "solved": saved["solved"],
                "already_solved": saved["solved"],
                "attempts": saved["attempts"],
                "attempts_max": attempts_max,
                "exhausted": not saved["solved"],
                "room_completed": _update_room_completion(cur, team_id, room_clues),
                "reward": _public(clue.get("reward")) if saved["solved"] else None,
                "message": "Clue already solved!"
                if saved["solved"]
                else "Maximum attempts exhausted for this clue.",
            }
        collected = {
            f["fragment_id"]
            for f in _fragments(cur, team_id)
            if f["room_id"] == ROOM_ID
        }
        if clue.get("input_gate") == "room_evidence_complete" and not _unlock_basket(
            cur, team_id, room, collected
        ):
            raise HTTPException(
                409,
                detail={
                    "code": "EVIDENCE_INCOMPLETE",
                    "message": "Collect every room fragment before submitting.",
                },
            )

        # Enforce sequential clue progression in Study
        STUDY_CLUES = ["R1-05", "R1-06", "R1-07", "R1-08"]
        if clue["id"] in STUDY_CLUES and not bypass_sequence:
            c_idx = STUDY_CLUES.index(clue["id"])
            if c_idx > 0:
                prev_id = STUDY_CLUES[c_idx - 1]
                cur.execute(
                    "SELECT solved, attempts FROM team_clues WHERE team_id = %s AND clue_id = %s",
                    (team_id, prev_id),
                )
                prev_row = cur.fetchone()
                prev_clue_def = next((c for c in content.get("clues", []) if c["id"] == prev_id), {})
                prev_max = prev_clue_def.get("attempts_max", 3)
                is_resolved = bool(prev_row and (prev_row["solved"] or (prev_max is not None and prev_row["attempts"] >= prev_max)))
                if not is_resolved:
                    raise HTTPException(
                        403,
                        detail={
                            "code": "CLUE_LOCKED",
                            "message": f"Previous clue '{prev_id}' in this sequence must be solved first.",
                        },
                    )

        _check_rate_limit(cur, team_id, content)
        correct = _verify_answer(content, clue, answer)
        attempts = saved["attempts"] + 1
        if correct:
            deduction = hint_service.get_clue_hint_point_deduction(cur, team_id, clue["id"])
            score = max(0.0, 100.0 - deduction)
        else:
            score = 0.0
        cur.execute(
            """INSERT INTO team_clues (team_id, round, clue_id, room_id, solved, attempts, score, solved_at)
               VALUES (%s, %s, %s, %s, %s, %s, %s, CASE WHEN %s THEN NOW() ELSE NULL END)
               ON CONFLICT (team_id, clue_id) DO UPDATE SET solved = EXCLUDED.solved,
                   attempts = EXCLUDED.attempts, score = EXCLUDED.score,
                   solved_at = EXCLUDED.solved_at, updated_at = NOW()""",
            (
                team_id,
                clue.get("round", 1),
                clue["id"],
                ROOM_ID,
                correct,
                attempts,
                score,
                correct,
            ),
        )
        cur.execute(
            """INSERT INTO submissions (team_id, clue_id, submitted_answer, is_correct, points_awarded)
               VALUES (%s, %s, %s, %s, %s)""",
            (team_id, clue["id"], answer, correct, score),
        )
        if correct:
            _recompute_score(cur, team_id, clue.get("round", 1))

        if (correct or (attempts_max is not None and attempts >= attempts_max)) and clue["id"] in STUDY_CLUES:
            c_idx = STUDY_CLUES.index(clue["id"])
            if c_idx + 1 < len(STUDY_CLUES):
                next_id = STUDY_CLUES[c_idx + 1]
                cur.execute(
                    """INSERT INTO team_clues (team_id, round, clue_id, room_id, is_unlocked, unlocked_at)
                       VALUES (%s, %s, %s, %s, TRUE, NOW())
                       ON CONFLICT (team_id, clue_id) DO UPDATE SET is_unlocked = TRUE, unlocked_at = COALESCE(team_clues.unlocked_at, NOW())""",
                    (team_id, clue.get("round", 1), next_id, ROOM_ID)
                )
        completed = _update_room_completion(cur, team_id, room_clues)
        return {
            "correct": correct,
            "solved": correct,
            "attempts": attempts,
            "attempts_max": attempts_max,
            "exhausted": not correct
            and attempts_max is not None
            and attempts >= attempts_max,
            "room_completed": completed,
            "reward": _public(clue.get("reward")) if correct else None,
            "message": "Correct! Evidence decrypted."
            if correct
            else FAILURE_MESSAGES.get(
                clue.get("object_id"),
                "Incorrect submission. Please verify your answer.",
            ),
        }
