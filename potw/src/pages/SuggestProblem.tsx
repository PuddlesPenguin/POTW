import { useEffect, useState } from 'react'
import type { FormEvent } from 'react'
import { MathJax, MathJaxContext } from 'better-react-mathjax'
import { Navigate } from 'react-router-dom'
import NavBar from '../components/navbar/NavBar'
import { apiRequest } from '../lib/api'
import type { SetUser, UserState } from '../types/user'
import './Page.css'

type Props = { user: UserState; setUser: SetUser }
type ProposalSummary = { id: number; title: string; status: string; created_at: string }

const emptyForm = { title: '', statement_latex: '', solution_latex: '', source: '', notes: '' }

function SuggestProblem({ user, setUser }: Props) {
  const [form, setForm] = useState(emptyForm)
  const [proposals, setProposals] = useState<ProposalSummary[]>([])
  const [message, setMessage] = useState('')
  const [submitting, setSubmitting] = useState(false)

  useEffect(() => {
    if (!user) return
    apiRequest<{ proposals: ProposalSummary[] }>('/problem-proposals/mine', {}, user)
      .then((data) => setProposals(data.proposals))
      .catch(() => undefined)
  }, [user])

  if (!user) return <Navigate to="/login" replace />

  async function submit(event: FormEvent) {
    event.preventDefault()
    setSubmitting(true)
    setMessage('')
    try {
      const data = await apiRequest<{ proposal: ProposalSummary; message: string }>('/problem-proposals', {
        method: 'POST',
        body: JSON.stringify(form),
      }, user)
      setProposals((current) => [data.proposal, ...current])
      setForm(emptyForm)
      setMessage(data.message)
    } catch (error) {
      setMessage(error instanceof Error ? error.message : 'Could not send your proposal.')
    } finally {
      setSubmitting(false)
    }
  }

  function update(field: keyof typeof form, value: string) {
    setForm((current) => ({ ...current, [field]: value }))
  }

  return (
    <MathJaxContext>
      <div className="app-page">
        <NavBar user={user} setUser={setUser} />
        <main className="page-content">
          <header className="page-heading">
            <h1>Suggestions</h1>
          </header>
          <section className="section-block proposal-form-section">
          <h2>Propose a problem</h2>
          <form className="panel simple-form" onSubmit={submit}>
            <label>Title<input value={form.title} onChange={(event) => update('title', event.target.value)} required /></label>
            <label>Problem statement (LaTeX)<textarea rows={6} value={form.statement_latex} onChange={(event) => update('statement_latex', event.target.value)} required /></label>
            <div className="latex-preview">
              <strong>Statement preview</strong>
              <MathJax dynamic>{form.statement_latex || 'Your rendered problem will appear here.'}</MathJax>
            </div>
            <label>Solution (optional, LaTeX)<textarea rows={5} value={form.solution_latex} onChange={(event) => update('solution_latex', event.target.value)} /></label>
            {form.solution_latex ? <div className="latex-preview"><strong>Solution preview</strong><MathJax dynamic>{form.solution_latex}</MathJax></div> : null}
            <div className="form-grid">
              <label>Source (optional)<input value={form.source} onChange={(event) => update('source', event.target.value)} /></label>
              <label>Notes (optional)<input value={form.notes} onChange={(event) => update('notes', event.target.value)} /></label>
            </div>
            <button className="primary-button" type="submit" disabled={submitting}>{submitting ? 'Sending…' : 'Send proposal'}</button>
            {message ? <p className="form-message" role="status">{message}</p> : null}
          </form>
          </section>

          <section className="section-block proposal-history-section">
            <h2>Your proposals</h2>
            {proposals.length === 0 ? <div className="panel empty-state">No proposals yet.</div> : (
              <div className="card-list">
                {proposals.map((proposal) => (
                  <article className="simple-card compact-card" key={proposal.id}>
                    <span className="status">{proposal.status}</span>
                    <strong>{proposal.title}</strong>
                    <span className="muted">Sent {new Date(proposal.created_at).toLocaleDateString()}</span>
                  </article>
                ))}
              </div>
            )}
          </section>
        </main>
      </div>
    </MathJaxContext>
  )
}

export default SuggestProblem
