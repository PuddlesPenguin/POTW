ALTER TABLE problems ADD COLUMN IF NOT EXISTS due_at timestamp with time zone;

-- Old due dates allowed work through the displayed date, so migrate them to
-- 11:59 PM Eastern rather than midnight at the start of that date.
UPDATE problems
SET due_at = (due_date::timestamp + TIME '23:59') AT TIME ZONE 'America/Indiana/Indianapolis'
WHERE due_at IS NULL AND due_date IS NOT NULL;

CREATE INDEX IF NOT EXISTS problems_due_at_idx ON problems (due_at);
