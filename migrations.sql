-- Run any of these in the Neon SQL Editor that you haven't already run. Each is safe to run
-- more than once — "IF NOT EXISTS" means it won't error or duplicate anything.

-- From the "favourites" update:
ALTER TABLE writings ADD COLUMN IF NOT EXISTS is_favorite boolean NOT NULL DEFAULT false;

-- From the "authentic WBBSE letter layout" update (receiver's and sender's postal address blocks):
ALTER TABLE writings ADD COLUMN IF NOT EXISTS receiver_address text DEFAULT '';
ALTER TABLE writings ADD COLUMN IF NOT EXISTS sender_address text DEFAULT '';

-- From the "nothing is ever permanently lost" update: deleting now moves a writing to a
-- recoverable Trash instead of erasing it. Safe to run even if you're not sure.
ALTER TABLE writings ADD COLUMN IF NOT EXISTS is_deleted boolean NOT NULL DEFAULT false;
ALTER TABLE writings ADD COLUMN IF NOT EXISTS deleted_at bigint;
CREATE INDEX IF NOT EXISTS idx_writings_deleted ON writings (is_deleted);

-- From the "who is this official letter to" quick-picker update:
ALTER TABLE writings ADD COLUMN IF NOT EXISTS recipient_type text DEFAULT '';

-- A brand-new database doesn't need any of this; the current schema.sql already includes it all.
