import { useEffect, useState } from 'react'
import type { FormEvent } from 'react'
import { MathJax, MathJaxContext } from 'better-react-mathjax'
import { Navigate } from 'react-router-dom'
import NavBar from '../components/navbar/NavBar'
import { apiRequest, downloadSubmissionFile } from '../lib/api'
import type { Problem } from '../types/problem'
import { formatDate, formatTimestamp } from '../types/problem'
import type { SetUser, User, UserState } from '../types/user'
import './Page.css'

type Props = { user: UserState; setUser: SetUser }
type AdminTab = 'grading' | 'problems' | 'proposals' | 'seasons' | 'users'
type AdminProblem = Problem & { solution_latex?: string | null }
type Submission = {
  id: number; username: string; email: string; title: string; problem_type: string
  answer_text?: string | null; work_text?: string | null; file_name?: string | null; solution_latex?: string | null
  score: number; feedback?: string | null; graded_at?: string | null; submitted_at: string
}
type Proposal = {
  id: number; username: string; email: string; title: string; statement_latex: string
  solution_latex?: string | null; source?: string | null; notes?: string | null
  status: 'pending' | 'accepted' | 'declined'; created_at: string
}
type HintRequest = { id: number; username: string; problem_title: string; message?: string | null; response?: string | null; status: string; created_at: string }
type Season = { id: number; name: string; start_date: string; end_date: string; is_active: boolean }
type ManagedUser = { id: number; username: string; email: string; is_admin: boolean; is_superuser: boolean }

const releaseTimeZone = 'America/Indiana/Indianapolis'

function defaultReleaseTime() {
  const parts = Object.fromEntries(new Intl.DateTimeFormat('en-US', {
    timeZone: releaseTimeZone, year: 'numeric', month: '2-digit', day: '2-digit',
    weekday: 'short', hour: '2-digit', hourCycle: 'h23',
  }).formatToParts(new Date()).map((part) => [part.type, part.value]))
  const weekdays = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat']
  const weekday = weekdays.indexOf(parts.weekday)
  let daysUntilMonday = (1 - weekday + 7) % 7
  if (daysUntilMonday === 0 && Number(parts.hour) >= 18) daysUntilMonday = 7
  const calendarDate = new Date(Date.UTC(Number(parts.year), Number(parts.month) - 1, Number(parts.day) + daysUntilMonday))
  return `${calendarDate.toISOString().slice(0, 10)}T18:00`
}

function localScheduledTime(value?: string | null, fallback = '') {
  if (!value) return fallback
  const formatted = new Intl.DateTimeFormat('sv-SE', {
    timeZone: releaseTimeZone, year: 'numeric', month: '2-digit', day: '2-digit',
    hour: '2-digit', minute: '2-digit', hourCycle: 'h23',
  }).format(new Date(value))
  return formatted.replace(' ', 'T')
}

function newProblemForm() {
  const releaseAt = defaultReleaseTime()
  const dueDate = new Date(`${releaseAt.slice(0, 10)}T00:00:00Z`)
  dueDate.setUTCDate(dueDate.getUTCDate() + 6)
  const dueAt = `${dueDate.toISOString().slice(0, 10)}T18:00`
  return {
    title: '', statement_latex: '', solution_latex: '', problem_source: '', proposed_by: '',
    problem_type: 'Computational', release_date: releaseAt.slice(0, 10), release_at: releaseAt, due_date: dueAt.slice(0, 10), due_at: dueAt, hints: '', difficulty_rating: '',
    is_current: true, is_archived: false, hints_enabled: true, allow_hint_requests: true,
  }
}

