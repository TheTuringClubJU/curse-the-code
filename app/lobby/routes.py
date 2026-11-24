from fastapi import APIRouter, Depends, HTTPException, Request
from typing import Optional, Dict, Any
import psycopg2
from psycopg2.extras import RealDictCursor
from app.config import DATABASE_URL, CONTENT_FILE, ROUNDS_STATUS
from app.login.routes import get_client_ip
from app.login.service import LoginService, get_db_connection
import json
import os
import time
import threading

lobby_router = APIRouter(prefix="/api/lobby", tags=["lobby"])

_content_cache = {"data": None, "mtime": 0.0}

def get_content_data():
    if os.path.exists(CONTENT_FILE):
        try:
            mtime = os.path.getmtime(CONTENT_FILE)
            if _content_cache["data"] is not None and _content_cache["mtime"] == mtime:
                return _content_cache["data"]
            with open(CONTENT_FILE, "r", encoding="utf-8") as f:
                data = json.load(f)
                _content_cache.update(data=data, mtime=mtime)
                return data
        except Exception:
            pass
    return {}

# Cache global tournament round status for 1 second
_rounds_cache = {"data": None, "ts": 0.0}
_rounds_lock = threading.Lock()

def get_cached_rounds_info(ttl: float = 1.0) -> Dict[int, Any]:
    now = time.monotonic()
    if _rounds_cache["data"] is not None and now - _rounds_cache["ts"] < ttl:
        return _rounds_cache["data"]
    with _rounds_lock:
        if _rounds_cache["data"] is not None and time.monotonic() - _rounds_cache["ts"] < ttl:
            return _rounds_cache["data"]
        
        rounds_info = {
            1: {"status": ROUNDS_STATUS.get(1, "pending")},
            2: {"status": ROUNDS_STATUS.get(2, "pending")}
        }
        if DATABASE_URL:
            conn = get_db_connection()
            if conn:
                try:
                    with conn.cursor(cursor_factory=RealDictCursor) as cur:
                        cur.execute("SELECT round, status, starts_at, ends_at FROM rounds ORDER BY round;")
                        for r in cur.fetchall():
                            rounds_info[r["round"]] = dict(r)
                except Exception as e:
                    print("Error querying rounds for cache:", e)
                finally:
                    conn.close()
        _rounds_cache.update(data=rounds_info, ts=time.monotonic())
        return rounds_info

# Cache entire lobby state per token (or 'anon') for 1 second
_lobby_cache: Dict[str, Any] = {}
_lobby_lock = threading.Lock()

@lobby_router.get("/state")
def get_lobby_state(request: Request):
    """
    Returns the team's current lobby status, current round status,
    round information (title, subtitle), and qualification status.
    Cached for 1.0s per token to protect database from high-frequency polling.
    """
    token = request.cookies.get("team_session") or request.cookies.get("ctc_session") or request.headers.get("x-session-token")
    if not token:
        auth = request.headers.get("authorization", "")
        if auth.startswith("Bearer "):
            token = auth.split(" ")[1]

    cache_key = token if token else "anon"
    now = time.monotonic()

    cached_entry = _lobby_cache.get(cache_key)
    if cached_entry and now - cached_entry["ts"] < 1.0:
        return cached_entry["data"]

    team_data = LoginService.get_current_team_by_token(token) if token else None
    rounds_info = get_cached_rounds_info(ttl=1.0)
    team_rounds = []
    
    if DATABASE_URL and team_data:
        conn = get_db_connection()
        if conn:
            try:
                with conn.cursor(cursor_factory=RealDictCursor) as cur:
                    cur.execute(
                        "SELECT round, total_score, clues_solved, COALESCE(penalty_seconds, 0) as penalty_seconds, qualified_at, qualified_rank FROM team_rounds WHERE team_id = %s",
                        (team_data["team"]["id"],)
                    )
                    team_rounds = [dict(tr) for tr in cur.fetchall()]
            except Exception as e:
                print("Error querying team_rounds for lobby:", e)
            finally:
                conn.close()

    content = get_content_data()
    rounds_content = {r["round"]: r for r in content.get("rounds", [])}

    r1 = rounds_info.get(1, {})
    r2 = rounds_info.get(2, {})

    r1_status = r1.get("status", "pending")
    r2_status = r2.get("status", "pending")

    if r1_status == "ended":
        active_round_num = 2
    else:
        active_round_num = 1

    is_qualified_r2 = False
    if team_data:
        is_qualified_r2 = any(tr.get("round") == 2 for tr in team_rounds)

    round_meta = rounds_content.get(active_round_num, {})

    data = {
        "ok": True,
        "team": team_data["team"] if team_data else None,
        "current_round": active_round_num,
        "round_status": r1_status if active_round_num == 1 else r2_status,
        "r1_status": r1_status,
        "r2_status": r2_status,
        "is_qualified_r2": is_qualified_r2,
        "round_title": round_meta.get("title", f"Round {active_round_num}"),
        "round_subtitle": round_meta.get("subtitle", ""),
        "meta": {
            "event_name": content.get("meta", {}).get("event_name", "Curse the Code"),
            "pack_label": content.get("meta", {}).get("pack_label", "2026")
        }
    }

    with _lobby_lock:
        if len(_lobby_cache) > 200:
            _lobby_cache.clear()
        _lobby_cache[cache_key] = {"data": data, "ts": time.monotonic()}

    return data
