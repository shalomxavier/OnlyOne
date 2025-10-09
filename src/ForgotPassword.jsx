import { useState } from 'react'
import { Link } from 'react-router-dom'
import { auth } from './firebase'
import { sendPasswordResetEmail } from 'firebase/auth'

function ForgotPassword() {
  const [email, setEmail] = useState('')
  const [sent, setSent] = useState(false)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  const handleSubmit = async (e) => {
    e.preventDefault()
    setError('')
    setLoading(true)
    try {
      await sendPasswordResetEmail(auth, email)
      setSent(true)
    } catch (err) {
      console.error(err)
      setError(err?.message || 'Failed to send reset email.')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="container">
      <h1>Reset password</h1>
      {sent ? (
        <>
          <p>Check your email for a reset link.</p>
          <Link to="/login">Back to login</Link>
        </>
      ) : (
        <form onSubmit={handleSubmit} className="form">
          <input
            type="email"
            name="email"
            placeholder="Your account email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            autoComplete="email"
            disabled={loading}
            required
          />
          {error && <p style={{ color: '#ff6b6b', margin: 0 }}>{error}</p>}
          <button type="submit" disabled={loading}>
            {loading ? 'Sending…' : 'Send reset link'}
          </button>
        </form>
      )}
    </div>
  )
}

export default ForgotPassword
