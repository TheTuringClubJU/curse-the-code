import psycopg2
from psycopg2.extras import RealDictCursor
from fastapi import APIRouter, Request, HTTPException
from typing import Dict, Any, List
from app.config import DATABASE_URL
from app.login.service import get_db_connection
from app.lobby.routes import get_content_data
from app.login.service import LoginService
import hmac
import hashlib

router = APIRouter(prefix="/api/game", tags=["game"])

def verify_team_auth(request: Request):
    token = (
        request.cookies.get("team_session")
        or request.cookies.get("ctc_session")
        or request.headers.get("x-session-token")
    )
    if not token:
        auth_header = request.headers.get("authorization", "")
        if auth_header.startswith("Bearer "):
            token = auth_header.split(" ")[1]
            
    if not token:
        raise HTTPException(status_code=401, detail="Unauthorized - Please login first")
        
    team_res = LoginService.get_current_team_by_token(token)
    if not team_res or not team_res.get('team'):
        raise HTTPException(status_code=401, detail='Unauthorized - Invalid or expired session')
    return team_res['team']

@router.get("/room/{room_id}")
def get_room_state(room_id: str, request: Request):
    team = verify_team_auth(request)
    content = get_content_data()
    
    # Locate room metadata in content
    target_room = None
    for r in content.get("rooms", []):
        if r["id"] == room_id:
            target_room = r
            break
            
    if not target_room:
        raise HTTPException(status_code=404, detail="Room not found")
        
    conn = get_db_connection()
    try:
        with conn.cursor(cursor_factory=RealDictCursor) as cur:
            # Query fragments already collected by this team in this room
            cur.execute(
                "SELECT fragment_id, is_wrapped, collected_at FROM team_fragments WHERE team_id = %s AND room_id = %s",
                (team["id"], room_id)
            )
            collected_fragments = [dict(row) for row in cur.fetchall()]
            
            # Query room status
            cur.execute(
                "SELECT is_basket_unlocked, is_completed FROM team_rooms WHERE team_id = %s AND room_id = %s",
                (team["id"], room_id)
            )
            room_status = cur.fetchone()
            
            # Query clue progress in this room
            cur.execute(
                """
                SELECT clue_id, solved, attempts, score
                FROM team_clues
                WHERE team_id = %s AND round = %s
                """,
                (team["id"], target_room.get("round", 1))
            )
            team_clues = {row["clue_id"]: dict(row) for row in cur.fetchall()}
            
            # Query total photo pieces earned
            cur.execute(
                "SELECT COUNT(DISTINCT clue_id) as photo_count FROM team_clues WHERE team_id = %s AND solved = TRUE",
                (team["id"],)
            )
            photo_row = cur.fetchone()
            photo_pieces_count = photo_row["photo_count"] if photo_row else 0
            
    finally:
        conn.close()
        
    collected_ids = [f["fragment_id"] for f in collected_fragments]
    room_evidence = target_room.get("evidence", [])
    total_in_room = len(room_evidence)
    is_basket_unlocked = bool(room_status and room_status["is_basket_unlocked"])
    is_completed = bool(room_status and room_status["is_completed"])
    
    # Auto-unlock basket if all room fragments are collected
    if not is_basket_unlocked and total_in_room > 0 and len(collected_ids) >= total_in_room:
        conn = get_db_connection()
        try:
            with conn.cursor() as cur:
                cur.execute(
                    """
                    INSERT INTO team_rooms (team_id, room_id, is_basket_unlocked)
                    VALUES (%s, %s, TRUE)
                    ON CONFLICT (team_id, room_id)
                    DO UPDATE SET is_basket_unlocked = TRUE
                    """,
                    (team["id"], room_id)
                )
                conn.commit()
            is_basket_unlocked = True
        finally:
            conn.close()

    # Projection of objects with client state
    projected_objects = []
    for obj in target_room.get("objects", []):
        obj_copy = {
            "id": obj["id"],
            "label": obj["label"],
            "kind": obj["kind"],
            "clue_id": obj.get("clue_id")
        }
        projected_objects.append(obj_copy)

    # Clues projection (hide hashes & answers)
    projected_clues = []
    for c in content.get("clues", []):
        if c.get("room") == room_id:
            c_info = team_clues.get(c["id"], {"solved": False, "attempts": 0})
            projected_clues.append({
                "id": c["id"],
                "title": c.get("title", ""),
                "object_id": c.get("object_id"),
                "scene_text": c.get("scene_text", ""),
                "solved": c_info["solved"],
                "attempts": c_info["attempts"],
                "attempts_max": c.get("attempts_max", 3),
                "solution_method": c.get("solution", {}).get("method"),
                "assembly": c.get("assembly"),
                "payload": c.get("payload", {}),
                "assets": c.get("assets", []),
                "stages": [
                    {
                        "index": s["index"],
                        "type": s["type"],
                        "prompt": s["prompt"],
                        "fields": s.get("fields", [])
                    }
                    for s in c.get("stages", [])
                ]
            })

    # Evidence details:
    # If basket is unlocked, return full text/display lines.
    # If still wrapped, hide the secret lines and only return ID and title.
    projected_evidence = []
    for ev in room_evidence:
        if ev["id"] in collected_ids:
            if is_basket_unlocked:
                projected_evidence.append({
                    "id": ev["id"],
                    "clue_id": ev.get("clue_id"),
                    "part": ev.get("part"),
                    "is_wrapped": False,
                    "display": ev.get("display", {})
                })
            else:
                projected_evidence.append({
                    "id": ev["id"],
                    "is_wrapped": True,
                    "display": {
                        "title": f"Wrapped Fragment #{ev.get('seq', '?')}",
                        "style": ev.get("display", {}).get("style", {})
                    }
                })

    return {
        "ok": True,
        "room_id": room_id,
        "title": target_room.get("title", ""),
        "theme": target_room.get("theme", {}),
        "ambient": target_room.get("ambient", {}),
        "objects": projected_objects,
        "collected_fragment_ids": collected_ids,
        "total_fragments_in_room": total_in_room,
        "basket_unlocked": is_basket_unlocked,
        "is_completed": is_completed,
        "clues": projected_clues,
        "evidence": projected_evidence,
        "photo_pieces_collected": photo_pieces_count
    }

