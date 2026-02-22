import React, { useState, useEffect, useCallback } from 'react'
import { getApplicationDetail, updateApplication } from '../../services/adminApi'

interface ApplicationDetail {
  id: number
  candidate_id: string
  uuid: string
  status: string
  created_at: string
  updated_at: string
  basic_info: any
  educational_info: any
  family_info: any
  income_info: any
  course_info: any
}

interface FieldDef {
  label: string
  key: string
  format?: (val: any) => string
  type?: string
}

interface Props {
  token: string
  candidateId: string
  onBack: () => void
  userRole?: string
}

// EditableField component - defined outside to prevent re-creation
const EditableField = React.memo(({
  field,
  value,
  sectionKey,
  onUpdate,
  originalValue
}: {
  field: FieldDef
  value: any
  sectionKey: string
  onUpdate: (section: string, key: string, value: any) => void
  originalValue: any
}) => {
  const inputType = field.type || (typeof originalValue === 'boolean' ? 'checkbox' : 'text')

  if (inputType === 'checkbox') {
    return (
      <div className="p-3" style={{ backgroundColor: '#fff3cd', borderRadius: '8px', border: '1px solid #ffc107' }}>
        <small className="text-muted d-block mb-1" style={{ fontSize: '0.875rem' }}>{field.label}</small>
        <div className="form-check">
          <input
            type="checkbox"
            className="form-check-input"
            checked={!!value}
            onChange={(e) => onUpdate(sectionKey, field.key, e.target.checked)}
          />
          <label className="form-check-label">{value ? 'Yes' : 'No'}</label>
        </div>
      </div>
    )
  } else if (inputType === 'textarea') {
    return (
      <div className="p-3" style={{ backgroundColor: '#fff3cd', borderRadius: '8px', border: '1px solid #ffc107' }}>
        <small className="text-muted d-block mb-1" style={{ fontSize: '0.875rem' }}>{field.label}</small>
        <textarea
          className="form-control"
          rows={3}
          defaultValue={value || ''}
          onBlur={(e) => onUpdate(sectionKey, field.key, e.target.value)}
          style={{ fontSize: '0.95rem' }}
        />
      </div>
    )
  } else {
    return (
      <div className="p-3" style={{ backgroundColor: '#fff3cd', borderRadius: '8px', border: '1px solid #ffc107' }}>
        <small className="text-muted d-block mb-1" style={{ fontSize: '0.875rem' }}>{field.label}</small>
        <input
          type={inputType}
          className="form-control"
          defaultValue={value || ''}
          onBlur={(e) => onUpdate(sectionKey, field.key, e.target.value)}
          style={{ fontSize: '0.95rem' }}
        />
      </div>
    )
  }
})

// DisplayField component
const DisplayField = React.memo(({
  field,
  value
}: {
  field: FieldDef
  value: any
}) => {
  let displayValue = value

  if (value === null || value === undefined || value === '') {
    displayValue = 'N/A'
  } else if (typeof value === 'boolean') {
    displayValue = value ? 'Yes' : 'No'
  } else if (field.format) {
    displayValue = field.format(value)
  }

  return (
    <div className="p-3" style={{ backgroundColor: '#f8f9fa', borderRadius: '8px' }}>
      <small className="text-muted d-block mb-1" style={{ fontSize: '0.875rem' }}>{field.label}</small>
      <div style={{ fontWeight: 500, wordBreak: 'break-word', fontSize: '0.95rem' }}>{displayValue}</div>
    </div>
  )
})

