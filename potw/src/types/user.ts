import type { Dispatch, SetStateAction } from 'react'

export type User = {
  id: number
  username: string
  email: string
  is_admin?: boolean
}
export type UserState = User | null
export type SetUser = Dispatch<SetStateAction<UserState>>
