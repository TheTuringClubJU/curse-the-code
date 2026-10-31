-- ============================================================================
-- CURSE THE CODE - LIVE TOURNAMENT DATABASE SCHEMA
-- Exactly matches all 14 active public tables in the live PostgreSQL instance.
-- ============================================================================

-- 1. ADMINS
CREATE TABLE IF NOT EXISTS admins (
    id SERIAL PRIMARY KEY,
    username VARCHAR(100) NOT NULL UNIQUE,
    password_hash TEXT NOT NULL,
    is_active BOOLEAN NOT NULL DEFAULT TRUE,
    failed_logins INT NOT NULL DEFAULT 0,
    locked_until TIMESTAMPTZ,
    last_login_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 2. ADMIN SESSIONS
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

-- 3. ADMIN ACTION LOG
CREATE TABLE IF NOT EXISTS admin_log (
    id BIGSERIAL PRIMARY KEY,
    admin_id INT REFERENCES admins(id) ON DELETE SET NULL,
    action TEXT NOT NULL,
    target TEXT,
    details JSONB NOT NULL DEFAULT '{}'::jsonb,
    ip INET,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 4. TEAMS
CREATE TABLE IF NOT EXISTS teams (
    id SERIAL PRIMARY KEY,
    name VARCHAR(100) NOT NULL UNIQUE,
    password_hash TEXT NOT NULL,
    members TEXT[] NOT NULL DEFAULT '{}'::text[],
    contact TEXT,
    is_active BOOLEAN NOT NULL DEFAULT TRUE,
    disqualified_reason TEXT,
    failed_logins INT NOT NULL DEFAULT 0,
    locked_until TIMESTAMPTZ,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 5. TEAM SESSIONS
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
    ended_reason VARCHAR(50)
);

-- 6. LOGIN ATTEMPTS AUDIT
CREATE TABLE IF NOT EXISTS login_attempts (
    id BIGSERIAL PRIMARY KEY,
    subject TEXT NOT NULL,
    ip INET,
    success BOOLEAN NOT NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 7. EVENT AUDIT LOG
CREATE TABLE IF NOT EXISTS event_log (
    id BIGSERIAL PRIMARY KEY,
    team_id INT REFERENCES teams(id) ON DELETE SET NULL,
    kind TEXT NOT NULL,
    details JSONB NOT NULL DEFAULT '{}'::jsonb,
    created_at TIMESTAMPTZ NOT NULL DEFAULT clock_timestamp()
);

-- 8. TOURNAMENT ROUNDS
CREATE TABLE IF NOT EXISTS rounds (
    round SMALLINT PRIMARY KEY,
    status VARCHAR(50) NOT NULL DEFAULT 'pending',
    duration_min INT,
    starts_at TIMESTAMPTZ,
    ends_at TIMESTAMPTZ,
    paused_at TIMESTAMPTZ,
    paused_total_sec INT NOT NULL DEFAULT 0,
    hide_scores BOOLEAN NOT NULL DEFAULT FALSE,
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 9. TEAM ROUND PROGRESSION & QUALIFICATION
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

-- 10. TEAM ROOM STATUS (Fragment hunt & basket gate)
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

-- 11. TEAM FRAGMENTS COLLECTED
CREATE TABLE IF NOT EXISTS team_fragments (
    id SERIAL PRIMARY KEY,
    team_id INT NOT NULL REFERENCES teams(id) ON DELETE CASCADE,
    room_id VARCHAR(50) NOT NULL,
    fragment_id VARCHAR(50) NOT NULL,
    is_wrapped BOOLEAN DEFAULT TRUE,
    collected_at TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE (team_id, fragment_id)
);

-- 12. TEAM CLUES (Status, attempts, score per clue)
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

-- 13. SUBMISSIONS (Full audit log of every submitted answer)
CREATE TABLE IF NOT EXISTS submissions (
    id SERIAL PRIMARY KEY,
    team_id INT NOT NULL REFERENCES teams(id) ON DELETE CASCADE,
    clue_id VARCHAR(50) NOT NULL,
    submitted_answer TEXT NOT NULL,
    is_correct BOOLEAN NOT NULL,
    points_awarded NUMERIC(5,2) DEFAULT 0,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 14. HINT USAGE (Penalties & unlocked levels)
CREATE TABLE IF NOT EXISTS hint_usage (
    team_id INT NOT NULL REFERENCES teams(id) ON DELETE CASCADE,
    clue_id VARCHAR(50) NOT NULL,
    hint_level SMALLINT NOT NULL CHECK (hint_level BETWEEN 1 AND 3),
    penalty NUMERIC(4,2) DEFAULT 0,
    unlocked_at TIMESTAMPTZ DEFAULT NOW(),
    PRIMARY KEY (team_id, clue_id, hint_level)
);
