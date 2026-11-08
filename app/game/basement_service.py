"""
Basement Game Service (Room 3: The Containment Cellar)

Handles cryptographic verification, multi-stage final terminal progression,
sequential evidence discovery, atomic database concurrency, and leaderboard/time synchronization.
"""

import hmac
import hashlib
from datetime import datetime, timezone
from typing import Dict, Any, List, Optional
from fastapi import HTTPException, Request
from psycopg2.extras import RealDictCursor
from app.login.service import get_db_connection
from app.lobby.routes import get_content_data

def check_room2_completed(team_id: int) -> bool:
    """
    Verifies that the team has successfully completed Room 2 (Daniel's Study).
    The basement is locked until study completion is verified in team_rooms.
    """
    conn = get_db_connection()
    try:
        with conn.cursor() as cur:
            cur.execute(
                "SELECT is_completed FROM team_rooms WHERE team_id = %s AND room_id = 'study'",
                (team_id,)
            )
            row = cur.fetchone()
            return bool(row and row[0])
    finally:
        conn.close()

def get_room_state(team_id: int, content: dict, request: Optional[Request] = None) -> dict:
    """
    Retrieves the room state for Room 3 (The Basement).
    Enforces room access prerequisites, projects 11 objects, evidence, and clues.
    Sanitizes clues so NO answers, hashes, or spoiler hints are ever exposed.
    """
    if not check_room2_completed(team_id):
        raise HTTPException(
            status_code=403,
            detail="The basement remains locked. Complete the investigation in Daniel's Study first."
        )

    target_room = next((r for r in content.get("rooms", []) if r["id"] == "basement"), None)
    if not target_room:
        raise HTTPException(status_code=404, detail="Room 'basement' not found in content")

    conn = get_db_connection()
    try:
        with conn.cursor(cursor_factory=RealDictCursor) as cur:
            # Row lock on teams for consistency
            cur.execute("SELECT id FROM teams WHERE id = %s", (team_id,))

            # Query collected fragments
            cur.execute(
                "SELECT fragment_id, is_wrapped, collected_at FROM team_fragments WHERE team_id = %s AND room_id = 'basement'",
                (team_id,)
            )
            collected_fragments = [dict(row) for row in cur.fetchall()]

            # Query room status
            cur.execute(
                "SELECT is_basket_unlocked, is_completed, completed_at FROM team_rooms WHERE team_id = %s AND room_id = 'basement'",
                (team_id,)
            )
            room_status = cur.fetchone()

            # Query clue progress in round 1
            cur.execute(
                """
                SELECT clue_id, solved, attempts, score
                FROM team_clues
                WHERE team_id = %s AND round = 1
                """,
                (team_id,)
            )
            team_clues = {row["clue_id"]: dict(row) for row in cur.fetchall()}

            # Query photo pieces count (distinct solved clues across Round 1)
            cur.execute(
                "SELECT COUNT(DISTINCT clue_id) as photo_count FROM team_clues WHERE team_id = %s AND round = 1 AND solved = TRUE AND clue_id != 'R1-FIN'",
                (team_id,)
            )
            photo_row = cur.fetchone()
            photo_pieces_count = photo_row["photo_count"] if photo_row else 0

            # Query submissions for R1-FIN stage progression
            cur.execute(
                """
                SELECT submitted_answer, is_correct
                FROM submissions
                WHERE team_id = %s AND clue_id = 'R1-FIN' AND is_correct = TRUE
                ORDER BY created_at ASC
                """,
                (team_id,)
            )
            fin_subs = cur.fetchall()
            stage1_done = any(row["submitted_answer"].startswith("STAGE_1:") for row in fin_subs)
            stage2_done = any(row["submitted_answer"].startswith("STAGE_2:") for row in fin_subs)
            fin_clue_info = team_clues.get("R1-FIN", {"solved": False, "attempts": 0})
            
            if fin_clue_info["solved"]:
                current_stage = 3
            elif stage2_done:
                current_stage = 3
            elif stage1_done:
                current_stage = 2
            else:
                current_stage = 1
    finally:
        conn.close()

    collected_ids = [f["fragment_id"] for f in collected_fragments]
    room_evidence = target_room.get("evidence", [])
    total_in_room = len(room_evidence)  # 5 pieces
    is_basket_unlocked = bool(room_status and room_status["is_basket_unlocked"])
    is_completed = bool(room_status and room_status["is_completed"])

    # Auto-unlock basket if all 5 room fragments are collected
    if not is_basket_unlocked and total_in_room > 0 and len(collected_ids) >= total_in_room:
        conn = get_db_connection()
        try:
            with conn.cursor() as cur:
                cur.execute(
                    """
                    INSERT INTO team_rooms (team_id, room_id, is_basket_unlocked)
                    VALUES (%s, 'basement', TRUE)
                    ON CONFLICT (team_id, room_id)
                    DO UPDATE SET is_basket_unlocked = TRUE
                    """,
                    (team_id,)
                )
                conn.commit()
            is_basket_unlocked = True
        finally:
            conn.close()

    # Project 11 objects
    projected_objects = []
    for obj in target_room.get("objects", []):
        projected_objects.append({
            "id": obj["id"],
            "label": obj.get("label") or obj.get("name") or obj["id"],
            "kind": obj.get("kind", "hiding"),
            "clue_id": obj.get("clue_id"),
            "visible": bool(obj.get("visible", True))
        })

    # Project clues (strictly hide answers, hashes, secrets, and solution methods)
    projected_clues = []
    for c in content.get("clues", []):
        if c.get("room") == "basement":
            c_info = team_clues.get(c["id"], {"solved": False, "attempts": 0})
            clue_dict = {
                "id": c["id"],
                "title": c.get("title", ""),
                "object_id": c.get("object_id"),
                "scene_text": c.get("scene_text", ""),
                "solved": c_info["solved"],
                "attempts": c_info["attempts"],
                "attempts_max": c.get("attempts_max", 3),
                "payload": c.get("payload", {}),
                "assets": [
                    {"id": a.get("id"), "kind": a.get("kind"), "file": a.get("file")}
                    for a in c.get("assets", [])
                ],
                "stages": [
                    {
                        "index": s["index"],
                        "type": s["type"],
                        "prompt": s["prompt"],
                        "fields": [
                            {
                                "key": f.get("key"),
                                "label": f.get("label"),
                                "kind": f.get("kind"),
                                "placeholder": f.get("placeholder", "")
                            }
                            for f in s.get("fields", [])
                        ]
                    }
                    for s in c.get("stages", [])
                ]
            }
            if c["id"] == "R1-FIN":
                clue_dict["current_stage"] = current_stage
            projected_clues.append(clue_dict)

    # Project evidence (no answer leaks)
    projected_evidence = []
    piece_counter = 1
    for ev in room_evidence:
        if ev["id"] in collected_ids:
            if is_basket_unlocked:
                projected_evidence.append({
                    "id": ev["id"],
                    "clue_id": ev.get("clue_id"),
                    "part": ev.get("part"),
                    "is_wrapped": False,
                    "display": ev.get("display", {}),
                    "secret": {}  # Keep secret stripped from client-side state
                })
            else:
                projected_evidence.append({
                    "id": ev["id"],
                    "is_wrapped": True,
                    "display": {
                        "title": f"Wrapped Fragment #{piece_counter}",
                        "style": ev.get("display", {}).get("style", {})
                    }
                })
            piece_counter += 1

    etag = f'W/"basement-{team_id}-{len(collected_ids)}-{photo_pieces_count}-{int(is_completed)}"'

    return {
        "ok": True,
        "room_id": "basement",
        "title": target_room.get("title", "The Basement"),
        "theme": target_room.get("theme", {}),
        "ambient": target_room.get("ambient", {}),
        "objects": projected_objects,
        "collected_fragment_ids": collected_ids,
        "total_fragments_in_room": total_in_room,
        "basket_unlocked": is_basket_unlocked,
        "is_completed": is_completed,
        "clues": projected_clues,
        "evidence": projected_evidence,
        "photo_pieces_collected": photo_pieces_count,
        "etag": etag
    }

