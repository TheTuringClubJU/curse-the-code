import os
import time
import logging
from typing import Optional
import psycopg2
from psycopg2 import pool
from psycopg2.extras import RealDictCursor
from app.config import DATABASE_URL

logger = logging.getLogger("uvicorn.error")

_db_pool: Optional[pool.ThreadedConnectionPool] = None

# Per-WORKER pool size. Total DB connections = workers * POOL_MAX.
POOL_MIN = int(os.getenv("DB_POOL_MIN", "2"))
POOL_MAX = int(os.getenv("DB_POOL_MAX", "10"))
POOL_WAIT_SECONDS = float(os.getenv("DB_POOL_WAIT", "8"))


def ensure_schema_updates(conn=None):
    """Ensures Round 2 columns and tables exist in PostgreSQL."""
    close_at_end = False
    if conn is None:
        conn = get_db_connection()
        close_at_end = True
    if conn:
        try:
            with conn.cursor() as cur:
                cur.execute("""
                    ALTER TABLE team_rounds ADD COLUMN IF NOT EXISTS penalty_seconds INT NOT NULL DEFAULT 0;
                    ALTER TABLE team_clues ADD COLUMN IF NOT EXISTS is_unlocked BOOLEAN DEFAULT FALSE;
                    ALTER TABLE team_clues ADD COLUMN IF NOT EXISTS unlocked_at TIMESTAMPTZ;
                    CREATE TABLE IF NOT EXISTS team_hints (
                        id SERIAL PRIMARY KEY,
                        team_id INT NOT NULL REFERENCES teams(id) ON DELETE CASCADE,
                        round SMALLINT NOT NULL DEFAULT 1,
                        room_id VARCHAR(50) NOT NULL,
                        hint_category VARCHAR(20) NOT NULL,
                        target_id VARCHAR(50) NOT NULL,
                        penalty_seconds INT NOT NULL DEFAULT 0,
                        hint_text TEXT NOT NULL,
                        created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
                    );
                    CREATE INDEX IF NOT EXISTS idx_team_hints_team_round ON team_hints (team_id, round);
                    CREATE UNIQUE INDEX IF NOT EXISTS idx_team_hints_team_target ON team_hints (team_id, round, target_id);
                    CREATE TABLE IF NOT EXISTS team_forks (
                        id SERIAL PRIMARY KEY,
                        team_id INT NOT NULL REFERENCES teams(id) ON DELETE CASCADE,
                        round SMALLINT NOT NULL DEFAULT 2,
                        fork_id VARCHAR(50) NOT NULL,
                        choice VARCHAR(10) NOT NULL,
                        is_trap BOOLEAN NOT NULL DEFAULT FALSE,
                        penalty_seconds INT NOT NULL DEFAULT 0,
                        created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
                    );
                    CREATE INDEX IF NOT EXISTS idx_team_forks ON team_forks (team_id, fork_id);
                """)
                conn.commit()
        except Exception as e:
            logger.warning(f"ensure_schema_updates notice: {e}")
        finally:
            if close_at_end:
                conn.close()


def init_pool(minconn: int = POOL_MIN, maxconn: int = POOL_MAX) -> Optional[pool.ThreadedConnectionPool]:
    global _db_pool
    if _db_pool is None and DATABASE_URL:
        try:
            _db_pool = pool.ThreadedConnectionPool(
                minconn=minconn,
                maxconn=maxconn,
                dsn=DATABASE_URL,
                connect_timeout=5,
                keepalives=1,
                keepalives_idle=30,
                keepalives_interval=10,
                keepalives_count=5,
            )
            logger.info(f"Initialized PostgreSQL ThreadedConnectionPool (pool size {minconn}-{maxconn})")
        except Exception as e:
            logger.error(f"Failed to initialize ThreadedConnectionPool: {e}")
            _db_pool = None
    return _db_pool


def get_pool() -> Optional[pool.ThreadedConnectionPool]:
    global _db_pool
    if _db_pool is None:
        init_pool()
    return _db_pool


class PooledConnectionProxy:
    """
    Wraps a pooled psycopg2 connection so .close() returns it to the pool.
    Idempotent, and a safety-net __del__ returns leaked connections.
    """
    def __init__(self, raw_conn, connection_pool: pool.ThreadedConnectionPool):
        self._conn = raw_conn
        self._pool = connection_pool
        self._closed = False

    def close(self):
        if self._closed:
            return
        self._closed = True
        conn, self._conn = self._conn, None
        if conn is None:
            return
        broken = False
        try:
            if conn.closed:
                broken = True
            else:
                conn.rollback()
        except Exception:
            broken = True
        try:
            # close=True discards broken connections instead of recycling them
            self._pool.putconn(conn, close=broken)
        except Exception:
            try:
                conn.close()
            except Exception:
                pass

    def __del__(self):
        # Safety net for code paths that forgot to call close()
        try:
            if not self._closed:
                logger.warning("DB connection was never closed explicitly; returning to pool")
                self.close()
        except Exception:
            pass

    def cursor(self, *args, **kwargs):
        return self._conn.cursor(*args, **kwargs)

    def commit(self):
        return self._conn.commit()

    def rollback(self):
        return self._conn.rollback()

    def __enter__(self):
        return self

    def __exit__(self, exc_type, exc_val, exc_tb):
        self.close()

    def __getattr__(self, name):
        return getattr(self._conn, name)


def _checkout(p: pool.ThreadedConnectionPool):
    """Borrow a healthy connection, waiting up to POOL_WAIT_SECONDS if the pool is busy."""
    deadline = time.monotonic() + POOL_WAIT_SECONDS
    while True:
        try:
            raw = p.getconn()
        except pool.PoolError:
            if time.monotonic() >= deadline:
                logger.error(f"Pool exhausted for {POOL_WAIT_SECONDS}s (max={POOL_MAX})")
                return None
            time.sleep(0.05)
            continue

        # Health check
        try:
            if raw.closed:
                raise psycopg2.OperationalError("closed")
            with raw.cursor() as c:
                c.execute("SELECT 1")
            raw.rollback()  # end the implicit transaction so it isn't left idle-in-transaction
            return raw
        except Exception:
            try:
                p.putconn(raw, close=True)
            except Exception:
                pass
            if time.monotonic() >= deadline:
                return None
            # loop and try again with a fresh connection


def get_db_connection():
    """
    Returns a pooled connection. Always call .close() (or use `with`) to return it.
    Returns None if the pool is unavailable or stays exhausted. NO direct-connect fallback.
    """
    p = get_pool()
    if not p:
        return None
    raw = _checkout(p)
    if raw is None:
        return None
    return PooledConnectionProxy(raw, p)
