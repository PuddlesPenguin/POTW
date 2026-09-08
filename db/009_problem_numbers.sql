ALTER TABLE problems ADD COLUMN IF NOT EXISTS problem_number integer;
ALTER TABLE problems DROP CONSTRAINT IF EXISTS problems_problem_number_check;
ALTER TABLE problems ADD CONSTRAINT problems_problem_number_check CHECK (problem_number > 0);
