import type { Dispatch, SetStateAction } from 'react'

export type User = {
  id: number
  username: string
  email: string
  is_admin?: boolean
  is_superuser?: boolean
  leaderboard_hidden?: boolean
  token: string
}
export type UserState = User | null
export type SetUser = Dispatch<SetStateAction<UserState>>