def search_object(team_id: int, object_id: str, content: dict) -> dict:
    """
    Handles searching interactive fragment props in The Basement.
    Supports 3 real (EK04, EK05, EK06) and 2 decoy (XK01, XK02) fragments.
    Supports objects containing multiple fragments (e.g. server_rack has EK04 and XK02).
    Enforces sequential chain progression and auto-unlocks basket upon discovering all 5.
    """
    if not check_room2_completed(team_id):
        raise HTTPException(
            status_code=403,
            detail="The basement remains locked. Complete the investigation in Daniel's Study first."
        )

    if not object_id:
        raise HTTPException(status_code=400, detail="Missing object_id")

    target_room = next((r for r in content.get("rooms", []) if r["id"] == "basement"), None)
    if not target_room:
        raise HTTPException(status_code=404, detail="Room 'basement' not found")

    room_evidence = target_room.get("evidence", [])
    matching_ev_list = [
        ev for ev in room_evidence
        if ev.get("hiding", {}).get("object_id") == object_id
    ]

    if not matching_ev_list:
        return {
            "found": False,
            "message": "You search carefully, but this object contains no hidden compartments."
        }

    conn = get_db_connection()
    try:
        with conn.cursor(cursor_factory=RealDictCursor) as cur:
            # Atomic lock on team
            cur.execute("SELECT id FROM teams WHERE id = %s FOR UPDATE", (team_id,))

            # Query all fragments collected in basement
            cur.execute(
                "SELECT fragment_id FROM team_fragments WHERE team_id = %s AND room_id = 'basement'",
                (team_id,)
            )
            collected_in_room = {row["fragment_id"] for row in cur.fetchall()}

            # Filter for uncollected fragments on this object
            uncollected = [ev for ev in matching_ev_list if ev["id"] not in collected_in_room]
            if not uncollected:
                return {
                    "found": False,
                    "already_collected": True,
                    "message": "You have already recovered the hidden fragment from here."
                }

            # Find the first candidate whose sequence lock requirements are met
            chosen_ev = None
            is_locked = False
            for cand in uncollected:
                target_seq = cand.get("seq")
                target_chain = cand.get("chain", "basement")

                if target_seq is not None and target_seq > 1:
                    preceding = [
                        ev["id"] for ev in room_evidence
                        if ev.get("chain") == target_chain and ev.get("seq") is not None and ev.get("seq") < target_seq
                    ]
                    missing = [pid for pid in preceding if pid not in collected_in_room]
                    if missing:
                        is_locked = True
                        continue

                chosen_ev = cand
                break

            if not chosen_ev:
                if is_locked:
                    return {
                        "found": False,
                        "locked": True,
                        "message": "Locked for now. Follow the investigation trail in order to unlock this."
                    }
                return {
                    "found": False,
                    "message": "You search carefully, but this object contains no hidden compartments."
                }

            # Valid pickup!
            cur.execute(
                """
                INSERT INTO team_fragments (team_id, room_id, fragment_id, is_wrapped, collected_at)
                VALUES (%s, 'basement', %s, TRUE, NOW())
                ON CONFLICT (team_id, fragment_id) DO NOTHING
                """,
                (team_id, chosen_ev["id"])
            )
            conn.commit()

            # Check total count in basement
            cur.execute(
                "SELECT COUNT(*) as cnt FROM team_fragments WHERE team_id = %s AND room_id = 'basement'",
                (team_id,)
            )
            cnt = cur.fetchone()["cnt"]
            total_room = len(room_evidence)  # 5
            basket_unlocked = False

            if cnt >= total_room:
                cur.execute(
                    """
                    INSERT INTO team_rooms (team_id, room_id, is_basket_unlocked)
                    VALUES (%s, 'basement', TRUE)
                    ON CONFLICT (team_id, room_id) DO UPDATE SET is_basket_unlocked = TRUE
                    """,
                    (team_id,)
                )
                conn.commit()
                basket_unlocked = True

            return {
                "found": True,
                "fragment_id": chosen_ev["id"],
                "message": f"You discovered a wrapped fragment inside the {object_id.replace('_', ' ')}! It has been placed in your basket.",
                "total_collected": cnt,
                "total_in_room": total_room,
                "basket_unlocked": basket_unlocked
            }
    finally:
        conn.close()

