import { useEffect, useRef, useState } from 'react'
import type { ChangeEvent, FormEvent } from 'react'
import { Link } from 'react-router-dom'
import { MathJax, MathJaxContext } from 'better-react-mathjax'
import { apiRequest } from '../../lib/api'
import type { Problem } from '../../types/problem'
import { formatDueTime } from '../../types/problem'
import type { UserState } from '../../types/user'
import './CurrentProb.css'

type Props = { user: UserState }
type ProblemType = 'Computational' | 'Proof-based'

const mathJaxConfig = {
  tex: { inlineMath: [['$', '$'], ['\\(', '\\)']], displayMath: [['$$', '$$'], ['\\[', '\\]']] },
}

function getProblemType(problemType: string): ProblemType {
  return problemType.toLowerCase().includes('proof') ? 'Proof-based' : 'Computational'
}

function difficultyClass(rating: number) {
  if (rating <= 2) return 'easy'
  if (rating <= 4) return 'medium'
  if (rating <= 6) return 'challenging'
  return 'hard'
}

function CurrentProb({ user }: Props) {
  const [problemType, setProblemType] = useState<ProblemType>('Computational')
  const [problems, setProblems] = useState<Problem[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [loadError, setLoadError] = useState('')
  const [answerText, setAnswerText] = useState('')
  const [workText, setWorkText] = useState('')
  const [workOpen, setWorkOpen] = useState(false)
  const [visibleHints, setVisibleHints] = useState<Set<number>>(() => new Set())
  const [selectedFile, setSelectedFile] = useState<File | null>(null)
  const [remainingByProblem, setRemainingByProblem] = useState<Record<number, number>>({})
  const [message, setMessage] = useState('')
  const [submitting, setSubmitting] = useState(false)
  const fileInputRef = useRef<HTMLInputElement>(null)

  useEffect(() => {
    const controller = new AbortController()
    apiRequest<{ problems: Problem[] }>('/problems/current', { signal: controller.signal })
      .then((data) => setProblems(data.problems))
      .catch((error) => {
        if (error instanceof DOMException && error.name === 'AbortError') return
        setLoadError(error instanceof Error ? error.message : 'Could not load the current problems.')
      })
      .finally(() => setIsLoading(false))
    return () => controller.abort()
  }, [])

  useEffect(() => {
    if (!user) return
    apiRequest<{ remaining_by_problem: Record<number, number> }>('/submissions/limits', {}, user)
      .then((data) => setRemainingByProblem(data.remaining_by_problem))
      .catch(() => undefined)
  }, [user])

  const activeProblem = problems.find((problem) => getProblemType(problem.problem_type) === problemType)
  const isProof = problemType === 'Proof-based'

  async function submit(event: FormEvent) {
    event.preventDefault()
    if (!activeProblem || !user) return
    if (!isProof && !answerText.trim()) {
      setMessage('Enter a short answer first.')
      return
    }
    if (isProof && !workText.trim() && !selectedFile) {
      setMessage('Type your proof or attach a proof file.')
      return
    }

    const formData = new FormData()
    formData.set('problem_id', String(activeProblem.id))
    formData.set('answer_text', answerText.trim())
    formData.set('work_text', workText.trim())
    if (selectedFile) formData.set('file', selectedFile)

    setSubmitting(true)
    setMessage('')
    try {
      const data = await apiRequest<{ message: string; submissions_remaining: number }>('/submissions', { method: 'POST', body: formData }, user)
      setMessage(data.message)
      setRemainingByProblem((current) => ({ ...current, [activeProblem.id]: data.submissions_remaining }))
      setAnswerText('')
      setWorkText('')
      setWorkOpen(false)
      setSelectedFile(null)
      if (fileInputRef.current) fileInputRef.current.value = ''
    } catch (error) {
      setMessage(error instanceof Error ? error.message : 'Submission failed.')
    } finally {
      setSubmitting(false)
    }
  }

  function chooseFile(event: ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0] ?? null
    setSelectedFile(file)
    setMessage(file && file.size > 5 * 1024 * 1024 ? 'Files must be 5 MB or smaller.' : '')
  }

  return (
    <MathJaxContext config={mathJaxConfig} version={4}>
      <section className="current-prob-container" aria-label="Current problem">
        <div className="current-prob-header">
          {(['Computational', 'Proof-based'] as ProblemType[]).map((type) => (
            <button
              key={type}
              className={`tab ${problemType === type ? 'active' : ''}`}
              onClick={() => {
                setProblemType(type)
                setAnswerText('')
                setWorkText('')
                setWorkOpen(false)
                setSelectedFile(null)
                setMessage('')
              }}
              type="button"
            >
              {type}
            </button>
          ))}
        </div>
        <div className="current-prob-content">
          {isLoading ? <div className="problem-state">Loading current problem…</div> : null}
          {!isLoading && loadError ? <div className="problem-state error-text">{loadError}</div> : null}
          {!isLoading && !loadError && !activeProblem ? (
            <div className="problem-state">No current {problemType.toLowerCase()} problem has been posted yet.</div>
          ) : null}
          {activeProblem ? (
            <article className="problem-card">
              <div className="problem-title-row">
                <h2>{activeProblem.title}</h2>
                {activeProblem.difficulty_rating ? <span className={`difficulty-pill ${difficultyClass(activeProblem.difficulty_rating)}`}>Difficulty {activeProblem.difficulty_rating}/10</span> : null}
              </div>
              <div className="problem-meta">
                <span><strong>Due</strong> {formatDueTime(activeProblem.due_at, activeProblem.due_date)}</span>
              </div>
              <div className="problem-statement"><MathJax dynamic>{activeProblem.statement_latex}</MathJax></div>
              {activeProblem.proposed_by ? <p className="proposer-thanks">Thank you to {activeProblem.proposed_by} for suggesting this problem.</p> : null}
              {activeProblem.hints_enabled && activeProblem.hints ? <section className="published-hint">
                <button className="show-hint-button" type="button" onClick={() => setVisibleHints((current) => {
                  const next = new Set(current)
                  if (next.has(activeProblem.id)) next.delete(activeProblem.id)
                  else next.add(activeProblem.id)
                  return next
                })}>{visibleHints.has(activeProblem.id) ? 'Hide hint' : 'Show hint'}</button>
                {visibleHints.has(activeProblem.id) ? <div className="response-preview"><strong>Hint</strong><MathJax dynamic>{activeProblem.hints}</MathJax></div> : null}
              </section> : null}

              <section className="solution-section">
                <h3>Your solution</h3>
                {user ? (
                <form className="submit-area" onSubmit={submit}>
                  <p className="submission-limit">{remainingByProblem[activeProblem.id] ?? 5} of 5 submissions remaining</p>
                  {!isProof ? (
                    <>
                      <input aria-label="Short answer" id="answer" value={answerText} onChange={(event) => setAnswerText(event.target.value)} placeholder="Enter your final answer. LaTeX is supported." required />
                      {answerText ? <div className="response-preview"><strong>Answer preview</strong><MathJax dynamic>{answerText}</MathJax></div> : null}
                    </>
                  ) : null}
                  <div className="work-choice">
                    <button className="work-toggle" type="button" onClick={() => setWorkOpen((current) => !current)}>{workOpen ? 'Hide typed work' : isProof ? 'Type proof' : 'Type work'}</button>
                    <span>or</span>
                    <input ref={fileInputRef} className="file-input" id="answer-file" type="file" onChange={chooseFile} />
                    <label className="file-button" htmlFor="answer-file">Upload {isProof ? 'proof' : 'work'}</label>
                  </div>
                  {workOpen ? <div className="expanded-work">
                    <label htmlFor="work-text">{isProof ? 'Written proof' : 'Comment / shown work'}
                      <textarea id="work-text" value={workText} onChange={(event) => setWorkText(event.target.value)} placeholder={isProof ? 'Type your proof here. LaTeX is supported.' : 'Explain your approach or calculations. LaTeX is supported.'} rows={isProof ? 8 : 5} autoFocus />
                    </label>
                    {workText ? <div className="response-preview"><strong>Work preview</strong><MathJax dynamic>{workText}</MathJax></div> : null}
                  </div> : null}
                  <div className="answer-actions">
                    {selectedFile ? <span>Attached: {selectedFile.name}</span> : null}
                    {selectedFile ? <button className="clear-file" type="button" onClick={() => { setSelectedFile(null); if (fileInputRef.current) fileInputRef.current.value = '' }}>Remove</button> : null}
                    <button type="submit" className="submit-action" disabled={submitting || Boolean(selectedFile && selectedFile.size > 5 * 1024 * 1024)}>
                      {submitting ? 'Submitting…' : 'Submit solution'}
                    </button>
                  </div>
                  {message ? <p className="submission-message" role="status">{message}</p> : null}
                </form>
              ) : (
                <p className="login-prompt"><Link to="/login">Log in</Link> or <Link to="/signup">create an account</Link> to submit a solution.</p>
              )}
              </section>
            </article>
          ) : null}
        </div>
      </section>
    </MathJaxContext>
  )
}

export default CurrentProb
