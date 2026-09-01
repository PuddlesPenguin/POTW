import { useEffect, useRef, useState } from 'react'
import { MathJax, MathJaxContext } from 'better-react-mathjax'
import { Link, Navigate } from 'react-router-dom'
import NavBar from '../components/navbar/NavBar'
import { apiRequest, downloadSubmissionFile } from '../lib/api'
import type { SetUser, User, UserState } from '../types/user'
import './Page.css'

type Props = { user: UserState; setUser: SetUser }
type Submission = {
  id: number
  title: string
  problem_type: string
  answer_text?: string | null
  work_text?: string | null
  file_name?: string | null
  is_correct?: boolean | null
  score: number
  feedback?: string | null
  graded_at?: string | null
  submitted_at: string
  due_date?: string | null
  due_at?: string | null
}

function ViewProfile({ user, setUser }: Props) {
  const [submissions, setSubmissions] = useState<Submission[]>([])
  const [message, setMessage] = useState('Loading your submissions…')
  const [editingId, setEditingId] = useState<number | null>(null)
  const [draftAnswer, setDraftAnswer] = useState('')
  const [draftWork, setDraftWork] = useState('')
  const [draftFile, setDraftFile] = useState<File | null>(null)
  const [privacySaving, setPrivacySaving] = useState(false)
  const editFileInputRef = useRef<HTMLInputElement>(null)

  useEffect(() => {
    if (!user) return
    const refresh = () => apiRequest<{ submissions: Submission[] }>('/submissions/mine', {}, user)
      .then((data) => { setSubmissions(data.submissions); setMessage('') })
      .catch((error) => setMessage(error instanceof Error ? error.message : 'Could not load submissions.'))
    void refresh()
    const interval = window.setInterval(refresh, 15000)
    return () => window.clearInterval(interval)
  }, [user])

  if (!user) return <Navigate to="/login" replace />

  function beginEdit(submission: Submission) {
    setEditingId(submission.id)
    setDraftAnswer(submission.answer_text ?? '')
    setDraftWork(submission.work_text ?? '')
    setDraftFile(null)
    setMessage('')
  }

  async function saveEdit(submission: Submission) {
    try {
      const formData = new FormData()
      formData.set('answer_text', draftAnswer)
      formData.set('work_text', draftWork)
      if (draftFile) formData.set('file', draftFile)
      const data = await apiRequest<{ submission: Submission; message: string }>(`/submissions/${submission.id}`, {
        method: 'PATCH',
        body: formData,
      }, user)
      setSubmissions((current) => current.map((item) => item.id === submission.id
        ? { ...item, ...data.submission, score: 0, feedback: null, graded_at: null }
        : item))
      setEditingId(null)
      setDraftFile(null)
      if (editFileInputRef.current) editFileInputRef.current.value = ''
      setMessage(data.message)
    } catch (error) {
      setMessage(error instanceof Error ? error.message : 'Could not update your response.')
    }
  }

  async function updateLeaderboardPrivacy(hidden: boolean) {
    setPrivacySaving(true)
    setMessage('')
    const currentUser = user
    if (!currentUser) return
    try {
      const data = await apiRequest<{ user: Omit<User, 'token'>; message: string }>('/profile/preferences', {
        method: 'PATCH', body: JSON.stringify({ leaderboard_hidden: hidden }),
      }, currentUser)
      setUser({ ...currentUser, ...data.user, token: currentUser.token })
      setMessage(data.message)
    } catch (error) {
      setMessage(error instanceof Error ? error.message : 'Could not update your preference.')
    } finally { setPrivacySaving(false) }
  }

  return (
    <MathJaxContext>
      <div className="app-page">
        <NavBar user={user} setUser={setUser} />
        <main className="page-content">
          <section className="panel profile-summary">
            <div><strong>{user.username}</strong><span className="muted">{user.email}</span></div>
            <div className="profile-summary-actions">
              <span>{submissions.length} submission{submissions.length === 1 ? '' : 's'}</span>
              <label className="privacy-switch"><span>Anonymous mode</span><input type="checkbox" checked={Boolean(user.leaderboard_hidden)} disabled={privacySaving} onChange={(event) => { void updateLeaderboardPrivacy(event.target.checked) }} /><span className="switch-track" aria-hidden="true"><span /></span></label>
            </div>
          </section>
          <header className="page-heading"><h1>Your submissions</h1><p>You can edit a current submission before its deadline. Each problem allows up to five submissions.</p></header>
          {message ? <p className="form-message" role="status">{message}</p> : null}
          {!message && submissions.length === 0 ? <div className="panel empty-state">You have not submitted a solution yet. <Link className="page-link" to="/">View this week&apos;s problems.</Link></div> : null}
          <div className="card-list">
            {submissions.map((submission) => {
              const status = !submission.graded_at ? 'Pending' : submission.score === 5 ? 'Correct' : submission.score === 0 ? 'Incorrect' : 'Partial credit'
              const canEdit = submission.due_at
                ? new Date(submission.due_at) >= new Date()
                : !submission.due_date || new Date(`${submission.due_date.slice(0, 10)}T23:59:59`) >= new Date()
              const isProof = submission.problem_type.toLowerCase().includes('proof')
              return (
                <article className="simple-card" key={submission.id}>
                  <span className={`status ${submission.graded_at ? submission.score === 5 ? 'correct' : submission.score === 0 ? 'incorrect' : 'partial' : ''}`}>{status}</span>
                  <h2>{submission.title}</h2>
                  <p className="muted">{submission.problem_type} · Submitted {new Date(submission.submitted_at).toLocaleString()}</p>
                  {submission.answer_text ? <p><strong>Short answer:</strong> {submission.answer_text}</p> : null}
                  {submission.work_text ? <div><strong>{isProof ? 'Written proof:' : 'Comment / shown work:'}</strong><MathJax dynamic>{submission.work_text}</MathJax></div> : null}
                  {submission.file_name ? <div className="submitted-file"><span>File: {submission.file_name}</span><button className="secondary-button" type="button" onClick={() => { void downloadSubmissionFile(submission.id, user) }}>Download</button></div> : null}
                  {submission.graded_at ? <strong>Score: {submission.score}/5</strong> : null}
                  {submission.feedback ? <p>Feedback: {submission.feedback}</p> : null}
                  {editingId === submission.id ? (
                    <div className="edit-response">
                      {!isProof ? <label>Short answer<input value={draftAnswer} onChange={(event) => setDraftAnswer(event.target.value)} /></label> : null}
                      <label>{isProof ? 'Written proof' : 'Comment / show your work'}<textarea rows={5} value={draftWork} onChange={(event) => setDraftWork(event.target.value)} /></label>
                      <div className="edit-file-row"><input ref={editFileInputRef} className="edit-file-input" id={`edit-file-${submission.id}`} type="file" onChange={(event) => setDraftFile(event.target.files?.[0] ?? null)} /><label className="secondary-button" htmlFor={`edit-file-${submission.id}`}>{draftFile ? 'Replace selected file' : submission.file_name ? 'Replace attached file' : 'Upload work file'}</label>{draftFile ? <span>{draftFile.name}</span> : null}</div>
                      {submission.file_name && !draftFile ? <p className="muted">The existing file stays attached unless you upload a replacement.</p> : null}
                      <div className="button-row"><button className="primary-button" type="button" onClick={() => saveEdit(submission)}>Save response</button><button className="secondary-button" type="button" onClick={() => { setEditingId(null); setDraftFile(null); if (editFileInputRef.current) editFileInputRef.current.value = '' }}>Cancel</button></div>
                    </div>
                  ) : canEdit ? <button className="secondary-button" type="button" onClick={() => beginEdit(submission)}>Edit response</button> : null}
                </article>
              )
            })}
          </div>
        </main>
      </div>
    </MathJaxContext>
  )
}

export default ViewProfile
