import { useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import NavBar from '../../components/navbar/NavBar'
import { loginUser } from '../../lib/auth'
import type { SetUser, UserState } from '../../types/user'
import './auth.css'

type Props = {
  user: UserState
  setUser: SetUser
}

function Login({ user, setUser }: Props) {
  const navigate = useNavigate()
  const [username, setUsername] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)

  const handleSubmit = async () => {
    setLoading(true)
    setError('')

    try {
      const loggedInUser = await loginUser(username, password)
      setUser(loggedInUser)
      navigate('/')
    } catch (loginError) {
      setError(loginError instanceof Error ? loginError.message : 'Login failed.')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="login-page">
      <NavBar user={user} setUser={setUser} />
      <div className="login-body">
        <div className="login-form-container">
          <form
            onSubmit={(e) => {
              e.preventDefault()
              void handleSubmit()
            }}
          >
            <h1>Login</h1>
            <label htmlFor="username" className="form-label">
              Username or email
            </label>
            <input
              id="username"
              type="text"
              placeholder="Username or email"
              className="form-control"
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              required
              autoComplete="username"
            />
            <label htmlFor="password" className="form-label">
              Password
            </label>
            <input
              id="password"
              type="password"
              placeholder="Password"
              className="form-control"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
              autoComplete="current-password"
            />
            {error ? <p>{error}</p> : null}
            <button className="authButton" type="submit" disabled={loading}>
              {loading ? 'Logging in...' : 'Login'}
            </button>
            <div className="auth-help-links">
              <Link to="/forgot-password">Forgot password?</Link>
              <Link to="/verify-email">Resend verification email</Link>
            </div>
          </form>
        </div>
      </div>
    </div>
  )
}

export default Login
