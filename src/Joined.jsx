import { useNavigate } from 'react-router-dom'

function Joined() {
  const navigate = useNavigate()

  return (
    <div className="container">
      <h1>You are joined!</h1>
      <p>Welcome to the platform.</p>
      <button onClick={() => navigate('/welcome')}>
        Back to Welcome
      </button>
    </div>
  )
}

export default Joined
