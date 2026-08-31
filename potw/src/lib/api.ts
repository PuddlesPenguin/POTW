import type { User } from '../types/user'

export const API_BASE_URL = import.meta.env.VITE_API_URL ?? ''

export async function apiRequest<T>(path: string, options: RequestInit = {}, user?: User | null) {
  const headers = new Headers(options.headers)
  if (user?.token) headers.set('Authorization', `Bearer ${user.token}`)
  if (options.body && !(options.body instanceof FormData)) headers.set('Content-Type', 'application/json')

  const response = await fetch(`${API_BASE_URL}/api${path}`, { ...options, headers })
  const data = (await response.json().catch(() => ({}))) as T & { message?: string }
  if (!response.ok) throw new Error(data.message || 'Something went wrong. Please try again.')
  return data
}

export async function downloadSubmissionFile(id: number, user: User) {
  const response = await fetch(`${API_BASE_URL}/api/submissions/${id}/file`, {
    headers: { Authorization: `Bearer ${user.token}` },
  })
  if (!response.ok) {
    const data = await response.json().catch(() => ({})) as { message?: string }
    throw new Error(data.message || 'Could not download the file.')
  }
  const blob = await response.blob()
  const url = URL.createObjectURL(blob)
  const anchor = document.createElement('a')
  anchor.href = url
  anchor.download = response.headers.get('Content-Disposition')?.match(/filename="?([^";]+)"?/)?.[1] || 'submission'
  anchor.click()
  URL.revokeObjectURL(url)
}
