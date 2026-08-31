import { useState } from 'react'
import { Link, useSearchParams } from 'react-router-dom'
import NavBar from '../../components/navbar/NavBar'
import { resetPassword } from '../../lib/auth'
import type { SetUser, UserState } from '../../types/user'
import './auth.css'

type Props = { user: UserState; setUser: SetUser }

function ResetPassword({ user, setUser }: Props) {
  const [searchParams] = useSearchParams()
  const token = searchParams.get('token') ?? ''
  const [password, setPassword] = useState('')
  const [confirmation, setConfirmation] = useState('')
  const [message, setMessage] = useState('')
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)

  async function submit() {
    if (password !== confirmation) return setError('Passwords do not match.')
    setLoading(true); setError('')
    try { setMessage((await resetPassword(token, password)).message) }
    catch (requestError) { setError(requestError instanceof Error ? requestError.message : 'Could not reset the password.') }
    finally { setLoading(false) }
  }

  return <div className="login-page"><NavBar user={user} setUser={setUser} /><div className="login-body"><div className="login-form-container"><form onSubmit={(event) => { event.preventDefault(); void submit() }}>
    <h1>Choose a password</h1>
    {message ? <div className="auth-success" role="status"><p>{message}</p><Link to="/login">Continue to login</Link></div> : <>{!token ? <p role="alert">This reset link is missing its token.</p> : <><label htmlFor="new-password">New password</label><input id="new-password" type="password" minLength={8} required value={password} onChange={(event) => setPassword(event.target.value)} autoComplete="new-password" /><label htmlFor="confirm-password">Confirm password</label><input id="confirm-password" type="password" minLength={8} required value={confirmation} onChange={(event) => setConfirmation(event.target.value)} autoComplete="new-password" />{error ? <p role="alert">{error}</p> : null}<button type="submit" disabled={loading}>{loading ? 'Saving...' : 'Save new password'}</button></>}</>}
  </form></div></div></div>
}

export default ResetPassword
