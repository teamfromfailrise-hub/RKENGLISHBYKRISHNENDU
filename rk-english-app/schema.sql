-- RK English — database schema
-- Run this once in the Neon SQL Editor (or via psql) against your Neon database,
-- before you deploy the app.

CREATE TABLE IF NOT EXISTS writings (
  id             text PRIMARY KEY,
  title          text NOT NULL,
  board          text NOT NULL,
  class          text NOT NULL,
  chapter        text DEFAULT '',
  type           text NOT NULL,
  body           text NOT NULL,
  recipient_name text DEFAULT '',
  receiver_address text DEFAULT '',
  place          text DEFAULT '',
  opening        text DEFAULT '',
  closing        text DEFAULT '',
  salutation     text DEFAULT '',
  sender_name    text DEFAULT '',
  sender_address text DEFAULT '',
  inst_name      text DEFAULT '',
  notice_subject text DEFAULT '',
  issued_by      text DEFAULT '',
  is_favorite    boolean NOT NULL DEFAULT false,
  created_at     bigint NOT NULL,
  updated_at     bigint NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_writings_board ON writings (board);
CREATE INDEX IF NOT EXISTS idx_writings_class ON writings (class);
CREATE INDEX IF NOT EXISTS idx_writings_type ON writings (type);
CREATE INDEX IF NOT EXISTS idx_writings_updated ON writings (updated_at DESC);

-- Single generic settings store: one row for remembered "last used" defaults (key = 'presets'),
-- one row for her own custom opening/closing phrases and format defaults (key = 'templates').
CREATE TABLE IF NOT EXISTS app_settings (
  key  text PRIMARY KEY,
  data jsonb NOT NULL DEFAULT '{}'::jsonb
);

-- Automatic daily snapshots, written by the Vercel cron job.
CREATE TABLE IF NOT EXISTS backups (
  id            serial PRIMARY KEY,
  created_at    timestamptz NOT NULL DEFAULT now(),
  writing_count int NOT NULL,
  snapshot      jsonb NOT NULL
);
