import { Routes, Route, Link } from 'react-router-dom'
import Joined from './Joined.jsx'
import SignUp from './SignUp.jsx'
import Login from './Login.jsx'
import Welcome from './Welcome.jsx'
import ForgotPassword from './ForgotPassword.jsx'
import Loading from './Loading.jsx'
import { useNavigate, useLocation } from 'react-router-dom'
import { useEffect, useState } from 'react'
import { auth, db } from './firebase'
import { onAuthStateChanged } from 'firebase/auth'
import { doc, getDoc } from 'firebase/firestore'

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
  const [isLoading, setIsLoading] = useState(true)

  useEffect(() => {
    const publicPaths = new Set(['/', '/login', '/signup', '/forgot'])
    const protectedPaths = new Set(['/welcome', '/joined'])

    const unsub = onAuthStateChanged(auth, async (user) => {
      setIsLoading(true)

      if (user) {
        if (location.pathname === '/' || location.pathname === '/login' || location.pathname === '/signup') {
          try {
            // Check if user has joined
            const userRef = doc(db, 'users', user.uid)
            const userSnap = await getDoc(userRef)
            const userData = userSnap.data() || {}

            // Redirect based on joined status
            if (userData.joined) {
              navigate('/joined', { replace: true })
            } else {
              navigate('/welcome', { replace: true })
            }
          } catch (e) {
            console.error('Error checking user joined status:', e)
            navigate('/welcome', { replace: true })
          }
        } else if (protectedPaths.has(location.pathname)) {
          try {
            // Check if user should be on different protected page
            const userRef = doc(db, 'users', user.uid)
            const userSnap = await getDoc(userRef)
            const userData = userSnap.data() || {}

            if (userData.joined && location.pathname === '/welcome') {
              navigate('/joined', { replace: true })
            } else if (!userData.joined && location.pathname === '/joined') {
              navigate('/welcome', { replace: true })
            }
          } catch (e) {
            console.error('Error checking user joined status:', e)
            // Stay on current page if there's an error
          }
        }
      } else {
        if (!publicPaths.has(location.pathname)) {
          navigate('/', { replace: true })
        }
      }

      // Small delay to ensure navigation completes before showing routes
      setTimeout(() => {
        setIsLoading(false)
      }, 100)
    })

    return () => unsub()
  }, [navigate, location.pathname])

  // Show loading screen while checking auth and joined status
  if (isLoading) {
    return <Loading />
  }

  return (
    <Routes>
      <Route path="/" element={<Home />} />
      <Route path="/signup" element={<SignUp />} />
      <Route path="/login" element={<Login />} />
      <Route path="/forgot" element={<ForgotPassword />} />
      <Route path="/welcome" element={<Welcome />} />
      <Route path="/joined" element={<Joined />} />
      {/* Optional: catch-all could route to Home */}
      {/* <Route path="*" element={<Home />} /> */}
    </Routes>
  );
}

export default App;
