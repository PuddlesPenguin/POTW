import jwt from 'jsonwebtoken'
import { query } from './db.js'

function getSecret() {
  const secret = process.env.JWT_SECRET
  if (!secret) throw new Error('JWT_SECRET is not configured.')
  return secret
}

export function createToken(user) {
  return jwt.sign(
    { sub: user.id, username: user.username, is_admin: user.is_admin, is_superuser: user.is_superuser },
    getSecret(),
    { expiresIn: '7d' },
  )
}

export async function requireAuth(req, res, next) {
  const token = req.headers.authorization?.replace(/^Bearer\s+/i, '')
  if (!token) return res.status(401).json({ message: 'Please log in to continue.' })

  try {
    const payload = jwt.verify(token, getSecret())
    const result = await query(
      `SELECT id, username, email, is_admin, is_superuser, email_verified, leaderboard_hidden
       FROM users WHERE id = $1`,
      [Number(payload.sub)],
    )
    if (!result.rows[0]) return res.status(401).json({ message: 'Your account could not be found.' })
    if (!result.rows[0].email_verified) return res.status(403).json({ message: 'Please verify your email to continue.' })
    req.user = result.rows[0]
    next()
  } catch {
    res.status(401).json({ message: 'Your session is invalid or has expired.' })
  }
}

export function requireAdmin(req, res, next) {
  if (!req.user?.is_admin && !req.user?.is_superuser) {
    return res.status(403).json({ message: 'Administrator access is required.' })
  }
  next()
}

export function requireSuperuser(req, res, next) {
  if (!req.user?.is_superuser) {
    return res.status(403).json({ message: 'Superuser access is required.' })
  }
  next()
}
