ALTER TABLE hint_requests ADD COLUMN IF NOT EXISTS response text;
ALTER TABLE hint_requests ADD COLUMN IF NOT EXISTS responded_at timestamp without time zone;
ALTER TABLE hint_requests ADD COLUMN IF NOT EXISTS responded_by integer REFERENCES users(id) ON DELETE SET NULL;
