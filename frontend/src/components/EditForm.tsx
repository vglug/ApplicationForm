import React, { useState, useEffect } from 'react'
import DynamicForm from './DynamicForm'
import Notification from './Notification'
import * as api from '../services/api'
import { validateFormConfig } from '../utils/formValidation'

interface EditFormProps {
  token: string
}

export default function EditForm({ token }: EditFormProps) {
  const [formConfig, setFormConfig] = useState<any>(null)
  const [formData, setFormData] = useState<Record<string, any>>({})
  const [candidateId, setCandidateId] = useState<string>('')
  const [verifiedEmail, setVerifiedEmail] = useState<string>('')
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [submitted, setSubmitted] = useState(false)
  const [notification, setNotification] = useState<{ message: string; type: 'success' | 'error' | 'info'; show: boolean }>({
    message: '',
    type: 'info',
    show: false
  })

  useEffect(() => {
    const loadData = async () => {
      try {
        setLoading(true)

        // Validate edit token and get application data
        const tokenResponse = await api.validateEditToken(token)
        const tokenData = await tokenResponse.json()

        if (!tokenResponse.ok || !tokenData.success) {
          setError(tokenData.message || 'Invalid or expired edit link')
          setLoading(false)
          return
        }

        setCandidateId(tokenData.candidate_id)
        setVerifiedEmail(tokenData.email)
        setFormData(tokenData.form_data)

        // Fetch form configuration
        const formRes = await api.getForm()
        if (!formRes.ok) {
          setError('Failed to load form configuration')
          setLoading(false)
          return
        }

        const formConfigData = await formRes.json()

        // Fetch validation schema from database
        const validationRes = await api.getValidationSchema()
        let validationSchema = null

        if (validationRes.ok) {
          const validationData = await validationRes.json()
          if (validationData && Object.keys(validationData).length > 0) {
            validationSchema = validationData
          }
        }

        // Apply validation only if schema exists
        if (validationSchema) {
          const validation = validateFormConfig(formConfigData, validationSchema)
          if (!validation.valid) {
            console.warn('Form configuration validation warnings:', validation.errors)
          }
        }

        setFormConfig(formConfigData)
      } catch (err) {
        console.error('Error loading edit form:', err)
        setError('Error loading form. Please try again.')
      } finally {
        setLoading(false)
      }
    }

    loadData()
  }, [token])

  const showNotification = (message: string, type: 'success' | 'error' | 'info') => {
    setNotification({ message, type, show: true })
  }

  const cleanBilingualValue = (value: any): any => {
    if (typeof value === 'string' && value.includes(' / ')) {
      return value.split(' / ')[0].trim()
    }
    return value
  }

  const structureFormData = (data: any, config: any): any => {
    const structured: any = {}

    config.sections.forEach((section: any) => {
      const sectionData: any[] = []

      section.fields.forEach((field: any) => {
        const fieldName = field.actual_name
        const rawValue = data[fieldName]
        const cleanedValue = cleanBilingualValue(rawValue)

        if (cleanedValue !== undefined && cleanedValue !== null && cleanedValue !== '') {
          sectionData.push({
            [fieldName]: cleanedValue
          })
        }
      })

      structured[section.key] = sectionData
    })

    return structured
  }

  const handleSubmit = async (data: any) => {
    try {
      const structuredData = structureFormData(data, formConfig)

      const res = await api.updateApplication(token, structuredData)
      if (res.ok) {
        setSubmitted(true)
      } else {
        const body = await res.json().catch(() => ({}))
        showNotification('Update failed: ' + (body.message || res.statusText), 'error')
      }
    } catch (e: any) {
      showNotification('Update error: ' + String(e), 'error')
    }
  }

  if (loading) {
    return (
      <div style={{
        minHeight: '100vh',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        backgroundColor: '#f8f9fa'
      }}>
        <div className="text-center">
          <div className="spinner-border text-primary" role="status" style={{ color: '#00BAED' }}>
            <span className="visually-hidden">Loading...</span>
          </div>
          <p className="mt-3" style={{ color: '#6c757d' }}>Loading your application...</p>
        </div>
      </div>
    )
  }

  if (error) {
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
          maxWidth: '500px',
          width: '100%',
          borderRadius: '16px',
          border: 'none'
        }}>
          <div className="card-body text-center p-5">
            <div style={{
              width: '80px',
              height: '80px',
              backgroundColor: '#f8d7da',
              borderRadius: '50%',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              margin: '0 auto 20px'
            }}>
              <svg width="40" height="40" viewBox="0 0 24 24" fill="none" stroke="#dc3545" strokeWidth="2">
                <circle cx="12" cy="12" r="10"></circle>
                <line x1="15" y1="9" x2="9" y2="15"></line>
                <line x1="9" y1="9" x2="15" y2="15"></line>
              </svg>
            </div>
            <h4 style={{ color: '#dc3545', marginBottom: '16px' }}>
              {error.includes('expired') ? 'Link Expired' : 'Invalid Link'}
            </h4>
            <p style={{ color: '#6c757d', fontSize: '14px', lineHeight: '1.6' }}>
              {error}
            </p>
            <a
              href="/form"
              className="btn btn-primary mt-3"
              style={{
                backgroundColor: '#00BAED',
                borderColor: '#00BAED',
                padding: '10px 24px'
              }}
            >
              Go to Application Form
            </a>
          </div>
        </div>
      </div>
    )
  }

  if (submitted) {
    return (
      <div style={{
        minHeight: '100vh',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        backgroundColor: '#f8f9fa'
      }}>
        <div className="card shadow-lg" style={{
          maxWidth: '600px',
          width: '90%',
          borderRadius: '16px',
          border: 'none'
        }}>
          <div className="card-body text-center p-5">
            <div style={{
              width: '100px',
              height: '100px',
              backgroundColor: '#d4edda',
              borderRadius: '50%',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              margin: '0 auto 24px'
            }}>
              <svg width="50" height="50" viewBox="0 0 24 24" fill="none" stroke="#28a745" strokeWidth="2">
                <polyline points="20 6 9 17 4 12"></polyline>
              </svg>
            </div>
            <h3 style={{ color: '#28a745', fontWeight: '600', marginBottom: '24px' }}>
              Application Updated Successfully!
            </h3>
            <p style={{
              color: '#6c757d',
              fontSize: '16px',
              lineHeight: '1.8',
              marginBottom: '32px'
            }}>
              Your application (ID: <strong>{candidateId}</strong>) has been updated.
              <br /><br />
              Thank you for keeping your information up to date.
            </p>
            <a
              href="/form"
              className="btn btn-primary"
              style={{
                backgroundColor: '#00BAED',
                borderColor: '#00BAED',
                padding: '12px 32px',
                fontSize: '16px'
              }}
            >
              Back to Home
            </a>
          </div>
        </div>
      </div>
    )
  }

  return (
    <>
      <Notification
        message={notification.message}
        type={notification.type}
        show={notification.show}
        onClose={() => setNotification({ ...notification, show: false })}
      />
      <div className="container py-4">
        <div className="card shadow-sm mx-auto" style={{ maxWidth: 900 }}>
          <div className="card-body">
            <div className="text-center mb-4">
              <img src="/images/logos/vglug.png" alt="VGLUG Logo" style={{ width: '120px', height: '120px', marginBottom: '20px' }} />
              <h2 className="mb-2" style={{ color: '#00BAED', fontFamily: 'Roboto, sans-serif' }}>
                Edit Your Application
              </h2>
              <p className="text-muted mb-0">
                Application ID: <strong>{candidateId}</strong>
              </p>
            </div>

            {/* Info banner */}
            <div className="alert alert-info mb-4" style={{ fontSize: '14px' }}>
              <strong>Editing Mode:</strong> You are updating your existing application.
              Your email address cannot be changed as it has been verified.
            </div>

            <DynamicForm
              formConfig={formConfig}
              onSubmit={handleSubmit}
              prefilledFields={{ email: verifiedEmail }}
              initialData={formData}
            />
          </div>
        </div>
      </div>
    </>
  )
}
