import bcrypt from 'bcryptjs'
import cors from 'cors'
import crypto from 'crypto'
import express from 'express'
import { rateLimit } from 'express-rate-limit'
import multer from 'multer'
import 'dotenv/config'
import { createToken, requireAdmin, requireAuth, requireSuperuser } from './auth.js'
import { pool, query } from './db.js'
import { sendPasswordResetEmail, sendVerificationEmail } from './email.js'

const app = express()
const port = Number(process.env.PORT || 3000)
const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 5 * 1024 * 1024, files: 1 },
})

if (process.env.TRUST_PROXY) app.set('trust proxy', Number(process.env.TRUST_PROXY) || process.env.TRUST_PROXY)

const frontendOrigin = (process.env.FRONTEND_URL || 'http://localhost:5173').replace(/\/+$/, '')
app.use(cors({ origin: frontendOrigin }))
app.use(express.json({ limit: '100kb' }))
app.use('/api', rateLimit({
  windowMs: 15 * 60 * 1000,
  limit: 300,
  standardHeaders: 'draft-8',
  legacyHeaders: false,
  message: { message: 'Too many requests. Please wait a few minutes and try again.' },
}))

const registerLimiter = rateLimit({
  windowMs: 60 * 60 * 1000,
  limit: 10,
  standardHeaders: 'draft-8',
  legacyHeaders: false,
  message: { message: 'Too many signup attempts. Please try again later.' },
})
const loginLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  limit: 10,
  skipSuccessfulRequests: true,
  standardHeaders: 'draft-8',
  legacyHeaders: false,
  message: { message: 'Too many failed login attempts. Please wait 15 minutes and try again.' },
})
const emailLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  limit: 5,
  standardHeaders: 'draft-8',
  legacyHeaders: false,
  message: { message: 'Too many email requests. Please wait 15 minutes and try again.' },
})

function createOneTimeToken() {
  const token = crypto.randomBytes(32).toString('hex')
  return { token, hash: crypto.createHash('sha256').update(token).digest('hex') }
}

function hashToken(token) {
  return crypto.createHash('sha256').update(token).digest('hex')
}

const publicUser = (row, token) => ({
  id: row.id,
  username: row.username,
  email: row.email,
  is_admin: row.is_admin,
  is_superuser: row.is_superuser,
  leaderboard_hidden: row.leaderboard_hidden,
  ...(token ? { token } : {}),
})

const publicProblemColumns = `
  id, title, statement_latex, problem_source, proposed_by, problem_type,
  is_current, is_archived, release_date, release_at, due_date, due_at, hints, hints_enabled,
  allow_hint_requests, difficulty_rating
`

app.get('/api/health', async (_req, res, next) => {
  try {
    await query('SELECT 1')
    res.json({ status: 'ok' })
  } catch (error) {
    next(error)
  }
})

app.post('/api/auth/register', registerLimiter, async (req, res, next) => {
  try {
    const username = String(req.body.username || '').trim()
    const email = String(req.body.email || '').trim().toLowerCase()
    const password = String(req.body.password || '')

    if (!/^[a-zA-Z0-9_-]{3,30}$/.test(username)) {
      return res.status(400).json({ message: 'Username must be 3–30 letters, numbers, dashes, or underscores.' })
    }
    if (!/^\S+@\S+\.\S+$/.test(email)) {
      return res.status(400).json({ message: 'Enter a valid email address.' })
    }
    if (password.length < 8) {
      return res.status(400).json({ message: 'Password must be at least 8 characters.' })
    }

    // An abandoned, unverified signup must not reserve an identity forever.
    // Verified accounts remain protected from duplicate usernames/emails.
    const existing = await query(
      'SELECT id, email_verified FROM users WHERE username = $1 OR email = $2',
      [username, email],
    )
    if (existing.rows.some((row) => row.email_verified)) {
      return res.status(409).json({ message: 'That username or email is already registered.' })
    }
    if (existing.rows.length > 0) {
      await query('DELETE FROM users WHERE id = ANY($1::integer[])', [existing.rows.map((row) => row.id)])
    }

    const passwordHash = await bcrypt.hash(password, 12)
    const verification = createOneTimeToken()
    const result = await query(
      `INSERT INTO users
         (username, email, password_hash, email_verified, email_verification_token_hash,
          email_verification_expires_at, email_verification_sent_at)
       VALUES ($1, $2, $3, FALSE, $4, CURRENT_TIMESTAMP + INTERVAL '24 hours', CURRENT_TIMESTAMP)
       RETURNING id, username, email`,
      [username, email, passwordHash, verification.hash],
    )
    const developmentUrl = await sendVerificationEmail(result.rows[0].email, verification.token)
    res.status(201).json({
      message: 'Account created. Check your email to verify it before logging in.',
      ...(developmentUrl ? { development_url: developmentUrl } : {}),
    })
  } catch (error) {
    if (error.code === '23505') {
      return res.status(409).json({ message: 'That username or email is already registered.' })
    }
    next(error)
  }
})

