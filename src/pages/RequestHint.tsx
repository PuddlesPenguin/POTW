import { useEffect, useState } from 'react'
import type { FormEvent } from 'react'
import { MathJax, MathJaxContext } from 'better-react-mathjax'
import { Navigate } from 'react-router-dom'
import NavBar from '../components/navbar/NavBar'
import { apiRequest } from '../lib/api'
import type { Problem } from '../types/problem'
import type { SetUser, UserState } from '../types/user'
import './Page.css'

type Props = { user: UserState; setUser: SetUser }
type HintRequest = { id: number; problem_title: string; message?: string | null; response?: string | null; status: string; created_at: string }

function RequestHint({ user, setUser }: Props) {
  const [problems, setProblems] = useState<Problem[]>([])
  const [problemId, setProblemId] = useState('')
  const [work, setWork] = useState('')
  const [message, setMessage] = useState('')
  const [submitting, setSubmitting] = useState(false)
  const [requests, setRequests] = useState<HintRequest[]>([])

  useEffect(() => {
    apiRequest<{ problems: Problem[] }>('/problems/current')
      .then((data) => {
        const available = data.problems.filter((problem) => problem.allow_hint_requests)
        setProblems(available)
        setProblemId(available[0] ? String(available[0].id) : '')
      })
      .catch((error) => setMessage(error instanceof Error ? error.message : 'Could not load problems.'))
  }, [])

  useEffect(() => {
    if (!user) return
    apiRequest<{ hint_requests: HintRequest[] }>('/hint-requests/mine', {}, user)
      .then((data) => setRequests(data.hint_requests))
      .catch(() => undefined)
  }, [user])

  if (!user) return <Navigate to="/login" replace />

  async function submit(event: FormEvent) {
    event.preventDefault()
    setSubmitting(true)
    setMessage('')
    try {
      const data = await apiRequest<{ message: string }>(`/problems/${problemId}/hint-requests`, {
        method: 'POST', body: JSON.stringify({ message: work }),
      }, user)
      setWork('')
      setMessage(data.message)
      const refreshed = await apiRequest<{ hint_requests: HintRequest[] }>('/hint-requests/mine', {}, user)
      setRequests(refreshed.hint_requests)
    } catch (error) {
      setMessage(error instanceof Error ? error.message : 'Could not send your request.')
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <MathJaxContext>
      <div className="app-page">
        <NavBar user={user} setUser={setUser} />
        <main className="page-content hint-page">
          <header className="page-heading"><h1>Request a hint</h1></header>
          {problems.length > 0 ? (
            <form className="panel simple-form" onSubmit={submit}>
              <div className="hint-problem-picker" role="group" aria-label="Problem">
                {problems.map((problem) => <button className={problemId === String(problem.id) ? 'selected' : ''} type="button" key={problem.id} onClick={() => setProblemId(String(problem.id))}>{problem.title}</button>)}
              </div>
              <label>What have you tried?<textarea rows={7} value={work} onChange={(event) => setWork(event.target.value)} required /></label>
              {work ? <div className="latex-preview"><strong>Preview</strong><MathJax dynamic>{work}</MathJax></div> : null}
              <button className="primary-button" type="submit" disabled={submitting}>{submitting ? 'Sending…' : 'Request hint'}</button>
            </form>
          ) : <div className="panel empty-state">No problems are accepting hint requests.</div>}
          {requests.length > 0 ? <section className="hint-history"><h2>Your hint requests</h2><div className="card-list">{requests.map((request) => <article className="simple-card compact-card" key={request.id}><div className="card-title-row"><h3>{request.problem_title}</h3><span className="status">{request.status}</span></div>{request.message ? <MathJax dynamic>{request.message}</MathJax> : null}{request.response ? <div className="hint-response"><strong>Admin response</strong><MathJax dynamic>{request.response}</MathJax></div> : null}</article>)}</div></section> : null}
          {message ? <p className="form-message" role="status">{message}</p> : null}
        </main>
      </div>
    </MathJaxContext>
  )
}

export default RequestHint
