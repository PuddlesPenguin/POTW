INSERT INTO problems
  (title, statement_latex, problem_source, proposed_by, problem_type, is_current, release_date, due_date, due_at, hints, difficulty_rating)
SELECT
  'A Sum of Squares', 'Find all positive integers $n$ such that $n^2 + 3n + 1$ is a perfect square.',
  'Purdue Math Club', 'POTW Committee', 'Computational', true, CURRENT_DATE, CURRENT_DATE + 7,
  ((CURRENT_DATE + 7)::timestamp + TIME '18:00') AT TIME ZONE 'America/Indiana/Indianapolis',
  'Try comparing consecutive squares.', 2
WHERE NOT EXISTS (SELECT 1 FROM problems WHERE title = 'A Sum of Squares');

INSERT INTO problems
  (title, statement_latex, problem_source, proposed_by, problem_type, is_current, release_date, due_date, due_at, hints, difficulty_rating)
SELECT
  'An Infinite Descent', 'Prove that there are no positive integers $x,y$ satisfying $x^2 - 2y^2 = 0$.',
  'Purdue Math Club', 'POTW Committee', 'Proof-based', true, CURRENT_DATE, CURRENT_DATE + 7,
  ((CURRENT_DATE + 7)::timestamp + TIME '18:00') AT TIME ZONE 'America/Indiana/Indianapolis',
  'Consider parity and divide by the largest common power of $2$.', 2
WHERE NOT EXISTS (SELECT 1 FROM problems WHERE title = 'An Infinite Descent');