app.post('/api/auth/verify-email', emailLimiter, async (req, res, next) => {
  try {
    const token = String(req.body.token || '')
    if (!/^[a-f0-9]{64}$/.test(token)) return res.status(400).json({ message: 'That verification link is invalid.' })
    const result = await query(
      `UPDATE users
       SET email_verified = TRUE, email_verification_token_hash = NULL,
           email_verification_expires_at = NULL, email_verification_sent_at = NULL
       WHERE email_verification_token_hash = $1
         AND email_verification_expires_at > CURRENT_TIMESTAMP
       RETURNING id`,
      [hashToken(token)],
    )
    if (!result.rows[0]) return res.status(400).json({ message: 'That verification link is invalid or has expired.' })
    res.json({ message: 'Email verified. You can log in now.' })
  } catch (error) {
    next(error)
  }
})

app.post('/api/auth/resend-verification', emailLimiter, async (req, res, next) => {
  try {
    const email = String(req.body.email || '').trim().toLowerCase()
    const found = await query(
      `SELECT id, email FROM users
       WHERE LOWER(email) = LOWER($1) AND email_verified = FALSE
         AND (email_verification_sent_at IS NULL OR email_verification_sent_at < CURRENT_TIMESTAMP - INTERVAL '2 minutes')`,
      [email],
    )
    let developmentUrl = null
    if (found.rows[0]) {
      const verification = createOneTimeToken()
      await query(
        `UPDATE users SET email_verification_token_hash = $1,
           email_verification_expires_at = CURRENT_TIMESTAMP + INTERVAL '24 hours',
           email_verification_sent_at = CURRENT_TIMESTAMP WHERE id = $2`,
        [verification.hash, found.rows[0].id],
      )
      developmentUrl = await sendVerificationEmail(found.rows[0].email, verification.token)
    }
    res.json({
      message: 'If that address has an unverified account, a new verification email has been sent.',
      ...(developmentUrl ? { development_url: developmentUrl } : {}),
    })
  } catch (error) {
    next(error)
  }
})

app.post('/api/auth/forgot-password', emailLimiter, async (req, res, next) => {
  try {
    const email = String(req.body.email || '').trim().toLowerCase()
    const found = await query('SELECT id, email FROM users WHERE LOWER(email) = LOWER($1)', [email])
    let developmentUrl = null
    if (found.rows[0]) {
      const reset = createOneTimeToken()
      await query(
        `UPDATE users SET password_reset_token_hash = $1,
           password_reset_expires_at = CURRENT_TIMESTAMP + INTERVAL '1 hour' WHERE id = $2`,
        [reset.hash, found.rows[0].id],
      )
      developmentUrl = await sendPasswordResetEmail(found.rows[0].email, reset.token)
    }
    res.json({
      message: 'If an account uses that email, a password reset link has been sent.',
      ...(developmentUrl ? { development_url: developmentUrl } : {}),
    })
  } catch (error) {
    next(error)
  }
})

app.post('/api/auth/reset-password', emailLimiter, async (req, res, next) => {
  try {
    const token = String(req.body.token || '')
    const password = String(req.body.password || '')
    if (!/^[a-f0-9]{64}$/.test(token)) return res.status(400).json({ message: 'That reset link is invalid.' })
    if (password.length < 8) return res.status(400).json({ message: 'Password must be at least 8 characters.' })
    const passwordHash = await bcrypt.hash(password, 12)
    const result = await query(
      `UPDATE users SET password_hash = $1,
         password_reset_token_hash = NULL, password_reset_expires_at = NULL
       WHERE password_reset_token_hash = $2 AND password_reset_expires_at > CURRENT_TIMESTAMP
       RETURNING id`,
      [passwordHash, hashToken(token)],
    )
    if (!result.rows[0]) return res.status(400).json({ message: 'That reset link is invalid or has expired.' })
    res.json({ message: 'Password updated. You can log in now.' })
  } catch (error) {
    next(error)
  }
})

app.post('/api/auth/login', loginLimiter, async (req, res, next) => {
  try {
    const identifier = String(req.body.username || '').trim()
    const password = String(req.body.password || '')
    const result = await query(
      `SELECT id, username, email, password_hash, is_admin, is_superuser, email_verified, leaderboard_hidden
       FROM users WHERE LOWER(username) = LOWER($1) OR LOWER(email) = LOWER($1)`,
      [identifier],
    )
    const user = result.rows[0]
    if (!user || !(await bcrypt.compare(password, user.password_hash))) {
      return res.status(401).json({ message: 'Incorrect username/email or password.' })
    }
    if (!user.email_verified) {
      return res.status(403).json({ message: 'Please verify your email before logging in.' })
    }
    res.json({ user: publicUser(user, createToken(user)) })
  } catch (error) {
    next(error)
  }
})

app.get('/api/problems/current', async (_req, res, next) => {
  try {
    const result = await query(
      `SELECT ${publicProblemColumns} FROM problems
       WHERE is_current = TRUE AND is_archived = FALSE
         AND ((release_at IS NULL AND (release_date IS NULL OR release_date <= CURRENT_DATE))
              OR release_at <= CURRENT_TIMESTAMP)
         AND ((due_at IS NULL AND (due_date IS NULL OR due_date >= CURRENT_DATE))
              OR due_at >= CURRENT_TIMESTAMP)
       ORDER BY CASE WHEN LOWER(problem_type) LIKE '%comput%' THEN 0 ELSE 1 END, id`,
    )
    res.json({ problems: result.rows })
  } catch (error) {
    next(error)
  }
})

