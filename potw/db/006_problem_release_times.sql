ALTER TABLE problems ADD COLUMN IF NOT EXISTS release_at timestamp with time zone;

-- Preserve the old behavior for already-scheduled problems. New schedules use
-- the exact time selected by an admin.
UPDATE problems
SET release_at = release_date::timestamp AT TIME ZONE 'America/Indiana/Indianapolis'
WHERE release_at IS NULL AND release_date IS NOT NULL;

CREATE INDEX IF NOT EXISTS problems_release_at_idx ON problems (release_at);
