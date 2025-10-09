import { Routes, Route, Link } from 'react-router-dom'
import SignUp from './SignUp.jsx'
import Login from './Login.jsx'
import Welcome from './Welcome.jsx'
import ForgotPassword from './ForgotPassword.jsx'
import { useNavigate, useLocation } from 'react-router-dom'
import { useEffect } from 'react'
import { auth } from './firebase'
import { onAuthStateChanged } from 'firebase/auth'

function Home() {
  const navigate = useNavigate()
  return (
    <div className="container">
      <h1>Only One</h1>
      <button onClick={() => navigate('/login')}>
        Log In
      </button>
      <Link to="/signup" aria-label="Sign up">
        Sign up
      </Link>
    </div>
  );
}

function App() {
  const navigate = useNavigate()
  const location = useLocation()

  useEffect(() => {
    const publicPaths = new Set(['/', '/login', '/signup', '/forgot'])
    const unsub = onAuthStateChanged(auth, (user) => {
      if (user) {
        if (location.pathname === '/' || location.pathname === '/login' || location.pathname === '/signup') {
          navigate('/welcome', { replace: true })
        }
      } else {
        if (!publicPaths.has(location.pathname)) {
          navigate('/', { replace: true })
        }
      }
    })
    return () => unsub()
  }, [navigate, location.pathname])

  return (
    <Routes>
      <Route path="/" element={<Home />} />
      <Route path="/signup" element={<SignUp />} />
      <Route path="/login" element={<Login />} />
      <Route path="/forgot" element={<ForgotPassword />} />
      <Route path="/welcome" element={<Welcome />} />
      {/* Optional: catch-all could route to Home */}
      {/* <Route path="*" element={<Home />} /> */}
    </Routes>
  );
}

export default App;