app.get('/api/problems/archive', async (_req, res, next) => {
  try {
    const result = await query(
      `SELECT ${publicProblemColumns} FROM problems
       WHERE release_date IS NOT NULL
         AND ((release_at IS NULL AND release_date <= CURRENT_DATE) OR release_at <= CURRENT_TIMESTAMP)
         AND (is_archived = TRUE OR is_current = FALSE
              OR (due_at IS NULL AND due_date < CURRENT_DATE) OR due_at < CURRENT_TIMESTAMP)
       ORDER BY release_date DESC NULLS LAST, id DESC`,
    )
    res.json({ problems: result.rows })
  } catch (error) {
    next(error)
  }
})

app.post('/api/submissions', requireAuth, upload.single('file'), async (req, res, next) => {
  try {
    const problemId = Number(req.body.problem_id)
    const answerText = String(req.body.answer_text || '').trim()
    const workText = String(req.body.work_text || '').trim()
    if (!Number.isInteger(problemId)) return res.status(400).json({ message: 'Choose a valid problem.' })

    const problem = await query(
      `SELECT id, due_date, problem_type FROM problems WHERE id = $1 AND is_current = TRUE AND is_archived = FALSE
       AND ((release_at IS NULL AND (release_date IS NULL OR release_date <= CURRENT_DATE))
            OR release_at <= CURRENT_TIMESTAMP)
       AND ((due_at IS NULL AND (due_date IS NULL OR due_date >= CURRENT_DATE))
            OR due_at >= CURRENT_TIMESTAMP)`,
      [problemId],
    )
    if (!problem.rows[0]) return res.status(404).json({ message: 'This problem is not currently accepting submissions.' })
    const isProof = String(problem.rows[0].problem_type).toLowerCase().includes('proof')
    if (!isProof && !answerText) {
      return res.status(400).json({ message: 'Enter a short answer for the computational problem.' })
    }
    if (isProof && !workText && !req.file) {
      return res.status(400).json({ message: 'Type your proof or attach a proof file.' })
    }

    const submissionCount = await query(
      'SELECT COUNT(*)::integer AS count FROM submissions WHERE user_id = $1 AND problem_id = $2',
      [req.user.id, problemId],
    )
    if (submissionCount.rows[0].count >= 5) {
      return res.status(429).json({ message: 'You have reached the limit of 5 submissions for this problem. You can still edit an existing submission before the deadline.' })
    }

    const result = await query(
      `INSERT INTO submissions
        (user_id, problem_id, answer_text, work_text, file_name, file_type, file_data)
       VALUES ($1, $2, NULLIF($3, ''), NULLIF($4, ''), $5, $6, $7)
       RETURNING id, submitted_at`,
      [req.user.id, problemId, answerText, workText, req.file?.originalname ?? null, req.file?.mimetype ?? null, req.file?.buffer ?? null],
    )
    const submissionsRemaining = 5 - submissionCount.rows[0].count - 1
    res.status(201).json({
      submission: result.rows[0],
      submissions_remaining: submissionsRemaining,
      message: `Submission saved. You have ${submissionsRemaining} submission${submissionsRemaining === 1 ? '' : 's'} remaining for this problem. You can edit this response before the deadline.`,
    })
  } catch (error) {
    if (error.code === '23503') return res.status(400).json({ message: 'Invalid problem or user.' })
    next(error)
  }
})

app.get('/api/submissions/mine', requireAuth, async (req, res, next) => {
  try {
    const result = await query(
      `SELECT s.id, s.answer_text, s.work_text, s.file_name, s.is_correct, s.score, s.feedback, s.graded_at,
              s.submitted_at, p.id AS problem_id, p.title, p.problem_type, p.due_date, p.due_at
       FROM submissions s JOIN problems p ON p.id = s.problem_id
       WHERE s.user_id = $1 ORDER BY s.submitted_at DESC`,
      [req.user.id],
    )
    res.json({ submissions: result.rows })
  } catch (error) {
    next(error)
  }
})

app.get('/api/submissions/limits', requireAuth, async (req, res, next) => {
  try {
    const result = await query(
      `SELECT problem_id, COUNT(*)::integer AS submission_count
       FROM submissions WHERE user_id = $1 GROUP BY problem_id`,
      [req.user.id],
    )
    res.json({
      remaining_by_problem: Object.fromEntries(result.rows.map((row) => [row.problem_id, Math.max(0, 5 - row.submission_count)])),
    })
  } catch (error) {
    next(error)
  }
})

app.patch('/api/profile/preferences', requireAuth, async (req, res, next) => {
  try {
    if (typeof req.body.leaderboard_hidden !== 'boolean') {
      return res.status(400).json({ message: 'Choose a valid leaderboard preference.' })
    }
    const result = await query(
      `UPDATE users SET leaderboard_hidden = $1 WHERE id = $2
       RETURNING id, username, email, is_admin, is_superuser, leaderboard_hidden`,
      [req.body.leaderboard_hidden, req.user.id],
    )
    res.json({
      user: publicUser(result.rows[0]),
      message: req.body.leaderboard_hidden
        ? 'You are now hidden from the public leaderboard. Your private scores are still saved.'
        : 'You will now appear on the public leaderboard.',
    })
  } catch (error) {
    next(error)
  }
})

