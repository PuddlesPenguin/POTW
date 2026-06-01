import NavBar from '../components/navbar/NavBar'
import type { SetUser, UserState } from '../types/user'

type Props = {
  user: UserState
  setUser: SetUser
}

function FrontPage({ user, setUser }: Props) {
  return (
    <div className="front-page">
      <NavBar user={user} setUser={setUser} />
      <h1>Welcome to Purdue Problem of the Week!!</h1>
      <p>Discover the best  problems of the week.</p>
    </div>
  )
}

export default FrontPage
