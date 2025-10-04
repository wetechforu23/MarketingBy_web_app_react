import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { api } from '../api/http'

export default function LoginPage() {
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)
  const navigate = useNavigate()

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)
    setError('')

    try {
      const response = await api.post('/auth/login', { email, password })
      if (response.data.success) {
        navigate('/app/admin')
      } else {
        setError('Login failed')
      }
    } catch (err: any) {
      setError(err.response?.data?.error || 'Login failed')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div style={{ 
      minHeight: '100vh', 
      background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      padding: '20px'
    }}>
      <div className="card" style={{ 
        maxWidth: 450, 
        width: '100%',
        background: 'rgba(255, 255, 255, 0.95)',
        backdropFilter: 'blur(10px)',
        border: '1px solid rgba(255, 255, 255, 0.2)'
      }}>
        <div className="text-center mb-3">
          <h1 style={{ 
            color: 'var(--primary)', 
            marginBottom: '8px',
            fontSize: '2.5em',
            fontWeight: '700'
          }}>
            WeTechForU
          </h1>
          <p className="text-muted">Healthcare Marketing Platform</p>
        </div>
        
        <form onSubmit={handleSubmit}>
          <div className="form-group">
            <label className="form-label">Email Address</label>
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
              className="form-control"
              placeholder="Enter your email"
            />
          </div>
          
          <div className="form-group">
            <label className="form-label">Password</label>
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
              className="form-control"
              placeholder="Enter your password"
            />
          </div>
          
          {error && (
            <div className="alert alert-danger">
              <span>⚠️</span>
              <span style={{ marginLeft: '8px' }}>{error}</span>
            </div>
          )}
          
          <button
            type="submit"
            disabled={loading}
            className="btn btn-primary"
            style={{ width: '100%', marginBottom: '20px' }}
          >
            {loading ? (
              <>
                <div className="spinner"></div>
                Signing in...
              </>
            ) : (
              'Sign In'
            )}
          </button>
        </form>
        
        <div className="card" style={{ 
          background: 'rgba(46, 134, 171, 0.1)',
          border: '1px solid rgba(46, 134, 171, 0.2)',
          marginTop: '20px'
        }}>
          <h4 style={{ margin: '0 0 12px 0', color: 'var(--primary)' }}>Demo Access</h4>
          <div style={{ fontSize: '14px', color: 'var(--text-light)' }}>
            <p style={{ margin: '4px 0' }}><strong>Email:</strong> test@test.com</p>
            <p style={{ margin: '4px 0' }}><strong>Password:</strong> password</p>
          </div>
        </div>
      </div>
    </div>
  )
}