export default function SubmissionView({ token, candidateId, onBack, userRole = 'volunteer' }: Props) {
  const [application, setApplication] = useState<ApplicationDetail | null>(null)
  const [loading, setLoading] = useState(true)
  const [isEditing, setIsEditing] = useState(false)
  const [editData, setEditData] = useState<any>({})
  const [saving, setSaving] = useState(false)
  const [notification, setNotification] = useState<{ message: string; type: 'success' | 'error' } | null>(null)

  // Separate state for Panel Review form
  const [reviewData, setReviewData] = useState<{ considered: boolean; selected: boolean; remarks: string }>({
    considered: false,
    selected: false,
    remarks: ''
  })
  const [savingReview, setSavingReview] = useState(false)

  const canEdit = userRole === 'admin' || userRole === 'panel_member'

  useEffect(() => {
    fetchApplication()
  }, [candidateId])

  const fetchApplication = async () => {
    setLoading(true)
    try {
      const res = await getApplicationDetail(token, candidateId)
      if (res.ok) {
        const data = await res.json()
        setApplication(data)
        // Initialize edit data
        setEditData({
          basic_info: { ...data.basic_info },
          educational_info: { ...data.educational_info },
          family_info: { ...data.family_info },
          income_info: { ...data.income_info },
          course_info: { ...data.course_info },
          status: data.status
        })
        // Initialize review data from application
        setReviewData({
          considered: data.basic_info.considered || false,
          selected: data.basic_info.selected || false,
          remarks: data.basic_info.remarks || ''
        })
      }
    } catch (error) {
      console.error('Failed to fetch application:', error)
    } finally {
      setLoading(false)
    }
  }

  const handleSave = async () => {
    setSaving(true)
    try {
      const res = await updateApplication(token, candidateId, editData)
      if (res.ok) {
        showNotification('Application updated successfully!', 'success')
        setIsEditing(false)
        fetchApplication()
      } else {
        const data = await res.json()
        showNotification(data.msg || 'Failed to update application', 'error')
      }
    } catch (error) {
      showNotification('Network error', 'error')
    } finally {
      setSaving(false)
    }
  }

  const handleCancelEdit = () => {
    if (application) {
      setEditData({
        basic_info: { ...application.basic_info },
        educational_info: { ...application.educational_info },
        family_info: { ...application.family_info },
        income_info: { ...application.income_info },
        course_info: { ...application.course_info },
        status: application.status
      })
    }
    setIsEditing(false)
  }

  // Handle saving panel review separately
  const handleSaveReview = async () => {
    // Validate remarks is mandatory
    if (!reviewData.remarks || reviewData.remarks.trim() === '') {
      showNotification('Remarks is mandatory. Please enter your review remarks.', 'error')
      return
    }

    setSavingReview(true)
    try {
      const res = await updateApplication(token, candidateId, {
        basic_info: {
          considered: reviewData.considered,
          selected: reviewData.selected,
          remarks: reviewData.remarks
        }
      })
      if (res.ok) {
        showNotification('Review saved successfully!', 'success')
        fetchApplication()
      } else {
        const data = await res.json()
        showNotification(data.msg || 'Failed to save review', 'error')
      }
    } catch (error) {
      showNotification('Network error', 'error')
    } finally {
      setSavingReview(false)
    }
  }

  const updateField = useCallback((section: string, key: string, value: any) => {
    setEditData((prev: any) => ({
      ...prev,
      [section]: {
        ...prev[section],
        [key]: value
      }
    }))
  }, [])

  const showNotification = (message: string, type: 'success' | 'error') => {
    setNotification({ message, type })
    setTimeout(() => setNotification(null), 3000)
  }

  const formatDate = (dateStr: string) => {
    return new Date(dateStr).toLocaleDateString('en-IN', {
      year: 'numeric',
      month: 'long',
      day: 'numeric'
    })
  }

  const renderSection = (title: string, sectionKey: string, data: any, fields: FieldDef[]) => {
    const sectionEditData = editData[sectionKey] || {}

    return (
      <>
        {/* Section title - only on desktop */}
        <h5 className="mb-3 d-none d-md-block" style={{ color: '#00BAED', borderBottom: '2px solid #00BAED', paddingBottom: '8px' }}>
          {title}
        </h5>

        {/* Desktop view - grouped by section */}
        <div className="d-none d-md-block mb-4">
          <div className="row g-3">
            {fields.map((field) => (
              <div key={field.key} className="col-12 col-md-6">
                {isEditing ? (
                  <EditableField
                    field={field}
                    value={sectionEditData[field.key]}
                    sectionKey={sectionKey}
                    onUpdate={updateField}
                    originalValue={data[field.key]}
                  />
                ) : (
                  <DisplayField field={field} value={data[field.key]} />
                )}
              </div>
            ))}
          </div>
        </div>

        {/* Mobile view - flat list without section grouping */}
        <div className="d-md-none">
          {fields.map((field) => (
            <div key={field.key} className="mb-2">
              {isEditing ? (
                <EditableField
                  field={field}
                  value={sectionEditData[field.key]}
                  sectionKey={sectionKey}
                  onUpdate={updateField}
                  originalValue={data[field.key]}
                />
              ) : (
                <DisplayField field={field} value={data[field.key]} />
              )}
            </div>
          ))}
        </div>
      </>
    )
  }

  if (loading) {
    return (
      <div className="container py-5">
        <div className="text-center">
          <div className="spinner-border text-primary" role="status">
            <span className="visually-hidden">Loading...</span>
          </div>
        </div>
      </div>
    )
  }

  if (!application) {
    return (
      <div className="container py-5">
        <div className="text-center text-muted">
          <p>Application not found</p>
          <button className="btn btn-primary" onClick={onBack}>
            Go Back
          </button>
        </div>
      </div>
    )
  }

  return (
    <div className="container-fluid py-4 px-3 px-md-4">
      {/* Notification */}
      {notification && (
        <div className="position-fixed top-0 start-50 translate-middle-x mt-3" style={{ zIndex: 9999, minWidth: '400px' }}>
          <div className={`alert alert-${notification.type === 'success' ? 'success' : 'danger'} alert-dismissible fade show shadow-lg`} role="alert" style={{ borderRadius: '8px', border: 'none' }}>
            <strong>{notification.type === 'success' ? 'Success' : 'Error'}:</strong> {notification.message}
            <button type="button" className="btn-close" onClick={() => setNotification(null)}></button>
          </div>
        </div>
      )}

      {/* Header */}
      <div className="mb-4">
        <div className="d-flex justify-content-between align-items-center mb-3">
          <button className="btn btn-outline-secondary" onClick={onBack} disabled={isEditing}>
            Back to List
          </button>
          {canEdit && !isEditing && (
            <button className="btn btn-warning" onClick={() => setIsEditing(true)}>
              Edit Application
            </button>
          )}
          {isEditing && (
            <div className="d-flex gap-2">
              <button className="btn btn-success" onClick={handleSave} disabled={saving}>
                {saving ? 'Saving...' : 'Save Changes'}
              </button>
              <button className="btn btn-secondary" onClick={handleCancelEdit} disabled={saving}>
                Cancel
              </button>
            </div>
          )}
        </div>
        <div className="d-flex flex-column flex-md-row justify-content-between align-items-start gap-3">
          <div>
            <h2 className="h4 h-md-2" style={{ color: '#00BAED' }}>
              Application Details
              {isEditing && <span className="badge bg-warning text-dark ms-2" style={{ fontSize: '0.7rem' }}>Editing</span>}
            </h2>
            <div className="mt-2 d-flex flex-wrap align-items-center gap-2">
              <span className="badge bg-primary" style={{ fontSize: '0.9rem' }}>
                {application.candidate_id}
              </span>
              <span className="badge bg-secondary" style={{ fontSize: '0.85rem' }}>
                {isEditing ? (
                  <select
                    className="form-select form-select-sm d-inline-block"
                    style={{ width: 'auto', backgroundColor: 'transparent', color: 'white', border: 'none' }}
                    value={editData.status || application.status}
                    onChange={(e) => setEditData((prev: any) => ({ ...prev, status: e.target.value }))}
                  >
                    <option value="submitted" style={{ color: 'black' }}>submitted</option>
                    <option value="reviewed" style={{ color: 'black' }}>reviewed</option>
                    <option value="approved" style={{ color: 'black' }}>approved</option>
                    <option value="rejected" style={{ color: 'black' }}>rejected</option>
                  </select>
                ) : application.status}
              </span>
              {/* Panel Review Status Badges */}
              {application.basic_info.considered !== null && (
                <span
                  className="badge"
                  style={{
                    fontSize: '0.85rem',
                    backgroundColor: application.basic_info.considered ? '#28a745' : '#dc3545',
                    color: 'white'
                  }}
                >
                  {application.basic_info.considered ? '✓ Considered' : '✗ Not Considered'}
                </span>
              )}
              {application.basic_info.selected !== null && (
                <span
                  className="badge"
                  style={{
                    fontSize: '0.85rem',
                    backgroundColor: application.basic_info.selected ? '#007bff' : '#6c757d',
                    color: 'white'
                  }}
                >
                  {application.basic_info.selected ? '★ Selected' : '○ Not Selected'}
                </span>
              )}
            </div>
          </div>
          <div className="text-start text-md-end text-muted">
            <small>Submitted: {formatDate(application.created_at)}</small>
          </div>
        </div>
      </div>

      {/* Application Content */}
      <div className="card shadow-sm">
        <div className="card-body p-3 p-md-4" style={{ overflowX: 'hidden' }}>
          {/* Personal Details */}
          {renderSection('Personal Details', 'basic_info', application.basic_info, [
            { label: 'Full Name', key: 'full_name' },
            { label: 'Date of Birth', key: 'dob', format: formatDate, type: 'date' },
            { label: 'Gender', key: 'gender' },
            { label: 'Email', key: 'email', type: 'email' },
            { label: 'Contact Number', key: 'contact', type: 'tel' },
            { label: 'WhatsApp Number', key: 'whatsapp_contact', type: 'tel' },
            { label: 'Differently Abled', key: 'differently_abled', type: 'checkbox' },
            { label: 'Has Laptop', key: 'has_laptop', type: 'checkbox' },
            { label: 'Laptop RAM', key: 'laptop_ram' },
            { label: 'Laptop Processor', key: 'laptop_processor' }
          ])}

          {/* Educational Details */}
          {renderSection('Educational Details', 'educational_info', application.educational_info, [
            { label: 'College Name', key: 'college_name' },
            { label: 'Degree', key: 'degree' },
            { label: 'Department', key: 'department' },
            { label: 'Year', key: 'year' },
            { label: 'Tamil Medium', key: 'tamil_medium', type: 'checkbox' },
            { label: '6th-8th: Govt School', key: 'six_to_8_govt_school', type: 'checkbox' },
            { label: '6th-8th: School Name', key: 'six_to_8_school_name' },
            { label: '9th-10th: Govt School', key: 'nine_to_10_govt_school', type: 'checkbox' },
            { label: '9th-10th: School Name', key: 'nine_to_10_school_name' },
            { label: '11th-12th: Govt School', key: 'eleven_to_12_govt_school', type: 'checkbox' },
            { label: '11th-12th: School Name', key: 'eleven_to_12_school_name' },
            { label: 'Present Work', key: 'present_work' },
            { label: 'Received Scholarship', key: 'received_scholarship', type: 'checkbox' },
            { label: 'Scholarship Details', key: 'scholarship_details', type: 'textarea' },
            { label: 'Transport Mode', key: 'transport_mode' },
            { label: 'Applied to VGLUG Before', key: 'vglug_applied_before' }
          ])}

          {/* Family Information */}
          {renderSection('Family Information', 'family_info', application.family_info, [
            { label: 'Family Environment', key: 'family_environment' },
            { label: 'Single Parent Info', key: 'single_parent_info' },
            { label: 'Family Members Count', key: 'family_members_count', type: 'number' },
            { label: 'Family Members Details', key: 'family_members_details', type: 'textarea' },
            { label: 'Earning Members Count', key: 'earning_members_count', type: 'number' },
            { label: 'Earning Members Details', key: 'earning_members_details', type: 'textarea' },
            { label: 'Guardian Details', key: 'guardian_details', type: 'textarea' }
          ])}

          {/* Income & Housing Information */}
          {renderSection('Income & Housing Information', 'income_info', application.income_info, [
            { label: 'Total Family Income', key: 'total_family_income' },
            { label: 'Own Land Size', key: 'own_land_size' },
            { label: 'House Ownership', key: 'house_ownership' },
            { label: 'Full Address', key: 'full_address', type: 'textarea' },
            { label: 'Pincode', key: 'pincode' },
            { label: 'District', key: 'district' }
          ])}

          {/* Course Preference */}
          {renderSection('Course Preference', 'course_info', application.course_info, [
            { label: 'Preferred Course', key: 'preferred_course' },
            { label: 'Training Benefit', key: 'training_benefit', type: 'textarea' },
            { label: 'Heard About VGLUG', key: 'heard_about_vglug', type: 'checkbox' },
            { label: 'Participated in VGLUG Events', key: 'participated_in_vglug_events', type: 'checkbox' }
          ])}

        </div>
      </div>

      {/* Panel Review Section - Separate form, only visible for admin/panel_member */}
      {canEdit && (
        <div className="card shadow-sm mt-4" style={{ border: '2px solid #00BAED' }}>
          <div className="card-header" style={{ backgroundColor: '#00BAED', color: 'white' }}>
            <h5 className="mb-0 d-flex justify-content-between align-items-center">
              <span>Panel Review</span>
              {application.basic_info.reviewer_email && (
                <small style={{ fontSize: '0.75rem', fontWeight: 'normal', opacity: 0.9 }}>
                  Last reviewed by: {application.basic_info.reviewer_email}
                </small>
              )}
            </h5>
          </div>
          <div className="card-body p-4">
            <div className="row g-4">
              <div className="col-12 col-md-4">
                <div className="form-check form-switch">
                  <input
                    type="checkbox"
                    className="form-check-input"
                    id="consideredCheck"
                    checked={reviewData.considered}
                    onChange={(e) => setReviewData(prev => ({ ...prev, considered: e.target.checked }))}
                    style={{ width: '3em', height: '1.5em' }}
                  />
                  <label className="form-check-label ms-2" htmlFor="consideredCheck" style={{ fontWeight: 500, fontSize: '1rem' }}>
                    Considered
                  </label>
                </div>
                <small className="text-muted">Mark if the application should be considered for selection</small>
              </div>
              <div className="col-12 col-md-4">
                <div className="form-check form-switch">
                  <input
                    type="checkbox"
                    className="form-check-input"
                    id="selectedCheck"
                    checked={reviewData.selected}
                    onChange={(e) => setReviewData(prev => ({ ...prev, selected: e.target.checked }))}
                    style={{ width: '3em', height: '1.5em' }}
                  />
                  <label className="form-check-label ms-2" htmlFor="selectedCheck" style={{ fontWeight: 500, fontSize: '1rem' }}>
                    Selected
                  </label>
                </div>
                <small className="text-muted">Mark if the candidate is selected for the program</small>
              </div>
              <div className="col-12 col-md-4">
                <label className="form-label" style={{ fontWeight: 500 }}>
                  Remarks <span className="text-danger">*</span>
                </label>
                <textarea
                  className="form-control"
                  rows={3}
                  value={reviewData.remarks}
                  onChange={(e) => setReviewData(prev => ({ ...prev, remarks: e.target.value }))}
                  placeholder="Enter your review remarks here..."
                  style={{ fontSize: '0.95rem' }}
                  required
                />
                <small className="text-muted">Required field</small>
              </div>
            </div>
            <div className="mt-4 d-flex justify-content-end">
              <button
                className="btn btn-primary"
                onClick={handleSaveReview}
                disabled={savingReview}
                style={{ backgroundColor: '#00BAED', border: 'none', padding: '10px 30px' }}
              >
                {savingReview ? 'Saving...' : 'Save Review'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
