import { useEffect, useRef, useState } from 'react'
import NavBar from '../components/navbar/NavBar'
import { apiRequest } from '../lib/api'
import { formatDate } from '../types/problem'
import type { SetUser, UserState } from '../types/user'
import './Page.css'

type Props = { user: UserState; setUser: SetUser }
type Season = { id: number; name: string; start_date: string; end_date: string; is_active: boolean }
type LeaderboardProblem = { id: number; title: string; problem_type: string; release_date: string }
type Leader = { id: number; username: string; solved: number; points: number; scores: Record<string, number | null> }

function Leaderboard({ user, setUser }: Props) {
  const [seasons, setSeasons] = useState<Season[]>([])
  const [selectedSeasonId, setSelectedSeasonId] = useState('')
  const [season, setSeason] = useState<Season | null>(null)
  const [problems, setProblems] = useState<LeaderboardProblem[]>([])
  const [leaders, setLeaders] = useState<Leader[]>([])
  const newestProblemRef = useRef<HTMLTableCellElement | null>(null)
  const [message, setMessage] = useState('Loading leaderboard…')

  useEffect(() => {
    apiRequest<{ seasons: Season[] }>('/seasons')
      .then((data) => {
        setSeasons(data.seasons)
        const initial = data.seasons.find((item) => item.is_active) ?? data.seasons[0]
        setSelectedSeasonId(initial ? String(initial.id) : '')
        if (!initial) setMessage('No seasons have been created yet.')
      })
      .catch((error) => setMessage(error instanceof Error ? error.message : 'Could not load seasons.'))
  }, [])

  useEffect(() => {
    if (!selectedSeasonId) return
    const refresh = () => apiRequest<{ season: Season; problems: LeaderboardProblem[]; leaders: Leader[] }>(`/leaderboard?season_id=${selectedSeasonId}`)
      .then((data) => { setSeason(data.season); setProblems(data.problems); setLeaders(data.leaders); setMessage('') })
      .catch((error) => setMessage(error instanceof Error ? error.message : 'Could not load the leaderboard.'))
    void refresh()
    const interval = window.setInterval(refresh, 15000)
    return () => window.clearInterval(interval)
  }, [selectedSeasonId])

  useEffect(() => {
    if (problems.length > 0) newestProblemRef.current?.scrollIntoView({ behavior: 'smooth', block: 'nearest', inline: 'center' })
  }, [problems])

  return (
    <div className="app-page">
      <NavBar user={user} setUser={setUser} />
      <main className="page-content leaderboard-page">
        <header className="page-heading season-heading">
          <div><h1>Leaderboard</h1>{season ? <p>{formatDate(season.start_date)} – {formatDate(season.end_date)} · 5 points per problem</p> : null}</div>
          <label>Season<select value={selectedSeasonId} onChange={(event) => { setMessage('Loading leaderboard…'); setSelectedSeasonId(event.target.value) }}>{seasons.map((item) => <option key={item.id} value={item.id}>{item.name}</option>)}</select></label>
        </header>
        <div className="panel table-wrap">
          {message ? <div className="empty-state">{message}</div> : (
            <table className="simple-table leaderboard-table">
              <thead><tr><th>Rank</th><th>Member</th>{problems.map((problem, index) => <th ref={index === problems.length - 1 ? newestProblemRef : undefined} key={problem.id} title={problem.title}>P{index + 1}</th>)}<th>Total</th></tr></thead>
              <tbody>{leaders.map((leader, index) => <tr key={leader.id}><td>{index + 1}</td><td>{leader.username}</td>{problems.map((problem) => { const score = leader.scores[problem.id]; const scoreClass = score === null || score === undefined ? 'score-unattempted' : score === 5 ? 'score-correct' : score === 0 ? 'score-incorrect' : ''; return <td className={scoreClass} key={problem.id}>{score === null || score === undefined ? '—' : score}</td> })}<td><strong>{leader.points}</strong></td></tr>)}</tbody>
            </table>
          )}
          {!message && leaders.length === 0 ? <div className="empty-state">No solvers are ranked in this season yet.</div> : null}
        </div>
        {!message && problems.length > 0 ? <div className="problem-key">{problems.map((problem, index) => <span key={problem.id}><strong>P{index + 1}</strong> {problem.title}</span>)}</div> : null}
      </main>
    </div>
  )
}

export default Leaderboard
