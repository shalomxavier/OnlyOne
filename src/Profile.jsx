import { useEffect, useMemo, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { onAuthStateChanged } from 'firebase/auth'
import { collection, doc, getDocs, setDoc } from 'firebase/firestore'
import { auth, db } from './firebase'

function Profile() {
  const navigate = useNavigate()
  const [questions, setQuestions] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [currentIndex, setCurrentIndex] = useState(0)
  const [answers, setAnswers] = useState({})
  const [uid, setUid] = useState('')
  const [submitting, setSubmitting] = useState(false)
  const [submitError, setSubmitError] = useState('')
  const [activeSection, setActiveSection] = useState('')

  useEffect(() => {
    const fetchQuestions = async () => {
      try {
        const snap = await getDocs(collection(db, 'questions'))
        const collected = snap.docs.flatMap((docSnap) => {
          const data = docSnap.data() || {}
          const { category = '', questions: docQuestions = [] } = data
          if (!Array.isArray(docQuestions)) {
            return []
          }
          return docQuestions
            .filter((entry) => entry && typeof entry.question === 'string')
            .map((entry) => ({
              category,
              question: entry.question,
              options: Array.isArray(entry.options) ? entry.options.filter(Boolean) : [],
              scores: Array.isArray(entry.scores) ? entry.scores : [],
              type: entry.type === 'complementary' ? 'complementary' : 'similarity',
            }))
        })

        const filtered = collected.filter((item) => item.question && item.options.length > 0)
        setQuestions(filtered)
      } catch (err) {
        console.error('Failed to load questions:', err)
        setError('Unable to load questions right now. Please try again later.')
      } finally {
        setLoading(false)
      }
    }

    fetchQuestions()
  }, [])

  useEffect(() => {
    const unsub = onAuthStateChanged(auth, (user) => {
      setUid(user?.uid || '')
    })
    return () => unsub()
  }, [])

  const currentQuestion = useMemo(() => questions[currentIndex], [questions, currentIndex])
  const submitIndex = Math.min(24, Math.max(questions.length - 1, 0))
  const isSubmitQuestion = currentIndex === submitIndex
  const hasAnsweredCurrent = answers[currentIndex] !== undefined
  const actionDisabled =
    submitting || !hasAnsweredCurrent || (!isSubmitQuestion && currentIndex >= questions.length - 1)

  const onOptionSelect = (optionIndex) => {
    setAnswers((prev) => ({ ...prev, [currentIndex]: optionIndex }))
  }

  const goToPrevious = () => {
    setCurrentIndex((index) => Math.max(index - 1, 0))
  }

  const goToNext = () => {
    setCurrentIndex((index) => Math.min(index + 1, questions.length - 1))
  }

  const handleSubmit = async () => {
    if (!hasAnsweredCurrent || submitting) return
    if (!uid) {
      setSubmitError('You must be signed in to submit your responses.')
      window.alert('You must be signed in to submit your responses.')
      return
    }

    const totals = { similarity: 0, complementary: 0 }
    Object.entries(answers).forEach(([questionIndex, optionIndex]) => {
      const idx = Number(questionIndex)
      const selectedIndex = optionIndex
      const question = questions[idx]
      if (!question) return
      const scoreArray = Array.isArray(question.scores) ? question.scores : []
      const score = Number(scoreArray[selectedIndex] ?? 0)
      if (question.type === 'complementary') {
        totals.complementary += score
      } else {
        totals.similarity += score
      }
    })

    setSubmitError('')
    setSubmitting(true)
    try {
      const userRef = doc(db, 'users', uid)
      await setDoc(
        userRef,
        {
          similarityScore: totals.similarity,
          complementaryScore: totals.complementary,
        },
        { merge: true }
      )
      console.log('Submitted answers:', answers, totals)
      window.alert('Responses saved successfully!')
      navigate('/welcome')
    } catch (err) {
      console.error('Failed to save scores:', err)
      setSubmitError('Failed to save your responses. Please try again.')
      window.alert('Failed to save your responses. Please try again.')
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <div className="container">
      <h1>Tell us about yourself</h1>
      {activeSection === '' && (
        <div style={{ display: 'flex', gap: 12, marginTop: 16 }}>
          {[
            { key: 'questions', label: 'Questions' },
            { key: 'preferences', label: 'Preferences' },
            { key: 'taste', label: 'Taste' },
          ].map((section) => (
            <button
              key={section.key}
              type="button"
              onClick={() => setActiveSection(section.key)}
              style={{
                padding: '10px 14px',
                borderRadius: 8,
                border: '1px solid #d1d5db',
                background: '#fff',
                color: '#111827',
                cursor: 'pointer',
                fontWeight: 500,
                flex: 1,
              }}
            >
              {section.label}
            </button>
          ))}
        </div>
      )}
      {loading && <p>Loading questions…</p>}
      {!loading && error && <p role="alert">{error}</p>}
      {!loading && !error && activeSection === '' && (
        <p style={{ marginTop: 24, color: '#6b7280' }}>
          Choose a section to get started.
        </p>
      )}
      {!loading && !error && activeSection === 'preferences' && (
        <p style={{ marginTop: 24, color: '#6b7280' }}>Preferences section coming soon.</p>
      )}
      {!loading && !error && activeSection === 'taste' && (
        <p style={{ marginTop: 24, color: '#6b7280' }}>Taste section coming soon.</p>
      )}
      {!loading && !error && activeSection === 'questions' && currentQuestion && (
        <div style={{ marginTop: 16 }}>
          <p style={{ color: '#6b7280', fontSize: 14, marginBottom: 4 }}>
            {currentQuestion.category || 'General'} • {currentQuestion.type === 'complementary' ? 'Complementary' : 'Similarity'} question
          </p>
          <h2 style={{ marginBottom: 16 }}>{currentQuestion.question}</h2>
          <div style={{ display: 'grid', gap: 12 }}>
            {currentQuestion.options.map((option, idx) => {
              const selected = answers[currentIndex] === idx
              return (
                <button
                  key={`${currentIndex}-${idx}`}
                  type="button"
                  onClick={() => onOptionSelect(idx)}
                  style={{
                    padding: '12px 16px',
                    textAlign: 'left',
                    borderRadius: 10,
                    border: selected ? '2px solid #1d4ed8' : '1px solid #d1d5db',
                    background: selected ? '#2563eb' : '#fff',
                    color: selected ? '#fff' : '#111827',
                    boxShadow: selected
                      ? '0 10px 24px rgba(37, 99, 235, 0.35)'
                      : '0 4px 12px rgba(15, 23, 42, 0.08)',
                    fontWeight: selected ? 600 : 500,
                    transform: selected ? 'translateY(-2px)' : 'none',
                    cursor: 'pointer',
                    transition: 'all 0.2s ease-in-out',
                  }}
                >
                  {option}
                </button>
              )
            })}
          </div>
          <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: 24 }}>
            <button
              type="button"
              onClick={goToPrevious}
              disabled={currentIndex === 0}
              style={{
                padding: '10px 16px',
                borderRadius: 8,
                border: '1px solid #d1d5db',
                background: currentIndex === 0 ? '#f3f4f6' : '#fff',
                color: '#111827',
                cursor: currentIndex === 0 ? 'not-allowed' : 'pointer',
              }}
            >
              Previous
            </button>
            <div style={{ alignSelf: 'center', color: '#6b7280', fontSize: 14 }}>
              Question {currentIndex + 1} of {questions.length}
            </div>
            <button
              type="button"
              onClick={isSubmitQuestion ? handleSubmit : goToNext}
              disabled={actionDisabled}
              style={{
                padding: '10px 16px',
                borderRadius: 8,
                border: '1px solid #2563eb',
                background: actionDisabled ? '#dbeafe' : '#2563eb',
                color: actionDisabled ? '#1d4ed8' : '#fff',
                cursor: actionDisabled ? 'not-allowed' : 'pointer',
              }}
            >
              {isSubmitQuestion ? (submitting ? 'Submitting…' : 'Submit') : 'Next'}
            </button>
          </div>
          {submitError && (
            <p style={{ color: '#ef4444', marginTop: 12 }}>{submitError}</p>
          )}
        </div>
      )}
      {!loading && !error && activeSection === 'questions' && questions.length === 0 && (
        <p>No questions available.</p>
      )}
    </div>
  )
}

export default Profile
