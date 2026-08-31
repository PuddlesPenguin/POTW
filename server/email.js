import nodemailer from 'nodemailer'

let transporter

function getTransporter() {
  if (transporter) return transporter
  if (!process.env.SMTP_HOST) return null

  const port = Number(process.env.SMTP_PORT || 587)
  transporter = nodemailer.createTransport({
    host: process.env.SMTP_HOST,
    port,
    secure: process.env.SMTP_SECURE === 'true' || port === 465,
    auth: process.env.SMTP_USER
      ? { user: process.env.SMTP_USER, pass: process.env.SMTP_PASS }
      : undefined,
  })
  return transporter
}

function appUrl(path) {
  return new URL(path, process.env.FRONTEND_URL || 'http://localhost:5173').toString()
}

function escapeHtml(value) {
  return value.replace(/[&<>"']/g, (character) => ({
    '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#039;',
  })[character])
}

async function sendAccountEmail({ to, subject, intro, action, path }) {
  const url = appUrl(path)
  const mailer = getTransporter()
  if (!mailer) {
    if (process.env.NODE_ENV === 'production') throw new Error('SMTP is not configured.')
    console.log(`[development email] ${subject} for ${to}: ${url}`)
    return url
  }

  await mailer.sendMail({
    from: process.env.EMAIL_FROM || 'Purdue Math Club POTW <no-reply@example.com>',
    to,
    subject,
    text: `${intro}\n\n${action}: ${url}\n\nIf you did not request this, you can ignore this email.`,
    html: `<p>${escapeHtml(intro)}</p><p><a href="${url}">${escapeHtml(action)}</a></p><p>If you did not request this, you can ignore this email.</p>`,
  })
  return null
}

export function sendVerificationEmail(email, token) {
  return sendAccountEmail({
    to: email,
    subject: 'Verify your POTW email',
    intro: 'Confirm your email address to finish creating your POTW account.',
    action: 'Verify email',
    path: `/verify-email?token=${encodeURIComponent(token)}`,
  })
}

export function sendPasswordResetEmail(email, token) {
  return sendAccountEmail({
    to: email,
    subject: 'Reset your POTW password',
    intro: 'A password reset was requested for your POTW account. This link expires in one hour.',
    action: 'Reset password',
    path: `/reset-password?token=${encodeURIComponent(token)}`,
  })
}
