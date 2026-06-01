import type { SetUser, UserState } from "../../types/user"
import {useNavigate} from "react-router-dom"
type LoginWidgetProps = {
    user: UserState
    setUser: SetUser
}
function LoginWidget({user, setUser}: LoginWidgetProps) {
    const navigate = useNavigate();
    const loginHandler = (setUser: SetUser) => {
        setUser({id: "testuser"})
        console.log(user)
        navigate("/")
    }
    return (
        <div className="LoginWidget">
            <form onSubmit={(e) => {
                e.preventDefault();
                loginHandler(setUser);
            }}>
                <h1>Login</h1>
                <input type="text" placeholder="Username" className="form-control" />
                <input type="password" placeholder="Password" className="form-control" />
                <button className="authButton" type="submit">Login</button>
            </form>
        </div>
    )
}

export default LoginWidget