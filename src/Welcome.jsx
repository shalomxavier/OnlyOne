import { useEffect, useState } from 'react'
import { auth, db } from './firebase'
import { onAuthStateChanged } from 'firebase/auth'
import { doc, getDoc, setDoc, updateDoc, increment } from 'firebase/firestore'

function Welcome() {
  const [uid, setUid] = useState('')
  const [gender, setGender] = useState('')
  const [waiting, setWaiting] = useState(false)
  const [loading, setLoading] = useState(true)
  const [toast, setToast] = useState('')

  const showToast = (msg) => {
    setToast(msg)
    setTimeout(() => setToast(''), 3000)
  }

  useEffect(() => {
    const unsub = onAuthStateChanged(auth, async (user) => {
      if (!user) return
      setUid(user.uid)
      try {
        const userRef = doc(db, 'users', user.uid)
        const snap = await getDoc(userRef)
        const data = snap.data() || {}
        setGender(data.gender || '')
        setWaiting(Boolean(data.waiting))
      } catch (e) {
        console.error(e)
        showToast('Failed to load your profile')
      } finally {
        setLoading(false)
      }
    })
    return () => unsub()
  }, [])

  const toggleWaiting = async () => {
    if (!uid) return
    if (!gender) {
      showToast('Missing gender in profile')
      return
    }
    try {
      // ensure stats doc exists and then increment/decrement
      const statsRef = doc(db, 'stats', 'genderCounts')
      const delta = waiting ? -1 : 1
      await setDoc(
        statsRef,
        { [gender]: increment(delta) },
        { merge: true }
      )

      // persist user waiting state
      const userRef = doc(db, 'users', uid)
      await updateDoc(userRef, { waiting: !waiting })

      setWaiting((w) => !w)
      showToast(!waiting ? 'You are now waiting' : 'Ended waiting')
    } catch (e) {
      console.error(e)
      showToast('Failed to update waiting status')
    }
  }

  if (loading) {
    return (
      <div className="container">
        <h1>Welcome</h1>
        <p>Loading…</p>
      </div>
    )
  }

  return (
    <div className="container">
      <h1>Welcome</h1>
      <p>You are logged in.</p>
      <button onClick={toggleWaiting}>
        {waiting ? 'End waiting' : 'Wait'}
      </button>
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

export default Welcome