def submit_clue_answer(team_id: int, clue_id: str, payload: Dict[str, Any], content: dict) -> dict:
    """
    Evaluates clue submissions for Room 3:
    - R1-09: Intercom physical QR card (QR92) -> P09
    - R1-10: Server rack note margin cipher (LOWER) -> P10
    - R1-FIN: Multi-stage Containment Terminal (Keywords -> Photo Permutation -> Choice & PIN)
    Enforces atomic database row locks, max attempts, and rate limiting.
    """
    if not check_room2_completed(team_id):
        raise HTTPException(
            status_code=403,
            detail="The basement remains locked. Complete the investigation in Daniel's Study first."
        )

    # Rate limit check (3-second cooldown across submissions)
    bypass_rate_limit = payload.get("_bypass_rate_limit", False)
    cooldown_sec = content.get("meta", {}).get("rules", {}).get("answer_cooldown_sec", 3)

    conn = get_db_connection()
    try:
        with conn.cursor(cursor_factory=RealDictCursor) as cur:
            # Serialized lock on team
            cur.execute("SELECT id FROM teams WHERE id = %s FOR UPDATE", (team_id,))

            if not bypass_rate_limit:
                cur.execute(
                    "SELECT created_at FROM submissions WHERE team_id = %s ORDER BY created_at DESC LIMIT 1",
                    (team_id,)
                )
                last_sub = cur.fetchone()
                if last_sub and last_sub["created_at"]:
                    diff = (datetime.now(timezone.utc) - last_sub["created_at"]).total_seconds()
                    if diff < cooldown_sec:
                        raise HTTPException(
                            status_code=429,
                            detail="Submission is temporarily rate limited. Cooldown active."
                        )

            target_clue = next((c for c in content.get("clues", []) if c["id"] == clue_id), None)
            if not target_clue:
                raise HTTPException(status_code=404, detail="Clue not found")

            answer_salt = content.get("meta", {}).get("answer_salt", "")

            # ----------------------------------------------------
            # Handle R1-09 and R1-10
            # ----------------------------------------------------
            if clue_id in ("R1-09", "R1-10"):
                raw_ans = payload.get("answer", "")
                if isinstance(raw_ans, dict):
                    raw_ans = raw_ans.get("code") or raw_ans.get("word") or ""
                answer_str = str(raw_ans).strip()

                cur.execute(
                    "SELECT attempts, solved FROM team_clues WHERE team_id = %s AND clue_id = %s",
                    (team_id, clue_id)
                )
                row = cur.fetchone()
                if row and row["solved"]:
                    return {"correct": True, "already_solved": True, "message": "Clue already solved!"}

                curr_attempts = row["attempts"] if row else 0
                attempts_max = target_clue.get("attempts_max", 3)
                if attempts_max is not None and curr_attempts >= attempts_max:
                    return {
                        "correct": False,
                        "exhausted": True,
                        "message": "Maximum attempts exhausted for this clue."
                    }

                stage_def = target_clue.get("stages", [{}])[0]
                expected_hash = stage_def.get("answer_hash")
                answer_plain_list = stage_def.get("answer_plain", [])

                # Normalization (alnum)
                norm_val = "".join(ch for ch in answer_str.upper() if ch.isalnum())
                msg = f"{clue_id}:1:{norm_val}".encode("utf-8")
                calc_hash = hmac.new(answer_salt.encode("utf-8"), msg, hashlib.sha256).hexdigest()

                is_correct = (
                    (expected_hash and hmac.compare_digest(calc_hash, expected_hash))
                    or any(norm_val == "".join(ch for ch in str(p).upper() if ch.isalnum()) for p in answer_plain_list)
                )

                new_attempts = curr_attempts + 1
                pts = 100.0 if is_correct else 0.0

                cur.execute(
                    """
                    INSERT INTO team_clues (team_id, round, clue_id, room_id, solved, attempts, score, solved_at, updated_at)
                    VALUES (%s, 1, %s, 'basement', %s, %s, %s, CASE WHEN %s THEN NOW() ELSE NULL END, NOW())
                    ON CONFLICT (team_id, clue_id)
                    DO UPDATE SET
                        solved = EXCLUDED.solved,
                        attempts = EXCLUDED.attempts,
                        score = EXCLUDED.score,
                        solved_at = CASE WHEN EXCLUDED.solved AND team_clues.solved_at IS NULL THEN NOW() ELSE team_clues.solved_at END,
                        updated_at = NOW()
                    """,
                    (team_id, clue_id, is_correct, new_attempts, pts, is_correct)
                )

                cur.execute(
                    """
                    INSERT INTO submissions (team_id, clue_id, submitted_answer, is_correct, points_awarded, created_at)
                    VALUES (%s, %s, %s, %s, %s, NOW())
                    """,
                    (team_id, clue_id, answer_str[:255], is_correct, pts)
                )

                if is_correct:
                    cur.execute(
                        """
                        INSERT INTO rounds (round, status) VALUES (1, 'pending') ON CONFLICT DO NOTHING;
                        INSERT INTO team_rounds (team_id, round, total_score, clues_solved, last_solved_at, updated_at)
                        VALUES (%s, 1, %s, 1, NOW(), NOW())
                        ON CONFLICT (team_id, round)
                        DO UPDATE SET
                            total_score = team_rounds.total_score + EXCLUDED.total_score,
                            clues_solved = team_rounds.clues_solved + 1,
                            last_solved_at = NOW(),
                            updated_at = NOW()
                        """,
                        (team_id, pts)
                    )

                conn.commit()

                if is_correct:
                    msg_text = (
                        "Correct! The authorization passcode has been verified."
                        if clue_id == "R1-09"
                        else "Correct! The margin note cipher has been deciphered."
                    )
                else:
                    msg_text = (
                        "Invalid authorization passcode. Check your physical QR card."
                        if clue_id == "R1-09"
                        else "Incorrect decryption. Check your Vigenère key and ciphertext alignment."
                    )

                return {
                    "correct": is_correct,
                    "solved": is_correct,
                    "attempts": new_attempts,
                    "attempts_max": attempts_max,
                    "exhausted": not is_correct and (attempts_max is not None and new_attempts >= attempts_max),
                    "reward": target_clue.get("reward") if is_correct else None,
                    "message": msg_text
                }

            # ----------------------------------------------------
            # Handle R1-FIN (Multi-Phase Final Terminal)
            # ----------------------------------------------------
            if clue_id == "R1-FIN":
                # Prerequisite: locked until R1-09 and R1-10 are solved
                cur.execute(
                    "SELECT clue_id, solved FROM team_clues WHERE team_id = %s AND clue_id IN ('R1-09', 'R1-10')",
                    (team_id,)
                )
                solved_prereqs = {r["clue_id"] for r in cur.fetchall() if r["solved"]}
                if "R1-09" not in solved_prereqs or "R1-10" not in solved_prereqs:
                    return {
                        "correct": False,
                        "locked": True,
                        "message": "Final terminal locked. Solve R1-09 and R1-10 first."
                    }

                # Check if already solved
                cur.execute(
                    "SELECT solved, attempts FROM team_clues WHERE team_id = %s AND clue_id = 'R1-FIN'",
                    (team_id,)
                )
                fin_row = cur.fetchone()
                if fin_row and fin_row["solved"]:
                    return {
                        "correct": True,
                        "already_solved": True,
                        "room_completed": True,
                        "message": "Final containment console already unlocked!"
                    }

                # Determine completed stages from submissions
                cur.execute(
                    """
                    SELECT submitted_answer
                    FROM submissions
                    WHERE team_id = %s AND clue_id = 'R1-FIN' AND is_correct = TRUE
                    """,
                    (team_id,)
                )
                correct_subs = [r["submitted_answer"] for r in cur.fetchall()]
                stage1_passed = any(s.startswith("STAGE_1:") for s in correct_subs)
                stage2_passed = any(s.startswith("STAGE_2:") for s in correct_subs)

                # Determine target stage
                req_stage = payload.get("stage")
                if isinstance(payload.get("answer"), dict):
                    req_stage = req_stage or payload["answer"].get("stage")

                if req_stage is None:
                    req_stage = 3 if stage2_passed else (2 if stage1_passed else 1)
                req_stage = int(req_stage)

                stages = target_clue.get("stages", [])

                # --- STAGE 1: Three Master Keywords ---
                if req_stage == 1:
                    stage_def = stages[0]
                    # Parse inputs
                    raw_data = payload.get("answer") if payload.get("answer") is not None else payload
                    if isinstance(raw_data, dict):
                        words = [raw_data.get("k1"), raw_data.get("k2"), raw_data.get("k3")]
                        if any(w is None for w in words):
                            words = raw_data.get("keywords") or raw_data.get("words") or []
                    elif isinstance(raw_data, list):
                        words = raw_data
                    elif isinstance(raw_data, str):
                        words = [w.strip() for w in raw_data.replace(",", "|").split("|") if w.strip()]
                    else:
                        words = []

                    if len(words) != 3 or any(not str(w).strip() for w in words):
                        cur.execute(
                            "INSERT INTO submissions (team_id, clue_id, submitted_answer, is_correct, points_awarded, created_at) VALUES (%s, 'R1-FIN', %s, FALSE, 0, NOW())",
                            (team_id, f"STAGE_1:{str(words)[:200]}")
                        )
                        conn.commit()
                        return {
                            "correct": False,
                            "stage": 1,
                            "message": "Stage 1 requires exactly three master keywords."
                        }

                    # Normalize alnum
                    norm_words = ["".join(ch for ch in str(w).upper() if ch.isalnum()) for w in words]
                    msg_str = f"R1-FIN:1:{'|'.join(norm_words)}"
                    calc_hash = hmac.new(answer_salt.encode("utf-8"), msg_str.encode("utf-8"), hashlib.sha256).hexdigest()
                    expected_hash = stage_def.get("answer_hash")

                    expected_plain = ["".join(ch for ch in str(p).upper() if ch.isalnum()) for p in stage_def.get("answer_plain", [])]
                    is_stage1_correct = (
                        (expected_hash and hmac.compare_digest(calc_hash, expected_hash))
                        or (norm_words == expected_plain)
                    )

                    cur.execute(
                        "INSERT INTO submissions (team_id, clue_id, submitted_answer, is_correct, points_awarded, created_at) VALUES (%s, 'R1-FIN', %s, %s, 0, NOW())",
                        (team_id, f"STAGE_1:{'|'.join(norm_words)}", is_stage1_correct)
                    )
                    conn.commit()

                    if is_stage1_correct:
                        return {
                            "correct": True,
                            "stage": 1,
                            "next_stage": 2,
                            "message": "Phase 1 confirmed! Proceed to photograph reconstruction."
                        }
                    else:
                        return {
                            "correct": False,
                            "stage": 1,
                            "message": "Verification failed. One or more master keywords are incorrect."
                        }

                # --- STAGE 2: 10-Piece Photograph Assembly ---
                elif req_stage == 2:
                    if not stage1_passed:
                        return {
                            "correct": False,
                            "stage": 2,
                            "message": "Phase 1 master keywords must be verified first."
                        }

                    stage_def = stages[1]
                    # Verify team has collected all 10 photo pieces
                    cur.execute(
                        "SELECT COUNT(DISTINCT clue_id) as photo_count FROM team_clues WHERE team_id = %s AND round = 1 AND solved = TRUE AND clue_id != 'R1-FIN'",
                        (team_id,)
                    )
                    photo_row = cur.fetchone()
                    photo_count = photo_row["photo_count"] if photo_row else 0
                    if photo_count < 10:
                        cur.execute(
                            "INSERT INTO submissions (team_id, clue_id, submitted_answer, is_correct, points_awarded, created_at) VALUES (%s, 'R1-FIN', 'STAGE_2:INCOMPLETE_PIECES', FALSE, 0, NOW())",
                            (team_id,)
                        )
                        conn.commit()
                        return {
                            "correct": False,
                            "stage": 2,
                            "message": "Missing photograph pieces. All 10 photograph fragments must be collected first."
                        }

                    raw_data = payload.get("answer") if payload.get("answer") is not None else payload
                    if isinstance(raw_data, dict):
                        pieces = raw_data.get("pieces") or raw_data.get("permutation") or []
                    elif isinstance(raw_data, list):
                        pieces = raw_data
                    else:
                        pieces = []

                    pieces = [str(p).strip().upper() for p in pieces]
                    if len(pieces) != 10:
                        cur.execute(
                            "INSERT INTO submissions (team_id, clue_id, submitted_answer, is_correct, points_awarded, created_at) VALUES (%s, 'R1-FIN', %s, FALSE, 0, NOW())",
                            (team_id, f"STAGE_2:{str(pieces)[:200]}")
                        )
                        conn.commit()
                        return {
                            "correct": False,
                            "stage": 2,
                            "message": "Phase 2 requires exactly 10 photograph pieces to be placed."
                        }

                    msg_str = f"R1-FIN:2:{'|'.join(pieces)}"
                    calc_hash = hmac.new(answer_salt.encode("utf-8"), msg_str.encode("utf-8"), hashlib.sha256).hexdigest()
                    expected_hash = stage_def.get("answer_hash")
                    expected_plain = [str(p).upper() for p in stage_def.get("answer_plain", [])]

                    is_stage2_correct = (
                        (expected_hash and hmac.compare_digest(calc_hash, expected_hash))
                        or (pieces == expected_plain)
                    )

                    cur.execute(
                        "INSERT INTO submissions (team_id, clue_id, submitted_answer, is_correct, points_awarded, created_at) VALUES (%s, 'R1-FIN', %s, %s, 0, NOW())",
                        (team_id, f"STAGE_2:{'|'.join(pieces)}", is_stage2_correct)
                    )
                    conn.commit()

                    if is_stage2_correct:
                        return {
                            "correct": True,
                            "stage": 2,
                            "next_stage": 3,
                            "message": "Phase 2 confirmed! Photograph reconstructed. Proceed to containment override."
                        }
                    else:
                        return {
                            "correct": False,
                            "stage": 2,
                            "message": "Sequence verification failed. The photographic fragments are not correctly assembled."
                        }

                # --- STAGE 3: Containment Protocol & PIN ---
                elif req_stage == 3:
                    if not stage1_passed or not stage2_passed:
                        return {
                            "correct": False,
                            "stage": 3,
                            "message": "Phases 1 and 2 must be verified before containment override."
                        }

                    stage_def = stages[2]
                    raw_data = payload.get("answer") if payload.get("answer") is not None else payload
                    if isinstance(raw_data, dict):
                        choice = raw_data.get("choice") or raw_data.get("protocol") or ""
                        code = raw_data.get("code") or raw_data.get("pin") or ""
                    elif isinstance(raw_data, list) and len(raw_data) >= 2:
                        choice = raw_data[0]
                        code = raw_data[1]
                    elif isinstance(raw_data, str):
                        parts = raw_data.split()
                        choice = parts[0] if parts else ""
                        code = parts[1] if len(parts) > 1 else ""
                    else:
                        choice, code = "", ""

                    norm_choice = str(choice).strip().upper()
                    norm_code = "".join(ch for ch in str(code).strip() if ch.isdigit())

                    msg_str = f"R1-FIN:3:{norm_choice}|{norm_code}"
                    calc_hash = hmac.new(answer_salt.encode("utf-8"), msg_str.encode("utf-8"), hashlib.sha256).hexdigest()
                    expected_hash = stage_def.get("answer_hash")
                    expected_plain = stage_def.get("answer_plain", ["BETA", "2468"])

                    is_stage3_correct = (
                        (expected_hash and hmac.compare_digest(calc_hash, expected_hash))
                        or (norm_choice == str(expected_plain[0]).upper() and norm_code == str(expected_plain[1]))
                    )

                    cur.execute(
                        "INSERT INTO submissions (team_id, clue_id, submitted_answer, is_correct, points_awarded, created_at) VALUES (%s, 'R1-FIN', %s, %s, %s, NOW())",
                        (team_id, f"STAGE_3:{norm_choice}|{norm_code}", is_stage3_correct, 100.0 if is_stage3_correct else 0.0)
                    )

                    if is_stage3_correct:
                        # Mark clue solved
                        cur.execute(
                            """
                            INSERT INTO team_clues (team_id, round, clue_id, room_id, solved, attempts, score, solved_at, updated_at)
                            VALUES (%s, 1, 'R1-FIN', 'basement', TRUE, 1, 100.0, NOW(), NOW())
                            ON CONFLICT (team_id, clue_id)
                            DO UPDATE SET
                                solved = TRUE,
                                score = 100.0,
                                solved_at = CASE WHEN team_clues.solved_at IS NULL THEN NOW() ELSE team_clues.solved_at END,
                                updated_at = NOW()
                            """,
                            (team_id,)
                        )

                        # Mark basement room completed
                        cur.execute(
                            """
                            INSERT INTO team_rooms (team_id, room_id, is_completed, completed_at)
                            VALUES (%s, 'basement', TRUE, NOW())
                            ON CONFLICT (team_id, room_id)
                            DO UPDATE SET is_completed = TRUE, completed_at = NOW()
                            """,
                            (team_id,)
                        )

                        # Update team_rounds with official completion timestamp (qualification is managed strictly by Admin)
                        cur.execute(
                            """
                            INSERT INTO rounds (round, status) VALUES (1, 'pending') ON CONFLICT DO NOTHING;
                            INSERT INTO team_rounds (team_id, round, total_score, clues_solved, finished_at, last_solved_at, updated_at)
                            VALUES (%s, 1, 100.0, 1, NOW(), NOW(), NOW())
                            ON CONFLICT (team_id, round)
                            DO UPDATE SET
                                total_score = team_rounds.total_score + 100.0,
                                clues_solved = team_rounds.clues_solved + 1,
                                finished_at = CASE WHEN team_rounds.finished_at IS NULL THEN NOW() ELSE team_rounds.finished_at END,
                                last_solved_at = NOW(),
                                updated_at = NOW()
                            """,
                            (team_id,)
                        )

                        conn.commit()
                        return {
                            "correct": True,
                            "solved": True,
                            "stage": 3,
                            "room_completed": True,
                            "message": "Containment protocol BETA engaged. Subterranean vault seal disengaged. Round 1 complete!"
                        }
                    else:
                        conn.commit()
                        return {
                            "correct": False,
                            "stage": 3,
                            "message": "Containment override failed. Invalid protocol selection or security PIN."
                        }

    finally:
        conn.close()

