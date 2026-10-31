import os
from fastapi import APIRouter, Request, Response, HTTPException, Depends
from typing import Optional, Dict, Any
from datetime import datetime, timezone
import psycopg2
from psycopg2.extras import RealDictCursor
from app.config import DATABASE_URL
from app.login.routes import get_client_ip
from app.admin.schemas import AdminLoginRequest, RoundControlRequest, QualifyTeamsRequest
from app.admin.service import AdminService
from app.login.service import get_db_connection, TEAMS_DB, SESSIONS_DB, LoginService

admin_router = APIRouter(prefix="/api/admin", tags=["admin"])

COOKIE_SECURE = os.getenv("COOKIE_SECURE", "false").lower() == "true"
COOKIE_SAMESITE = os.getenv("COOKIE_SAMESITE", "lax")

def get_admin_user(request: Request) -> Dict[str, Any]:
    token = request.cookies.get("admin_session") or request.headers.get("x-admin-token")
    admin = AdminService.get_current_admin_by_token(token) if token else None
    if not admin:
        raise HTTPException(status_code=401, detail={"code": "UNAUTHENTICATED", "message": "Admin login required"})
    return admin

@admin_router.post("/login")
async def admin_login(req: AdminLoginRequest, request: Request, response: Response):
    ip = get_client_ip(request)
    ua = request.headers.get("user-agent", "Unknown")

    res = AdminService.authenticate_admin(req.username, req.password, ip, ua)
    if "error" in res:
        code = res["error"]
        status = 401 if code == "BAD_CREDENTIALS" else (403 if code == "ACCOUNT_DISABLED" else 429)
        raise HTTPException(status_code=status, detail=res)

    token = res["token"]
    response.set_cookie(
        key="admin_session",
        value=token,
        httponly=True,
        samesite=COOKIE_SAMESITE,
        secure=COOKIE_SECURE,
        max_age=8 * 3600
    )

    return {
        "ok": True,
        "token": token,
        "admin": res["admin"]
    }

@admin_router.post("/logout")
async def admin_logout(request: Request, response: Response):
    token = request.cookies.get("admin_session") or request.headers.get("x-admin-token")
    if token:
        AdminService.logout_admin_session(token)
    response.delete_cookie(key="admin_session", samesite=COOKIE_SAMESITE, secure=COOKIE_SECURE)
    return {"ok": True, "message": "Admin signed out"}

@admin_router.get("/me")
async def admin_me(admin: Dict[str, Any] = Depends(get_admin_user)):
    return {"ok": True, "admin": admin}

@admin_router.get("/dashboard")
async def get_dashboard_data(admin: Dict[str, Any] = Depends(get_admin_user)):
    """
    Returns:
    1. Status of Round 1 & Round 2
    2. Active teams vs logged out teams summary
    """
    conn = get_db_connection()
    rounds = {1: {"status": "pending", "starts_at": None, "ends_at": None}, 
              2: {"status": "pending", "starts_at": None, "ends_at": None}}
    teams_list = []

    if conn:
        try:
            with conn.cursor(cursor_factory=RealDictCursor) as cur:
                cur.execute("SELECT round, status, starts_at, ends_at FROM rounds ORDER BY round;")
                for r in cur.fetchall():
                    rounds[r["round"]] = dict(r)

                cur.execute(
                    """
                    SELECT t.id, t.name, t.is_active,
                           COUNT(s.id) as active_sessions_count
                    FROM teams t
                    LEFT JOIN team_sessions s 
                           ON s.team_id = t.id 
                          AND s.ended_at IS NULL 
                          AND s.expires_at > now()
                    GROUP BY t.id, t.name, t.is_active
                    ORDER BY t.name ASC;
                    """
                )
                for t in cur.fetchall():
                    teams_list.append({
                        "id": t["id"],
                        "name": t["name"],
                        "is_active": t["is_active"],
                        "is_logged_in": t["active_sessions_count"] > 0,
                        "active_devices": t["active_sessions_count"]
                    })
        except Exception as e:
            print("Error loading dashboard data:", e)
        finally:
            conn.close()
    else:
        now = datetime.now(timezone.utc)
        for t in TEAMS_DB.values():
            active_count = sum(
                1 for s in SESSIONS_DB.values()
                if s["team_id"] == t["id"] and s["ended_at"] is None and s["expires_at"] > now
            )
            teams_list.append({
                "id": t["id"],
                "name": t["name"],
                "is_active": t.get("is_active", True),
                "is_logged_in": active_count > 0,
                "active_devices": active_count
            })

    logged_in_count = sum(1 for t in teams_list if t["is_logged_in"])
    logged_out_count = len(teams_list) - logged_in_count

    return {
        "ok": True,
        "rounds": rounds,
        "teams": teams_list,
        "presence": {
            "total_teams": len(teams_list),
            "logged_in": logged_in_count,
            "logged_out": logged_out_count
        }
    }

