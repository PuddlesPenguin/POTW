import type { User } from '../types/user'
import { apiRequest } from './api'

type AuthResponse = {
  user: User
  message?: string
}

export type EmailActionResponse = {
  message: string
  development_url?: string
}

async function postAuthRequest(
  path: string,
  body: Record<string, string>
): Promise<User> {
  const data = await apiRequest<AuthResponse>(`/auth/${path}`, {
    method: 'POST',
    body: JSON.stringify(body),
  })
  return data.user
}

export function loginUser(username: string, password: string) {
  return postAuthRequest('login', { username, password })
}

export function registerUser(username: string, email: string, password: string) {
  return apiRequest<EmailActionResponse>('/auth/register', {
    method: 'POST',
    body: JSON.stringify({ username, email, password }),
  })
}

export function verifyEmail(token: string) {
  return apiRequest<EmailActionResponse>('/auth/verify-email', {
    method: 'POST', body: JSON.stringify({ token }),
  })
}

export function resendVerification(email: string) {
  return apiRequest<EmailActionResponse>('/auth/resend-verification', {
    method: 'POST', body: JSON.stringify({ email }),
  })
}

export function forgotPassword(email: string) {
  return apiRequest<EmailActionResponse>('/auth/forgot-password', {
    method: 'POST', body: JSON.stringify({ email }),
  })
}

export function resetPassword(token: string, password: string) {
  return apiRequest<EmailActionResponse>('/auth/reset-password', {
    method: 'POST', body: JSON.stringify({ token, password }),
  })
}
