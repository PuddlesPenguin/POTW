import { useEffect, useRef, useState } from 'react'
import type { ChangeEvent, FormEvent } from 'react'
import { MathJax, MathJaxContext } from 'better-react-mathjax'
import './CurrentProb.css'

type Problem = {
  id: number
  title: string
  statement_latex: string
  problem_type: string
  is_current: boolean
  difficulty_rating?: string | number | null
  proposed_by?: string | null
  release_date?: string | null
  due_date?: string | null
  hints?: unknown
}

type ProblemType = 'Computational' | 'Proof-based'

const mathJaxConfig = {
  tex: {
    inlineMath: [['$', '$'], ['\\(', '\\)']],
    displayMath: [['$$', '$$'], ['\\[', '\\]']],
  },
}

function getProblemTypeLabel(problemType: string): ProblemType {
  return problemType.toLowerCase().includes('proof') ? 'Proof-based' : 'Computational'
}

function formatDate(dateValue?: string | null) {
  if (!dateValue) {
    return null
  }

  const parsedDate = new Date(dateValue)

  if (Number.isNaN(parsedDate.getTime())) {
    return null
  }

  return parsedDate.toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  })
}

function formatDifficulty(difficulty?: string | number | null) {
  if (difficulty === null || difficulty === undefined || difficulty === '') {
    return null
  }

  return String(difficulty)
}

function CurrentProb() {
  const [problemType, setProblemType] = useState<ProblemType>('Computational')
  const [problems, setProblems] = useState<Problem[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [answerText, setAnswerText] = useState('')
  const [selectedFile, setSelectedFile] = useState<File | null>(null)
  const [submissionMessage, setSubmissionMessage] = useState('')
  const fileInputRef = useRef<HTMLInputElement>(null)

  useEffect(() => {
    const controller = new AbortController()

    async function loadCurrentProblems() {
      try {
        setIsLoading(true)
        const response = await fetch('/api/problems/current', {
          signal: controller.signal,
        })

        if (!response.ok) {
          throw new Error('Failed to load current problems.')
        }

        const data = (await response.json()) as { problems?: Problem[] }
        setProblems(data.problems ?? [])
      } catch (error) {
        if (error instanceof DOMException && error.name === 'AbortError') {
          return
        }

        setProblems([])
      } finally {
        setIsLoading(false)
      }
    }

    void loadCurrentProblems()

    return () => controller.abort()
  }, [])

  const activeProblem = problems.find(
    (problem) => problem.is_current && getProblemTypeLabel(problem.problem_type) === problemType
  )

  const releaseDate = formatDate(activeProblem?.release_date)
  const dueDate = formatDate(activeProblem?.due_date)
  const difficulty = formatDifficulty(activeProblem?.difficulty_rating)
  const hintCount = Array.isArray(activeProblem?.hints)
    ? activeProblem?.hints.length
    : typeof activeProblem?.hints === 'string'
      ? Number.parseInt(activeProblem.hints, 10)
      : null

  function handleTextSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()

    if (!answerText.trim()) {
      setSubmissionMessage('Please enter an answer before submitting.')
      return
    }

    setSubmissionMessage(`Text answer ready to submit: ${answerText.trim()}`)
  }

  function handleUploadClick() {
    fileInputRef.current?.click()
  }

  function handleFileChange(event: ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0] ?? null
    setSelectedFile(file)
    setSubmissionMessage(file ? `Selected file: ${file.name}` : '')
  }

  function handleCancelUpload() {
    setSelectedFile(null)
    setSubmissionMessage('')
    if (fileInputRef.current) {
      fileInputRef.current.value = ''
    }
  }

  function handleConfirmUpload() {
    if (!selectedFile) {
      setSubmissionMessage('Choose a file before uploading your answer.')
      return
    }

    setSubmissionMessage(`Upload ready to submit: ${selectedFile.name}`)
  }

  return (
    <MathJaxContext config={mathJaxConfig} version={4}>
      <div className="current-prob-container">
        <div className="current-prob-header">
          <button
            className={`tab ${problemType === 'Computational' ? 'active' : ''}`}
            onClick={() => setProblemType('Computational')}
            type="button"
          >
            Computational
          </button>
          <button
            className={`tab ${problemType === 'Proof-based' ? 'active' : ''}`}
            onClick={() => setProblemType('Proof-based')}
            type="button"
          >
            Proof-based
          </button>
        </div>
        <div className="current-prob-content">
          {isLoading ? (
            <div className="problem-state">Loading current problem...</div>
          ) : activeProblem ? (
            <div className="problem-card">
              <h2>{activeProblem.title}</h2>
              <div className="problem-meta">
                {difficulty && <span>Difficulty: {difficulty}</span>}
                {activeProblem.proposed_by && <span>Suggested by: {activeProblem.proposed_by}</span>}
                {releaseDate && <span>Released: {releaseDate}</span>}
                {dueDate && <span>Due: {dueDate}</span>}
                {typeof hintCount === 'number' && !Number.isNaN(hintCount) && (
                  <span>Hints: {hintCount}</span>
                )}
              </div>
              <div className="problem-statement">
                <MathJax dynamic>{activeProblem.statement_latex}</MathJax>
              </div>
              <div className="submit-area">
                <form className="answer-row" onSubmit={handleTextSubmit}>
                  <input
                    type="text"
                    value={answerText}
                    onChange={(event) => setAnswerText(event.target.value)}
                    placeholder={
                      problemType === 'Computational'
                        ? 'Enter computational answer'
                        : 'Enter your answer'
                    }
                  />
                  <button type="submit" className="submit-action primary">
                    Submit Text
                  </button>
                <button type="button" className="submit-action secondary upload-action" onClick={handleUploadClick}>
                  Upload File
                </button>
              </form>
              <input
                ref={fileInputRef}
                type="file"
                className="hidden-file-input"
                onChange={handleFileChange}
              />
              {selectedFile && (
                <div className="upload-confirm-row">
                  <p className="file-name">Selected: {selectedFile.name}</p>
                  <div className="upload-confirm-actions">
                    <button
                      type="button"
                      className="submit-action confirm-button"
                      onClick={handleConfirmUpload}
                      aria-label="Confirm upload"
                      title="Confirm upload"
                    >
                      ✓
                    </button>
                    <button
                      type="button"
                      className="submit-action cancel-button"
                      onClick={handleCancelUpload}
                      aria-label="Cancel upload"
                      title="Cancel upload"
                    >
                      ×
                    </button>
                  </div>
                </div>
              )}
              {submissionMessage && <p className="submission-message">{submissionMessage}</p>}
              </div>
            </div>
          ) : (
            <div className="problem-state">
              No current {problemType.toLowerCase()} problem has been posted yet.
            </div>
          )}
        </div>
      </div>
    </MathJaxContext>
  )
}

export default CurrentProb
