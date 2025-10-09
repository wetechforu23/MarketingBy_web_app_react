import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { api } from '../api/http'

export default function LoginPage() {
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)
  const [showPassword, setShowPassword] = useState(false)
  const [rememberMe, setRememberMe] = useState(false)
  const navigate = useNavigate()

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)
    setError('')

    try {
      const response = await api.post('/auth/login', { 
        email, 
        password, 
        rememberMe 
      })
      if (response.data.success) {
        // Store remember me preference
        if (rememberMe) {
          localStorage.setItem('rememberMe', 'true')
          localStorage.setItem('rememberMeExpiry', new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString())
        } else {
          localStorage.removeItem('rememberMe')
          localStorage.removeItem('rememberMeExpiry')
        }
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
      background: 'linear-gradient(135deg, #2E86AB 0%, #4A90E2 30%, #87CEEB 70%, #B0E0E6 100%)',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      padding: '20px'
    }}>
      <div className="card" style={{ 
        maxWidth: 480, 
        width: '100%',
        background: 'rgba(255, 255, 255, 0.98)',
        backdropFilter: 'blur(20px)',
        border: '1px solid rgba(255, 255, 255, 0.3)',
        borderRadius: '20px',
        boxShadow: '0 20px 40px rgba(0, 0, 0, 0.1), 0 8px 16px rgba(0, 0, 0, 0.05)',
        padding: '40px 35px',
        position: 'relative',
        overflow: 'hidden'
      }}>
        <div className="text-center mb-3">
          <a 
            href="/"
            style={{
              display: 'inline-block',
              textDecoration: 'none',
              cursor: 'pointer',
              transition: 'transform 0.3s ease'
            }}
            onMouseEnter={(e) => {
              e.currentTarget.style.transform = 'scale(1.05)';
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.transform = 'scale(1)';
            }}
          >
            <img 
              src="/logo.png" 
              alt="WeTechForU" 
              style={{
                height: '180px',
                width: 'auto',
                marginBottom: '8px'
              }}
            />
          </a>
          <h2 style={{ 
            marginTop: '0px', 
            fontSize: '1.4rem',
            fontWeight: '600',
            color: '#2E86AB',
            letterSpacing: '0.5px',
            textShadow: '0 1px 2px rgba(0,0,0,0.1)'
          }}>Healthcare Marketing Platform</h2>
        </div>
        
        <form onSubmit={handleSubmit}>
          <div className="form-group">
            <label className="form-label" style={{ 
              fontSize: '0.95rem',
              fontWeight: '600',
              color: '#2E86AB',
              marginBottom: '8px'
            }}>Email Address</label>
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
              className="form-control"
              placeholder="Enter your email"
              style={{
                padding: '14px 16px',
                fontSize: '1rem',
                border: '2px solid #e1e8ed',
                borderRadius: '12px',
                backgroundColor: '#ffffff',
                transition: 'all 0.3s ease',
                boxShadow: '0 2px 4px rgba(0,0,0,0.05)'
              }}
              onFocus={(e) => {
                e.target.style.borderColor = '#2E86AB';
                e.target.style.boxShadow = '0 4px 12px rgba(46, 134, 171, 0.15)';
              }}
              onBlur={(e) => {
                e.target.style.borderColor = '#e1e8ed';
                e.target.style.boxShadow = '0 2px 4px rgba(0,0,0,0.05)';
              }}
            />
          </div>
          
          <div className="form-group">
            <label className="form-label" style={{ 
              fontSize: '0.95rem',
              fontWeight: '600',
              color: '#2E86AB',
              marginBottom: '8px'
            }}>Password</label>
            <div style={{ position: 'relative' }}>
              <input
                type={showPassword ? 'text' : 'password'}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
                className="form-control"
                placeholder="Enter your password"
                style={{
                  padding: '14px 50px 14px 16px',
                  fontSize: '1rem',
                  border: '2px solid #e1e8ed',
                  borderRadius: '12px',
                  backgroundColor: '#ffffff',
                  transition: 'all 0.3s ease',
                  boxShadow: '0 2px 4px rgba(0,0,0,0.05)',
                  width: '100%'
                }}
                onFocus={(e) => {
                  e.target.style.borderColor = '#2E86AB';
                  e.target.style.boxShadow = '0 4px 12px rgba(46, 134, 171, 0.15)';
                }}
                onBlur={(e) => {
                  e.target.style.borderColor = '#e1e8ed';
                  e.target.style.boxShadow = '0 2px 4px rgba(0,0,0,0.05)';
                }}
              />
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                style={{
                  position: 'absolute',
                  right: '16px',
                  top: '50%',
                  transform: 'translateY(-50%)',
                  background: 'none',
                  border: 'none',
                  cursor: 'pointer',
                  color: '#2E86AB',
                  fontSize: '18px',
                  padding: '4px',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center'
                }}
              >
                {showPassword ? '👁️' : '👁️‍🗨️'}
              </button>
            </div>
          </div>
          
          {error && (
            <div className="alert alert-danger">
              <span>⚠️</span>
              <span style={{ marginLeft: '8px' }}>{error}</span>
            </div>
          )}
          
          <div style={{ 
            display: 'flex', 
            alignItems: 'center', 
            justifyContent: 'space-between',
            marginBottom: '20px'
          }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <input
                type="checkbox"
                id="rememberMe"
                checked={rememberMe}
                onChange={(e) => setRememberMe(e.target.checked)}
                style={{
                  width: '18px',
                  height: '18px',
                  accentColor: '#2E86AB',
                  cursor: 'pointer'
                }}
              />
              <label 
                htmlFor="rememberMe"
                style={{
                  fontSize: '0.95rem',
                  color: '#2E86AB',
                  fontWeight: '500',
                  cursor: 'pointer',
                  userSelect: 'none'
                }}
              >
                Remember me for 30 days
              </label>
            </div>
            <button
              type="button"
              onClick={() => {
                if (email) {
                  // Send OTP for password reset
                  api.post('/auth/send-otp', { email })
                    .then(response => {
                      if (response.data.success) {
                        alert('OTP sent to your email! Please check your inbox.');
                      }
                    })
                    .catch(err => {
                      alert('Failed to send OTP. Please try again.');
                    });
                } else {
                  alert('Please enter your email first.');
                }
              }}
              style={{
                background: 'none',
                border: 'none',
                color: '#2E86AB',
                fontSize: '0.9rem',
                cursor: 'pointer',
                textDecoration: 'underline',
                fontWeight: '500'
              }}
            >
              Forgot Password?
            </button>
          </div>
          
          <button
            type="submit"
            disabled={loading}
            className="btn btn-primary"
            style={{ 
              width: '100%', 
              marginBottom: '20px',
              padding: '16px 24px',
              fontSize: '1.1rem',
              fontWeight: '600',
              borderRadius: '12px',
              background: 'linear-gradient(135deg, #2E86AB 0%, #4A90E2 100%)',
              border: 'none',
              boxShadow: '0 4px 15px rgba(46, 134, 171, 0.3)',
              transition: 'all 0.3s ease',
              textTransform: 'none',
              letterSpacing: '0.5px'
            }}
            onMouseEnter={(e) => {
              if (!loading) {
                e.target.style.transform = 'translateY(-2px)';
                e.target.style.boxShadow = '0 6px 20px rgba(46, 134, 171, 0.4)';
              }
            }}
            onMouseLeave={(e) => {
              if (!loading) {
                e.target.style.transform = 'translateY(0px)';
                e.target.style.boxShadow = '0 4px 15px rgba(46, 134, 171, 0.3)';
              }
            }}
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
      </div>
    </div>
  )
}