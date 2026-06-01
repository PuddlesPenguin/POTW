import FrontPage from './pages/FrontPage'
import { BrowserRouter, Routes, Route } from 'react-router-dom'
import { useState } from 'react'
import type { UserState } from './types/user'
import Login from './pages/auth/Login'

function App() {
  const [user, setUser] = useState<UserState>(null)
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/" element={<FrontPage user={user} setUser={setUser} />} />
        <Route path="/login" element={<Login user={user} setUser={setUser} />} />
        <Route path="/signup" element={<h1>Signup</h1>} />
        <Route path="/archive" element={<h1>Archive</h1>} />
        <Route path="/leaderboard" element={<h1>Leaderboard</h1>} />
        <Route path="*" element={<h1>Not Found</h1>} />
      </Routes>
    </BrowserRouter>
  )
}

export default App