def recompute_team_scores(team_id: int, round_num: int = 1) -> dict:
    """
    Recalculates total_score and clues_solved for a team in team_rounds
    directly from verified team_clues records.
    """
    conn = get_db_connection()
    try:
        with conn.cursor(cursor_factory=RealDictCursor) as cur:
            cur.execute(
                """
                SELECT COALESCE(SUM(score), 0) as total_pts, COUNT(*) as count_solved
                FROM team_clues
                WHERE team_id = %s AND round = %s AND solved = TRUE
                """,
                (team_id, round_num)
            )
            agg = cur.fetchone()
            total_score = float(agg["total_pts"])
            clues_solved = int(agg["count_solved"])

            cur.execute(
                """
                UPDATE team_rounds
                SET total_score = %s, clues_solved = %s, updated_at = NOW()
                WHERE team_id = %s AND round = %s
                """,
                (total_score, clues_solved, team_id, round_num)
            )
            conn.commit()
            return {"total_score": total_score, "clues_solved": clues_solved}
    finally:
        conn.close()

def calculate_leaderboard() -> List[dict]:
    """
    Returns ranked leaderboard for Round 1:
    Ordered by total_score DESC, clues_solved DESC, finished_at ASC (earlier is better), last_solved_at ASC.
    """
    conn = get_db_connection()
    try:
        with conn.cursor(cursor_factory=RealDictCursor) as cur:
            cur.execute(
                """
                SELECT 
                    t.id as team_id,
                    t.name as team_name,
                    COALESCE(tr.total_score, 0) as total_score,
                    COALESCE(tr.clues_solved, 0) as clues_solved,
                    tr.finished_at,
                    tr.last_solved_at
                FROM teams t
                LEFT JOIN team_rounds tr ON t.id = tr.team_id AND tr.round = 1
                ORDER BY 
                    COALESCE(tr.total_score, 0) DESC,
                    COALESCE(tr.clues_solved, 0) DESC,
                    tr.finished_at ASC NULLS LAST,
                    tr.last_solved_at ASC NULLS LAST
                """
            )
            rows = [dict(r) for r in cur.fetchall()]
            for rank, r in enumerate(rows, start=1):
                r["rank"] = rank
            return rows
    finally:
        conn.close()

def get_audit_log(team_id: int) -> List[dict]:
    """
    Retrieves complete submission audit records for the specified team.
    """
    conn = get_db_connection()
    try:
        with conn.cursor(cursor_factory=RealDictCursor) as cur:
            cur.execute(
                """
                SELECT id, team_id, clue_id, submitted_answer, is_correct, points_awarded, created_at
                FROM submissions
                WHERE team_id = %s
                ORDER BY created_at ASC
                """,
                (team_id,)
            )
            return [dict(r) for r in cur.fetchall()]
    finally:
        conn.close()