app.patch('/api/submissions/:id', requireAuth, upload.single('file'), async (req, res, next) => {
  try {
    const current = await query(
      `SELECT s.id, s.file_data, p.problem_type FROM submissions s
       JOIN problems p ON p.id = s.problem_id
       WHERE s.id = $1 AND s.user_id = $2 AND p.is_current = TRUE AND p.is_archived = FALSE
         AND ((p.release_at IS NULL AND (p.release_date IS NULL OR p.release_date <= CURRENT_DATE))
              OR p.release_at <= CURRENT_TIMESTAMP)
         AND ((p.due_at IS NULL AND (p.due_date IS NULL OR p.due_date >= CURRENT_DATE))
              OR p.due_at >= CURRENT_TIMESTAMP)`,
      [Number(req.params.id), req.user.id],
    )
    const submission = current.rows[0]
    if (!submission) return res.status(404).json({ message: 'This submission can no longer be edited.' })
    const answerText = String(req.body.answer_text || '').trim()
    const workText = String(req.body.work_text || '').trim()
    const isProof = String(submission.problem_type).toLowerCase().includes('proof')
    if (!isProof && !answerText) return res.status(400).json({ message: 'A short answer is required.' })
    const fileData = req.file?.buffer ?? submission.file_data
    if (isProof && !workText && !fileData) {
      return res.status(400).json({ message: 'A written proof or existing proof file is required.' })
    }
    const result = await query(
      `UPDATE submissions SET answer_text = NULLIF($1, ''), work_text = NULLIF($2, ''),
         file_name = CASE WHEN $3::boolean THEN $4 ELSE file_name END,
         file_type = CASE WHEN $3::boolean THEN $5 ELSE file_type END,
         file_data = CASE WHEN $3::boolean THEN $6 ELSE file_data END,
         is_correct = NULL, score = 0, feedback = NULL, graded_by = NULL, graded_at = NULL,
         submitted_at = CURRENT_TIMESTAMP
       WHERE id = $7 RETURNING id, answer_text, work_text, file_name, submitted_at`,
      [answerText, workText, Boolean(req.file), req.file?.originalname ?? null, req.file?.mimetype ?? null, req.file?.buffer ?? null, submission.id],
    )
    res.json({ submission: result.rows[0], message: 'Response updated and returned to the grading queue.' })
  } catch (error) {
    next(error)
  }
})

app.get('/api/submissions/:id/file', requireAuth, async (req, res, next) => {
  try {
    const result = await query(
      `SELECT file_name, file_type, file_data FROM submissions
       WHERE id = $1 AND (user_id = $2 OR $3 = TRUE)`,
      [Number(req.params.id), req.user.id, Boolean(req.user.is_admin || req.user.is_superuser)],
    )
    const file = result.rows[0]
    if (!file?.file_data) return res.status(404).json({ message: 'File not found.' })
    res.type(file.file_type || 'application/octet-stream')
    res.attachment(file.file_name || 'submission')
    res.send(file.file_data)
  } catch (error) {
    next(error)
  }
})

app.get('/api/seasons', async (_req, res, next) => {
  try {
    const result = await query(
      'SELECT id, name, start_date, end_date, is_active FROM seasons ORDER BY start_date DESC, id DESC',
    )
    res.json({ seasons: result.rows })
  } catch (error) {
    next(error)
  }
})

app.get('/api/leaderboard', async (req, res, next) => {
  try {
    const seasonId = Number(req.query.season_id)
    const seasonResult = Number.isInteger(seasonId)
      ? await query('SELECT id, name, start_date, end_date, is_active FROM seasons WHERE id = $1', [seasonId])
      : await query(
          `SELECT id, name, start_date, end_date, is_active FROM seasons
           ORDER BY is_active DESC, start_date DESC LIMIT 1`,
        )
    const season = seasonResult.rows[0]
    if (!season) return res.json({ season: null, problems: [], leaders: [] })

    const problemsResult = await query(
      `SELECT id, title, problem_type, release_date FROM problems
       WHERE release_date BETWEEN $1 AND $2
       ORDER BY release_date, id`,
      [season.start_date, season.end_date],
    )
    const usersResult = await query(
      `SELECT id, username FROM users
       WHERE is_admin = FALSE AND is_superuser = FALSE AND leaderboard_hidden = FALSE
         AND EXISTS (
           SELECT 1 FROM submissions submitted
           JOIN problems submitted_problem ON submitted_problem.id = submitted.problem_id
           WHERE submitted.user_id = users.id
             AND submitted.graded_at IS NOT NULL
             AND submitted_problem.release_date BETWEEN $1 AND $2
         )
       ORDER BY username`,
      [season.start_date, season.end_date],
    )
    const scoresResult = await query(
      `SELECT s.user_id, s.problem_id, MAX(s.score)::integer AS score
       FROM submissions s JOIN problems p ON p.id = s.problem_id
       WHERE s.graded_at IS NOT NULL AND p.release_date BETWEEN $1 AND $2
       GROUP BY s.user_id, s.problem_id`,
      [season.start_date, season.end_date],
    )
    const scoreMap = new Map(scoresResult.rows.map((row) => [`${row.user_id}:${row.problem_id}`, row.score]))
    const leaders = usersResult.rows.map((user) => {
      const scores = Object.fromEntries(
        problemsResult.rows.map((problem) => [problem.id, scoreMap.get(`${user.id}:${problem.id}`) ?? null]),
      )
      const gradedScores = Object.values(scores).filter((score) => score !== null)
      return {
        ...user,
        scores,
        solved: gradedScores.filter((score) => score === 5).length,
        points: gradedScores.reduce((total, score) => total + score, 0),
      }
    }).sort((a, b) => b.points - a.points || b.solved - a.solved || a.username.localeCompare(b.username))

    res.json({ season, problems: problemsResult.rows, leaders })
  } catch (error) {
    next(error)
  }
})