function Admin({ user, setUser }: Props) {
  const [tab, setTab] = useState<AdminTab>('grading')
  if (!user) return <Navigate to="/login" replace />
  if (!user.is_admin && !user.is_superuser) return <Navigate to="/" replace />

  const tabs: { id: AdminTab; label: string; superuser?: boolean }[] = [
    { id: 'grading', label: 'Grading' },
    { id: 'problems', label: 'Problems' },
    { id: 'proposals', label: 'Proposals' },
    { id: 'seasons', label: 'Seasons' },
    { id: 'users', label: 'Users', superuser: true },
  ]

  return (
    <MathJaxContext>
      <div className="app-page">
        <NavBar user={user} setUser={setUser} />
        <main className="page-content admin-page">
          <header className="page-heading"><h1>Admin</h1><p>Manage weekly problems and grading.</p></header>
          <div className="admin-tabs" role="tablist">
            {tabs.filter((item) => !item.superuser || user.is_superuser).map((item) => (
              <button key={item.id} type="button" className={tab === item.id ? 'active' : ''} onClick={() => setTab(item.id)}>{item.label}</button>
            ))}
          </div>
          {tab === 'grading' ? <GradingTab user={user} /> : null}
          {tab === 'problems' ? <ProblemsTab user={user} /> : null}
          {tab === 'proposals' ? <ProposalsTab user={user} /> : null}
          {tab === 'seasons' ? <SeasonsTab user={user} /> : null}
          {tab === 'users' && user.is_superuser ? <UsersTab user={user} /> : null}
        </main>
      </div>
    </MathJaxContext>
  )
}

function GradingTab({ user }: { user: User }) {
  const [submissions, setSubmissions] = useState<Submission[]>([])
  const [grades, setGrades] = useState<Record<number, { score: string; feedback: string }>>({})
  const [showAll, setShowAll] = useState(false)
  const [message, setMessage] = useState('Loading pending submissions…')

  useEffect(() => {
    apiRequest<{ submissions: Submission[] }>(`/admin/submissions${showAll ? '?status=all' : ''}`, {}, user)
      .then((data) => {
        setSubmissions(data.submissions)
        setGrades(Object.fromEntries(data.submissions.map((item) => [item.id, { score: String(item.score ?? 0), feedback: item.feedback ?? '' }])))
        setMessage('')
      })
      .catch((error) => setMessage(error instanceof Error ? error.message : 'Could not load submissions.'))
  }, [user, showAll])

  async function saveGrade(submission: Submission) {
    const grade = grades[submission.id] ?? { score: '0', feedback: '' }
    try {
      const data = await apiRequest<{ message: string }>(`/admin/submissions/${submission.id}/grade`, {
        method: 'PATCH', body: JSON.stringify({ score: Number(grade.score), feedback: grade.feedback }),
      }, user)
      setSubmissions((current) => current.map((item) => item.id === submission.id
        ? { ...item, score: Number(grade.score), feedback: grade.feedback || null, graded_at: new Date().toISOString() }
        : item))
      if (!showAll) setSubmissions((current) => current.filter((item) => item.id !== submission.id))
      setMessage(showAll ? data.message : '')
    } catch (error) {
      setMessage(error instanceof Error ? error.message : 'Could not save the grade.')
    }
  }

  function updateGrade(id: number, field: 'score' | 'feedback', value: string) {
    setGrades((current) => ({ ...current, [id]: { score: current[id]?.score ?? '0', feedback: current[id]?.feedback ?? '', [field]: value } }))
  }

  return (
    <section className="admin-section">
      <div className="section-heading"><div><h2>{showAll ? 'All submissions' : 'Pending grading'}</h2><p className="muted">Each problem is worth up to 5 points.</p></div><span className="count-badge">{submissions.length}</span></div>
      <div className="button-row grading-filter" role="group" aria-label="Submission filter">
        <button className={!showAll ? 'primary-button' : 'secondary-button'} type="button" onClick={() => setShowAll(false)}>Pending</button>
        <button className={showAll ? 'primary-button' : 'secondary-button'} type="button" onClick={() => setShowAll(true)}>All submissions</button>
      </div>
      {message ? <p className="form-message" role="status">{message}</p> : null}
      {!message && submissions.length === 0 ? <div className="panel empty-state">{showAll ? 'No submissions yet.' : 'Everything is graded.'}</div> : null}
      <div className="card-list">
        {submissions.map((submission) => {
          const grade = grades[submission.id] ?? { score: String(submission.score ?? 0), feedback: submission.feedback ?? '' }
          return (
            <article className="simple-card" key={submission.id}>
              <div className="card-title-row"><div><span className="status">{submission.problem_type}</span><h3>{submission.title}</h3></div><span className="muted">{submission.username}</span></div>
              <p className="muted">Submitted {new Date(submission.submitted_at).toLocaleString()}</p>
              {submission.answer_text ? <div className="answer-box"><strong>Short answer</strong><p>{submission.answer_text}</p></div> : null}
              {submission.work_text ? <div className="answer-box"><strong>{submission.problem_type.toLowerCase().includes('proof') ? 'Written proof' : 'Comment / shown work'}</strong><MathJax dynamic>{submission.work_text}</MathJax></div> : null}
              {submission.file_name ? <button className="secondary-button" type="button" onClick={() => downloadSubmissionFile(submission.id, user).catch((error) => setMessage(error.message))}>Download {submission.file_name}</button> : null}
              {submission.solution_latex ? <details><summary>Reference solution</summary><div className="latex-preview"><MathJax dynamic>{submission.solution_latex}</MathJax></div></details> : null}
              <div className="grade-row">
                <label>Score (0–5)<input type="number" min="0" max="5" step="1" value={grade.score} onChange={(event) => updateGrade(submission.id, 'score', event.target.value)} /></label>
                <label>Feedback<input value={grade.feedback} onChange={(event) => updateGrade(submission.id, 'feedback', event.target.value)} placeholder="Optional feedback" /></label>
                <button className="primary-button" type="button" onClick={() => saveGrade(submission)}>Save grade</button>
              </div>
            </article>
          )
        })}
      </div>
    </section>
  )
}

