import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { auth, db } from './firebase'
import { onAuthStateChanged } from 'firebase/auth'
import { doc, getDoc, setDoc, updateDoc, increment, serverTimestamp, collection, query, where, orderBy, limit, getDocs } from 'firebase/firestore'

function Welcome() {
  const navigate = useNavigate()
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

  const onJoin = async () => {
    if (!uid || !gender) {
      showToast('Profile not loaded')
      return
    }

    try {
      // Read current stats
      const statsRef = doc(db, 'stats', 'genderCounts')
      const statsSnap = await getDoc(statsRef)
      const stats = statsSnap.data() || {}

      // Determine opposite gender
      const oppositeGender = gender === 'male' ? 'female' : 'male'

      // Check condition: opposite gender count > user's gender count
      const userGenderCount = stats[gender] || 0
      const oppositeGenderCount = stats[oppositeGender] || 0

      if (oppositeGenderCount > userGenderCount) {
        // Decrement the opposite gender count since we're matching this user
        await setDoc(
          statsRef,
          { [oppositeGender]: increment(-1) },
          { merge: true }
        )

        // Find and update the earliest waiting user of opposite gender
        const usersRef = collection(db, 'users')
        const q = query(
          usersRef,
          where('gender', '==', oppositeGender),
          where('waiting', '==', true),
          orderBy('lastWaitClickedAt', 'asc'),
          limit(1)
        )

        const querySnapshot = await getDocs(q)
        if (!querySnapshot.empty) {
          const earliestUserDoc = querySnapshot.docs[0]
          const earliestUserRef = doc(db, 'users', earliestUserDoc.id)

          // Update the earliest waiting user: set waiting to false and joined to true
          await updateDoc(earliestUserRef, {
            waiting: false,
            joined: true,
            joinedAt: serverTimestamp()
          })

          console.log(`Matched with user ${earliestUserDoc.id}`)
        }

        // Set joined flag in current user's document
        const userRef = doc(db, 'users', uid)
        await updateDoc(userRef, { joined: true, joinedAt: serverTimestamp() })

        navigate('/joined')
      } else {
        showToast(`Not enough ${oppositeGender} users waiting`)
      }
    } catch (e) {
      console.error(e)
      showToast('Failed to check availability')
    }
  }

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
      await updateDoc(userRef, { waiting: !waiting, lastWaitClickedAt: serverTimestamp() })

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
      <button onClick={onJoin} style={{ marginBottom: 8 }}>Join</button>
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
