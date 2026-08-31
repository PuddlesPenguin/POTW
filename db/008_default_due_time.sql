-- Weekly problems close at 6:00 PM Eastern. Only adjust the 11:59 PM values
-- produced by migration 007; preserve any custom due times chosen by admins.
UPDATE problems
SET due_at = (due_date::timestamp + TIME '18:00') AT TIME ZONE 'America/Indiana/Indianapolis'
WHERE due_date IS NOT NULL
  AND due_at IS NOT NULL
  AND (due_at AT TIME ZONE 'America/Indiana/Indianapolis')::time = TIME '23:59';
