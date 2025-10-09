import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { auth, db } from './firebase'
import { createUserWithEmailAndPassword, sendEmailVerification } from 'firebase/auth'
import { collection, doc, getDoc, setDoc } from 'firebase/firestore'

function SignUp() {
  const navigate = useNavigate()
  const [form, setForm] = useState({ username: '', email: '', password: '', confirmPassword: '', gender: '' })
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  const handleChange = (e) => {
    const { name, value } = e.target
    setForm((prev) => ({ ...prev, [name]: value }))
  }

  const isValidUsername = (u) => {
    if (!u) return false
    const user = u.toLowerCase()
    // 1-30 chars, letters numbers . _ only
    if (!/^[a-z0-9._]{1,30}$/.test(user)) return false
    // no leading/trailing dot or underscore
    if (user.startsWith('.') || user.startsWith('_') || user.endsWith('.') || user.endsWith('_')) return false
    // no consecutive dots
    if (user.includes('..')) return false
    return true
  }

  const handleSubmit = async (e) => {
    e.preventDefault()
    setError('')
    if (!form.username || !form.email || !form.password || !form.confirmPassword || !form.gender) {
      setError('All fields are required.')
      return
    }
    if (!isValidUsername(form.username)) {
      setError('Username must be 1-30 chars, letters/numbers/._ only, no leading/trailing . or _, no consecutive dots.')
      return
    }
    if (form.password !== form.confirmPassword) {
      setError('Passwords do not match.')
      return
    }
    setLoading(true)
    try {
      // Check username uniqueness using a usernames collection (document id is the username)
      const usernamesCol = collection(db, 'usernames')
      const normalizedUsername = form.username.toLowerCase()
      const usernameRef = doc(usernamesCol, normalizedUsername)
      const usernameSnap = await getDoc(usernameRef)
      if (usernameSnap.exists()) {
        setError('Username is already taken.')
        setLoading(false)
        return
      }

      // Create auth user
      const cred = await createUserWithEmailAndPassword(auth, form.email, form.password)
      const user = cred.user

      // Reserve username -> uid map and create user profile
      await setDoc(usernameRef, { uid: user.uid, createdAt: Date.now() })
      await setDoc(doc(db, 'users', user.uid), {
        username: normalizedUsername,
        email: form.email,
        gender: form.gender,
        createdAt: Date.now(),
      })

      // Send verification email
      await sendEmailVerification(user)

      // Notify and navigate home
      alert('Verification link sent. Please check your email.')
      navigate('/')
    } catch (err) {
      console.error(err)
      setError(err?.message || 'Failed to create account.')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="container">
      <h1>Create account</h1>
      <form onSubmit={handleSubmit} className="form">
        <input
          name="username"
          placeholder="Username"
          value={form.username}
          onChange={handleChange}
          autoComplete="username"
          disabled={loading}
          required
        />
        <select
          name="gender"
          value={form.gender}
          onChange={handleChange}
          disabled={loading}
          required
        >
          <option value="" disabled>Gender</option>
          <option value="male">Male</option>
          <option value="female">Female</option>
        </select>
        <input
          type="email"
          name="email"
          placeholder="Email"
          value={form.email}
          onChange={handleChange}
          autoComplete="email"
          disabled={loading}
          required
        />
        <input
          type="password"
          name="password"
          placeholder="Password"
          value={form.password}
          onChange={handleChange}
          autoComplete="new-password"
          disabled={loading}
          required
        />
        <input
          type="password"
          name="confirmPassword"
          placeholder="Confirm password"
          value={form.confirmPassword}
          onChange={handleChange}
          autoComplete="new-password"
          disabled={loading}
          required
        />
        {error && <p style={{ color: '#ff6b6b', margin: 0 }}>{error}</p>}
        <button type="submit" disabled={loading}>
          {loading ? 'Creating…' : 'Create account'}
        </button>
      </form>
    </div>
  )
}

export default SignUp
