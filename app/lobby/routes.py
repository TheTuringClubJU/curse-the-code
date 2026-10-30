from fastapi import APIRouter, Depends, HTTPException, Request
from typing import Optional, Dict, Any
import psycopg2
from psycopg2.extras import RealDictCursor
from app.config import DATABASE_URL, CONTENT_FILE
from app.login.routes import get_client_ip
from app.login.service import LoginService
import json
import os

lobby_router = APIRouter(prefix="/api/lobby", tags=["lobby"])

def get_content_data():
    if os.path.exists(CONTENT_FILE):
        try:
            with open(CONTENT_FILE, "r", encoding="utf-8") as f:
                return json.load(f)
        except Exception:
            pass
    return {}

@lobby_router.get("/state")
async def get_lobby_state(request: Request):
    """
    Returns the team's current lobby status, current round status,
    round information (title, subtitle), and qualification status.
    """
    token = request.cookies.get("team_session") or request.cookies.get("ctc_session") or request.headers.get("x-session-token")
    if not token:
        # Check Authorization header Bearer
        auth = request.headers.get("authorization", "")
        if auth.startswith("Bearer "):
            token = auth.split(" ")[1]

    team_data = LoginService.get_current_team_by_token(token) if token else None

    # Connect to database for round status
    rounds_info = {1: {"status": "pending"}, 2: {"status": "pending"}}
    team_rounds = []
    
    if DATABASE_URL:
        try:
            conn = psycopg2.connect(DATABASE_URL)
            with conn.cursor(cursor_factory=RealDictCursor) as cur:
                cur.execute("SELECT round, status, starts_at, ends_at FROM rounds ORDER BY round;")
                for r in cur.fetchall():
                    rounds_info[r["round"]] = dict(r)

                if team_data:
                    cur.execute(
                        "SELECT round, total_score, clues_solved, qualified_at, qualified_rank FROM team_rounds WHERE team_id = %s",
                        (team_data["team"]["id"],)
                    )
                    team_rounds = [dict(tr) for tr in cur.fetchall()]
            conn.close()
        except Exception as e:
            print("Error querying rounds for lobby:", e)

    content = get_content_data()
    rounds_content = {r["round"]: r for r in content.get("rounds", [])}

    # Determine current active tournament stage
    r1 = rounds_info.get(1, {})
    r2 = rounds_info.get(2, {})

    r1_status = r1.get("status", "pending")
    r2_status = r2.get("status", "pending")

    # Current round for display:
    # Round 2 Intermission Lobby displays when Round 1 has ended AND Round 2 is pending (or live/paused)
    if r1_status == "ended":
        active_round_num = 2
    else:
        active_round_num = 1

    # Check if team is qualified for round 2 if in stage 2
    is_qualified_r2 = False
    if team_data:
        is_qualified_r2 = any(tr.get("round") == 2 for tr in team_rounds)

    round_meta = rounds_content.get(active_round_num, {})

    return {
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
