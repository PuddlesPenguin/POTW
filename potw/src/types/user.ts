import type { Dispatch, SetStateAction } from 'react'

export type User = {
  id: string
}
export type UserState = User | null
export type SetUser = Dispatch<SetStateAction<UserState>>
