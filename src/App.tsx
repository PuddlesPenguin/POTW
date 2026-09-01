import FrontPage from './pages/FrontPage'
import { BrowserRouter, Routes, Route, useLocation } from 'react-router-dom'
import { useEffect, useState } from 'react'
import type { UserState } from './types/user'
import Login from './pages/auth/Login'
import Signup from './pages/auth/Signup'
import Archive from './pages/Archive'
import Leaderboard from './pages/Leaderboard'
import ViewProfile from './pages/ViewProfile'
import NotFound from './pages/NotFound'
import Admin from './pages/Admin'
import SuggestProblem from './pages/SuggestProblem'
import VerifyEmail from './pages/auth/VerifyEmail'
import ForgotPassword from './pages/auth/ForgotPassword'
import ResetPassword from './pages/auth/ResetPassword'
import RequestHint from './pages/RequestHint'

function App() {
  const [user, setUser] = useState<UserState>(() => {
    const storedUser = localStorage.getItem('potw-user')
    if (!storedUser) return null
    try {
      const parsed = JSON.parse(storedUser) as UserState
      return parsed?.token ? parsed : null
    } catch {
      return null
    }
  })

  useEffect(() => {
    if (user) {
      localStorage.setItem('potw-user', JSON.stringify(user))
      return
    }

    localStorage.removeItem('potw-user')
  }, [user])

  return (
    <BrowserRouter>
      <ScrollToTop />
      <Routes>
        <Route path="/" element={<FrontPage user={user} setUser={setUser} />} />
        <Route path="/login" element={<Login user={user} setUser={setUser} />} />
        <Route path="/signup" element={<Signup user={user} setUser={setUser} />} />
        <Route path="/verify-email" element={<VerifyEmail user={user} setUser={setUser} />} />
        <Route path="/forgot-password" element={<ForgotPassword user={user} setUser={setUser} />} />
        <Route path="/reset-password" element={<ResetPassword user={user} setUser={setUser} />} />
        <Route path="/profile" element={<ViewProfile user={user} setUser={setUser} />} />
        <Route path="/archive" element={<Archive user={user} setUser={setUser} />} />
        <Route path="/leaderboard" element={<Leaderboard user={user} setUser={setUser} />} />
        <Route path="/suggest" element={<SuggestProblem user={user} setUser={setUser} />} />
        <Route path="/hints" element={<RequestHint user={user} setUser={setUser} />} />
        <Route path="/admin" element={<Admin user={user} setUser={setUser} />} />
        <Route path="*" element={<NotFound user={user} setUser={setUser} />} />
      </Routes>
    </BrowserRouter>
  )
}

function ScrollToTop() {
  const { pathname } = useLocation()

  useEffect(() => {
    window.scrollTo({ top: 0, left: 0, behavior: 'auto' })
  }, [pathname])

  return null
}

export default App
