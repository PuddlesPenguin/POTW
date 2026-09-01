import { useEffect, useState } from 'react'
import type { FormEvent } from 'react'
import { MathJax, MathJaxContext } from 'better-react-mathjax'
import { Navigate } from 'react-router-dom'
import NavBar from '../components/navbar/NavBar'
import { apiRequest } from '../lib/api'
import type { SetUser, UserState } from '../types/user'
import './Page.css'

type Props = { user: UserState; setUser: SetUser }
type ProposalSummary = { id: number; title: string; statement_latex: string; solution_latex?: string | null; source?: string | null; notes?: string | null; status: string; created_at: string }

const emptyForm = { title: '', statement_latex: '', solution_latex: '', source: '', notes: '' }

function SuggestProblem({ user, setUser }: Props) {
  const [form, setForm] = useState(emptyForm)
  const [editingProposalId, setEditingProposalId] = useState<number | null>(null)
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
      const data = await apiRequest<{ proposal: ProposalSummary; message: string }>(editingProposalId ? `/problem-proposals/${editingProposalId}` : '/problem-proposals', {
        method: editingProposalId ? 'PATCH' : 'POST',
        body: JSON.stringify(form),
      }, user)
      setProposals((current) => editingProposalId ? current.map((proposal) => proposal.id === editingProposalId ? data.proposal : proposal) : [data.proposal, ...current])
      setForm(emptyForm)
      setEditingProposalId(null)
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

  async function removeProposal(proposal: ProposalSummary) {
    if (!window.confirm(`Remove your proposal, ${proposal.title}?`)) return
    try {
      const data = await apiRequest<{ message: string }>(`/problem-proposals/${proposal.id}`, { method: 'DELETE' }, user)
      setProposals((current) => current.filter((item) => item.id !== proposal.id))
      if (editingProposalId === proposal.id) { setEditingProposalId(null); setForm(emptyForm) }
      setMessage(data.message)
    } catch (error) {
      setMessage(error instanceof Error ? error.message : 'Could not remove your proposal.')
    }
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
          <h2>{editingProposalId ? 'Edit proposal' : 'Propose a problem'}</h2>
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
            <div className="button-row"><button className="primary-button" type="submit" disabled={submitting}>{submitting ? 'Saving…' : editingProposalId ? 'Save changes' : 'Send proposal'}</button>{editingProposalId ? <button className="secondary-button" type="button" onClick={() => { setEditingProposalId(null); setForm(emptyForm) }}>Cancel</button> : null}</div>
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
                    {proposal.status === 'pending' ? <div className="button-row"><button className="secondary-button" type="button" onClick={() => { setEditingProposalId(proposal.id); setForm({ title: proposal.title, statement_latex: proposal.statement_latex, solution_latex: proposal.solution_latex ?? '', source: proposal.source ?? '', notes: proposal.notes ?? '' }); setMessage('Editing your proposal.') }}>Edit proposal</button><button className="danger-button" type="button" onClick={() => void removeProposal(proposal)}>Remove proposal</button></div> : null}
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
