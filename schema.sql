-- ============================================================================
-- CURSE THE CODE - LIVE TOURNAMENT DATABASE SCHEMA
-- Matches all 14 active tables, enums, triggers, and seed data for production & CI.
-- ============================================================================

-- 1. EXTENSIONS
CREATE EXTENSION IF NOT EXISTS citext;     -- Case-insensitive team names and usernames
CREATE EXTENSION IF NOT EXISTS pgcrypto;   -- gen_random_uuid() for session tokens

-- 2. ENUMS
DO $$ BEGIN 
  CREATE TYPE session_end AS ENUM ('logout','forced_logout','admin_revoked','expired','replaced'); 
EXCEPTION 
  WHEN duplicate_object THEN NULL; 
END $$;

DO $$ BEGIN 
  CREATE TYPE round_status AS ENUM ('pending','live','paused','ended'); 
EXCEPTION 
  WHEN duplicate_object THEN NULL; 
END $$;

-- 3. TRIGGER HELPERS
CREATE OR REPLACE FUNCTION set_updated_at() RETURNS trigger AS $$
BEGIN 
  NEW.updated_at = clock_timestamp(); 
  RETURN NEW; 
END;
$$ LANGUAGE plpgsql;

-- 4. ADMINS
CREATE TABLE IF NOT EXISTS admins (
    id SERIAL PRIMARY KEY,
    username CITEXT NOT NULL UNIQUE,
    password_hash TEXT NOT NULL,
    is_active BOOLEAN NOT NULL DEFAULT TRUE,
    failed_logins INT NOT NULL DEFAULT 0,
    locked_until TIMESTAMPTZ,
    last_login_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

DROP TRIGGER IF EXISTS trg_admins_updated ON admins;
CREATE TRIGGER trg_admins_updated 
BEFORE UPDATE ON admins 
FOR EACH ROW EXECUTE FUNCTION set_updated_at();

-- Seed default admin (admin / admin123)
INSERT INTO admins (username, password_hash) VALUES
    ('admin', '$2b$12$YomkOFAK6PAxvkien8D3V.j7dgQYLZ8yzviTeNkQOwoSoExbeaqJy')
ON CONFLICT (username) DO NOTHING;

-- 5. ADMIN SESSIONS
CREATE TABLE IF NOT EXISTS admin_sessions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    admin_id INT NOT NULL REFERENCES admins(id) ON DELETE CASCADE,
    token_hash TEXT NOT NULL,
    ip INET,
    user_agent TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    expires_at TIMESTAMPTZ NOT NULL,
    revoked_at TIMESTAMPTZ
);

CREATE INDEX IF NOT EXISTS idx_admin_sessions_admin
ON admin_sessions (admin_id)
WHERE revoked_at IS NULL;

-- 6. ADMIN ACTION LOG
CREATE TABLE IF NOT EXISTS admin_log (
    id BIGSERIAL PRIMARY KEY,
    admin_id INT REFERENCES admins(id) ON DELETE SET NULL,
    action TEXT NOT NULL,
    target TEXT,
    details JSONB NOT NULL DEFAULT '{}'::jsonb,
    ip INET,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_admin_log_time 
ON admin_log (created_at DESC);

-- 7. TEAMS
CREATE TABLE IF NOT EXISTS teams (
    id SERIAL PRIMARY KEY,
    name CITEXT NOT NULL UNIQUE,
    password_hash TEXT NOT NULL,
    members TEXT[] NOT NULL DEFAULT '{}'::text[],
    contact TEXT,
    is_active BOOLEAN NOT NULL DEFAULT TRUE,
    disqualified_reason TEXT,
    failed_logins INT NOT NULL DEFAULT 0,
    locked_until TIMESTAMPTZ,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    CONSTRAINT teams_name_len CHECK (char_length(name) BETWEEN 2 AND 40)
);

DROP TRIGGER IF EXISTS trg_teams_updated ON teams;
CREATE TRIGGER trg_teams_updated 
BEFORE UPDATE ON teams 
FOR EACH ROW EXECUTE FUNCTION set_updated_at();

-- 8. TEAM SESSIONS
CREATE TABLE IF NOT EXISTS team_sessions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    team_id INT NOT NULL REFERENCES teams(id) ON DELETE CASCADE,
    token_hash TEXT NOT NULL,
    device_label TEXT,
    ip INET,
    user_agent TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    last_seen_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    expires_at TIMESTAMPTZ NOT NULL,
    ended_at TIMESTAMPTZ,
    ended_reason session_end
);

CREATE INDEX IF NOT EXISTS idx_active_team_sessions 
ON team_sessions (team_id, last_seen_at DESC) 
WHERE ended_at IS NULL;

CREATE INDEX IF NOT EXISTS idx_token_hash 
ON team_sessions (token_hash);

