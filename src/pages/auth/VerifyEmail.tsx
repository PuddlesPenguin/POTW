import { useState } from 'react'
import { Link, useSearchParams } from 'react-router-dom'
import NavBar from '../../components/navbar/NavBar'
import { resendVerification, verifyEmail } from '../../lib/auth'
import type { SetUser, UserState } from '../../types/user'
import './auth.css'

type Props = { user: UserState; setUser: SetUser }

function VerifyEmail({ user, setUser }: Props) {
  const [searchParams] = useSearchParams()
  const token = searchParams.get('token') ?? ''
  const [email, setEmail] = useState('')
  const [message, setMessage] = useState('')
  const [error, setError] = useState('')
  const [developmentUrl, setDevelopmentUrl] = useState('')
  const [loading, setLoading] = useState(false)

  async function confirmVerification() {
    setLoading(true); setError(''); setMessage('')
    try {
      const result = await verifyEmail(token)
      setMessage(result.message)
    } catch (verifyError) {
      setError(verifyError instanceof Error ? verifyError.message : 'Could not verify your email.')
    } finally { setLoading(false) }
  }

  async function resend() {
    setLoading(true); setError(''); setMessage(''); setDevelopmentUrl('')
    try {
      const result = await resendVerification(email)
      setMessage(result.message)
      setDevelopmentUrl(result.development_url ?? '')
    } catch (resendError) {
      setError(resendError instanceof Error ? resendError.message : 'Could not send the email.')
    } finally { setLoading(false) }
  }

  return <div className="login-page"><NavBar user={user} setUser={setUser} /><div className="login-body"><div className="login-form-container"><form onSubmit={(event) => { event.preventDefault(); void resend() }}>
    <h1>Verify email</h1>
    {message ? <div className="auth-success" role="status"><p>{message}</p>{developmentUrl ? <a href={developmentUrl}>Open the development verification link</a> : null}{token && message.startsWith('Email verified') ? <Link to="/login">Continue to login</Link> : null}</div> : null}
    {error ? <p role="alert">{error}</p> : null}
    {token ? <><p>Press the button below to verify your email. Opening this page alone does not verify your account.</p><button type="button" onClick={() => void confirmVerification()} disabled={loading}>{loading ? 'Verifying...' : 'Verify my email'}</button></> : <><label htmlFor="verification-email">Email</label><input id="verification-email" type="email" value={email} onChange={(event) => setEmail(event.target.value)} required autoComplete="email" /><button type="submit" disabled={loading}>{loading ? 'Sending...' : 'Send verification email'}</button></>}
  </form></div></div></div>
}

export default VerifyEmail
