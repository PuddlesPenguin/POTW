import { useState } from 'react'
import { Link } from 'react-router-dom'
import NavBar from '../../components/navbar/NavBar'
import { forgotPassword } from '../../lib/auth'
import type { SetUser, UserState } from '../../types/user'
import './auth.css'

type Props = { user: UserState; setUser: SetUser }

function ForgotPassword({ user, setUser }: Props) {
  const [email, setEmail] = useState('')
  const [message, setMessage] = useState('')
  const [error, setError] = useState('')
  const [developmentUrl, setDevelopmentUrl] = useState('')
  const [loading, setLoading] = useState(false)

  async function submit() {
    setLoading(true); setError('')
    try {
      const result = await forgotPassword(email)
      setMessage(result.message); setDevelopmentUrl(result.development_url ?? '')
    } catch (requestError) {
      setError(requestError instanceof Error ? requestError.message : 'Could not send the reset email.')
    } finally { setLoading(false) }
  }

  return <div className="login-page"><NavBar user={user} setUser={setUser} /><div className="login-body"><div className="login-form-container"><form onSubmit={(event) => { event.preventDefault(); void submit() }}>
    <h1>Reset password</h1>
    {message ? <div className="auth-success" role="status"><p>{message}</p>{developmentUrl ? <a href={developmentUrl}>Open the development reset link</a> : null}<Link to="/login">Return to login</Link></div> : <><label htmlFor="reset-email">Email</label><input id="reset-email" type="email" value={email} onChange={(event) => setEmail(event.target.value)} required autoComplete="email" />{error ? <p role="alert">{error}</p> : null}<button type="submit" disabled={loading}>{loading ? 'Sending...' : 'Email reset link'}</button></>}
  </form></div></div></div>
}

export default ForgotPassword
