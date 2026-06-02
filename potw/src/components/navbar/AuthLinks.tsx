import { useNavigate } from 'react-router-dom'
import type { SetUser, UserState } from '../../types/user'

type AuthLinksProps = {
  user: UserState
  setUser: SetUser
}

function AuthLinks({ user, setUser }: AuthLinksProps) {
  const navigate = useNavigate()

  const handleProfileClick = () => {
    navigate('/profile')
  }

  const handleLogoutClick = () => {
    setUser(null)
    navigate('/')
  }

  const handleSignupClick = () => {
    navigate('/signup')
  }

  const handleLoginClick = () => {
    navigate('/login')
  }

  if (user) {
    return (
      <div className="auth-links">
        <button onClick={handleProfileClick} className="auth-button">
          Profile
        </button>
        <button onClick={handleLogoutClick} className="auth-button">
          Logout
        </button>
      </div>
    )
  }

  return (
    <div className="auth-links">
      <button onClick={handleSignupClick} className="auth-button">
        Signup
      </button>
      <button onClick={handleLoginClick} className="auth-button">
        Login
      </button>
    </div>
  )
}

export default AuthLinks