@admin_router.post("/rounds/control")
async def control_round(req: RoundControlRequest, admin: Dict[str, Any] = Depends(get_admin_user)):
    """
    Manual controls for Round 1 and Round 2:
    - start_r1: sets round 1 to live, starts_at = now()
    - end_r1: sets round 1 to ended, ends_at = now()
    - reset_r1: sets round 1 back to pending, starts_at = null, ends_at = null
    - start_r2: sets round 2 to live, starts_at = now()
    - end_r2: sets round 2 to ended, ends_at = now()
    - reset_r2: sets round 2 back to pending, starts_at = null, ends_at = null
    """
    action = req.action
    now = datetime.now(timezone.utc)
    target_round = 1 if "r1" in action else 2
    
    if "reset" in action or "pending" in action:
        new_status = "pending"
    elif "start" in action:
        new_status = "live"
    else:
        new_status = "ended"

    conn = get_db_connection()
    if conn:
        try:
            with conn.cursor() as cur:
                if new_status == "live":
                    cur.execute(
                        "UPDATE rounds SET status = %s, starts_at = %s, ends_at = NULL WHERE round = %s",
                        (new_status, now, target_round)
                    )
                elif new_status == "ended":
                    cur.execute(
                        "UPDATE rounds SET status = %s, ends_at = %s WHERE round = %s",
                        (new_status, now, target_round)
                    )
                else: # pending
                    cur.execute(
                        "UPDATE rounds SET status = %s, starts_at = NULL, ends_at = NULL WHERE round = %s",
                        (new_status, target_round)
                    )
                
                # Log action into admin_log
                cur.execute(
                    "INSERT INTO admin_log (admin_id, action, details, created_at) VALUES (%s, %s, %s, %s)",
                    (admin["id"], f"round.{action}", f'{{"round": {target_round}, "status": "{new_status}"}}', now)
                )
                conn.commit()
        except Exception as e:
            print("Error executing round control:", e)
            raise HTTPException(status_code=500, detail="Database update failed")
        finally:
            conn.close()

    return {
        "ok": True,
        "action": action,
        "round": target_round,
        "status": new_status,
        "timestamp": now.isoformat()
    }

@admin_router.post("/teams/{team_id}/logout")
async def admin_logout_team(team_id: int, admin: Dict[str, Any] = Depends(get_admin_user)):
    """
    Allows organizers to forcibly terminate all active sessions for a specific team.
    """
    sessions_terminated = LoginService.force_logout_team_by_id(team_id, admin.get("username", "admin"))
    return {
        "ok": True,
        "team_id": team_id,
        "sessions_terminated": sessions_terminated,
        "message": f"Terminated {sessions_terminated} session(s) for team #{team_id}"
    }

@admin_router.get("/leaderboard")
async def get_leaderboard(round_num: int = 1, admin: Dict[str, Any] = Depends(get_admin_user)):
    """
    Fetch exact scores and finish times with tie-breaking for Round 1 or Round 2.
    """
    conn = get_db_connection()
    leaderboard = []
    if conn:
        try:
            with conn.cursor(cursor_factory=RealDictCursor) as cur:
                cur.execute(
                    """
                    SELECT 
                        t.id as team_id,
                        t.name as team_name,
                        COALESCE(tr.clues_solved, 0) as clues_solved,
                        COALESCE(tr.total_score, 0)::float as total_score,
                        tr.finished_at,
                        tr.qualified_at,
                        tr.qualified_rank,
                        EXISTS(SELECT 1 FROM team_rounds tr2 WHERE tr2.team_id = t.id AND tr2.round = 2) as is_qualified_r2
                    FROM teams t
                    LEFT JOIN team_rounds tr ON tr.team_id = t.id AND tr.round = %s
                    WHERE t.is_active = true
                    ORDER BY 
                        COALESCE(tr.clues_solved, 0) DESC,
                        COALESCE(tr.total_score, 0) DESC,
                        tr.finished_at ASC NULLS LAST,
                        t.name ASC;
                    """,
                    (round_num,)
                )
                rows = cur.fetchall()
                for idx, r in enumerate(rows, start=1):
                    item = dict(r)
                    item["rank"] = idx
                    if item.get("finished_at"):
                        item["finished_at"] = item["finished_at"].isoformat()
                    if item.get("qualified_at"):
                        item["qualified_at"] = item["qualified_at"].isoformat()
                    leaderboard.append(item)
        except Exception as e:
            print("Error querying leaderboard:", e)
            raise HTTPException(status_code=500, detail="Database leaderboard query failed")
        finally:
            conn.close()

    return {
        "ok": True,
        "round": round_num,
        "leaderboard": leaderboard
    }