function ProblemsTab({ user }: { user: User }) {
  const [problems, setProblems] = useState<AdminProblem[]>([])
  const [editingId, setEditingId] = useState<number | null>(null)
  const [form, setForm] = useState(newProblemForm)
  const [message, setMessage] = useState('Loading problems…')

  function load() {
    apiRequest<{ problems: AdminProblem[] }>('/admin/problems', {}, user)
      .then((data) => { setProblems(data.problems); setMessage('') })
      .catch((error) => setMessage(error instanceof Error ? error.message : 'Could not load problems.'))
  }
  useEffect(load, [user])

  function update(field: keyof typeof form, value: string | boolean) {
    setForm((current) => ({ ...current, [field]: value }))
  }

  function edit(problem: AdminProblem) {
    setEditingId(problem.id)
    setForm({
      title: problem.title, statement_latex: problem.statement_latex, solution_latex: problem.solution_latex ?? '',
      problem_source: problem.problem_source ?? '', proposed_by: problem.proposed_by ?? '', problem_type: problem.problem_type,
      release_date: problem.release_date?.slice(0, 10) ?? '', release_at: localScheduledTime(problem.release_at, defaultReleaseTime()),
      due_date: problem.due_date?.slice(0, 10) ?? '', due_at: localScheduledTime(problem.due_at), hints: problem.hints ?? '',
      difficulty_rating: problem.difficulty_rating ? String(problem.difficulty_rating) : '', is_current: problem.is_current, is_archived: problem.is_archived,
      hints_enabled: problem.hints_enabled, allow_hint_requests: problem.allow_hint_requests,
    })
    window.scrollTo({ top: 0, behavior: 'smooth' })
  }

  function reset() { setEditingId(null); setForm(newProblemForm()); setMessage('') }

  async function save(event: FormEvent) {
    event.preventDefault()
    try {
      const path = editingId ? `/admin/problems/${editingId}` : '/admin/problems'
      const data = await apiRequest<{ message: string }>(path, {
        method: editingId ? 'PUT' : 'POST', body: JSON.stringify(form),
      }, user)
      reset()
      setMessage(data.message)
      load()
    } catch (error) {
      setMessage(error instanceof Error ? error.message : 'Could not save the problem.')
    }
  }

  async function remove(problem: AdminProblem) {
    if (!window.confirm(`Remove “${problem.title}”? Existing submissions for it will also be removed.`)) return
    try {
      const data = await apiRequest<{ message: string }>(`/admin/problems/${problem.id}`, { method: 'DELETE' }, user)
      setProblems((current) => current.filter((item) => item.id !== problem.id))
      setMessage(data.message)
      if (editingId === problem.id) reset()
    } catch (error) {
      setMessage(error instanceof Error ? error.message : 'Could not remove the problem.')
    }
  }

  return (
    <section className="admin-section">
      <div className="section-heading"><div><h2>{editingId ? 'Edit problem' : 'Add problem'}</h2><p className="muted">New problems default to Monday at 6:00 PM Eastern.</p></div>{editingId ? <button className="secondary-button" type="button" onClick={reset}>New problem</button> : null}</div>
      <form className="panel simple-form" onSubmit={save}>
        <div className="form-grid"><label>Title<input value={form.title} onChange={(event) => update('title', event.target.value)} required /></label><label>Type<select value={form.problem_type} onChange={(event) => update('problem_type', event.target.value)}><option>Computational</option><option>Proof-based</option></select></label></div>
        <label>Problem statement (LaTeX)<textarea rows={6} value={form.statement_latex} onChange={(event) => update('statement_latex', event.target.value)} required /></label>
        <div className="latex-preview"><strong>Statement preview</strong><MathJax dynamic>{form.statement_latex || 'Your rendered problem will appear here.'}</MathJax></div>
        <label>Solution (LaTeX)<textarea rows={6} value={form.solution_latex} onChange={(event) => update('solution_latex', event.target.value)} /></label>
        <div className="latex-preview"><strong>Solution preview</strong><MathJax dynamic>{form.solution_latex || 'Your rendered solution will appear here.'}</MathJax></div>
        <div className="form-grid"><label>Release date and time (Eastern)<input type="datetime-local" value={form.release_at} onChange={(event) => setForm((current) => ({ ...current, release_at: event.target.value, release_date: event.target.value.slice(0, 10) }))} required /></label><label>Due date and time (Eastern)<input type="datetime-local" value={form.due_at} onChange={(event) => setForm((current) => ({ ...current, due_at: event.target.value, due_date: event.target.value.slice(0, 10) }))} /></label></div>
        <div className="form-grid"><label>Difficulty (1–10)<input type="number" min="1" max="10" value={form.difficulty_rating} onChange={(event) => update('difficulty_rating', event.target.value)} /></label><label>Source<input value={form.problem_source} onChange={(event) => update('problem_source', event.target.value)} /></label></div>
        <div className="form-grid"><label>Proposed by<input value={form.proposed_by} onChange={(event) => update('proposed_by', event.target.value)} /></label><label>Published hint (LaTeX supported)<textarea rows={3} value={form.hints} onChange={(event) => update('hints', event.target.value)} /></label></div>
        {form.hints ? <div className="latex-preview"><strong>Hint preview</strong><MathJax dynamic>{form.hints}</MathJax></div> : null}
        <div className="check-row"><label><input type="checkbox" checked={form.hints_enabled} onChange={(event) => update('hints_enabled', event.target.checked)} /> Show the published hint</label><label><input type="checkbox" checked={form.allow_hint_requests} onChange={(event) => update('allow_hint_requests', event.target.checked)} /> Allow hint requests</label></div>
        <div className="check-row"><label><input type="checkbox" checked={form.is_current} onChange={(event) => update('is_current', event.target.checked)} /> Available when release date arrives</label><label><input type="checkbox" checked={form.is_archived} onChange={(event) => update('is_archived', event.target.checked)} /> Archived</label></div>
        <button className="primary-button" type="submit">{editingId ? 'Save changes' : 'Create problem'}</button>
        {message ? <p className="form-message" role="status">{message}</p> : null}
      </form>
      <div className="section-heading list-heading"><h2>All problems</h2><span className="count-badge">{problems.length}</span></div>
      <div className="card-list">
        {problems.map((problem) => (
          <article className="simple-card compact-card" key={problem.id}>
            <div className="card-title-row"><div><span className="status">{problem.problem_type}</span><h3>{problem.title}</h3></div><span className="muted">{problem.release_at ? formatTimestamp(problem.release_at) : formatDate(problem.release_date)}</span></div>
            <p className="muted">Difficulty {problem.difficulty_rating ?? '—'}/10 · Due {problem.due_at ? formatTimestamp(problem.due_at) : formatDate(problem.due_date)} · {problem.is_archived ? 'Archived' : problem.is_current ? 'Scheduled/current' : 'Draft'}</p>
            <div className="button-row"><button className="secondary-button" type="button" onClick={() => edit(problem)}>Edit</button><button className="danger-button" type="button" onClick={() => remove(problem)}>Remove</button></div>
          </article>
        ))}
      </div>
    </section>
  )
}

