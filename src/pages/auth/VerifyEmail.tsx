import { useEffect, useState } from 'react'
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
  const [message, setMessage] = useState(token ? 'Verifying your email...' : '')
  const [error, setError] = useState('')
  const [developmentUrl, setDevelopmentUrl] = useState('')
  const [loading, setLoading] = useState(Boolean(token))

  useEffect(() => {
    if (!token) return
    verifyEmail(token)
      .then((result) => setMessage(result.message))
      .catch((verifyError) => setError(verifyError instanceof Error ? verifyError.message : 'Could not verify your email.'))
      .finally(() => setLoading(false))
  }, [token])

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
    {message ? <div className="auth-success" role="status"><p>{message}</p>{developmentUrl ? <a href={developmentUrl}>Open the development verification link</a> : null}{token ? <Link to="/login">Continue to login</Link> : null}</div> : null}
    {error ? <p role="alert">{error}</p> : null}
    {!token ? <><label htmlFor="verification-email">Email</label><input id="verification-email" type="email" value={email} onChange={(event) => setEmail(event.target.value)} required autoComplete="email" /><button type="submit" disabled={loading}>{loading ? 'Sending...' : 'Send verification email'}</button></> : null}
  </form></div></div></div>
}

export default VerifyEmail
