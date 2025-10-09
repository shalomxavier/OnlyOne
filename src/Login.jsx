import { useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { auth, db } from './firebase'
import { signInWithEmailAndPassword } from 'firebase/auth'
import { doc, getDoc } from 'firebase/firestore'

function Login() {
  const navigate = useNavigate()
  const [identifier, setIdentifier] = useState('') // username or email
  const [password, setPassword] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [toast, setToast] = useState('')

  const showToast = (msg) => {
    setToast(msg)
    // auto-hide after 3.5s
    setTimeout(() => setToast(''), 3500)
  }

  const toFriendlyMessage = (err) => {
    const code = err?.code
    switch (code) {
      case 'auth/invalid-credential':
      case 'auth/wrong-password':
        return 'Incorrect email/username or password.'
      case 'auth/user-not-found':
        return 'No account found with these credentials.'
      case 'auth/too-many-requests':
        return 'Too many attempts. Please try again later.'
      case 'auth/invalid-email':
        return 'Please enter a valid email address.'
      default:
        // For our custom thrown errors or unknown ones, prefer the message if it seems friendly
        return err?.message?.startsWith('Firebase:') ? 'Login failed. Please try again.' : (err?.message || 'Login failed. Please try again.')
    }
  }

  const resolveEmailFromIdentifier = async (id) => {
    // If it's an email, return it directly
    if (id.includes('@')) return id

    // Otherwise assume it's a username -> look up uid then user profile to get email
    const usernameDoc = await getDoc(doc(db, 'usernames', id.toLowerCase()))
    if (!usernameDoc.exists()) {
      throw new Error('No account found for this username.')
    }
    const uid = usernameDoc.data()?.uid
    if (!uid) throw new Error('Invalid username mapping.')
    const userDoc = await getDoc(doc(db, 'users', uid))
    const email = userDoc.data()?.email
    if (!email) throw new Error('Could not resolve email for this username.')
    return email
  }

  const handleSubmit = async (e) => {
    e.preventDefault()
    setError('')
    setLoading(true)
    try {
      const email = await resolveEmailFromIdentifier(identifier.trim())
      await signInWithEmailAndPassword(auth, email, password)
      navigate('/welcome')
    } catch (err) {
      console.error(err)
      const msg = toFriendlyMessage(err)
      setError(msg) // keep for potential future use
      showToast(msg)
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="container">
      <h1>Log In</h1>
      <form onSubmit={handleSubmit} className="form">
        <input
          type="text"
          name="identifier"
          placeholder="Username or Email"
          value={identifier}
          onChange={(e) => setIdentifier(e.target.value)}
          autoComplete="username"
          disabled={loading}
          required
        />
        <input
          type="password"
          name="password"
          placeholder="Password"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          autoComplete="current-password"
          disabled={loading}
          required
        />
        <button type="submit" disabled={loading}>
          {loading ? 'Logging in…' : 'Login'}
        </button>
      </form>
      <div style={{ marginTop: 8 }}>
        <Link to="/forgot">Forgot Password?</Link>
      </div>
      {toast && (
        <div
          role="status"
          aria-live="polite"
          style={{
            position: 'fixed',
            bottom: 16,
            left: '50%',
            transform: 'translateX(-50%)',
            background: '#333',
            color: '#fff',
            padding: '10px 14px',
            borderRadius: 8,
            boxShadow: '0 6px 18px rgba(0,0,0,0.25)',
            zIndex: 1000,
            maxWidth: 420,
            textAlign: 'center'
          }}
        >
          {toast}
        </div>
      )}
    </div>
  )
}

export default Login
