import React, { useState, useEffect } from 'react'
import DynamicForm from './components/DynamicForm'
import Notification from './components/Notification'
import OTPVerification from './components/OTPVerification'
import * as api from './services/api'
import { validateFormConfig } from './utils/formValidation'

export default function App(){
  const [formConfig, setFormConfig] = useState<any>(null)
  const [loading, setLoading] = useState(true)
  const [submitted, setSubmitted] = useState(false)
  const [verifiedEmail, setVerifiedEmail] = useState<string | null>(null)
  const [notification, setNotification] = useState<{ message: string; type: 'success' | 'error' | 'info'; show: boolean }>({
    message: '',
    type: 'info',
    show: false
  })

  useEffect(() => {
    const fetchFormConfig = async () => {
      try {
        setLoading(true)

        // Fetch form configuration
        const formRes = await api.getForm()
        if (!formRes.ok) {
          showNotification('Failed to load form configuration', 'error')
          setLoading(false)
          return
        }

        const formData = await formRes.json()

        // Fetch validation schema from database
        const validationRes = await api.getValidationSchema()
        let validationSchema = null

        if (validationRes.ok) {
          const validationData = await validationRes.json()
          // Check if validation schema exists (not empty object)
          if (validationData && Object.keys(validationData).length > 0) {
            validationSchema = validationData
          }
        }

        // Apply validation only if schema exists
        if (validationSchema) {
          const validation = validateFormConfig(formData, validationSchema)
          if (!validation.valid) {
            console.warn('Form configuration validation warnings:', validation.errors)
            // Still load the form even with validation warnings
          }
        }

        setFormConfig(formData)
      } catch (error) {
        console.error('Error fetching form:', error)
        showNotification('Error loading form configuration', 'error')
      } finally {
        setLoading(false)
      }
    }

    fetchFormConfig()
  }, [])

  const showNotification = (message: string, type: 'success' | 'error' | 'info') => {
    setNotification({ message, type, show: true })
  }

  const cleanBilingualValue = (value: any): any => {
    if (typeof value === 'string' && value.includes(' / ')) {
      // Extract English part (before the first " / ")
      return value.split(' / ')[0].trim()
    }
    return value
  }

  const structureFormData = (data: any, config: any): any => {
    const structured: any = {}

    // Iterate through each section in the form config
    config.sections.forEach((section: any) => {
      const sectionData: any[] = []

      // Iterate through fields in this section
      section.fields.forEach((field: any) => {
        const fieldName = field.actual_name
        const rawValue = data[fieldName]
        const cleanedValue = cleanBilingualValue(rawValue)

        // Only include field if it has a value
        if (cleanedValue !== undefined && cleanedValue !== null && cleanedValue !== '') {
          sectionData.push({
            [fieldName]: cleanedValue
          })
        }
      })

      // Add section data to structured object
      structured[section.key] = sectionData
    })

    return structured
  }

  const handleSubmit = async (data: any) => {
    try{
      // Structure and clean form data by sections
      const structuredData = structureFormData(data, formConfig)

      const res = await api.submit(structuredData)
      if(res.ok){
        const body = await res.json()

        // Mark form as submitted to show success page
        setSubmitted(true)

        // PDF download disabled for now
        // Will be added later
      }else{
        const body = await res.json().catch(()=>({}))
        showNotification('Submission failed: ' + (body.msg || res.statusText), 'error')
      }
    }catch(e:any){
      showNotification('Submission error: '+ String(e), 'error')
    }
  }

  if (loading) {
    return (
      <div className="container py-4">
        <div className="text-center">
          <div className="spinner-border text-primary" role="status">
            <span className="visually-hidden">Loading...</span>
          </div>
          <p className="mt-3">Loading form...</p>
        </div>
      </div>
    )
  }

  if (!formConfig) {
    return (
      <div style={{
        minHeight: '100vh',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        backgroundColor: '#f8f9fa'
      }}>
        <div className="card shadow-lg" style={{
          maxWidth: '500px',
          width: '90%',
          borderRadius: '16px',
          border: 'none'
        }}>
          <div className="card-body text-center p-5">
            <img
              src="/images/logos/vglug.png"
              alt="VGLUG Logo"
              style={{
                width: '100px',
                height: '100px',
                marginBottom: '24px'
              }}
            />
            <h4 style={{
              color: '#00BAED',
              fontWeight: '600',
              marginBottom: '16px'
            }}>
              Form Update in Progress
            </h4>
            <p style={{
              color: '#6c757d',
              fontSize: '16px',
              lineHeight: '1.6',
              marginBottom: '8px'
            }}>
              We are updating the form. Kindly come back after some time.
            </p>
            <p style={{
              color: '#adb5bd',
              fontSize: '14px',
              marginTop: '24px',
              marginBottom: 0
            }}>
              Thank you for your patience
            </p>
          </div>
        </div>
      </div>
    )
  }

  // Show OTP verification screen if email is not verified
  if (!verifiedEmail) {
    return <OTPVerification onVerified={setVerifiedEmail} />
  }

  // Show success page if form is submitted
  if (submitted) {
    const successMessage = formConfig.success_message || 'Thank you for submitting your application! We will review it and get back to you soon.'

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
            <img
              src="/images/logos/vglug.png"
              alt="VGLUG Logo"
              style={{
                width: '120px',
                height: '120px',
                marginBottom: '24px'
              }}
            />
            <h3 style={{
              color: '#00BAED',
              fontWeight: '600',
              marginBottom: '24px'
            }}>
              Form Submitted Successfully!
            </h3>
            <p style={{
              color: '#6c757d',
              fontSize: '16px',
              lineHeight: '1.8',
              marginBottom: '32px',
              whiteSpace: 'pre-line'
            }}>
              {successMessage}
            </p>
            <button
              className="btn btn-primary"
              onClick={() => window.location.reload()}
              style={{
                backgroundColor: '#00BAED',
                borderColor: '#00BAED',
                padding: '12px 32px',
                fontSize: '16px'
              }}
            >
              Submit Another Response
            </button>
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
        <div className="card shadow-sm mx-auto" style={{maxWidth: 900}}>
          <div className="card-body">
            <div className="text-center mb-4">
              <img src="/images/logos/vglug.png" alt="VGLUG Logo" style={{width: '120px', height: '120px', marginBottom: '20px'}} />
              <h2 className="mb-3" style={{color: '#00BAED', fontFamily: 'Roboto, sans-serif'}}>{formConfig.title}</h2>
            </div>
            <DynamicForm
              formConfig={formConfig}
              onSubmit={handleSubmit}
              prefilledFields={{ email: verifiedEmail }}
            />
          </div>
        </div>
      </div>
    </>
  )
}