app.post('/api/problem-proposals', requireAuth, async (req, res, next) => {
  try {
    const title = String(req.body.title || '').trim()
    const statement = String(req.body.statement_latex || '').trim()
    if (!title || !statement) return res.status(400).json({ message: 'A title and problem statement are required.' })
    const result = await query(
      `INSERT INTO problem_proposals (user_id, title, statement_latex, solution_latex, source, notes)
       VALUES ($1, $2, $3, NULLIF($4, ''), NULLIF($5, ''), NULLIF($6, ''))
       RETURNING id, title, status, created_at`,
      [req.user.id, title, statement, String(req.body.solution_latex || '').trim(), String(req.body.source || '').trim(), String(req.body.notes || '').trim()],
    )
    res.status(201).json({ proposal: result.rows[0], message: 'Your problem proposal was sent to the admins.' })
  } catch (error) {
    next(error)
  }
})

app.get('/api/problem-proposals/mine', requireAuth, async (req, res, next) => {
  try {
    const result = await query(
      `SELECT id, title, statement_latex, solution_latex, source, notes, status, created_at FROM problem_proposals
       WHERE user_id = $1 ORDER BY created_at DESC`,
      [req.user.id],
    )
    res.json({ proposals: result.rows })
  } catch (error) {
    next(error)
  }
})

app.patch('/api/problem-proposals/:id', requireAuth, async (req, res, next) => {
  try {
    const title = String(req.body.title || '').trim()
    const statement = String(req.body.statement_latex || '').trim()
    if (!title || !statement) return res.status(400).json({ message: 'A title and problem statement are required.' })
    const result = await query(
      `UPDATE problem_proposals
       SET title = $1, statement_latex = $2, solution_latex = NULLIF($3, ''),
           source = NULLIF($4, ''), notes = NULLIF($5, '')
       WHERE id = $6 AND user_id = $7 AND status = 'pending'
       RETURNING id, title, statement_latex, solution_latex, source, notes, status, created_at`,
      [title, statement, String(req.body.solution_latex || '').trim(), String(req.body.source || '').trim(), String(req.body.notes || '').trim(), Number(req.params.id), req.user.id],
    )
    if (!result.rows[0]) return res.status(404).json({ message: 'Only a pending proposal of your own can be edited.' })
    res.json({ proposal: result.rows[0], message: 'Proposal updated.' })
  } catch (error) {
    next(error)
  }
})

app.delete('/api/problem-proposals/:id', requireAuth, async (req, res, next) => {
  try {
    const result = await query(
      `DELETE FROM problem_proposals
       WHERE id = $1 AND user_id = $2 AND status = 'pending'
       RETURNING id`,
      [Number(req.params.id), req.user.id],
    )
    if (!result.rows[0]) return res.status(404).json({ message: 'Only a pending proposal of your own can be removed.' })
    res.json({ message: 'Proposal removed.' })
  } catch (error) {
    next(error)
  }
})

app.post('/api/problems/:id/hint-requests', requireAuth, async (req, res, next) => {
  try {
    const problemId = Number(req.params.id)
    if (!Number.isInteger(problemId)) return res.status(400).json({ message: 'Invalid problem.' })
    const problem = await query(
      `SELECT allow_hint_requests FROM problems
       WHERE id = $1 AND is_current = TRUE AND is_archived = FALSE
         AND ((release_at IS NULL AND (release_date IS NULL OR release_date <= CURRENT_DATE))
              OR release_at <= CURRENT_TIMESTAMP)
         AND ((due_at IS NULL AND (due_date IS NULL OR due_date >= CURRENT_DATE))
              OR due_at >= CURRENT_TIMESTAMP)`,
      [problemId],
    )
    if (!problem.rows[0]) return res.status(404).json({ message: 'Problem not found.' })
    if (!problem.rows[0].allow_hint_requests) {
      return res.status(403).json({ message: 'Hint requests are not enabled for this problem.' })
    }
    const existing = await query(
      `SELECT id FROM hint_requests
       WHERE user_id = $1 AND problem_id = $2 AND status = 'pending'`,
      [req.user.id, problemId],
    )
    if (existing.rows[0]) return res.status(409).json({ message: 'You already have a pending hint request for this problem.' })
    await query(
      `INSERT INTO hint_requests (user_id, problem_id, message)
       VALUES ($1, $2, NULLIF($3, ''))`,
      [req.user.id, problemId, String(req.body.message || '').trim()],
    )
    res.status(201).json({ message: 'Your hint request was sent to the admins.' })
  } catch (error) {
    if (error.code === '23503') return res.status(404).json({ message: 'Problem not found.' })
    next(error)
  }
})

app.get('/api/hint-requests/mine', requireAuth, async (req, res, next) => {
  try {
    const result = await query(
      `SELECT hr.id, hr.message, hr.response, hr.status, hr.created_at, p.title AS problem_title
       FROM hint_requests hr JOIN problems p ON p.id = hr.problem_id
       WHERE hr.user_id = $1 ORDER BY hr.created_at DESC`, [req.user.id],
    )
    res.json({ hint_requests: result.rows })
  } catch (error) { next(error) }
})

