import { useState } from 'react'
import { Link } from 'react-router-dom'
import NavBar from '../../components/navbar/NavBar'
import { registerUser } from '../../lib/auth'
import type { SetUser, UserState } from '../../types/user'
import './auth.css'

type Props = {
  user: UserState
  setUser: SetUser
}

function Signup({ user, setUser }: Props) {
  const [username, setUsername] = useState('')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)
  const [success, setSuccess] = useState('')
  const [developmentUrl, setDevelopmentUrl] = useState('')

  const handleSubmit = async () => {
    setLoading(true)
    setError('')

    try {
      const result = await registerUser(username, email, password)
      setSuccess(result.message)
      setDevelopmentUrl(result.development_url ?? '')
    } catch (signupError) {
      setError(signupError instanceof Error ? signupError.message : 'Signup failed.')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="signup-page">
      <NavBar user={user} setUser={setUser} />
      <div className="signup-body">
        <div className="signup-form-container">
        <form
          onSubmit={(e) => {
            e.preventDefault()
            void handleSubmit()
          }}
        >
          <h1>Signup</h1>
          {!success ? <p className="signup-notice"><strong>Please use a personal email if possible.</strong> Purdue may quarantine verification emails. If you do not receive one, message Puddles_Penguin or email tpauskar@purdue.edu and I can manually verify your account.</p> : null}
          {success ? (
            <div className="auth-success" role="status">
              <p>{success}</p>
              {developmentUrl ? <a href={developmentUrl}>Open the development verification link</a> : null}
              <Link to="/login">Return to login</Link>
            </div>
          ) : <>
          <label htmlFor="username" className="form-label">
            Username
          </label>
          <input
            id="username"
            type="text"
            placeholder="Username"
            className="form-control"
            value={username}
            onChange={(e) => setUsername(e.target.value)}
            required
            minLength={3}
            maxLength={30}
            autoComplete="username"
          />
          <label htmlFor="email" className="form-label">
            Email
          </label>
          <input
            id="email"
            type="email"
            placeholder="Email"
            className="form-control"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            required
            autoComplete="email"
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
            minLength={8}
            autoComplete="new-password"
          />
          {error ? <p>{error}</p> : null}
          <button className="authButton" type="submit" disabled={loading}>
            {loading ? 'Signing up...' : 'Signup'}
          </button>
          </>}
        </form>
        </div>
      </div>
    </div>
  )
}

export default Signup
