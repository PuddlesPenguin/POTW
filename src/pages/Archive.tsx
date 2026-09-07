import { useEffect, useState } from 'react'
import { MathJaxContext } from 'better-react-mathjax'
import NavBar from '../components/navbar/NavBar'
import Latex from '../components/Latex'
import { apiRequest } from '../lib/api'
import { mathJaxConfig } from '../lib/mathjax'
import type { Problem } from '../types/problem'
import { formatDate, formatTimestamp } from '../types/problem'
import type { SetUser, UserState } from '../types/user'
import './Page.css'

type Props = { user: UserState; setUser: SetUser }

function Archive({ user, setUser }: Props) {
  const [problems, setProblems] = useState<Problem[]>([])
  const [visibleSolutions, setVisibleSolutions] = useState<Set<number>>(new Set())
  const [message, setMessage] = useState('Loading archived problems…')

  function toggleSolution(problemId: number) {
    setVisibleSolutions((current) => {
      const next = new Set(current)
      if (next.has(problemId)) next.delete(problemId)
      else next.add(problemId)
      return next
    })
  }

  useEffect(() => {
    apiRequest<{ problems: Problem[] }>('/problems/archive')
      .then((data) => { setProblems(data.problems); setMessage('') })
      .catch((error) => setMessage(error instanceof Error ? error.message : 'Could not load the archive.'))
  }, [])

  return (
    <MathJaxContext config={mathJaxConfig} version={4}>
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
                <div><Latex>{problem.statement_latex}</Latex></div>
                {problem.solution_latex?.trim() ? (
                  <>
                    <button
                      className="secondary-button"
                      type="button"
                      aria-expanded={visibleSolutions.has(problem.id)}
                      onClick={() => toggleSolution(problem.id)}
                    >
                      {visibleSolutions.has(problem.id) ? 'Hide solution' : 'Show solution'}
                    </button>
                    {visibleSolutions.has(problem.id) ? (
                      <div className="latex-preview solution-preview">
                        <strong>Solution</strong>
                        <Latex>{problem.solution_latex}</Latex>
                      </div>
                    ) : null}
                  </>
                ) : null}
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
