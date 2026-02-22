import React, { useState, useEffect, useRef } from 'react'
import * as api from '../services/api'

interface OTPVerificationProps {
  onVerified: (email: string) => void
}

export default function OTPVerification({ onVerified }: OTPVerificationProps) {
  const [step, setStep] = useState<'email' | 'otp' | 'already_registered' | 'edit_link_sent'>('email')
  const [email, setEmail] = useState('')
  const [normalizedEmail, setNormalizedEmail] = useState('')
  const [otp, setOtp] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [success, setSuccess] = useState('')
  const [countdown, setCountdown] = useState(0)

  const otpInputRef = useRef<HTMLInputElement>(null)

  // Countdown timer for resend
  useEffect(() => {
    if (countdown > 0) {
      const timer = setTimeout(() => setCountdown(countdown - 1), 1000)
      return () => clearTimeout(timer)
    }
  }, [countdown])

  // Focus OTP input when switching to OTP step
  useEffect(() => {
    if (step === 'otp' && otpInputRef.current) {
      otpInputRef.current.focus()
    }
  }, [step])

  const validateEmail = (emailAddress: string): string | null => {
    const trimmed = emailAddress.trim().toLowerCase()

    // Basic email format validation
    const emailPattern = /^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$/
    if (!emailPattern.test(trimmed)) {
      return 'Please enter a valid email address'
    }

    // Check for common typos
    if (trimmed.includes('..') || trimmed.startsWith('.') || trimmed.includes('@.')) {
      return 'Please enter a valid email address'
    }

    return null
  }

  const handleSendOTP = async (e: React.FormEvent) => {
    e.preventDefault()
    setError('')
    setSuccess('')

    const validationError = validateEmail(email)
    if (validationError) {
      setError(validationError)
      return
    }

    setLoading(true)

    try {
      // First check if email is already registered
      const checkResponse = await api.checkEmail(email)
      const checkData = await checkResponse.json()

      if (checkResponse.ok && checkData.success && checkData.registered) {
        // Email is already registered
        setNormalizedEmail(email.trim().toLowerCase())
        setStep('already_registered')
        setLoading(false)
        return
      }

      // Email not registered, send OTP
      const response = await api.sendOTP(email)
      const data = await response.json()

      if (response.ok && data.success) {
        setNormalizedEmail(data.email)
        setSuccess('OTP sent successfully to your email!')
        setStep('otp')
        setCountdown(30) // 30 seconds before allowing resend
      } else {
        setError(data.message || 'Failed to send OTP')
      }
    } catch (err) {
      setError('Network error. Please try again.')
    } finally {
      setLoading(false)
    }
  }

  const handleVerifyOTP = async (e: React.FormEvent) => {
    e.preventDefault()
    setError('')
    setSuccess('')

    if (otp.length !== 6) {
      setError('Please enter a 6-digit OTP')
      return
    }

    setLoading(true)

    try {
      const response = await api.verifyOTP(normalizedEmail, otp)
      const data = await response.json()

      if (response.ok && data.success) {
        setSuccess('Email verified!')
        // Call the onVerified callback with the verified email
        setTimeout(() => {
          onVerified(data.verified_email)
        }, 500)
      } else {
        setError(data.message || 'Invalid OTP')
      }
    } catch (err) {
      setError('Network error. Please try again.')
    } finally {
      setLoading(false)
    }
  }

  const handleResendOTP = async () => {
    if (countdown > 0) return

    setError('')
    setSuccess('')
    setLoading(true)

    try {
      const response = await api.sendOTP(normalizedEmail)
      const data = await response.json()

      if (response.ok && data.success) {
        setSuccess('OTP resent successfully!')
        setOtp('')
        setCountdown(30)
      } else {
        setError(data.message || 'Failed to resend OTP')
      }
    } catch (err) {
      setError('Network error. Please try again.')
    } finally {
      setLoading(false)
    }
  }

  const handleChangeEmail = () => {
    setStep('email')
    setOtp('')
    setError('')
    setSuccess('')
    setCountdown(0)
  }

  const handleSendEditLink = async () => {
    setError('')
    setSuccess('')
    setLoading(true)

    try {
      const response = await api.sendEditLink(normalizedEmail)
      const data = await response.json()

      if (response.ok && data.success) {
        setStep('edit_link_sent')
      } else {
        setError(data.message || 'Failed to send edit link')
      }
    } catch (err) {
      setError('Network error. Please try again.')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div style={{
      minHeight: '100vh',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      backgroundColor: '#f8f9fa',
      padding: '20px'
    }}>
      <div className="card shadow-lg" style={{
        maxWidth: '450px',
        width: '100%',
        borderRadius: '16px',
        border: 'none'
      }}>
        <div className="card-body p-4 p-md-5">
          {/* Logo */}
          <div className="text-center mb-4">
            <img
              src="/images/logos/vglug.png"
              alt="VGLUG Logo"
              style={{
                width: '80px',
                height: '80px',
                marginBottom: '16px'
              }}
            />
            <h4 style={{ color: '#00BAED', fontWeight: '600', marginBottom: '8px' }}>
              VGLUG Training Application
            </h4>
            <p style={{ color: '#6c757d', fontSize: '14px', marginBottom: 0 }}>
              {step === 'email' && 'Verify your email address to continue'}
              {step === 'otp' && 'Enter the OTP sent to your email'}
              {step === 'already_registered' && 'This email is already registered'}
              {step === 'edit_link_sent' && 'Check your email'}
            </p>
          </div>

          {/* Error Alert */}
          {error && (
            <div className="alert alert-danger py-2 px-3" style={{ fontSize: '14px' }}>
              {error}
            </div>
          )}

          {/* Success Alert */}
          {success && (
            <div className="alert alert-success py-2 px-3" style={{ fontSize: '14px' }}>
              {success}
            </div>
          )}

          {step === 'email' && (
            /* Email Form */
            <form onSubmit={handleSendOTP}>
              <div className="mb-4">
                <label className="form-label" style={{ fontWeight: '500' }}>
                  Email Address
                </label>
                <input
                  type="email"
                  className="form-control form-control-lg"
                  placeholder="Enter your email address"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  style={{
                    fontSize: '16px'
                  }}
                  autoFocus
                  disabled={loading}
                />
                <small className="text-muted">
                  We'll send an OTP to verify this email
                </small>
              </div>

              <button
                type="submit"
                className="btn btn-primary w-100 py-2"
                style={{
                  backgroundColor: '#00BAED',
                  borderColor: '#00BAED',
                  fontSize: '16px',
                  fontWeight: '500'
                }}
                disabled={loading || !email.includes('@')}
              >
                {loading ? (
                  <>
                    <span className="spinner-border spinner-border-sm me-2" role="status" />
                    Checking...
                  </>
                ) : (
                  'Continue'
                )}
              </button>
            </form>
          )}

          {step === 'otp' && (
            /* OTP Verification Form */
            <form onSubmit={handleVerifyOTP}>
              <div className="mb-3">
                <div className="d-flex justify-content-between align-items-center mb-2">
                  <label className="form-label mb-0" style={{ fontWeight: '500' }}>
                    Enter OTP
                  </label>
                  <button
                    type="button"
                    className="btn btn-link btn-sm p-0"
                    onClick={handleChangeEmail}
                    style={{ color: '#00BAED', textDecoration: 'none' }}
                  >
                    Change Email
                  </button>
                </div>
                <p className="text-muted mb-3" style={{ fontSize: '14px' }}>
                  OTP sent to <strong>{normalizedEmail}</strong>
                </p>
                <input
                  ref={otpInputRef}
                  type="text"
                  className="form-control form-control-lg text-center"
                  placeholder="• • • • • •"
                  value={otp}
                  onChange={(e) => {
                    // Only allow digits
                    const value = e.target.value.replace(/\D/g, '')
                    if (value.length <= 6) {
                      setOtp(value)
                    }
                  }}
                  style={{
                    fontSize: '24px',
                    letterSpacing: '8px',
                    fontWeight: '500'
                  }}
                  maxLength={6}
                  disabled={loading}
                />
              </div>

              <button
                type="submit"
                className="btn btn-primary w-100 py-2 mb-3"
                style={{
                  backgroundColor: '#00BAED',
                  borderColor: '#00BAED',
                  fontSize: '16px',
                  fontWeight: '500'
                }}
                disabled={loading || otp.length !== 6}
              >
                {loading ? (
                  <>
                    <span className="spinner-border spinner-border-sm me-2" role="status" />
                    Verifying...
                  </>
                ) : (
                  'Verify OTP'
                )}
              </button>

              <div className="text-center">
                {countdown > 0 ? (
                  <p className="text-muted mb-0" style={{ fontSize: '14px' }}>
                    Resend OTP in <strong>{countdown}s</strong>
                  </p>
                ) : (
                  <button
                    type="button"
                    className="btn btn-link p-0"
                    onClick={handleResendOTP}
                    disabled={loading}
                    style={{ color: '#00BAED', textDecoration: 'none', fontSize: '14px' }}
                  >
                    Didn't receive OTP? Resend
                  </button>
                )}
              </div>
            </form>
          )}

          {step === 'already_registered' && (
            /* Already Registered Screen */
            <div>
              <div className="alert alert-warning py-3 px-3 mb-4" style={{ fontSize: '14px' }}>
                <strong>Email Already Registered</strong>
                <p className="mb-0 mt-2">
                  The email <strong>{normalizedEmail}</strong> is already associated with an application.
                </p>
              </div>

              <p className="text-muted mb-4" style={{ fontSize: '14px' }}>
                If you need to update your application, click the button below. We'll send a secure edit link to your email that will be valid for 6 hours.
              </p>

              <button
                type="button"
                className="btn btn-primary w-100 py-2 mb-3"
                onClick={handleSendEditLink}
                style={{
                  backgroundColor: '#00BAED',
                  borderColor: '#00BAED',
                  fontSize: '16px',
                  fontWeight: '500'
                }}
                disabled={loading}
              >
                {loading ? (
                  <>
                    <span className="spinner-border spinner-border-sm me-2" role="status" />
                    Sending Edit Link...
                  </>
                ) : (
                  'Send Edit Link to Email'
                )}
              </button>

              <button
                type="button"
                className="btn btn-outline-secondary w-100 py-2"
                onClick={handleChangeEmail}
                disabled={loading}
                style={{ fontSize: '14px' }}
              >
                Use Different Email
              </button>
            </div>
          )}

          {step === 'edit_link_sent' && (
            /* Edit Link Sent Screen */
            <div className="text-center">
              <div style={{
                width: '80px',
                height: '80px',
                backgroundColor: '#d4edda',
                borderRadius: '50%',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                margin: '0 auto 20px'
              }}>
                <svg width="40" height="40" viewBox="0 0 24 24" fill="none" stroke="#28a745" strokeWidth="2">
                  <polyline points="20 6 9 17 4 12"></polyline>
                </svg>
              </div>

              <h5 style={{ color: '#28a745', marginBottom: '16px' }}>Edit Link Sent!</h5>

              <p className="text-muted mb-4" style={{ fontSize: '14px', lineHeight: '1.6' }}>
                We've sent an edit link to <strong>{normalizedEmail}</strong>.
                <br /><br />
                Please check your inbox (and spam folder) and click the link to update your application.
                <br /><br />
                <strong>Note:</strong> The link is valid for 6 hours and can only be used once.
              </p>

              <button
                type="button"
                className="btn btn-outline-primary w-100 py-2"
                onClick={handleChangeEmail}
                style={{ borderColor: '#00BAED', color: '#00BAED', fontSize: '14px' }}
              >
                Start New Application with Different Email
              </button>
            </div>
          )}

          {/* Footer */}
          <div className="text-center mt-4 pt-3" style={{ borderTop: '1px solid #e9ecef' }}>
            <small className="text-muted">
              By continuing, you agree to our terms of service
            </small>
          </div>
        </div>
      </div>
    </div>
  )
}
