-- Schema for the internal World Cup prediction game.
-- Run with: npm run db:init  (local)  /  npm run db:init:remote  (production)

CREATE TABLE IF NOT EXISTS users (
  id         INTEGER PRIMARY KEY AUTOINCREMENT,
  name       TEXT NOT NULL UNIQUE,
  pin_hash   TEXT NOT NULL,            -- PBKDF2 hash of the player's PIN
  token      TEXT NOT NULL UNIQUE,
  created_at TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE TABLE IF NOT EXISTS fixtures (
  id         INTEGER PRIMARY KEY,
  stage      TEXT NOT NULL,            -- e.g. "Group A", "Round of 16", "Final"
  home_team  TEXT NOT NULL,
  away_team  TEXT NOT NULL,
  kickoff    TEXT NOT NULL,            -- ISO 8601 UTC, e.g. "2026-06-11T20:00:00Z"
  home_score INTEGER,                  -- NULL until the result is entered
  away_score INTEGER,
  status     TEXT NOT NULL DEFAULT 'scheduled'  -- 'scheduled' | 'finished'
);

CREATE TABLE IF NOT EXISTS predictions (
  id         INTEGER PRIMARY KEY AUTOINCREMENT,
  user_id    INTEGER NOT NULL REFERENCES users(id),
  fixture_id INTEGER NOT NULL REFERENCES fixtures(id),
  home_pred  INTEGER NOT NULL,
  away_pred  INTEGER NOT NULL,
  updated_at TEXT NOT NULL DEFAULT (datetime('now')),
  UNIQUE (user_id, fixture_id)
);

CREATE INDEX IF NOT EXISTS idx_predictions_fixture ON predictions (fixture_id);
CREATE INDEX IF NOT EXISTS idx_fixtures_kickoff ON fixtures (kickoff);