app.patch('/api/hint-requests/:id', requireAuth, async (req, res, next) => {
  try {
    const message = String(req.body.message || '').trim()
    if (!message) return res.status(400).json({ message: 'Describe what you have tried before saving your request.' })
    const result = await query(
      `UPDATE hint_requests SET message = $1
       WHERE id = $2 AND user_id = $3 AND status = 'pending'
       RETURNING id, message, status, created_at`,
      [message, Number(req.params.id), req.user.id],
    )
    if (!result.rows[0]) return res.status(404).json({ message: 'Only a pending request of your own can be edited.' })
    res.json({ hint_request: result.rows[0], message: 'Hint request updated.' })
  } catch (error) {
    next(error)
  }
})

app.delete('/api/hint-requests/:id', requireAuth, async (req, res, next) => {
  try {
    const result = await query(
      `DELETE FROM hint_requests
       WHERE id = $1 AND user_id = $2 AND status = 'pending'
       RETURNING id`,
      [Number(req.params.id), req.user.id],
    )
    if (!result.rows[0]) return res.status(404).json({ message: 'Only a pending request of your own can be removed.' })
    res.json({ message: 'Hint request removed.' })
  } catch (error) {
    next(error)
  }
})

app.get('/api/admin/submissions', requireAuth, requireAdmin, async (req, res, next) => {
  try {
    const showAll = req.query.status === 'all'
    const result = await query(
      `SELECT s.id, s.answer_text, s.work_text, s.file_name, s.score, s.feedback, s.graded_at, s.submitted_at,
              u.username, u.email, p.id AS problem_id, p.title, p.problem_type, p.solution_latex
       FROM submissions s
       JOIN users u ON u.id = s.user_id
       JOIN problems p ON p.id = s.problem_id
       WHERE ($1::boolean = TRUE OR s.graded_at IS NULL)
       ORDER BY s.graded_at NULLS FIRST, s.submitted_at`,
      [showAll],
    )
    res.json({ submissions: result.rows })
  } catch (error) {
    next(error)
  }
})

app.patch('/api/admin/submissions/:id/grade', requireAuth, requireAdmin, async (req, res, next) => {
  try {
    const score = Number(req.body.score)
    if (!Number.isInteger(score) || score < 0 || score > 5) {
      return res.status(400).json({ message: 'Score must be a whole number from 0 to 5.' })
    }
    const result = await query(
      `UPDATE submissions
       SET score = $1, feedback = NULLIF($2, ''), is_correct = ($1 = 5),
           graded_by = $3, graded_at = CURRENT_TIMESTAMP
       WHERE id = $4 RETURNING id, score, feedback, graded_at`,
      [score, String(req.body.feedback || '').trim(), req.user.id, Number(req.params.id)],
    )
    if (!result.rows[0]) return res.status(404).json({ message: 'Submission not found.' })
    res.json({ submission: result.rows[0], message: 'Grade saved.' })
  } catch (error) {
    next(error)
  }
})

app.delete('/api/admin/submissions/:id', requireAuth, requireAdmin, async (req, res, next) => {
  try {
    const result = await query('DELETE FROM submissions WHERE id = $1 RETURNING id', [Number(req.params.id)])
    if (!result.rows[0]) return res.status(404).json({ message: 'Submission not found.' })
    res.json({ message: 'Submission removed.' })
  } catch (error) {
    next(error)
  }
})

app.get('/api/admin/problems', requireAuth, requireAdmin, async (_req, res, next) => {
  try {
    const result = await query(
      `SELECT id, title, statement_latex, solution_latex, problem_source, proposed_by, problem_type,
              is_current, is_archived, release_date, release_at, due_date, due_at, hints, hints_enabled,
              allow_hint_requests, difficulty_rating
       FROM problems ORDER BY release_date DESC NULLS LAST, id DESC`,
    )
    res.json({ problems: result.rows })
  } catch (error) {
    next(error)
  }
})

function problemValues(body) {
  return [
    String(body.title || '').trim(),
    String(body.statement_latex || '').trim(),
    String(body.solution_latex || '').trim() || null,
    String(body.problem_source || '').trim() || null,
    String(body.proposed_by || '').trim() || null,
    String(body.problem_type || '').trim(),
    Boolean(body.is_current),
    Boolean(body.is_archived),
    body.release_date || null,
    body.due_date || null,
    String(body.hints || '').trim() || null,
    body.difficulty_rating ? Number(body.difficulty_rating) : null,
    Boolean(body.hints_enabled),
    Boolean(body.allow_hint_requests),
    String(body.release_at || '').trim() || null,
    String(body.due_at || '').trim() || null,
  ]
}

function validateProblem(values) {
  if (!values[0] || !values[1] || !values[5]) return 'Title, statement, and problem type are required.'
  if (values[11] !== null && (!Number.isInteger(values[11]) || values[11] < 1 || values[11] > 10)) {
    return 'Difficulty must be a whole number from 1 to 10.'
  }
  if (values[8] && values[9] && values[9] < values[8]) return 'Due date cannot be before release date.'
  if (values[14] && !/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}$/.test(values[14])) return 'Choose a valid release date and time.'
  if (values[15] && !/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}$/.test(values[15])) return 'Choose a valid due date and time.'
  if (values[14] && values[15] && values[15] <= values[14]) return 'Due time must be after release time.'
  return ''
}

