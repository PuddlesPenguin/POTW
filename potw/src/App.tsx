import FrontPage from './pages/FrontPage'
import { BrowserRouter, Routes, Route } from 'react-router-dom'
import { useEffect, useState } from 'react'
import type { UserState } from './types/user'
import Login from './pages/auth/Login'
import Signup from './pages/auth/Signup'

function App() {
  const [user, setUser] = useState<UserState>(null)

  useEffect(() => {
    const storedUser = localStorage.getItem('potw-user')

    if (storedUser) {
      setUser(JSON.parse(storedUser) as UserState)
    }
  }, [])

  useEffect(() => {
    if (user) {
      localStorage.setItem('potw-user', JSON.stringify(user))
      return
    }

    localStorage.removeItem('potw-user')
  }, [user])

  return (
    <BrowserRouter>
      <Routes>
        <Route path="/" element={<FrontPage user={user} setUser={setUser} />} />
        <Route path="/login" element={<Login user={user} setUser={setUser} />} />
        <Route path="/signup" element={<Signup user={user} setUser={setUser} />} />
        <Route path="/profile" element={<h1>Profile</h1>} />
        <Route path="/archive" element={<h1>Archive</h1>} />
        <Route path="/leaderboard" element={<h1>Leaderboard</h1>} />
        <Route path="*" element={<h1>Not Found</h1>} />
      </Routes>
    </BrowserRouter>
  )
}

export default App
