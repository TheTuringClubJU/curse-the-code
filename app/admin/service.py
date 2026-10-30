import bcrypt
import hashlib
import secrets
import json
from datetime import datetime, timedelta, timezone
from typing import Dict, Any, List, Optional
import psycopg2
from psycopg2.extras import RealDictCursor
from app.config import DATABASE_URL
from app.login.service import get_db_connection, verify_password, hash_token, create_session_token

ADMINS_DB: Dict[str, Dict[str, Any]] = {}
ADMIN_SESSIONS_DB: Dict[str, Dict[str, Any]] = {}

def seed_demo_admin():
    ADMINS_DB.clear()
    salt = bcrypt.gensalt()
    pw_hash = bcrypt.hashpw(b"admin123", salt).decode("utf-8")
    
    conn = get_db_connection()
    if conn:
        try:
            with conn.cursor() as cur:
                cur.execute(
                    """
                    INSERT INTO admins (username, password_hash)
                    VALUES (%s, %s)
                    ON CONFLICT (username) DO NOTHING;
                    """,
                    ("admin", pw_hash)
                )
                conn.commit()
        except Exception as e:
            print("Error seeding admin in DB:", e)
        finally:
            conn.close()

    ADMINS_DB["admin"] = {
        "id": 1,
        "username": "admin",
        "password_hash": pw_hash,
        "is_active": True,
        "failed_logins": 0,
        "locked_until": None,
    }

seed_demo_admin()

class AdminService:
    @staticmethod
    def get_admin_by_username(username: str) -> Optional[Dict[str, Any]]:
        uname = username.strip().lower()
        conn = get_db_connection()
        if conn:
            try:
                with conn.cursor(cursor_factory=RealDictCursor) as cur:
                    cur.execute("SELECT * FROM admins WHERE username = %s", (uname,))
                    row = cur.fetchone()
                    if row:
                        return dict(row)
            except Exception as e:
                print("Error looking up admin in DB:", e)
            finally:
                conn.close()
        return ADMINS_DB.get(uname)

    @classmethod
    def authenticate_admin(cls, username: str, password: str, ip: str, user_agent: str) -> Dict[str, Any]:
        uname = username.strip().lower()
        now = datetime.now(timezone.utc)
        admin = cls.get_admin_by_username(uname)

        if admin and admin.get("locked_until") and admin["locked_until"] > now:
            retry_sec = int((admin["locked_until"] - now).total_seconds())
            return {
                "error": "LOCKED",
                "message": f"Account locked. Try again in {retry_sec // 60}:{retry_sec % 60:02d}",
                "retry_after_sec": retry_sec
            }

        if not admin:
            return {"error": "BAD_CREDENTIALS", "message": "Invalid admin username or password"}

        if not admin.get("is_active", True):
            return {"error": "ACCOUNT_DISABLED", "message": "Admin account is disabled"}

        if not verify_password(password, admin["password_hash"]):
            failed = admin.get("failed_logins", 0) + 1
            locked_until = None
            if failed >= 5:
                locked_until = now + timedelta(minutes=10)
                failed = 0
            admin["failed_logins"] = failed
            admin["locked_until"] = locked_until

            conn = get_db_connection()
            if conn:
                try:
                    with conn.cursor() as cur:
                        cur.execute(
                            "UPDATE admins SET failed_logins = %s, locked_until = %s WHERE id = %s",
                            (failed, locked_until, admin["id"])
                        )
                        conn.commit()
                except Exception as e:
                    print("Error updating admin failed logins:", e)
                finally:
                    conn.close()

            return {"error": "BAD_CREDENTIALS", "message": "Invalid admin username or password"}

        # Success: reset failures and update last login
        admin["failed_logins"] = 0
        admin["locked_until"] = None
        conn = get_db_connection()
        if conn:
            try:
                with conn.cursor() as cur:
                    cur.execute(
                        "UPDATE admins SET failed_logins = 0, locked_until = NULL, last_login_at = %s WHERE id = %s",
                        (now, admin["id"])
                    )
                    conn.commit()
            except Exception as e:
                print("Error resetting admin logins:", e)
            finally:
                conn.close()

        # Create 8-hour admin session (no concurrent limit)
        raw_token = create_session_token()
        t_hash = hash_token(raw_token)
        session_id = secrets.token_hex(16)

        conn = get_db_connection()
        if conn:
            try:
                with conn.cursor(cursor_factory=RealDictCursor) as cur:
                    cur.execute(
                        """
                        INSERT INTO admin_sessions (admin_id, token_hash, ip, user_agent, created_at, expires_at)
                        VALUES (%s, %s, %s, %s, %s, %s)
                        RETURNING id
                        """,
                        (admin["id"], t_hash, ip, user_agent[:200], now, now + timedelta(hours=8))
                    )
                    row = cur.fetchone()
                    if row:
                        session_id = str(row["id"])
                    conn.commit()
            except Exception as e:
                print("Error creating admin session in DB:", e)
            finally:
                conn.close()

        session_record = {
            "id": session_id,
            "admin_id": admin["id"],
            "token_hash": t_hash,
            "ip": ip,
            "user_agent": user_agent,
            "created_at": now,
            "expires_at": now + timedelta(hours=8),
            "revoked_at": None
        }
        ADMIN_SESSIONS_DB[t_hash] = session_record

        return {
            "token": raw_token,
            "admin": {
                "id": admin["id"],
                "username": admin["username"]
            }
        }

    @classmethod
    def get_current_admin_by_token(cls, raw_token: str) -> Optional[Dict[str, Any]]:
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
                        SELECT s.*, a.id as a_id, a.username, a.is_active
                        FROM admin_sessions s
                        JOIN admins a ON a.id = s.admin_id
                        WHERE s.token_hash = %s AND s.revoked_at IS NULL AND s.expires_at > now()
                        """,
                        (t_hash,)
                    )
                    row = cur.fetchone()
                    if row and row["is_active"]:
                        return {
                            "id": row["a_id"],
                            "username": row["username"]
                        }
            except Exception as e:
                print("Error looking up admin session in DB:", e)
            finally:
                conn.close()

        session = ADMIN_SESSIONS_DB.get(t_hash)
        if session and session["revoked_at"] is None and session["expires_at"] > now:
            for a in ADMINS_DB.values():
                if a["id"] == session["admin_id"] and a.get("is_active", True):
                    return {
                        "id": a["id"],
                        "username": a["username"]
                    }
        return None

    @classmethod
    def logout_admin_session(cls, raw_token: str) -> bool:
        if not raw_token:
            return False
        t_hash = hash_token(raw_token)
        now = datetime.now(timezone.utc)

        conn = get_db_connection()
        if conn:
            try:
                with conn.cursor() as cur:
                    cur.execute("UPDATE admin_sessions SET revoked_at = %s WHERE token_hash = %s", (now, t_hash))
                    conn.commit()
            except Exception as e:
                print("Error revoking admin session in DB:", e)
            finally:
                conn.close()

        session = ADMIN_SESSIONS_DB.get(t_hash)
        if session:
            session["revoked_at"] = now
            return True
        return False
