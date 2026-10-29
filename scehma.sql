-- =====================================================================
-- Curse the Code: schema.sql (simplified)
-- One college event, fixed teams, two rounds. Run once on an empty DB.
-- Passwords are stored as plain text on purpose: only the organisers can
-- reach the DB. Clue answers are NOT in the DB; they live in the content file.
--
-- Single sources of truth:
--   score      = SUM(team_clues.score)            (fix a score = edit that row)
--   fragments  = reward.fragment of the team's solved clues (from content)
--   rooms      = derived from team_clues + content file (no rooms table)
-- Round control is manual: the admin clicks start / end. Nothing ends a round
-- by itself.
-- =====================================================================

CREATE TABLE IF NOT EXISTS teams (
  id        serial PRIMARY KEY,
  name      text NOT NULL,
  password  text NOT NULL,
  is_active boolean NOT NULL DEFAULT true          -- false = disabled / disqualified
);
CREATE UNIQUE INDEX IF NOT EXISTS uq_teams_name ON teams (lower(name));

-- Cookie value = id. Valid while ended_at IS NULL.
CREATE TABLE IF NOT EXISTS team_sessions (
  id         uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  team_id    int  NOT NULL REFERENCES teams(id) ON DELETE CASCADE,
  created_at timestamptz NOT NULL DEFAULT now(),
  ended_at   timestamptz,
  ended_reason text CHECK (ended_reason IN ('logout','forced','round_ended'))
);
CREATE INDEX IF NOT EXISTS idx_team_sessions_active ON team_sessions (team_id) WHERE ended_at IS NULL;

-- Three organiser accounts, inserted by hand (see seed at the bottom).
CREATE TABLE IF NOT EXISTS admins (
  id       serial PRIMARY KEY,
  username text NOT NULL UNIQUE,
  password text NOT NULL
);

CREATE TABLE IF NOT EXISTS admin_sessions (
  id         uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  admin_id   int NOT NULL REFERENCES admins(id) ON DELETE CASCADE,
  created_at timestamptz NOT NULL DEFAULT now(),
  ended_at   timestamptz
);

-- status: pending -> live -> ended. Only the admin buttons change it.
CREATE TABLE IF NOT EXISTS rounds (
  round       smallint PRIMARY KEY CHECK (round IN (1,2)),
  status      text NOT NULL DEFAULT 'pending' CHECK (status IN ('pending','live','ended')),
  started_at  timestamptz,
  ended_at    timestamptz,
  hide_scores boolean NOT NULL DEFAULT false       -- admin toggle for the public leaderboard
);

-- A team's presence in a round. Round 2 rows exist only for qualified teams.
CREATE TABLE IF NOT EXISTS team_rounds (
  team_id     int      NOT NULL REFERENCES teams(id) ON DELETE CASCADE,
  round       smallint NOT NULL REFERENCES rounds(round),
  finished_at timestamptz,                         -- set when the round's final clue is solved
  PRIMARY KEY (team_id, round)
);

-- One row per unlocked clue. This is the progress + score store.
CREATE TABLE IF NOT EXISTS team_clues (
  team_id        int  NOT NULL REFERENCES teams(id) ON DELETE CASCADE,
  clue_id        text NOT NULL,
  round          smallint NOT NULL REFERENCES rounds(round),
  unlocked_at    timestamptz NOT NULL,
  current_stage  smallint NOT NULL DEFAULT 1,
  wrong_attempts int NOT NULL DEFAULT 0,
  last_wrong_at  timestamptz,
  locked_until   timestamptz,
  solved_at      timestamptz,
  score          numeric(5,2),                     -- null until solved
  PRIMARY KEY (team_id, clue_id)
);

-- Every attempt, for the admin log and audit. Not used for scoring.
CREATE TABLE IF NOT EXISTS submissions (
  id         bigserial PRIMARY KEY,
  team_id    int  NOT NULL REFERENCES teams(id) ON DELETE CASCADE,
  clue_id    text NOT NULL,
  stage      smallint NOT NULL,
  fields     jsonb NOT NULL,
  result     text NOT NULL,                        -- correct, stage_correct, wrong, already_solved, locked, too_fast
  points     numeric(5,2),
  created_at timestamptz NOT NULL DEFAULT clock_timestamp()
);
CREATE INDEX IF NOT EXISTS idx_submissions_team ON submissions (team_id, created_at DESC);

-- Penalty is looked up from the content file by level, not stored.
CREATE TABLE IF NOT EXISTS hint_usage (
  team_id int  NOT NULL REFERENCES teams(id) ON DELETE CASCADE,
  clue_id text NOT NULL,
  stage   smallint NOT NULL,
  level   smallint NOT NULL CHECK (level BETWEEN 1 AND 3),
  used_at timestamptz NOT NULL DEFAULT clock_timestamp(),
  PRIMARY KEY (team_id, clue_id, stage, level)
);

-- The only view: used by the public board, the admin board and qualification.
CREATE OR REPLACE VIEW v_leaderboard AS
SELECT tr.round, t.id AS team_id, t.name,
       COUNT(tc.solved_at)               AS clues_solved,
       COALESCE(SUM(tc.score), 0)        AS score,
       MAX(tc.solved_at)                 AS last_solved_at,
       tr.finished_at,
       RANK() OVER (PARTITION BY tr.round
         ORDER BY (tr.finished_at IS NULL),            -- finished teams first
                  COUNT(tc.solved_at) DESC,
                  COALESCE(SUM(tc.score), 0) DESC,
                  MAX(tc.solved_at) ASC NULLS LAST,
                  t.id) AS rank
FROM team_rounds tr
JOIN teams t ON t.id = tr.team_id AND t.is_active
LEFT JOIN team_clues tc ON tc.team_id = tr.team_id AND tc.round = tr.round
GROUP BY tr.round, t.id, t.name, tr.finished_at;

-- SEED ---------------------------------------------------------------
INSERT INTO rounds (round) VALUES (1), (2) ON CONFLICT DO NOTHING;
-- Organisers and teams are plain inserts, e.g.:
--   INSERT INTO admins (username, password) VALUES ('organiser1','changeme'), ('organiser2','changeme'), ('organiser3','changeme');
--   INSERT INTO teams (name, password) VALUES ('Team Alpha','pw1'), ('Team Beta','pw2');
-- Reset a team password:  UPDATE teams SET password='newpw' WHERE name='Team Alpha';
-- Fix a score:            UPDATE team_clues SET score=7.5 WHERE team_id=3 AND clue_id='R1-04';