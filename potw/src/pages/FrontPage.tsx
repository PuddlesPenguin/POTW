import NavBar from '../components/navbar/NavBar'
import CurrentProb from './../components/problem-widget/CurrentProb'
import type { SetUser, UserState } from '../types/user'
import './FrontPage.css'

type Props = {
  user: UserState
  setUser: SetUser
}

function FrontPage({ user, setUser }: Props) {
  return (
    <div className="front-page">
      <NavBar user={user} setUser={setUser} />
      <div className="front-page-hero">
        <h1>This weeks Problem(s)!</h1>
      </div>
      <CurrentProb />
    </div>
  )
}

export default FrontPage