app.post('/api/admin/problems', requireAuth, requireAdmin, async (req, res, next) => {
  try {
    const values = problemValues(req.body)
    const validationError = validateProblem(values)
    if (validationError) return res.status(400).json({ message: validationError })
    const result = await query(
      `INSERT INTO problems
        (title, statement_latex, solution_latex, problem_source, proposed_by, problem_type,
         is_current, is_archived, release_date, due_date, hints, difficulty_rating,
         hints_enabled, allow_hint_requests, release_at, due_at)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14,
               $15::timestamp AT TIME ZONE 'America/Indiana/Indianapolis',
               $16::timestamp AT TIME ZONE 'America/Indiana/Indianapolis')
       RETURNING *`,
      values,
    )
    res.status(201).json({ problem: result.rows[0], message: 'Problem created.' })
  } catch (error) {
    next(error)
  }
})

app.put('/api/admin/problems/:id', requireAuth, requireAdmin, async (req, res, next) => {
  try {
    const values = problemValues(req.body)
    const validationError = validateProblem(values)
    if (validationError) return res.status(400).json({ message: validationError })
    const result = await query(
      `UPDATE problems SET
         title = $1, statement_latex = $2, solution_latex = $3, problem_source = $4,
         proposed_by = $5, problem_type = $6, is_current = $7, is_archived = $8,
         release_date = $9, due_date = $10, hints = $11, difficulty_rating = $12,
         hints_enabled = $13, allow_hint_requests = $14,
         release_at = $15::timestamp AT TIME ZONE 'America/Indiana/Indianapolis',
         due_at = $16::timestamp AT TIME ZONE 'America/Indiana/Indianapolis'
       WHERE id = $17 RETURNING *`,
      [...values, Number(req.params.id)],
    )
    if (!result.rows[0]) return res.status(404).json({ message: 'Problem not found.' })
    res.json({ problem: result.rows[0], message: 'Problem updated.' })
  } catch (error) {
    next(error)
  }
})

app.delete('/api/admin/problems/:id', requireAuth, requireAdmin, async (req, res, next) => {
  try {
    const result = await query('DELETE FROM problems WHERE id = $1 RETURNING id', [Number(req.params.id)])
    if (!result.rows[0]) return res.status(404).json({ message: 'Problem not found.' })
    res.json({ message: 'Problem removed.' })
  } catch (error) {
    next(error)
  }
})

app.get('/api/admin/proposals', requireAuth, requireAdmin, async (_req, res, next) => {
  try {
    const proposals = await query(
      `SELECT pp.*, u.username, u.email FROM problem_proposals pp
       JOIN users u ON u.id = pp.user_id ORDER BY pp.status, pp.created_at DESC`,
    )
    const hintRequests = await query(
      `SELECT hr.id, hr.message, hr.response, hr.status, hr.created_at, u.username, p.title AS problem_title
       FROM hint_requests hr JOIN users u ON u.id = hr.user_id JOIN problems p ON p.id = hr.problem_id
       ORDER BY hr.status, hr.created_at DESC`,
    )
    res.json({ proposals: proposals.rows, hint_requests: hintRequests.rows })
  } catch (error) {
    next(error)
  }
})

app.patch('/api/admin/proposals/:id', requireAuth, requireAdmin, async (req, res, next) => {
  try {
    if (!['pending', 'accepted', 'declined'].includes(req.body.status)) {
      return res.status(400).json({ message: 'Invalid proposal status.' })
    }
    const result = await query(
      'UPDATE problem_proposals SET status = $1 WHERE id = $2 RETURNING id, status',
      [req.body.status, Number(req.params.id)],
    )
    if (!result.rows[0]) return res.status(404).json({ message: 'Proposal not found.' })
    res.json({ proposal: result.rows[0], message: 'Proposal updated.' })
  } catch (error) {
    next(error)
  }
})

app.delete('/api/admin/proposals/:id', requireAuth, requireAdmin, async (req, res, next) => {
  try {
    const result = await query('DELETE FROM problem_proposals WHERE id = $1 RETURNING id', [Number(req.params.id)])
    if (!result.rows[0]) return res.status(404).json({ message: 'Proposal not found.' })
    res.json({ message: 'Proposal removed.' })
  } catch (error) {
    next(error)
  }
})

app.patch('/api/admin/hint-requests/:id', requireAuth, requireAdmin, async (req, res, next) => {
  try {
    const status = req.body.status === 'resolved' ? 'resolved' : 'pending'
    const hasResponse = Object.prototype.hasOwnProperty.call(req.body, 'response')
    const response = String(req.body.response || '').trim()
    const result = await query(
      `UPDATE hint_requests
       SET status = $1,
           response = CASE WHEN $2::boolean THEN NULLIF($3, '') ELSE response END
       WHERE id = $4 RETURNING id, status, response`,
      [status, hasResponse, response, Number(req.params.id)],
    )
    if (!result.rows[0]) return res.status(404).json({ message: 'Hint request not found.' })
    res.json({ hint_request: result.rows[0], message: 'Hint request updated.' })
  } catch (error) {
    next(error)
  }
})

app.delete('/api/admin/hint-requests/:id', requireAuth, requireAdmin, async (req, res, next) => {
  try {
    const result = await query('DELETE FROM hint_requests WHERE id = $1 RETURNING id', [Number(req.params.id)])
    if (!result.rows[0]) return res.status(404).json({ message: 'Hint request not found.' })
    res.json({ message: 'Hint request removed.' })
  } catch (error) {
    next(error)
  }
})