@router.post("/room/{room_id}/search")
def search_object(room_id: str, payload: Dict[str, Any], request: Request):
    team = verify_team_auth(request)
    object_id = payload.get("object_id")
    if not object_id:
        raise HTTPException(status_code=400, detail="Missing object_id")
        
    content = get_content_data()
    target_room = next((r for r in content.get("rooms", []) if r["id"] == room_id), None)
    if not target_room:
        raise HTTPException(status_code=404, detail="Room not found")
        
    # Find evidence attached to this object in room definition
    room_evidence = target_room.get("evidence", [])
    target_ev = next((ev for ev in room_evidence if ev.get("hiding", {}).get("object_id") == object_id), None)
    
    if not target_ev:
        return {
            "found": False,
            "message": "You search carefully, but this object contains no hidden compartments."
        }
        
    conn = get_db_connection()
    try:
        with conn.cursor(cursor_factory=RealDictCursor) as cur:
            # Check if team already collected this piece
            cur.execute(
                "SELECT fragment_id FROM team_fragments WHERE team_id = %s AND fragment_id = %s",
                (team["id"], target_ev["id"])
            )
            if cur.fetchone():
                return {
                    "found": False,
                    "already_collected": True,
                    "message": "You have already recovered the hidden fragment from here."
                }
                
            # Verify sequence lock:
            # Target piece requires all lower seq in this chain to have been collected
            target_seq = target_ev.get("seq")
            target_chain = target_ev.get("chain", room_id)
            
            if target_seq is not None and target_seq > 1:
                cur.execute(
                    """
                    SELECT fragment_id FROM team_fragments
                    WHERE team_id = %s AND room_id = %s
                    """,
                    (team["id"], room_id)
                )
                collected_in_room = {row["fragment_id"] for row in cur.fetchall()}
                
                # Check preceding items in same chain
                preceding = [
                    ev["id"] for ev in room_evidence
                    if ev.get("chain", room_id) == target_chain and ev.get("seq") is not None and ev.get("seq") < target_seq
                ]
                missing = [pid for pid in preceding if pid not in collected_in_room]
                if missing:
                    # Locked out of order prompt (Option 3 discussed)
                    return {
                        "found": False,
                        "locked": True,
                        "message": "Locked for now. Follow the investigation trail in order to unlock this."
                    }
                    
            # Valid pickup! Insert into team_fragments
            cur.execute(
                """
                INSERT INTO team_fragments (team_id, room_id, fragment_id, is_wrapped)
                VALUES (%s, %s, %s, TRUE)
                ON CONFLICT (team_id, fragment_id) DO NOTHING
                """,
                (team["id"], room_id, target_ev["id"])
            )
            conn.commit()
            
            # Check total count in room now
            cur.execute(
                "SELECT COUNT(*) as cnt FROM team_fragments WHERE team_id = %s AND room_id = %s",
                (team["id"], room_id)
            )
            cnt = cur.fetchone()["cnt"]
            total_room = len(room_evidence)
            basket_unlocked = False
            
            if cnt >= total_room:
                cur.execute(
                    """
                    INSERT INTO team_rooms (team_id, room_id, is_basket_unlocked)
                    VALUES (%s, %s, TRUE)
                    ON CONFLICT (team_id, room_id) DO UPDATE SET is_basket_unlocked = TRUE
                    """,
                    (team["id"], room_id)
                )
                conn.commit()
                basket_unlocked = True
                
            return {
                "found": True,
                "fragment_id": target_ev["id"],
                "message": f"You discovered a wrapped fragment inside the {object_id.replace('_', ' ')}! It has been placed in your basket.",
                "total_collected": cnt,
                "total_in_room": total_room,
                "basket_unlocked": basket_unlocked
            }
    finally:
        conn.close()

