export type Problem = {
  id: number
  title: string
  statement_latex: string
  solution_latex?: string | null
  problem_source?: string | null
  proposed_by?: string | null
  problem_type: string
  is_current: boolean
  is_archived: boolean
  release_date?: string | null
  release_at?: string | null
  due_date?: string | null
  due_at?: string | null
  hints?: string | null
  hints_enabled: boolean
  allow_hint_requests: boolean
  difficulty_rating?: number | null
}

export function formatTimestamp(value?: string | null) {
  if (!value) return 'â€”'
  const date = new Date(value)
  return Number.isNaN(date.getTime())
    ? 'â€”'
    : date.toLocaleString('en-US', {
        timeZone: 'America/Indiana/Indianapolis', month: 'short', day: 'numeric',
        year: 'numeric', hour: 'numeric', minute: '2-digit', timeZoneName: 'short',
      })
}

export function formatDueTime(timestamp?: string | null, dateValue?: string | null) {
  if (timestamp) {
    const date = new Date(timestamp)
    if (!Number.isNaN(date.getTime())) {
      return date.toLocaleString('en-US', {
        timeZone: 'America/Indiana/Indianapolis', month: 'short', day: 'numeric',
        hour: 'numeric', minute: '2-digit', timeZoneName: 'short',
      })
    }
  }
  if (!dateValue) return '—'
  const date = new Date(`${dateValue.slice(0, 10)}T12:00:00`)
  return Number.isNaN(date.getTime()) ? '—' : date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })
}

export function formatDate(value?: string | null) {
  if (!value) return '—'
  const date = new Date(`${value.slice(0, 10)}T12:00:00`)
  return Number.isNaN(date.getTime())
    ? '—'
    : date.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })
}
