import { Routes, Route, Link } from 'react-router-dom'
import Joined from './Joined.jsx'
import SignUp from './SignUp.jsx'
import Login from './Login.jsx'
import Welcome from './Welcome.jsx'
import ForgotPassword from './ForgotPassword.jsx'
import { useNavigate, useLocation } from 'react-router-dom'
import { useEffect } from 'react'
import { auth, db } from './firebase'
import { onAuthStateChanged } from 'firebase/auth'
import { doc, getDoc } from 'firebase/firestore'
import { App as CapApp } from '@capacitor/app'
import { Capacitor } from '@capacitor/core'

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
    const protectedPaths = new Set(['/welcome', '/joined'])

    const unsub = onAuthStateChanged(auth, async (user) => {
      if (user) {
        // If on auth pages and user is verified, redirect them into the app
        if ((location.pathname === '/login' || location.pathname === '/signup') && user.emailVerified) {
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
            // Block unverified users from protected routes
            if (!user.emailVerified) {
              navigate('/', { replace: true })
              return
            }

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
    })
    return () => unsub()
  }, [navigate, location.pathname])

  useEffect(() => {
    const rootPaths = new Set(['/', '/login', '/signup', '/forgot'])
    if (!Capacitor.isNativePlatform()) return

    let handle
    const setup = async () => {
      handle = await CapApp.addListener('backButton', ({ canGoBack }) => {
        if (canGoBack) {
          window.history.back()
          return
        }
        if (!rootPaths.has(location.pathname)) {
          navigate(-1)
        } else {
          CapApp.exitApp()
        }
      })
    }
    setup()

    return () => {
      if (handle) {
        handle.remove()
      }
    }
  }, [location.pathname, navigate])

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
