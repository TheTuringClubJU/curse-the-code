-- =====================================================================
-- Curse the Code: schema.sql
-- Run once on an empty database. Safe to re-run (IF NOT EXISTS / OR REPLACE).
-- Sections: 0 extensions, 1 enums, 2 helpers, 3 admin side, 4 teams and
-- sessions, 5 rounds, 6 progress, 7 submissions, 8 hints and fragments,
-- 9 scoring adjustments, 10 announcements, 11 logs, 12 views, 13 seed.
-- =====================================================================

-- 0. EXTENSIONS ------------------------------------------------------
CREATE EXTENSION IF NOT EXISTS citext;     -- case-insensitive team names and usernames
CREATE EXTENSION IF NOT EXISTS pgcrypto;   -- gen_random_uuid()

-- 1. ENUMS -----------------------------------------------------------
DO $$ BEGIN CREATE TYPE round_status  AS ENUM ('pending','live','paused','ended');            EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN CREATE TYPE submit_result AS ENUM ('correct','wrong','stage_correct','already_solved','locked','too_fast','rejected'); EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN CREATE TYPE session_end   AS ENUM ('logout','forced_logout','admin_revoked','expired','replaced'); EXCEPTION WHEN duplicate_object THEN NULL; END $$;

-- 2. HELPERS ---------------------------------------------------------
CREATE OR REPLACE FUNCTION set_updated_at() RETURNS trigger AS $$
BEGIN NEW.updated_at = clock_timestamp(); RETURN NEW; END;
$$ LANGUAGE plpgsql;

-- 3. ADMIN SIDE ------------------------------------------------------
CREATE TABLE IF NOT EXISTS admins (
  id             serial PRIMARY KEY,
  username       citext UNIQUE NOT NULL,
  password_hash  text   NOT NULL,
  is_active      boolean NOT NULL DEFAULT true,
  failed_logins  int     NOT NULL DEFAULT 0,
  locked_until   timestamptz,
  last_login_at  timestamptz,
  created_at     timestamptz NOT NULL DEFAULT now(),
  updated_at     timestamptz NOT NULL DEFAULT now()
);
DROP TRIGGER IF EXISTS trg_admins_updated ON admins;
CREATE TRIGGER trg_admins_updated BEFORE UPDATE ON admins FOR EACH ROW EXECUTE FUNCTION set_updated_at();

CREATE TABLE IF NOT EXISTS admin_sessions (
  id           uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  admin_id     int  NOT NULL REFERENCES admins(id) ON DELETE CASCADE,
  token_hash   text NOT NULL UNIQUE,
  ip           inet,
  user_agent   text,
  created_at   timestamptz NOT NULL DEFAULT now(),
  expires_at   timestamptz NOT NULL,
  revoked_at   timestamptz
);
CREATE INDEX IF NOT EXISTS idx_admin_sessions_admin ON admin_sessions (admin_id) WHERE revoked_at IS NULL;

-- 4. TEAMS AND SESSIONS ---------------------------------------------
CREATE TABLE IF NOT EXISTS teams (
  id             serial PRIMARY KEY,
  name           citext UNIQUE NOT NULL,
  password_hash  text   NOT NULL,
  members        text[] NOT NULL DEFAULT '{}',
  contact        text,
  is_active      boolean NOT NULL DEFAULT true,     -- false = disqualified or disabled
  disqualified_reason text,
  failed_logins  int     NOT NULL DEFAULT 0,
  locked_until   timestamptz,
  created_at     timestamptz NOT NULL DEFAULT now(),
  updated_at     timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT teams_name_len CHECK (char_length(name) BETWEEN 2 AND 40)
);
DROP TRIGGER IF EXISTS trg_teams_updated ON teams;
CREATE TRIGGER trg_teams_updated BEFORE UPDATE ON teams FOR EACH ROW EXECUTE FUNCTION set_updated_at();

CREATE TABLE IF NOT EXISTS team_sessions (
  id           uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  team_id      int  NOT NULL REFERENCES teams(id) ON DELETE CASCADE,
  token_hash   text NOT NULL UNIQUE,
  device_label text,
  ip           inet,
  user_agent   text,
  created_at   timestamptz NOT NULL DEFAULT now(),
  last_seen_at timestamptz NOT NULL DEFAULT now(),
  expires_at   timestamptz NOT NULL,
  ended_at     timestamptz,
  ended_reason session_end
);
-- Limit active sessions: max 2 sessions per team
CREATE INDEX IF NOT EXISTS idx_team_sessions_active ON team_sessions (team_id) WHERE ended_at IS NULL;

