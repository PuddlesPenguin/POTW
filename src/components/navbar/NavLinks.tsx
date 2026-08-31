import { Link } from 'react-router-dom'
import type { UserState } from '../../types/user'

const links = [
  { name: 'Home', path: '/' },
  { name: 'Archive', path: '/archive' },
  { name: 'Leaderboard', path: '/leaderboard' },
  { name: 'Discord', path: 'https://discord.gg/D3Z7Kck' },
]

function NavLinks({ user }: { user: UserState }) {
  return (
    <nav className="nav-links">
      {links.map((link) => (
        link.path.startsWith('http') ? (
          <a key={link.name} href={link.path} className="nav-link" target="_blank" rel="noreferrer">{link.name}</a>
        ) : (
          <Link key={link.name} to={link.path} className="nav-link">{link.name}</Link>
        )
      ))}
      {user ? <Link to="/hints" className="nav-link">Hints</Link> : null}
      {user ? <Link to="/suggest" className="nav-link">Suggest</Link> : null}
      {user?.is_admin || user?.is_superuser ? <Link to="/admin" className="nav-link">Admin</Link> : null}
    </nav>
  )
}

export default NavLinks
