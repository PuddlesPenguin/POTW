import type { User } from '../types/user'

const API_BASE_URL = import.meta.env.VITE_API_URL ?? 'http://localhost:3000'

type AuthResponse = {
  user: User
  message?: string
}

async function postAuthRequest(
  path: string,
  body: Record<string, string>
): Promise<User> {
  const response = await fetch(`${API_BASE_URL}/api/auth/${path}`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(body),
  })

  const data = (await response.json().catch(() => ({}))) as Partial<AuthResponse>

  if (!response.ok || !data.user) {
    throw new Error(data.message ?? 'Authentication request failed.')
  }

  return data.user
}

export function loginUser(username: string, password: string) {
  return postAuthRequest('login', { username, password })
}

export function registerUser(username: string, email: string, password: string) {
  return postAuthRequest('register', { username, email, password })
}
