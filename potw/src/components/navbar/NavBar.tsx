import './NavBar.css'

import Logo from './Logo'
import NavLinks from './NavLinks'
import AuthLinks from './AuthLinks'
import type { SetUser, UserState } from '../../types/user'
import { useState, useEffect } from 'react'

type Props = {
  user: UserState
  setUser: SetUser
}

function Navbar({ user, setUser }: Props) {
  const [dropDown, setDropDown] = useState(false);
  const [menuOpen, setMenuOpen] = useState(false);

  useEffect(() => {
    const handleResize = () => {
      if (window.innerWidth < 1010) {
        setDropDown(true);
      } else {
        setDropDown(false);
        setMenuOpen(false);
      }
    };

    window.addEventListener('resize', handleResize);
    handleResize();
    return () => window.removeEventListener('resize', handleResize);
  }, []);
  if (!dropDown) {
    return (
      <div className="navbar">
        <div className="inner-navbar">
          <Logo />
          <NavLinks />
          <AuthLinks user={user} setUser={setUser} />
        </div>
      </div>
    )
  } else {
    return (
      <div className="navbar">
        <div className="inner-navbar">
          <Logo />
          <div className="dropdown">
            <button
              type="button"
              className="hamburger-button"
              aria-label="Open navigation menu"
              aria-expanded={menuOpen}
              onClick={() => setMenuOpen((currentValue) => !currentValue)}
            >
              <span />
              <span />
              <span />
            </button>
            {menuOpen ? (
              <div className="dropdown-panel">
                <NavLinks />
                <AuthLinks user={user} setUser={setUser} />
              </div>
            ) : null}
          </div>
        </div>
      </div>
    )
  }
}
export default Navbar
