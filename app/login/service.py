import bcrypt
import hashlib
import secrets
import json
from datetime import datetime, timedelta, timezone
from typing import Dict, Any, List, Optional
import psycopg2
from psycopg2.extras import RealDictCursor
from app.config import MAX_SESSIONS_PER_TEAM, DATABASE_URL

# Fallback in-memory store if DATABASE_URL is not set
TEAMS_DB: Dict[str, Dict[str, Any]] = {}
SESSIONS_DB: Dict[str, Dict[str, Any]] = {}
LOGIN_ATTEMPTS: List[Dict[str, Any]] = []
EVENT_LOG: List[Dict[str, Any]] = []

from app.db import get_db_connection

def seed_demo_teams():
    # Helper to seed demo teams into memory or database if empty
    TEAMS_DB.clear()
    demo_teams = [
        {"name": "Team Cipher", "password": "password123"},
        {"name": "Shadow Hackers", "password": "halloweennight"},
        {"name": "Curse Breakers", "password": "secretpass"}
    ]
    
    conn = get_db_connection()
    if conn:
        try:
            with conn.cursor() as cur:
                # Ensure tournament rounds 1 and 2 exist
                cur.execute(
                    """
                    INSERT INTO rounds (round, status)
                    VALUES (1, 'pending'), (2, 'pending')
                    ON CONFLICT (round) DO NOTHING;
                    """
                )
                # Reset test sessions and failed login lockout state between test runs
                cur.execute("UPDATE teams SET failed_logins = 0, locked_until = NULL, is_active = true WHERE name IN ('Team Cipher', 'Shadow Hackers', 'Curse Breakers');")
                cur.execute("DELETE FROM team_sessions WHERE team_id IN (SELECT id FROM teams WHERE name IN ('Team Cipher', 'Shadow Hackers', 'Curse Breakers'));")
                for t in demo_teams:
                    salt = bcrypt.gensalt()
                    pw_hash = bcrypt.hashpw(t["password"].encode("utf-8"), salt).decode("utf-8")
                    cur.execute(
                        """
                        INSERT INTO teams (name, password_hash, members, contact)
                        VALUES (%s, %s, %s, %s)
                        ON CONFLICT (name) DO NOTHING;
                        """,
                        (t["name"], pw_hash, ['Member 1', 'Member 2'], 'team@cursethecode.local')
                    )
                conn.commit()
        except Exception as e:
            print("Error seeding teams to DB:", e)
        finally:
            conn.close()

    for t in demo_teams:
        salt = bcrypt.gensalt()
        pw_hash = bcrypt.hashpw(t["password"].encode("utf-8"), salt).decode("utf-8")
        t_key = t["name"].lower()
        TEAMS_DB[t_key] = {
            "id": len(TEAMS_DB) + 1,
            "name": t["name"],
            "password_hash": pw_hash,
            "members": ["Member 1", "Member 2"],
            "contact": "team@cursethecode.local",
            "is_active": True,
            "disqualified_reason": None,
            "failed_logins": 0,
            "locked_until": None,
        }

seed_demo_teams()

def verify_password(plain_password: str, hashed_password: str) -> bool:
    try:
        return bcrypt.checkpw(plain_password.encode("utf-8"), hashed_password.encode("utf-8"))
    except Exception:
        return False

def hash_token(token: str) -> str:
    return hashlib.sha256(token.encode("utf-8")).hexdigest()

def create_session_token() -> str:
    return secrets.token_urlsafe(32)

