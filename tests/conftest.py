import pytest
from psycopg2 import Error, ProgrammingError
from psycopg2.extensions import parse_dsn

from app.config import CONTENT_FILE, DATABASE_URL

# login.service seeds teams at import time. Check the destination BEFORE importing
# it so neither the old tests nor the Study suite can reset live team sessions.
try:
    _database = parse_dsn(DATABASE_URL or "")
except ProgrammingError:
    _database = {}
if (
    _database.get("host") not in {"localhost", "127.0.0.1", "::1"}
    or _database.get("hostaddr", "127.0.0.1") not in {"127.0.0.1", "::1"}
    or "service" in _database
    or not _database.get("dbname", "").startswith("ctc_test")
    or CONTENT_FILE != "content.test.json"
):
    raise pytest.UsageError(
        "Tests require local PostgreSQL database ctc_test* and CONTENT_FILE=content.test.json."
    )

from app.admin.service import seed_demo_admin
from app.login.service import get_db_connection, seed_demo_teams


@pytest.fixture(scope="session", autouse=True)
def ensure_test_database_initialized():
    """
    Session-level autouse fixture executed before any test file runs.
    Ensures that rounds (1 & 2), admin credentials, and demo teams exist in PostgreSQL.
    """
    conn = get_db_connection()
    if conn:
        try:
            with conn.cursor() as cur:
                cur.execute("""
                    INSERT INTO rounds (round, status)
                    VALUES (1, 'pending'), (2, 'pending')
                    ON CONFLICT (round) DO NOTHING;
                """)
                conn.commit()
        except Error:
            pytest.fail("Could not initialize rounds in the local test database.")
        finally:
            conn.close()
    else:
        pytest.fail("The local PostgreSQL test database must be available.")

    seed_demo_admin()
    seed_demo_teams()
