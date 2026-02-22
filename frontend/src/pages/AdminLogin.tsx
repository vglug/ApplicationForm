import React, { useState } from 'react'
import { adminLogin } from '../services/adminApi'

interface AdminLoginProps {
  onLoginSuccess: (token: string, user: any) => void
}

export default function AdminLogin({ onLoginSuccess }: AdminLoginProps) {
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError('')
    setLoading(true)

    // Clear any old tokens
    localStorage.removeItem('admin_token')
    localStorage.removeItem('admin_user')

    try {
      const res = await adminLogin(email, password)
      const data = await res.json()

      if (res.ok) {
        onLoginSuccess(data.access_token, data.user)
      } else {
        setError(data.msg || 'Login failed')
      }
    } catch (err) {
      setError('Network error. Please try again.')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="min-vh-100 d-flex align-items-center justify-content-center" style={{ background: 'linear-gradient(135deg, #00BAED 0%, #0095C8 100%)' }}>
      <div className="card shadow-lg" style={{ width: '100%', maxWidth: '440px', borderRadius: '16px', border: 'none' }}>
        <div className="card-body p-5">
          <div className="text-center mb-4">
            <div style={{
              width: '90px',
              height: '90px',
              margin: '0 auto 20px',
              backgroundColor: 'white',
              borderRadius: '50%',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              boxShadow: '0 4px 12px rgba(0, 186, 237, 0.2)'
            }}>
              <img src="/images/logos/vglug.png" alt="VGLUG Logo" style={{ width: '65px', height: '65px' }} />
            </div>
            <h3 style={{ color: '#2c3e50', fontWeight: '700', marginBottom: '8px' }}>Admin Panel</h3>
            <p className="text-muted" style={{ fontSize: '14px', marginBottom: 0 }}>VGLUG Application Form Management</p>
          </div>

          {error && (
            <div className="alert alert-danger" role="alert" style={{ borderRadius: '10px', fontSize: '14px', border: 'none' }}>
              <strong>⚠️ Error:</strong> {error}
            </div>
          )}

          <form onSubmit={handleSubmit}>
            <div className="mb-3">
              <label htmlFor="email" className="form-label" style={{ fontWeight: '600', color: '#2c3e50', fontSize: '14px' }}>
                📧 Email
              </label>
              <input
                type="text"
                className="form-control"
                id="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="Enter your email"
                required
                disabled={loading}
                style={{
                  borderRadius: '10px',
                  padding: '12px 16px',
                  fontSize: '14px',
                  border: '2px solid #e9ecef'
                }}
              />
            </div>

            <div className="mb-4">
              <label htmlFor="password" className="form-label" style={{ fontWeight: '600', color: '#2c3e50', fontSize: '14px' }}>
                🔒 Password
              </label>
              <input
                type="password"
                className="form-control"
                id="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="Enter your password"
                required
                disabled={loading}
                style={{
                  borderRadius: '10px',
                  padding: '12px 16px',
                  fontSize: '14px',
                  border: '2px solid #e9ecef'
                }}
              />
            </div>

            <button
              type="submit"
              className="btn w-100"
              style={{
                backgroundColor: '#00BAED',
                border: 'none',
                color: 'white',
                borderRadius: '10px',
                padding: '12px',
                fontWeight: '600',
                fontSize: '15px',
                boxShadow: '0 4px 12px rgba(0, 186, 237, 0.3)',
                transition: 'all 0.3s ease'
              }}
              disabled={loading}
              onMouseEnter={(e) => {
                if (!loading) e.currentTarget.style.transform = 'translateY(-2px)'
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.transform = 'translateY(0)'
              }}
            >
              {loading ? '⏳ Logging in...' : '🔓 Login to Dashboard'}
            </button>
          </form>

          <div className="text-center mt-4">
            <div style={{
              backgroundColor: '#f8f9fa',
              padding: '12px',
              borderRadius: '8px',
              border: '1px solid #e9ecef'
            }}>
              <small className="text-muted" style={{ fontSize: '12px' }}>
                <strong>Default Credentials:</strong><br />
                <code style={{ fontSize: '11px', color: '#495057' }}>vglugadmin / WeGlug@123</code>
              </small>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
