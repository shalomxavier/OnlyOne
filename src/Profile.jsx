import { useEffect, useMemo, useState } from 'react'
import { collection, getDocs } from 'firebase/firestore'
import { db } from './firebase'

function Profile() {
  const [questions, setQuestions] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [currentIndex, setCurrentIndex] = useState(0)
  const [answers, setAnswers] = useState({})

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

  const currentQuestion = useMemo(() => questions[currentIndex], [questions, currentIndex])

  const onOptionSelect = (optionIndex) => {
    setAnswers((prev) => ({ ...prev, [currentIndex]: optionIndex }))
  }

  const goToPrevious = () => {
    setCurrentIndex((index) => Math.max(index - 1, 0))
  }

  const goToNext = () => {
    setCurrentIndex((index) => Math.min(index + 1, questions.length - 1))
  }

  return (
    <div className="container">
      <h1>Tell us about yourself</h1>
      {loading && <p>Loading questions…</p>}
      {!loading && error && <p role="alert">{error}</p>}
      {!loading && !error && currentQuestion && (
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
                    border: selected ? '2px solid #2563eb' : '1px solid #d1d5db',
                    background: selected ? '#eff6ff' : '#fff',
                    color: '#111827',
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
              onClick={goToNext}
              disabled={currentIndex >= questions.length - 1}
              style={{
                padding: '10px 16px',
                borderRadius: 8,
                border: '1px solid #2563eb',
                background: currentIndex >= questions.length - 1 ? '#dbeafe' : '#2563eb',
                color: currentIndex >= questions.length - 1 ? '#1d4ed8' : '#fff',
                cursor: currentIndex >= questions.length - 1 ? 'not-allowed' : 'pointer',
              }}
            >
              Next
            </button>
          </div>
        </div>
      )}
      {!loading && !error && questions.length === 0 && <p>No questions available.</p>}
    </div>
  )
}

export default Profile
