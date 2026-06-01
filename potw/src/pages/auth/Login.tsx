import NavBar from "../../components/navbar/NavBar"
import LoginWidget from "../../components/auth/LoginWidget"
import type { SetUser, UserState } from "../../types/user"
type Props = {
    user: UserState
    setUser: SetUser
}
function Login({ user, setUser }: Props) {
    return (
        <div className="login-page">
            <NavBar user={user} setUser={setUser} />
            <LoginWidget user={user} setUser={setUser} />
        </div>
    )
}

export default Login