class LoginService:
    @staticmethod
    def get_team_by_name(team_name: str) -> Optional[Dict[str, Any]]:
        conn = get_db_connection()
        if conn:
            try:
                with conn.cursor(cursor_factory=RealDictCursor) as cur:
                    cur.execute("SELECT * FROM teams WHERE name = %s", (team_name.strip(),))
                    row = cur.fetchone()
                    if row:
                        return dict(row)
            except Exception as e:
                print("Error reading team from DB:", e)
            finally:
                conn.close()
        return TEAMS_DB.get(team_name.strip().lower())

    @staticmethod
    def update_team_lock(team_id: int, failed_logins: int, locked_until: Optional[datetime]):
        conn = get_db_connection()
        if conn:
            try:
                with conn.cursor() as cur:
                    cur.execute(
                        "UPDATE teams SET failed_logins = %s, locked_until = %s WHERE id = %s",
                        (failed_logins, locked_until, team_id)
                    )
                    conn.commit()
            except Exception as e:
                print("Error updating team lock in DB:", e)
            finally:
                conn.close()

    @staticmethod
    def record_login_attempt(subject: str, ip: str, success: bool):
        conn = get_db_connection()
        if conn:
            try:
                with conn.cursor() as cur:
                    cur.execute(
                        "INSERT INTO login_attempts (subject, ip, success, created_at) VALUES (%s, %s, %s, %s)",
                        (subject, ip, success, datetime.now(timezone.utc))
                    )
                    conn.commit()
            except Exception as e:
                print("Error inserting login attempt:", e)
            finally:
                conn.close()
        LOGIN_ATTEMPTS.append({
            "subject": subject,
            "ip": ip,
            "success": success,
            "created_at": datetime.now(timezone.utc)
        })

    @staticmethod
    def record_event(team_id: Optional[int], kind: str, details: Dict[str, Any]):
        conn = get_db_connection()
        if conn:
            try:
                with conn.cursor() as cur:
                    cur.execute(
                        "INSERT INTO event_log (team_id, kind, details, created_at) VALUES (%s, %s, %s, %s)",
                        (team_id, kind, json.dumps(details), datetime.now(timezone.utc))
                    )
                    conn.commit()
            except Exception as e:
                print("Error recording event:", e)
            finally:
                conn.close()
        EVENT_LOG.append({
            "team_id": team_id,
            "kind": kind,
            "details": details,
            "created_at": datetime.now(timezone.utc)
        })

    @staticmethod
    def get_active_sessions(team_id: int) -> List[Dict[str, Any]]:
        conn = get_db_connection()
        if conn:
            try:
                with conn.cursor(cursor_factory=RealDictCursor) as cur:
                    cur.execute(
                        "SELECT * FROM team_sessions WHERE team_id = %s AND ended_at IS NULL AND expires_at > now()",
                        (team_id,)
                    )
                    return [dict(r) for r in cur.fetchall()]
            except Exception as e:
                print("Error fetching active sessions:", e)
            finally:
                conn.close()

        now = datetime.now(timezone.utc)
        active = []
        for s in SESSIONS_DB.values():
            if s["team_id"] == team_id and s["ended_at"] is None and s["expires_at"] > now:
                active.append(s)
        return active

    @classmethod
    def authenticate_team(cls, team_name: str, password: str, ip: str, user_agent: str, device_label: Optional[str] = None):
        t_key = team_name.strip()
        now = datetime.now(timezone.utc)
        team = cls.get_team_by_name(t_key)

        # Rate limit / brute force check (BE-18)
        if team and team.get("locked_until") and team["locked_until"] > now:
            retry_sec = int((team["locked_until"] - now).total_seconds())
            cls.record_event(team["id"], "refused_login", {"reason": "account_locked", "ip": ip})
            return {"error": "LOCKED", "message": f"Too many attempts. Try again in {retry_sec // 60}:{retry_sec % 60:02d}", "retry_after_sec": retry_sec}

        if not team:
            cls.record_login_attempt(f"team:{team_name}", ip, False)
            cls.record_event(None, "refused_login", {"reason": "bad_credentials", "team_name": team_name, "ip": ip})
            return {"error": "BAD_CREDENTIALS", "message": "Team name or password is wrong"}

        if not team.get("is_active", True):
            cls.record_event(team["id"], "refused_login", {"reason": "disabled", "ip": ip})
            return {"error": "ACCOUNT_DISABLED", "message": "This team is disabled. Contact the organisers."}

        if not verify_password(password, team["password_hash"]):
            failed = team.get("failed_logins", 0) + 1
            locked_until = None
            if failed >= 8:
                locked_until = now + timedelta(minutes=5)
                failed = 0
            team["failed_logins"] = failed
            team["locked_until"] = locked_until
            cls.update_team_lock(team["id"], failed, locked_until)
            cls.record_login_attempt(f"team:{team_name}", ip, False)
            cls.record_event(team["id"], "refused_login", {"reason": "bad_credentials", "ip": ip})
            return {"error": "BAD_CREDENTIALS", "message": "Team name or password is wrong"}

        # Success - reset failed logins
        team["failed_logins"] = 0
        team["locked_until"] = None
        cls.update_team_lock(team["id"], 0, None)
        cls.record_login_attempt(f"team:{team_name}", ip, True)

        # Check session limit: max 2 sessions per team (BE-11)
        active_sessions = cls.get_active_sessions(team["id"])
        if len(active_sessions) >= MAX_SESSIONS_PER_TEAM:
            devices = [s.get("device_label") or "Active Device" for s in active_sessions]
            cls.record_event(team["id"], "refused_login", {"reason": "session_limit", "ip": ip})
            return {
                "error": "SESSION_LIMIT",
                "message": f"Your team is already signed in on {len(active_sessions)} devices.",
                "active_sessions": len(active_sessions),
                "devices": devices
            }

        # Create session (12 hours sliding expiry)
        raw_token = create_session_token()
        t_hash = hash_token(raw_token)
        dev_label = device_label or ("Browser on " + (user_agent.split(")")[0].split("(")[-1] if "(" in user_agent else "Device"))

        conn = get_db_connection()
        session_id = None
        if conn:
            try:
                with conn.cursor(cursor_factory=RealDictCursor) as cur:
                    cur.execute(
                        """
                        INSERT INTO team_sessions (team_id, token_hash, device_label, ip, user_agent, created_at, last_seen_at, expires_at)
                        VALUES (%s, %s, %s, %s, %s, %s, %s, %s)
                        RETURNING id
                        """,
                        (team["id"], t_hash, dev_label[:60], ip, user_agent[:200], now, now, now + timedelta(hours=12))
                    )
                    row = cur.fetchone()
                    if row:
                        session_id = str(row["id"])
                    conn.commit()
            except Exception as e:
                print("Error inserting team session into DB:", e)
            finally:
                conn.close()

        if not session_id:
            session_id = secrets.token_hex(16)

        session_record = {
            "id": session_id,
            "team_id": team["id"],
            "token_hash": t_hash,
            "device_label": dev_label[:60],
            "ip": ip,
            "user_agent": user_agent[:200],
            "created_at": now,
            "last_seen_at": now,
            "expires_at": now + timedelta(hours=12),
            "ended_at": None,
            "ended_reason": None
        }
        SESSIONS_DB[t_hash] = session_record
        cls.record_event(team["id"], "login", {"session_id": session_id, "ip": ip, "device": dev_label})

        return {
            "token": raw_token,
            "session": session_record,
            "team": {
                "id": team["id"],
                "name": team["name"],
                "members": team.get("members", []),
                "contact": team.get("contact", "")
            },
            "active_sessions": len(active_sessions) + 1
        }

    @classmethod
    def logout_all_sessions(cls, team_name: str, password: str, ip: str) -> Dict[str, Any]:
        t_key = team_name.strip()
        now = datetime.now(timezone.utc)
        team = cls.get_team_by_name(t_key)

        if not team or not verify_password(password, team["password_hash"]):
            cls.record_login_attempt(f"team:{team_name}", ip, False)
            cls.record_event(None, "refused_logout_all", {"reason": "bad_credentials", "team_name": team_name, "ip": ip})
            return {"error": "BAD_CREDENTIALS", "message": "Team name or password is wrong"}

        # Idempotent: end all active sessions
        count = 0
        conn = get_db_connection()
        if conn:
            try:
                with conn.cursor() as cur:
                    cur.execute(
                        "UPDATE team_sessions SET ended_at = %s, ended_reason = 'forced_logout' WHERE team_id = %s AND ended_at IS NULL",
                        (now, team["id"])
                    )
                    count = cur.rowcount
                    conn.commit()
            except Exception as e:
                print("Error updating forced logout in DB:", e)
            finally:
                conn.close()

        # Always update memory cache as well
        active_sessions = cls.get_active_sessions(team["id"])
        for s in active_sessions:
            s["ended_at"] = now
            s["ended_reason"] = "forced_logout"
            if not conn:
                count += 1
        for s in SESSIONS_DB.values():
            if s["team_id"] == team["id"]:
                s["ended_at"] = now
                s["ended_reason"] = "forced_logout"

        cls.record_event(team["id"], "forced_logout", {"sessions_ended": count, "ip": ip})
        return {
            "ok": True,
            "sessions_ended": count,
            "message": f"{count} session(s) ended. You can sign in now."
        }

    @classmethod
    def force_logout_team_by_id(cls, team_id: int, admin_handle: str = "admin") -> int:
        """
        Admin-facing helper to immediately terminate all active sessions for a specific team.
        """
        now = datetime.now(timezone.utc)
        count = 0
        conn = get_db_connection()
        if conn:
            try:
                with conn.cursor() as cur:
                    cur.execute(
                        "UPDATE team_sessions SET ended_at = %s, ended_reason = 'admin_revoked' WHERE team_id = %s AND ended_at IS NULL",
                        (now, team_id)
                    )
                    count = cur.rowcount
                    conn.commit()
            except Exception as e:
                print("Error admin logging out team in DB:", e)
            finally:
                conn.close()

        for s in SESSIONS_DB.values():
            if s["team_id"] == team_id and s.get("ended_at") is None:
                s["ended_at"] = now
                s["ended_reason"] = "admin_revoked"
                if not conn:
                    count += 1

        cls.record_event(team_id, "admin_forced_logout", {"sessions_ended": count, "admin": admin_handle})
        return count

    @classmethod
    def get_current_team_by_token(cls, raw_token: str) -> Optional[Dict[str, Any]]:
        if not raw_token:
            return None
        t_hash = hash_token(raw_token)
        now = datetime.now(timezone.utc)

        conn = get_db_connection()
        if conn:
            try:
                with conn.cursor(cursor_factory=RealDictCursor) as cur:
                    cur.execute(
                        """
                        SELECT s.*, t.id as t_id, t.name as t_name, t.members, t.contact, t.is_active
                        FROM team_sessions s
                        JOIN teams t ON t.id = s.team_id
                        WHERE s.token_hash = %s
                        """,
                        (t_hash,)
                    )
                    row = cur.fetchone()
                    if row:
                        if row["ended_at"] is not None or row["expires_at"] <= now or not row["is_active"]:
                            return None

                        cur.execute(
                            "UPDATE team_sessions SET last_seen_at = %s, expires_at = %s WHERE id = %s",
                            (now, now + timedelta(hours=12), row["id"])
                        )
                        conn.commit()
                        team_dict = {
                            "id": row["t_id"],
                            "name": row["t_name"],
                            "members": row["members"],
                            "contact": row["contact"],
                            "is_active": row["is_active"]
                        }
                        return {
                            "team": team_dict,
                            "session": dict(row),
                            "active_sessions": len(cls.get_active_sessions(row["team_id"]))
                        }
            except Exception as e:
                print("Error looking up session from DB:", e)
            finally:
                conn.close()

        session = SESSIONS_DB.get(t_hash)
        if not session or session["ended_at"] is not None or session["expires_at"] <= now:
            return None

        session["last_seen_at"] = now
        session["expires_at"] = now + timedelta(hours=12)

        for team in TEAMS_DB.values():
            if team["id"] == session["team_id"]:
                return {
                    "team": team,
                    "session": session,
                    "active_sessions": len(cls.get_active_sessions(team["id"]))
                }
        return None

    @classmethod
    def logout_single_session(cls, raw_token: str) -> bool:
        if not raw_token:
            return False
        t_hash = hash_token(raw_token)
        now = datetime.now(timezone.utc)

        conn = get_db_connection()
        if conn:
            try:
                with conn.cursor(cursor_factory=RealDictCursor) as cur:
                    cur.execute(
                        "UPDATE team_sessions SET ended_at = %s, ended_reason = 'logout' WHERE token_hash = %s AND ended_at IS NULL RETURNING team_id, id",
                        (now, t_hash)
                    )
                    row = cur.fetchone()
                    conn.commit()
                    if row:
                        cls.record_event(row["team_id"], "logout", {"session_id": str(row["id"])})
                        return True
            except Exception as e:
                print("Error logging out in DB:", e)
            finally:
                conn.close()

        session = SESSIONS_DB.get(t_hash)
        if session and session["ended_at"] is None:
            session["ended_at"] = now
            session["ended_reason"] = "logout"
            cls.record_event(session["team_id"], "logout", {"session_id": session["id"]})
            return True
        return False