-- 9. LOGIN ATTEMPTS AUDIT
CREATE TABLE IF NOT EXISTS login_attempts (
    id BIGSERIAL PRIMARY KEY,
    subject TEXT NOT NULL,
    ip INET,
    success BOOLEAN NOT NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_login_ip_time 
ON login_attempts (ip, created_at DESC);

-- 10. EVENT AUDIT LOG
CREATE TABLE IF NOT EXISTS event_log (
    id BIGSERIAL PRIMARY KEY,
    team_id INT REFERENCES teams(id) ON DELETE SET NULL,
    kind TEXT NOT NULL,
    details JSONB NOT NULL DEFAULT '{}'::jsonb,
    created_at TIMESTAMPTZ NOT NULL DEFAULT clock_timestamp()
);

CREATE INDEX IF NOT EXISTS idx_event_log_team 
ON event_log (team_id, created_at DESC);

-- 11. TOURNAMENT ROUNDS
CREATE TABLE IF NOT EXISTS rounds (
    round SMALLINT PRIMARY KEY,
    status round_status NOT NULL DEFAULT 'pending',
    duration_min INT,
    starts_at TIMESTAMPTZ,
    ends_at TIMESTAMPTZ,
    paused_at TIMESTAMPTZ,
    paused_total_sec INT NOT NULL DEFAULT 0,
    hide_scores BOOLEAN NOT NULL DEFAULT FALSE,
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

DROP TRIGGER IF EXISTS trg_rounds_updated ON rounds;
CREATE TRIGGER trg_rounds_updated 
BEFORE UPDATE ON rounds 
FOR EACH ROW EXECUTE FUNCTION set_updated_at();

-- Seed initial tournament rounds (Rounds 1 and 2)
INSERT INTO rounds (round, status) VALUES 
    (1, 'pending'), 
    (2, 'pending')
ON CONFLICT (round) DO NOTHING;

-- 12. TEAM ROUND PROGRESSION & QUALIFICATION
CREATE TABLE IF NOT EXISTS team_rounds (
    team_id INT NOT NULL REFERENCES teams(id) ON DELETE CASCADE,
    round SMALLINT NOT NULL REFERENCES rounds(round) ON DELETE CASCADE,
    total_score NUMERIC(7,2) NOT NULL DEFAULT 0,
    clues_solved INT NOT NULL DEFAULT 0,
    last_solved_at TIMESTAMPTZ,
    finished_at TIMESTAMPTZ,
    qualified_at TIMESTAMPTZ,
    qualified_rank INT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    PRIMARY KEY (team_id, round)
);

CREATE INDEX IF NOT EXISTS idx_leaderboard 
ON team_rounds (round, clues_solved DESC, total_score DESC, last_solved_at ASC);

-- Auto-enrollment trigger: whenever a new team is inserted into teams,
-- automatically enroll them into Round 1 of team_rounds
CREATE OR REPLACE FUNCTION auto_enroll_team_in_round1()
RETURNS trigger AS $$
BEGIN
  INSERT INTO rounds (round, status)
  VALUES (1, 'pending')
  ON CONFLICT (round) DO NOTHING;

  INSERT INTO team_rounds (team_id, round)
  VALUES (NEW.id, 1)
  ON CONFLICT (team_id, round) DO NOTHING;
  RETURN NEW;
EXCEPTION
  WHEN foreign_key_violation THEN
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_auto_enroll_round1 ON teams;
CREATE TRIGGER trg_auto_enroll_round1
AFTER INSERT ON teams
FOR EACH ROW
EXECUTE FUNCTION auto_enroll_team_in_round1();

-- 13. TEAM ROOM STATUS (Fragment hunt & basket gate)
CREATE TABLE IF NOT EXISTS team_rooms (
    id SERIAL PRIMARY KEY,
    team_id INT NOT NULL REFERENCES teams(id) ON DELETE CASCADE,
    room_id VARCHAR(50) NOT NULL,
    is_basket_unlocked BOOLEAN DEFAULT FALSE,
    is_completed BOOLEAN DEFAULT FALSE,
    completed_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE (team_id, room_id)
);

-- 14. TEAM FRAGMENTS COLLECTED
CREATE TABLE IF NOT EXISTS team_fragments (
    id SERIAL PRIMARY KEY,
    team_id INT NOT NULL REFERENCES teams(id) ON DELETE CASCADE,
    room_id VARCHAR(50) NOT NULL,
    fragment_id VARCHAR(50) NOT NULL,
    is_wrapped BOOLEAN DEFAULT TRUE,
    collected_at TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE (team_id, fragment_id)
);

-- 15. TEAM CLUES (Status, attempts, score per clue)
CREATE TABLE IF NOT EXISTS team_clues (
    team_id INT NOT NULL REFERENCES teams(id) ON DELETE CASCADE,
    clue_id VARCHAR(50) NOT NULL,
    round SMALLINT NOT NULL DEFAULT 1,
    room_id VARCHAR(50) NOT NULL,
    solved BOOLEAN DEFAULT FALSE,
    attempts INT DEFAULT 0,
    score NUMERIC(5,2) DEFAULT 0,
    solved_at TIMESTAMPTZ,
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    PRIMARY KEY (team_id, clue_id)
);

-- 16. SUBMISSIONS (Full audit log of every submitted answer)
CREATE TABLE IF NOT EXISTS submissions (
    id SERIAL PRIMARY KEY,
    team_id INT NOT NULL REFERENCES teams(id) ON DELETE CASCADE,
    clue_id VARCHAR(50) NOT NULL,
    submitted_answer TEXT NOT NULL,
    is_correct BOOLEAN NOT NULL,
    points_awarded NUMERIC(5,2) DEFAULT 0,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 17. HINT USAGE (Penalties & unlocked levels)
CREATE TABLE IF NOT EXISTS hint_usage (
    team_id INT NOT NULL REFERENCES teams(id) ON DELETE CASCADE,
    clue_id VARCHAR(50) NOT NULL,
    hint_level SMALLINT NOT NULL CHECK (hint_level BETWEEN 1 AND 3),
    penalty NUMERIC(4,2) DEFAULT 0,
    unlocked_at TIMESTAMPTZ DEFAULT NOW(),
    PRIMARY KEY (team_id, clue_id, hint_level)
);