@admin_router.get("/qualification/preview")
async def preview_qualification(count: int = 5, admin: Dict[str, Any] = Depends(get_admin_user)):
    """
    Previews the top N teams eligible for Round 2 based on Round 1 ranking.
    """
    conn = get_db_connection()
    preview = []
    if conn:
        try:
            with conn.cursor(cursor_factory=RealDictCursor) as cur:
                cur.execute(
                    """
                    SELECT 
                        t.id as team_id,
                        t.name as team_name,
                        COALESCE(tr.clues_solved, 0) as clues_solved,
                        COALESCE(tr.total_score, 0)::float as total_score,
                        tr.finished_at,
                        EXISTS(SELECT 1 FROM team_rounds tr2 WHERE tr2.team_id = t.id AND tr2.round = 2) as already_qualified
                    FROM teams t
                    LEFT JOIN team_rounds tr ON tr.team_id = t.id AND tr.round = 1
                    WHERE t.is_active = true
                    ORDER BY 
                        COALESCE(tr.clues_solved, 0) DESC,
                        COALESCE(tr.total_score, 0) DESC,
                        tr.finished_at ASC NULLS LAST,
                        t.name ASC
                    LIMIT %s;
                    """,
                    (count,)
                )
                rows = cur.fetchall()
                for idx, r in enumerate(rows, start=1):
                    item = dict(r)
                    item["preview_rank"] = idx
                    if item.get("finished_at"):
                        item["finished_at"] = item["finished_at"].isoformat()
                    preview.append(item)
        except Exception as e:
            print("Error previewing qualification:", e)
            raise HTTPException(status_code=500, detail="Database query failed")
        finally:
            conn.close()

    return {
        "ok": True,
        "count": count,
        "preview": preview
    }

@admin_router.post("/qualification/qualify")
async def qualify_top_n_teams(req: QualifyTeamsRequest, admin: Dict[str, Any] = Depends(get_admin_user)):
    """
    Qualifies the top N teams from Round 1 into Round 2:
    - Sets qualified_at and qualified_rank in team_rounds for round 1
    - Inserts round 2 row in team_rounds
    """
    count = req.count
    now = datetime.now(timezone.utc)
    conn = get_db_connection()
    qualified_teams = []

    if conn:
        try:
            with conn.cursor(cursor_factory=RealDictCursor) as cur:
                # 1. Fetch top N teams from Round 1
                cur.execute(
                    """
                    SELECT 
                        t.id as team_id,
                        t.name as team_name
                    FROM teams t
                    LEFT JOIN team_rounds tr ON tr.team_id = t.id AND tr.round = 1
                    WHERE t.is_active = true
                    ORDER BY 
                        COALESCE(tr.clues_solved, 0) DESC,
                        COALESCE(tr.total_score, 0) DESC,
                        tr.finished_at ASC NULLS LAST,
                        t.name ASC
                    LIMIT %s;
                    """,
                    (count,)
                )
                top_teams = cur.fetchall()

                # Ensure tournament rounds 1 and 2 exist in rounds table
                cur.execute(
                    """
                    INSERT INTO rounds (round, status)
                    VALUES (1, 'pending'), (2, 'pending')
                    ON CONFLICT (round) DO NOTHING;
                    """
                )

                for rank_idx, team in enumerate(top_teams, start=1):
                    t_id = team["team_id"]
                    
                    # Ensure Round 1 row exists
                    cur.execute(
                        """
                        INSERT INTO team_rounds (team_id, round, qualified_at, qualified_rank)
                        VALUES (%s, 1, %s, %s)
                        ON CONFLICT (team_id, round) 
                        DO UPDATE SET qualified_at = EXCLUDED.qualified_at, qualified_rank = EXCLUDED.qualified_rank;
                        """,
                        (t_id, now, rank_idx)
                    )

                    # Grant Round 2 entry
                    cur.execute(
                        """
                        INSERT INTO team_rounds (team_id, round)
                        VALUES (%s, 2)
                        ON CONFLICT (team_id, round) DO NOTHING;
                        """,
                        (t_id,)
                    )

                    qualified_teams.append({
                        "team_id": t_id,
                        "team_name": team["team_name"],
                        "qualified_rank": rank_idx
                    })

                # Log admin action
                cur.execute(
                    "INSERT INTO admin_log (admin_id, action, details, created_at) VALUES (%s, %s, %s, %s)",
                    (admin["id"], "teams.qualify_top_n", f'{{"count": {count}, "teams_count": {len(qualified_teams)}}}', now)
                )
                conn.commit()
        except Exception as e:
            print("Error qualifying top N teams:", e)
            raise HTTPException(status_code=500, detail="Database qualification failed")
        finally:
            conn.close()

    return {
        "ok": True,
        "count": count,
        "qualified_count": len(qualified_teams),
        "teams": qualified_teams
    }
