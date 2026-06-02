import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import NavBar from '../../components/navbar/NavBar'
import { registerUser } from '../../lib/auth'
import type { SetUser, UserState } from '../../types/user'
import './auth.css'

type Props = {
  user: UserState
  setUser: SetUser
}

function Signup({ user, setUser }: Props) {
  const navigate = useNavigate()
  const [username, setUsername] = useState('')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)

  const handleSubmit = async () => {
    setLoading(true)
    setError('')

    try {
      const newUser = await registerUser(username, email, password)
      setUser(newUser)
      navigate('/')
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
          />
          {error ? <p>{error}</p> : null}
          <button className="authButton" type="submit" disabled={loading}>
            {loading ? 'Signing up...' : 'Signup'}
          </button>
        </form>
        </div>
      </div>
    </div>
  )
}

export default Signup