@router.post("/clue/{clue_id}/submit")
def submit_clue_answer(clue_id: str, payload: Dict[str, Any], request: Request):
    team = verify_team_auth(request)
    answer = payload.get("answer", "")
    content = get_content_data()
    answer_salt = content.get("meta", {}).get("answer_salt", "")
    
    target_clue = next((c for c in content.get("clues", []) if c["id"] == clue_id), None)
    if not target_clue:
        raise HTTPException(status_code=404, detail="Clue not found")
        
    room_id = target_clue.get("room")
    stage_idx = 1
    stage_def = target_clue.get("stages", [{}])[0]
    expected_hash = stage_def.get("answer_hash")
    attempts_max = target_clue.get("attempts_max", 3)
    
    # Normalise answer according to field rule
    field_norm = stage_def.get("fields", [{}])[0].get("normalize", "alnum")
    norm_val = "".join(ch for ch in str(answer).strip().upper() if ch.isalnum()) if field_norm == "alnum" else str(answer).strip().upper()
    
    # Calculate HMAC
    msg = f"{clue_id}:{stage_idx}:{norm_val}".encode("utf-8")
    calc_hash = hmac.new(answer_salt.encode("utf-8"), msg, hashlib.sha256).hexdigest()
    
    is_correct = hmac.compare_digest(calc_hash, expected_hash) if expected_hash else False
    
    conn = get_db_connection()
    try:
        with conn.cursor(cursor_factory=RealDictCursor) as cur:
            # Query current clue attempt record
            cur.execute(
                """
                SELECT id, attempts, solved, total_penalty
                FROM team_clues
                WHERE team_id = %s AND clue_id = %s
                """,
                (team["id"], clue_id)
            )
            row = cur.fetchone()
            
            if row and row["solved"]:
                return {
                    "correct": True,
                    "already_solved": True,
                    "message": "Clue already solved!"
                }
                
            curr_attempts = row["attempts"] if row else 0
            if attempts_max is not None and curr_attempts >= attempts_max:
                return {
                    "correct": False,
                    "exhausted": True,
                    "message": "Maximum attempts exhausted for this clue."
                }
                
            new_attempts = curr_attempts + 1
            clue_solved = is_correct
            
            # Calculate points if correct
            pts_awarded = 100.0 if clue_solved else 0.0

            cur.execute(
                """
                INSERT INTO team_clues (team_id, round, clue_id, room_id, solved, attempts, score, solved_at, updated_at)
                VALUES (%s, %s, %s, %s, %s, %s, %s, CASE WHEN %s THEN NOW() ELSE NULL END, NOW())
                ON CONFLICT (team_id, clue_id)
                DO UPDATE SET
                    solved = EXCLUDED.solved,
                    attempts = EXCLUDED.attempts,
                    score = EXCLUDED.score,
                    solved_at = CASE WHEN EXCLUDED.solved AND team_clues.solved_at IS NULL THEN NOW() ELSE team_clues.solved_at END,
                    updated_at = NOW()
                """,
                (team["id"], target_clue.get("round", 1), clue_id, room_id, clue_solved, new_attempts, pts_awarded, clue_solved)
            )

            # Record into submissions table
            cur.execute(
                """
                INSERT INTO submissions (team_id, clue_id, submitted_answer, is_correct, points_awarded, created_at)
                VALUES (%s, %s, %s, %s, %s, NOW())
                """,
                (team["id"], clue_id, str(answer)[:255], clue_solved, pts_awarded)
            )

            # Update team_rounds aggregate score & clues_solved for live leaderboard
            if clue_solved:
                cur.execute(
                    """
                    INSERT INTO team_rounds (team_id, round, total_score, clues_solved, last_solved_at, updated_at)
                    VALUES (%s, %s, %s, 1, NOW(), NOW())
                    ON CONFLICT (team_id, round)
                    DO UPDATE SET
                        total_score = team_rounds.total_score + EXCLUDED.total_score,
                        clues_solved = team_rounds.clues_solved + 1,
                        last_solved_at = NOW(),
                        updated_at = NOW()
                    """,
                    (team["id"], target_clue.get("round", 1), pts_awarded)
                )
            
            # Check if all clues in this room are now resolved (solved or exhausted)
            cur.execute(
                """
                SELECT clue_id, solved, attempts
                FROM team_clues
                WHERE team_id = %s AND round = %s
                """,
                (team["id"], target_clue.get("round", 1))
            )
            solved_clues_map = {r["clue_id"]: r for r in cur.fetchall()}
            
            room_clues = [c for c in content.get("clues", []) if c.get("room") == room_id]
            all_resolved = True
            for rc in room_clues:
                rec = solved_clues_map.get(rc["id"])
                max_att = rc.get("attempts_max", 3)
                if not rec or (not rec["solved"] and (max_att is None or rec["attempts"] < max_att)):
                    all_resolved = False
                    break
                    
            if all_resolved:
                cur.execute(
                    """
                    INSERT INTO team_rooms (team_id, room_id, is_completed, completed_at)
                    VALUES (%s, %s, TRUE, NOW())
                    ON CONFLICT (team_id, room_id)
                    DO UPDATE SET is_completed = TRUE, completed_at = NOW()
                    """,
                    (team["id"], room_id)
                )
                
            conn.commit()
            
            return {
                "correct": is_correct,
                "attempts": new_attempts,
                "attempts_max": attempts_max,
                "exhausted": not is_correct and (attempts_max is not None and new_attempts >= attempts_max),
                "room_completed": all_resolved,
                "reward": target_clue.get("reward") if is_correct else None,
                "message": "Correct! Cipher decrypted." if is_correct else "Incorrect submission. Check your cipher shift."
            }
    finally:
        conn.close()