function ProposalsTab({ user }: { user: User }) {
  const [proposals, setProposals] = useState<Proposal[]>([])
  const [hints, setHints] = useState<HintRequest[]>([])
  const [hintResponses, setHintResponses] = useState<Record<number, string>>({})
  const [message, setMessage] = useState('Loading proposals…')

  function load() {
    apiRequest<{ proposals: Proposal[]; hint_requests: HintRequest[] }>('/admin/proposals', {}, user)
      .then((data) => { setProposals(data.proposals); setHints(data.hint_requests); setMessage('') })
      .catch((error) => setMessage(error instanceof Error ? error.message : 'Could not load proposals.'))
  }
  useEffect(load, [user])

  async function setProposalStatus(id: number, status: Proposal['status']) {
    await apiRequest(`/admin/proposals/${id}`, { method: 'PATCH', body: JSON.stringify({ status }) }, user)
    setProposals((current) => current.map((item) => item.id === id ? { ...item, status } : item))
  }

  async function respondToHint(hint: HintRequest) {
    const response = hintResponses[hint.id] ?? hint.response ?? ''
    await apiRequest(`/admin/hint-requests/${hint.id}`, { method: 'PATCH', body: JSON.stringify({ status: response.trim() ? 'resolved' : 'pending', response }) }, user)
    setHints((current) => current.map((item) => item.id === hint.id ? { ...item, status: response.trim() ? 'resolved' : 'pending', response: response.trim() || null } : item))
  }

  return (
    <section className="admin-section">
      <div className="section-heading"><h2>Problem proposals</h2><span className="count-badge">{proposals.filter((item) => item.status === 'pending').length} pending</span></div>
      {message ? <p className="form-message">{message}</p> : null}
      {proposals.length === 0 ? <div className="panel empty-state">No problem proposals yet.</div> : null}
      <div className="card-list">
        {proposals.map((proposal) => (
          <article className="simple-card" key={proposal.id}>
            <div className="card-title-row"><div><span className="status">{proposal.status}</span><h3>{proposal.title}</h3></div><span className="muted">{proposal.username}</span></div>
            <div className="latex-preview"><MathJax dynamic>{proposal.statement_latex}</MathJax></div>
            <button className="secondary-button copy-button" type="button" onClick={() => navigator.clipboard.writeText(proposal.statement_latex)}>Copy statement LaTeX</button>
            {proposal.solution_latex ? <details><summary>Proposed solution</summary><div className="latex-preview"><MathJax dynamic>{proposal.solution_latex}</MathJax></div><button className="secondary-button copy-button" type="button" onClick={() => navigator.clipboard.writeText(proposal.solution_latex ?? '')}>Copy solution LaTeX</button></details> : null}
            {proposal.source ? <p><strong>Source:</strong> {proposal.source}</p> : null}{proposal.notes ? <p><strong>Notes:</strong> {proposal.notes}</p> : null}
            <div className="button-row"><button className="primary-button" type="button" onClick={() => setProposalStatus(proposal.id, 'accepted')}>Accept</button><button className="secondary-button" type="button" onClick={() => setProposalStatus(proposal.id, 'declined')}>Decline</button><button className="secondary-button" type="button" onClick={() => setProposalStatus(proposal.id, 'pending')}>Pending</button></div>
          </article>
        ))}
      </div>
      <div className="section-heading list-heading"><h2>Hint requests</h2><span className="count-badge">{hints.filter((item) => item.status === 'pending').length} pending</span></div>
      {hints.length === 0 ? <div className="panel empty-state">No hint requests yet.</div> : (
        <div className="card-list">{hints.map((hint) => <article className="simple-card compact-card" key={hint.id}><div className="card-title-row"><div><span className="status">{hint.status}</span><h3>{hint.problem_title}</h3></div><span className="muted">{hint.username}</span></div>{hint.message ? <MathJax dynamic>{hint.message}</MathJax> : <p className="muted">No message included.</p>}<label>Response (LaTeX supported)<textarea rows={3} value={hintResponses[hint.id] ?? hint.response ?? ''} onChange={(event) => setHintResponses((current) => ({ ...current, [hint.id]: event.target.value }))} placeholder="Write a hint for this solver" /></label><button className="primary-button" type="button" onClick={() => respondToHint(hint)}>{hint.response ? 'Update response' : 'Send response'}</button></article>)}</div>
      )}
    </section>
  )
}

