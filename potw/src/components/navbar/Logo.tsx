import { Link } from 'react-router-dom'

function Logo() {
  return (
    <div className="logo-container">
      <Link to="/" className="navbar-logo">
        <img
          src="/POTWLogo.svg"
          alt="Purdue Math Club logo"
          className="logo-image"
        />
        <span className="logo-text">Purdue Math Club POTW</span>
      </Link>
    </div>
  )
}

export default Logo
