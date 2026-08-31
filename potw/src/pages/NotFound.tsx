import { Link } from 'react-router-dom'
import NavBar from '../components/navbar/NavBar'
import type { SetUser, UserState } from '../types/user'
import './Page.css'

function NotFound({ user, setUser }: { user: UserState; setUser: SetUser }) {
  return <div className="app-page"><NavBar user={user} setUser={setUser} /><main className="page-content not-found"><h1>Page not found</h1><Link to="/">Return home</Link></main></div>
}

export default NotFound
