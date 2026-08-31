ALTER TABLE problems ADD COLUMN IF NOT EXISTS hints_enabled boolean NOT NULL DEFAULT true;
ALTER TABLE problems ADD COLUMN IF NOT EXISTS allow_hint_requests boolean NOT NULL DEFAULT true;
ALTER TABLE submissions ADD COLUMN IF NOT EXISTS work_text text;

DO $$
DECLARE constraint_row record;
BEGIN
  FOR constraint_row IN
    SELECT conname
    FROM pg_constraint
    WHERE conrelid = 'submissions'::regclass
      AND contype = 'c'
      AND pg_get_constraintdef(oid) LIKE '%answer_text%file_data%'
  LOOP
    EXECUTE format('ALTER TABLE submissions DROP CONSTRAINT %I', constraint_row.conname);
  END LOOP;
END $$;

ALTER TABLE submissions DROP CONSTRAINT IF EXISTS submissions_content_check;
ALTER TABLE submissions ADD CONSTRAINT submissions_content_check
  CHECK (answer_text IS NOT NULL OR work_text IS NOT NULL OR file_data IS NOT NULL);