CREATE TABLE IF NOT EXISTS login_attempts (
  id          bigserial PRIMARY KEY,
  subject     text NOT NULL,                       -- 'team:<name>' or 'admin:<username>'
  ip          inet,
  success     boolean NOT NULL,
  created_at  timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_login_attempts_subject ON login_attempts (subject, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_login_attempts_ip      ON login_attempts (ip, created_at DESC);

-- 5. ROUNDS ----------------------------------------------------------
CREATE TABLE IF NOT EXISTS rounds (
  round          smallint PRIMARY KEY CHECK (round IN (1,2)),
  status         round_status NOT NULL DEFAULT 'pending',
  duration_min   int,
  starts_at      timestamptz,
  ends_at        timestamptz,
  paused_at      timestamptz,
  paused_total_sec int NOT NULL DEFAULT 0,
  hide_scores    boolean NOT NULL DEFAULT false,
  updated_at     timestamptz NOT NULL DEFAULT now()
);
DROP TRIGGER IF EXISTS trg_rounds_updated ON rounds;
CREATE TRIGGER trg_rounds_updated BEFORE UPDATE ON rounds FOR EACH ROW EXECUTE FUNCTION set_updated_at();

-- A team's presence in a round. Round 2 rows exist only for qualifiers.
CREATE TABLE IF NOT EXISTS team_rounds (
  team_id         int      NOT NULL REFERENCES teams(id) ON DELETE CASCADE,
  round           smallint NOT NULL REFERENCES rounds(round),
  total_score     numeric(6,2) NOT NULL DEFAULT 0,
  clues_solved    int NOT NULL DEFAULT 0,
  last_solved_at  timestamptz,
  finished_at     timestamptz,
  qualified_at    timestamptz,
  qualified_rank  int,
  created_at      timestamptz NOT NULL DEFAULT now(),
  updated_at      timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY (team_id, round),
  CONSTRAINT tr_score_nonneg CHECK (total_score >= 0),
  CONSTRAINT tr_solved_range CHECK (clues_solved BETWEEN 0 AND 10)
);
DROP TRIGGER IF EXISTS trg_team_rounds_updated ON team_rounds;
CREATE TRIGGER trg_team_rounds_updated BEFORE UPDATE ON team_rounds FOR EACH ROW EXECUTE FUNCTION set_updated_at();
CREATE INDEX IF NOT EXISTS idx_leaderboard ON team_rounds (round, clues_solved DESC, total_score DESC, last_solved_at ASC);

-- Which content file a round was started with, to detect a wrong file at runtime.
CREATE TABLE IF NOT EXISTS content_fingerprint (
  round        smallint PRIMARY KEY REFERENCES rounds(round),
  pack_label   text NOT NULL,
  file_sha256  text NOT NULL,
  recorded_at  timestamptz NOT NULL DEFAULT now()
);

-- 6. PROGRESS --------------------------------------------------------
CREATE TABLE IF NOT EXISTS team_clues (
  team_id         int  NOT NULL REFERENCES teams(id) ON DELETE CASCADE,
  clue_id         text NOT NULL,
  round           smallint NOT NULL REFERENCES rounds(round),
  room_id         text NOT NULL,
  unlocked_at     timestamptz NOT NULL,
  current_stage   smallint NOT NULL DEFAULT 1,
  solved_at       timestamptz,
  wrong_attempts  int NOT NULL DEFAULT 0,
  last_wrong_at   timestamptz,
  locked_until    timestamptz,
  score           numeric(5,2),
  PRIMARY KEY (team_id, clue_id),
  CONSTRAINT tc_score_range CHECK (score IS NULL OR score BETWEEN 0 AND 10),
  FOREIGN KEY (team_id, round) REFERENCES team_rounds(team_id, round) ON DELETE CASCADE
);
CREATE INDEX IF NOT EXISTS idx_team_clues_room ON team_clues (team_id, room_id);

CREATE TABLE IF NOT EXISTS team_clue_stages (
  team_id     int  NOT NULL,
  clue_id     text NOT NULL,
  stage       smallint NOT NULL,
  solved_at   timestamptz NOT NULL DEFAULT clock_timestamp(),
  PRIMARY KEY (team_id, clue_id, stage),
  FOREIGN KEY (team_id, clue_id) REFERENCES team_clues(team_id, clue_id) ON DELETE CASCADE
);

CREATE TABLE IF NOT EXISTS team_rooms (
  team_id      int  NOT NULL REFERENCES teams(id) ON DELETE CASCADE,
  room_id      text NOT NULL,
  round        smallint NOT NULL REFERENCES rounds(round),
  opened_at    timestamptz NOT NULL,
  completed_at timestamptz,
  PRIMARY KEY (team_id, room_id)
);

-- 7. SUBMISSIONS -----------------------------------------------------
CREATE TABLE IF NOT EXISTS submissions (
  id           bigserial PRIMARY KEY,
  team_id      int  NOT NULL REFERENCES teams(id) ON DELETE CASCADE,
  session_id   uuid REFERENCES team_sessions(id) ON DELETE SET NULL,
  clue_id      text NOT NULL,
  stage        smallint NOT NULL DEFAULT 1,
  request_id   uuid NOT NULL,                       -- idempotency key from the browser
  raw_fields   jsonb NOT NULL,                      -- exactly what the team typed or arranged
  result       submit_result NOT NULL,
  points       numeric(5,2),
  response     jsonb NOT NULL,                      -- the exact response, replayed on retry
  created_at   timestamptz NOT NULL DEFAULT clock_timestamp(),
  UNIQUE (team_id, request_id)
);
CREATE INDEX IF NOT EXISTS idx_submissions_team_time ON submissions (team_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_submissions_clue      ON submissions (clue_id, result);

-- 8. HINTS AND FRAGMENTS --------------------------------------------
CREATE TABLE IF NOT EXISTS hint_usage (
  team_id      int  NOT NULL,
  clue_id      text NOT NULL,
  stage        smallint NOT NULL,
  level        smallint NOT NULL CHECK (level BETWEEN 1 AND 3),
  penalty      numeric(3,1) NOT NULL DEFAULT 0,
  used_at      timestamptz NOT NULL DEFAULT clock_timestamp(),
  request_id   uuid,
  PRIMARY KEY (team_id, clue_id, stage, level),
  FOREIGN KEY (team_id, clue_id) REFERENCES team_clues(team_id, clue_id) ON DELETE CASCADE
);

CREATE TABLE IF NOT EXISTS team_fragments (
  team_id      int  NOT NULL REFERENCES teams(id) ON DELETE CASCADE,
  fragment_id  text NOT NULL,                        -- F01 .. F10
  awarded_by   text NOT NULL,                        -- clue id
  awarded_at   timestamptz NOT NULL DEFAULT clock_timestamp(),
  PRIMARY KEY (team_id, fragment_id)
);

-- 9. SCORING ADJUSTMENTS --------------------------------------------
CREATE TABLE IF NOT EXISTS score_adjustments (
  id          bigserial PRIMARY KEY,
  team_id     int NOT NULL REFERENCES teams(id) ON DELETE CASCADE,
  round       smallint NOT NULL REFERENCES rounds(round),
  delta       numeric(5,2) NOT NULL,
  reason      text NOT NULL CHECK (char_length(reason) >= 3),
  admin_id    int NOT NULL REFERENCES admins(id),
  created_at  timestamptz NOT NULL DEFAULT now()
);

-- 10. LOGS -----------------------------------------------------------
CREATE TABLE IF NOT EXISTS admin_log (
  id          bigserial PRIMARY KEY,
  admin_id    int REFERENCES admins(id),
  action      text NOT NULL,                        -- e.g. 'round.start', 'team.force_logout'
  target      text,
  details     jsonb NOT NULL DEFAULT '{}',
  ip          inet,
  created_at  timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_admin_log_time ON admin_log (created_at DESC);

CREATE TABLE IF NOT EXISTS event_log (
  id          bigserial PRIMARY KEY,
  team_id     int REFERENCES teams(id) ON DELETE SET NULL,
  kind        text NOT NULL,                        -- 'login','logout','room_open','clue_unlock','finish','error'
  details     jsonb NOT NULL DEFAULT '{}',
  created_at  timestamptz NOT NULL DEFAULT clock_timestamp()
);
CREATE INDEX IF NOT EXISTS idx_event_log_team ON event_log (team_id, created_at DESC);

-- 12. VIEWS ----------------------------------------------------------
-- Effective score = clue scores plus manual adjustments.
CREATE OR REPLACE VIEW v_team_round_scores AS
SELECT tr.team_id, tr.round,
       COALESCE((SELECT SUM(tc.score) FROM team_clues tc WHERE tc.team_id = tr.team_id AND tc.round = tr.round), 0)
     + COALESCE((SELECT SUM(sa.delta) FROM score_adjustments sa WHERE sa.team_id = tr.team_id AND sa.round = tr.round), 0)
       AS effective_score
FROM team_rounds tr;

CREATE OR REPLACE VIEW v_leaderboard AS
SELECT tr.round, t.id AS team_id, t.name, tr.clues_solved, tr.total_score, tr.last_solved_at, tr.finished_at,
       RANK() OVER (PARTITION BY tr.round
                    ORDER BY tr.clues_solved DESC, tr.total_score DESC, tr.last_solved_at ASC NULLS LAST, t.id ASC) AS rank
FROM team_rounds tr
JOIN teams t ON t.id = tr.team_id
WHERE t.is_active;

CREATE OR REPLACE VIEW v_room_progress AS
SELECT tc.team_id, tc.round, tc.room_id,
       COUNT(*)                                  AS unlocked_clues,
       COUNT(*) FILTER (WHERE tc.solved_at IS NOT NULL) AS solved_clues
FROM team_clues tc
GROUP BY tc.team_id, tc.round, tc.room_id;

CREATE OR REPLACE VIEW v_active_sessions AS
SELECT s.team_id, t.name, COUNT(*) AS active_sessions, MAX(s.last_seen_at) AS last_seen_at
FROM team_sessions s JOIN teams t ON t.id = s.team_id
WHERE s.ended_at IS NULL AND s.expires_at > now()
GROUP BY s.team_id, t.name;

-- 13. SEED -----------------------------------------------------------
INSERT INTO rounds (round) VALUES (1), (2) ON CONFLICT DO NOTHING;
-- First superadmin is created by the setup script (scripts/create_admin), never by SQL.