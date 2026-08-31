import { useEffect, useState } from 'react'
import { MathJax, MathJaxContext } from 'better-react-mathjax'
import NavBar from '../components/navbar/NavBar'
import { apiRequest } from '../lib/api'
import type { Problem } from '../types/problem'
import { formatDate, formatTimestamp } from '../types/problem'
import type { SetUser, UserState } from '../types/user'
import './Page.css'

type Props = { user: UserState; setUser: SetUser }

function Archive({ user, setUser }: Props) {
  const [problems, setProblems] = useState<Problem[]>([])
  const [message, setMessage] = useState('Loading archived problems…')

  useEffect(() => {
    apiRequest<{ problems: Problem[] }>('/problems/archive')
      .then((data) => { setProblems(data.problems); setMessage('') })
      .catch((error) => setMessage(error instanceof Error ? error.message : 'Could not load the archive.'))
  }, [])

  return (
    <MathJaxContext>
      <div className="app-page">
        <NavBar user={user} setUser={setUser} />
        <main className="page-content">
          <header className="page-heading"><h1>Problem archive</h1></header>
          {message ? <div className="panel empty-state">{message}</div> : null}
          {!message && problems.length === 0 ? <div className="panel empty-state">No archived problems yet.</div> : null}
          <div className="card-list">
            {problems.map((problem) => (
              <article className="simple-card" key={problem.id}>
                <span className="status">{problem.problem_type}</span>
                <h2>{problem.title}</h2>
                <p className="muted">Released {problem.release_at ? formatTimestamp(problem.release_at) : formatDate(problem.release_date)} · Due {problem.due_at ? formatTimestamp(problem.due_at) : formatDate(problem.due_date)} · Difficulty {problem.difficulty_rating ?? '—'}/10</p>
                <div><MathJax dynamic>{problem.statement_latex}</MathJax></div>
                {problem.problem_source ? <p className="muted">Source: {problem.problem_source}</p> : null}
              </article>
            ))}
          </div>
        </main>
      </div>
    </MathJaxContext>
  )
}

export default Archive
