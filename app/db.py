import os
import logging
from typing import Optional
import psycopg2
from psycopg2 import pool
from psycopg2.extras import RealDictCursor
from app.config import DATABASE_URL

logger = logging.getLogger("uvicorn.error")

_db_pool: Optional[pool.ThreadedConnectionPool] = None

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

def init_pool(minconn: int = 1, maxconn: int = 10) -> Optional[pool.ThreadedConnectionPool]:
    global _db_pool
    if _db_pool is None and DATABASE_URL:
        try:
            # Persistent connection pool with TCP keepalives and 5s connect timeout
            _db_pool = pool.ThreadedConnectionPool(
                minconn=minconn,
                maxconn=maxconn,
                dsn=DATABASE_URL,
                connect_timeout=5,
                keepalives=1,
                keepalives_idle=30,
                keepalives_interval=10,
                keepalives_count=5
            )
            logger.info("Initialized PostgreSQL ThreadedConnectionPool")
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
    Wraps a pooled psycopg2 connection so that calling .close()
    automatically returns the connection back to the ThreadedConnectionPool
    rather than severing the underlying socket.
    """
    def __init__(self, raw_conn, connection_pool: pool.ThreadedConnectionPool):
        self._conn = raw_conn
        self._pool = connection_pool
        self._closed = False

    def close(self):
        if not self._closed:
            self._closed = True
            try:
                if self._conn and not self._conn.closed:
                    self._conn.rollback()
            except Exception:
                pass
            if self._pool and self._conn:
                try:
                    self._pool.putconn(self._conn)
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
        if exc_type is not None:
            try:
                if self._conn and not self._conn.closed:
                    self._conn.rollback()
            except Exception:
                pass
        self.close()

    def __getattr__(self, name):
        return getattr(self._conn, name)

def get_db_connection():
    """
    Returns a warm connection from the ThreadedConnectionPool.
    Calling .close() on the returned connection safely returns it to the pool.
    """
    p = get_pool()
    if p:
        try:
            for _ in range(3):
                raw = p.getconn()
                if raw.closed != 0:
                    p.putconn(raw, close=True)
                    continue
                try:
                    with raw.cursor() as cur:
                        cur.execute("SELECT 1")
                    raw.rollback()
                    return PooledConnectionProxy(raw, p)
                except Exception:
                    p.putconn(raw, close=True)
            raw = p.getconn()
            return PooledConnectionProxy(raw, p)
        except Exception as e:
            logger.warning(f"Connection pool getconn failed, falling back to direct connect: {e}")

    # Fallback to direct connect if pool is unavailable
    if DATABASE_URL:
        try:
            return psycopg2.connect(DATABASE_URL, connect_timeout=5)
        except Exception as e:
            logger.error(f"Direct DB connection failed: {e}")
    return None