function SeasonsTab({ user }: { user: User }) {
  const [seasons, setSeasons] = useState<Season[]>([])
  const [editingId, setEditingId] = useState<number | null>(null)
  const [form, setForm] = useState({ name: '', start_date: '', end_date: '', is_active: false })
  const [message, setMessage] = useState('')

  function load() { apiRequest<{ seasons: Season[] }>('/seasons').then((data) => setSeasons(data.seasons)).catch((error) => setMessage(error.message)) }
  useEffect(load, [])
  function edit(season: Season) { setEditingId(season.id); setForm({ name: season.name, start_date: season.start_date.slice(0, 10), end_date: season.end_date.slice(0, 10), is_active: season.is_active }) }

  async function save(event: FormEvent) {
    event.preventDefault()
    try {
      const data = await apiRequest<{ message: string }>(editingId ? `/admin/seasons/${editingId}` : '/admin/seasons', { method: editingId ? 'PUT' : 'POST', body: JSON.stringify(form) }, user)
      setMessage(data.message); setEditingId(null); setForm({ name: '', start_date: '', end_date: '', is_active: false }); load()
    } catch (error) { setMessage(error instanceof Error ? error.message : 'Could not save the season.') }
  }

  return (
    <section className="admin-section">
      <div className="section-heading"><div><h2>{editingId ? 'Edit season' : 'Add season'}</h2><p className="muted">Problems count when their release date falls in this range.</p></div>{editingId ? <button className="secondary-button" type="button" onClick={() => { setEditingId(null); setForm({ name: '', start_date: '', end_date: '', is_active: false }) }}>New season</button> : null}</div>
      <form className="panel simple-form" onSubmit={save}><div className="form-grid three"><label>Name<input value={form.name} onChange={(event) => setForm({ ...form, name: event.target.value })} required /></label><label>Start<input type="date" value={form.start_date} onChange={(event) => setForm({ ...form, start_date: event.target.value })} required /></label><label>End<input type="date" value={form.end_date} onChange={(event) => setForm({ ...form, end_date: event.target.value })} required /></label></div><label className="check-label"><input type="checkbox" checked={form.is_active} onChange={(event) => setForm({ ...form, is_active: event.target.checked })} /> Use as the default leaderboard season</label><button className="primary-button" type="submit">Save season</button>{message ? <p className="form-message">{message}</p> : null}</form>
      <div className="panel table-wrap list-heading"><table className="simple-table"><thead><tr><th>Season</th><th>Dates</th><th>Default</th><th></th></tr></thead><tbody>{seasons.map((season) => <tr key={season.id}><td>{season.name}</td><td>{formatDate(season.start_date)} – {formatDate(season.end_date)}</td><td>{season.is_active ? 'Yes' : '—'}</td><td><button className="secondary-button" type="button" onClick={() => edit(season)}>Edit</button></td></tr>)}</tbody></table></div>
    </section>
  )
}

