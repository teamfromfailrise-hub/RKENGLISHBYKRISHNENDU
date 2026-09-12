-- Run any of these in the Neon SQL Editor that you haven't already run. Each is safe to run
-- more than once — "IF NOT EXISTS" means it won't error or duplicate anything.

-- From the "favourites" update:
ALTER TABLE writings ADD COLUMN IF NOT EXISTS is_favorite boolean NOT NULL DEFAULT false;

-- From the "authentic WBBSE letter layout" update (receiver's and sender's postal address blocks):
ALTER TABLE writings ADD COLUMN IF NOT EXISTS receiver_address text DEFAULT '';
ALTER TABLE writings ADD COLUMN IF NOT EXISTS sender_address text DEFAULT '';

-- A brand-new database doesn't need any of this; the current schema.sql already includes it all.
