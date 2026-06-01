const links = [
  { name: 'Home', path: '/' },
  { name: 'Archive', path: '/archive' },
  { name: 'Leaderboard', path: '/leaderboard' },
  { name: 'Discord', path: 'https://discord.gg/XxUFnGfw' },
]

function NavLinks() {
  return (
    <nav className="nav-links">
      {links.map((link) => (
        <a key={link.name} href={link.path} className="nav-link">
          {link.name}
        </a>
      ))}
    </nav>
  )
}

export default NavLinks
