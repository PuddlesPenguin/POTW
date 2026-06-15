import express from 'express';
import pool from '../db.js';

const router = express.Router();

router.get('/current', async (_req, res) => {
  try {
    const result = await pool.query(
      `SELECT
         id,
         title,
         statement_latex,
         solution_latex,
         problem_source,
         proposed_by,
         problem_type,
         is_current,
         is_archived,
         release_date,
         due_date,
         hints,
         difficulty_rating
       FROM problems
       WHERE is_current = true
       ORDER BY
         CASE
           WHEN LOWER(problem_type) LIKE 'comput%' THEN 0
           WHEN LOWER(problem_type) LIKE 'proof%' THEN 1
           ELSE 2
         END,
         release_date DESC,
         id DESC`
    );

    return res.json({ problems: result.rows });
  } catch (error) {
    console.error('Current problems error:', error);
    return res.status(500).json({ message: 'Unable to load current problems.' });
  }
});

export default router;
