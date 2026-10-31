import pytest
from app.login.service import get_db_connection, seed_demo_teams
from app.admin.service import seed_demo_admin

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
        except Exception as e:
            print("Error initializing tournament rounds in test session:", e)
        finally:
            conn.close()

    seed_demo_admin()
    seed_demo_teams()