function UsersTab({ user }: { user: User }) {
  const [users, setUsers] = useState<ManagedUser[]>([])
  const [message, setMessage] = useState('Loading users…')
  useEffect(() => { apiRequest<{ users: ManagedUser[] }>('/admin/users', {}, user).then((data) => { setUsers(data.users); setMessage('') }).catch((error) => setMessage(error.message)) }, [user])

  async function toggle(account: ManagedUser) {
    try {
      const data = await apiRequest<{ user: ManagedUser; message: string }>(`/admin/users/${account.id}`, { method: 'PATCH', body: JSON.stringify({ is_admin: !account.is_admin }) }, user)
      setUsers((current) => current.map((item) => item.id === account.id ? data.user : item)); setMessage(data.message)
    } catch (error) { setMessage(error instanceof Error ? error.message : 'Could not update that user.') }
  }

  return (
    <section className="admin-section"><div className="section-heading"><div><h2>User access</h2><p className="muted">Only the superuser can add or remove admins.</p></div></div>{message ? <p className="form-message">{message}</p> : null}<div className="panel table-wrap"><table className="simple-table"><thead><tr><th>User</th><th>Email</th><th>Role</th><th></th></tr></thead><tbody>{users.map((account) => <tr key={account.id}><td>{account.username}</td><td>{account.email}</td><td>{account.is_superuser ? 'Superuser' : account.is_admin ? 'Admin' : 'Solver'}</td><td>{account.is_superuser ? <span className="status">Protected</span> : <button className="secondary-button" type="button" onClick={() => toggle(account)}>{account.is_admin ? 'Remove admin' : 'Make admin'}</button>}</td></tr>)}</tbody></table></div></section>
  )
}

export default Admin
