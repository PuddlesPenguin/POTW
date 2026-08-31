-- Keep the bundled Fall season aligned with bundled/current sample problems.
-- User-created seasons are not changed.
UPDATE seasons
SET start_date = LEAST(start_date, current_problem.first_release)
FROM (
  SELECT MIN(release_date) AS first_release
  FROM problems
  WHERE is_current = TRUE AND release_date IS NOT NULL
) AS current_problem
WHERE seasons.name = 'Fall 2026'
  AND current_problem.first_release IS NOT NULL
  AND current_problem.first_release < seasons.start_date;