app.post('/api/admin/seasons', requireAuth, requireAdmin, async (req, res, next) => {
  try {
    const name = String(req.body.name || '').trim()
    const { start_date: startDate, end_date: endDate } = req.body
    if (!name || !startDate || !endDate || endDate < startDate) {
      return res.status(400).json({ message: 'Enter a name and a valid date range.' })
    }
    if (req.body.is_active) await query('UPDATE seasons SET is_active = FALSE')
    const result = await query(
      `INSERT INTO seasons (name, start_date, end_date, is_active)
       VALUES ($1, $2, $3, $4) RETURNING id, name, start_date, end_date, is_active`,
      [name, startDate, endDate, Boolean(req.body.is_active)],
    )
    res.status(201).json({ season: result.rows[0], message: 'Season created.' })
  } catch (error) {
    if (error.code === '23505') return res.status(409).json({ message: 'A season with that name already exists.' })
    next(error)
  }
})

app.put('/api/admin/seasons/:id', requireAuth, requireAdmin, async (req, res, next) => {
  try {
    const name = String(req.body.name || '').trim()
    const { start_date: startDate, end_date: endDate } = req.body
    if (!name || !startDate || !endDate || endDate < startDate) {
      return res.status(400).json({ message: 'Enter a name and a valid date range.' })
    }
    if (req.body.is_active) await query('UPDATE seasons SET is_active = FALSE')
    const result = await query(
      `UPDATE seasons SET name = $1, start_date = $2, end_date = $3, is_active = $4
       WHERE id = $5 RETURNING id, name, start_date, end_date, is_active`,
      [name, startDate, endDate, Boolean(req.body.is_active), Number(req.params.id)],
    )
    if (!result.rows[0]) return res.status(404).json({ message: 'Season not found.' })
    res.json({ season: result.rows[0], message: 'Season updated.' })
  } catch (error) {
    if (error.code === '23505') return res.status(409).json({ message: 'A season with that name already exists.' })
    next(error)
  }
})

app.get('/api/admin/users', requireAuth, requireSuperuser, async (_req, res, next) => {
  try {
    const result = await query(
      'SELECT id, username, email, is_admin, is_superuser, email_verified, created_at FROM users ORDER BY username',
    )
    res.json({ users: result.rows })
  } catch (error) {
    next(error)
  }
})

app.patch('/api/admin/users/:id', requireAuth, requireSuperuser, async (req, res, next) => {
  try {
    const verifyEmail = req.body.email_verified === true
    const result = await query(
      `UPDATE users SET is_admin = $1,
       email_verified = CASE WHEN $2::boolean THEN TRUE ELSE email_verified END,
       email_verification_token_hash = CASE WHEN $2::boolean THEN NULL ELSE email_verification_token_hash END,
       email_verification_expires_at = CASE WHEN $2::boolean THEN NULL ELSE email_verification_expires_at END,
       email_verification_sent_at = CASE WHEN $2::boolean THEN NULL ELSE email_verification_sent_at END
       WHERE id = $3 AND is_superuser = FALSE
       RETURNING id, username, email, is_admin, is_superuser, email_verified`,
      [Boolean(req.body.is_admin), verifyEmail, Number(req.params.id)],
    )
    if (!result.rows[0]) return res.status(400).json({ message: 'That account cannot be changed.' })
    res.json({ user: result.rows[0], message: 'Administrator access updated.' })
  } catch (error) {
    next(error)
  }
})

app.delete('/api/admin/users/:id', requireAuth, requireSuperuser, async (req, res, next) => {
  try {
    const accountId = Number(req.params.id)
    if (!Number.isInteger(accountId)) return res.status(400).json({ message: 'Invalid account.' })
    const result = await query(
      `DELETE FROM users
       WHERE id = $1 AND is_superuser = FALSE
       RETURNING id, username`,
      [accountId],
    )
    if (!result.rows[0]) return res.status(400).json({ message: 'That account cannot be deleted.' })
    res.json({ deleted_user: result.rows[0], message: 'Account and its associated submissions were deleted.' })
  } catch (error) {
    next(error)
  }
})

app.use((error, _req, res, _next) => {
  if (error instanceof multer.MulterError) {
    return res.status(400).json({ message: error.code === 'LIMIT_FILE_SIZE' ? 'Files must be 5 MB or smaller.' : error.message })
  }
  console.error(error)
  res.status(500).json({ message: 'The server could not complete that request.' })
})

async function archiveExpiredProblems() {
  try {
    const result = await query(
      `UPDATE problems
       SET is_current = FALSE, is_archived = TRUE
       WHERE is_archived = FALSE
         AND ((due_at IS NOT NULL AND due_at <= CURRENT_TIMESTAMP)
              OR (due_at IS NULL AND due_date IS NOT NULL AND due_date < CURRENT_DATE))`,
    )
    if (result.rowCount) console.log(`Archived ${result.rowCount} expired problem${result.rowCount === 1 ? '' : 's'}.`)
  } catch (error) {
    console.error('Could not archive expired problems:', error)
  }
}

const server = app.listen(port, () => console.log(`POTW API listening on http://localhost:${port}`))
void archiveExpiredProblems()
const archiveTimer = setInterval(() => { void archiveExpiredProblems() }, 60 * 1000)
archiveTimer.unref?.()

async function shutdown() {
  clearInterval(archiveTimer)
  server.close(async () => {
    await pool.end()
    process.exit(0)
  })
}

process.on('SIGINT', shutdown)
process.on('SIGTERM', shutdown)
