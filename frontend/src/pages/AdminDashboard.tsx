import React, { useState, useEffect } from 'react'
import * as adminApi from '../services/adminApi'
import { validateFormConfig, formatValidationErrors, FORM_VALIDATION_SCHEMA } from '../utils/formValidation'
import SubmissionsList from '../components/admin/SubmissionsList'
import SubmissionView from '../components/admin/SubmissionView'
import Dashboard from '../components/admin/Dashboard'
import WidgetBuilder from '../components/admin/WidgetBuilder'
import WidgetList from '../components/admin/WidgetList'
import CustomDashboard from '../components/admin/CustomDashboard'
import AgentWidgetBuilder from '../components/admin/AgentWidgetBuilder'
import VolunteerCheckin from '../components/admin/VolunteerCheckin'
import { Widget } from '../types/widget'

interface AdminDashboardProps {
  token: string
  user: any
  onLogout: () => void
}

export default function AdminDashboard({ token, user, onLogout }: AdminDashboardProps) {
  const [activeTab, setActiveTab] = useState<'dashboard' | 'forms' | 'validations' | 'users' | 'submissions' | 'widgets' | 'checkin'>('submissions')
  const [viewingCandidateId, setViewingCandidateId] = useState<string | null>(null)
  const [formConfigs, setFormConfigs] = useState<any[]>([])
  const [users, setUsers] = useState<any[]>([])
  const [selectedConfig, setSelectedConfig] = useState<any>(null)
  const [jsonEditor, setJsonEditor] = useState('')
  const [loading, setLoading] = useState(false)
  const [notification, setNotification] = useState<{ message: string; type: 'success' | 'error' } | null>(null)
  const [showValidationModal, setShowValidationModal] = useState(false)
  const [validationErrors, setValidationErrors] = useState<string>('')
  const [isEditingValidation, setIsEditingValidation] = useState(false)
  const [validationJsonEditor, setValidationJsonEditor] = useState<string>('')
  const [validationSchemas, setValidationSchemas] = useState<any[]>([])
  const [activeValidationSchema, setActiveValidationSchema] = useState<any>(null)
  const [selectedValidationSchema, setSelectedValidationSchema] = useState<any>(null)

  // New user form
  const [newUserEmail, setNewUserEmail] = useState('')
  const [newUserPassword, setNewUserPassword] = useState('')
  const [newUserRole, setNewUserRole] = useState('volunteer')

  // Widget state
  const [widgetView, setWidgetView] = useState<'list' | 'builder' | 'dashboard' | 'agent'>('dashboard')
  const [editingWidget, setEditingWidget] = useState<Widget | null>(null)
  const [widgetRefreshTrigger, setWidgetRefreshTrigger] = useState(0)

  // Widget filter for submissions
  const [widgetFilterCandidateIds, setWidgetFilterCandidateIds] = useState<string[] | undefined>(undefined)
  const [widgetFilterTitle, setWidgetFilterTitle] = useState<string | undefined>(undefined)

  // Handler for navigating from widget to submissions
  const handleWidgetNavigation = (candidateIds: string[], widgetTitle: string) => {
    setWidgetFilterCandidateIds(candidateIds)
    setWidgetFilterTitle(widgetTitle)
    setActiveTab('submissions')
    setViewingCandidateId(null)
  }

  const clearWidgetFilter = () => {
    setWidgetFilterCandidateIds(undefined)
    setWidgetFilterTitle(undefined)
  }

  // Load validation schemas on mount to have them available for form validation
  useEffect(() => {
    loadValidationSchemas()
  }, [])

  useEffect(() => {
    if (activeTab === 'forms') {
      loadFormConfigs()
      // Also load validation schemas for form config validation
      if (validationSchemas.length === 0) {
        loadValidationSchemas()
      }
    } else if (activeTab === 'validations') {
      loadValidationSchemas()
    } else {
      loadUsers()
    }
  }, [activeTab])

  const loadFormConfigs = async () => {
    try {
      const res = await adminApi.getFormConfigs(token)
      if (res.ok) {
        const data = await res.json()
        setFormConfigs(data)
      }
    } catch (err) {
      showNotification('Failed to load form configurations', 'error')
    }
  }

  const loadUsers = async () => {
    try {
      const res = await adminApi.getUsers(token)
      if (res.ok) {
        const data = await res.json()
        setUsers(data)
      }
    } catch (err) {
      showNotification('Failed to load users', 'error')
    }
  }

  const loadValidationSchemas = async () => {
    try {
      const res = await adminApi.getValidationSchemas(token)
      if (res.ok) {
        const data = await res.json()
        setValidationSchemas(data)
        const active = data.find((s: any) => s.is_active)
        setActiveValidationSchema(active)
      }
    } catch (err) {
      showNotification('Failed to load validation schemas', 'error')
    }
  }

  const loadConfigDetail = async (configId: number) => {
    try {
      const res = await adminApi.getFormConfigDetail(token, configId)
      if (res.ok) {
        const data = await res.json()
        setSelectedConfig(data)
        setJsonEditor(JSON.stringify(data.template_json, null, 2))
      }
    } catch (err) {
      showNotification('Failed to load configuration details', 'error')
    }
  }

  const handleSaveNewVersion = async () => {
    try {
      const templateJson = JSON.parse(jsonEditor)

      // Validate the form configuration using active validation schema from database
      // If no active schema exists, skip validation
      if (activeValidationSchema && activeValidationSchema.schema_json) {
        console.log('Applying validation using active schema:', activeValidationSchema.name)
        const validation = validateFormConfig(templateJson, activeValidationSchema.schema_json)
        if (!validation.valid) {
          const errorMessage = formatValidationErrors(validation.errors)
          setValidationErrors(errorMessage)
          setShowValidationModal(true)
          return
        }
        console.log('Validation passed!')
      } else {
        console.log('No active validation schema - skipping validation')
      }

      const year = new Date().getFullYear()

      setLoading(true)
      const res = await adminApi.createFormConfig(token, templateJson, year, true)
      const data = await res.json()

      if (res.ok) {
        showNotification(`Created version ${data.version} successfully!`, 'success')
        setSelectedConfig(null)
        setJsonEditor('')
        loadFormConfigs()
      } else {
        showNotification(data.msg || 'Failed to create configuration', 'error')
      }
    } catch (err: any) {
      showNotification(err.message || 'Invalid JSON format', 'error')
    } finally {
      setLoading(false)
    }
  }

  const handleActivateConfig = async (configId: number) => {
    try {
      setLoading(true)
      const res = await adminApi.activateFormConfig(token, configId)
      const data = await res.json()

      if (res.ok) {
        showNotification('Configuration activated successfully!', 'success')
        loadFormConfigs()
      } else {
        showNotification(data.msg || 'Failed to activate configuration', 'error')
      }
    } finally {
      setLoading(false)
    }
  }

  const loadValidationSchemaDetail = async (schemaId: number) => {
    try {
      const res = await adminApi.getValidationSchemaDetail(token, schemaId)
      if (res.ok) {
        const data = await res.json()
        setSelectedValidationSchema(data)
        setValidationJsonEditor(JSON.stringify(data.schema_json, null, 2))
      }
    } catch (err) {
      showNotification('Failed to load validation schema details', 'error')
    }
  }

  const handleSaveNewValidationVersion = async () => {
    try {
      const schemaJson = JSON.parse(validationJsonEditor)
      const year = new Date().getFullYear()
      const name = `Validation Schema ${year}`
      const description = 'Updated validation schema'

      setLoading(true)
      const res = await adminApi.createValidationSchema(token, schemaJson, year, name, description, true)
      const data = await res.json()

      if (res.ok) {
        showNotification(`Created validation schema version ${data.version} successfully!`, 'success')
        setSelectedValidationSchema(null)
        setValidationJsonEditor('')
        loadValidationSchemas()
      } else {
        showNotification(data.msg || 'Failed to create validation schema', 'error')
      }
    } catch (err: any) {
      showNotification(err.message || 'Invalid JSON format', 'error')
    } finally {
      setLoading(false)
    }
  }

  const handleActivateValidationSchema = async (schemaId: number) => {
    try {
      setLoading(true)
      const res = await adminApi.activateValidationSchema(token, schemaId)
      const data = await res.json()

      if (res.ok) {
        showNotification('Validation schema activated successfully!', 'success')
        loadValidationSchemas()
      } else {
        showNotification(data.msg || 'Failed to activate validation schema', 'error')
      }
    } finally {
      setLoading(false)
    }
  }

  const handleCreateUser = async (e: React.FormEvent) => {
    e.preventDefault()

    try {
      setLoading(true)
      const res = await adminApi.createUser(token, newUserEmail, newUserPassword, newUserRole)
      const data = await res.json()

      if (res.ok) {
        showNotification(`User ${newUserEmail} created successfully!`, 'success')
        setNewUserEmail('')
        setNewUserPassword('')
        setNewUserRole('volunteer')
        loadUsers()
      } else {
        showNotification(data.msg || 'Failed to create user', 'error')
      }
    } catch (err) {
      showNotification('Network error', 'error')
    } finally {
      setLoading(false)
    }
  }

  const showNotification = (message: string, type: 'success' | 'error') => {
    setNotification({ message, type })
    setTimeout(() => setNotification(null), 3000)
  }

  return (
    <div className="min-vh-100" style={{ backgroundColor: '#f5f7fa' }}>
      {/* Header */}
      <nav className="navbar navbar-light bg-white shadow-sm" style={{ borderBottom: '3px solid #00BAED' }}>
        <div className="container-fluid px-4">
          <div className="d-flex align-items-center">
            <img src="/images/logos/vglug.png" alt="VGLUG Logo" style={{ width: '45px', height: '45px', marginRight: '15px' }} />
            <div>
              <span className="navbar-brand mb-0 h4" style={{ color: '#00BAED', fontWeight: '600' }}>VGLUG Admin Panel</span>
              <div style={{ fontSize: '12px', color: '#6c757d' }}>Application Form Management System</div>
            </div>
          </div>
          <div className="d-flex align-items-center gap-3">
            <div className="text-end">
              <div style={{ fontSize: '14px', fontWeight: '500', color: '#2c3e50' }}>{user.email}</div>
              <div style={{ fontSize: '11px', color: '#6c757d' }}>
              {user.role === 'admin' ? 'Administrator' : user.role === 'panel_member' ? 'Panel Member' : 'Volunteer'}
            </div>
            </div>
            <button className="btn btn-outline-danger btn-sm" onClick={onLogout} style={{ borderRadius: '6px', padding: '6px 16px' }}>
              <span style={{ fontSize: '13px' }}>Logout</span>
            </button>
          </div>
        </div>
      </nav>

      {/* Notification */}
      {notification && (
        <div className="position-fixed top-0 start-50 translate-middle-x mt-3" style={{ zIndex: 9999, minWidth: '400px' }}>
          <div className={`alert alert-${notification.type === 'success' ? 'success' : 'danger'} alert-dismissible fade show shadow-lg`} role="alert" style={{ borderRadius: '8px', border: 'none' }}>
            <strong>{notification.type === 'success' ? '✓ Success' : '✗ Error'}:</strong> {notification.message}
            <button type="button" className="btn-close" onClick={() => setNotification(null)}></button>
          </div>
        </div>
      )}

      <div className="container-fluid py-4 px-4">
        {/* Tabs - Show based on role */}
        <div className="mb-4">
          <ul className="nav nav-pills gap-2" style={{ backgroundColor: 'white', padding: '8px', borderRadius: '10px', boxShadow: '0 2px 4px rgba(0,0,0,0.08)' }}>
            {/* Dashboard - Admin only */}
            {user.role === 'admin' && (
              <li className="nav-item">
                <button
                  className={`nav-link ${activeTab === 'dashboard' ? 'active' : ''}`}
                  onClick={() => setActiveTab('dashboard')}
                  style={{
                    backgroundColor: activeTab === 'dashboard' ? '#00BAED' : 'transparent',
                    color: activeTab === 'dashboard' ? 'white' : '#6c757d',
                    border: 'none',
                    borderRadius: '8px',
                    padding: '10px 20px',
                    fontWeight: '500',
                    fontSize: '14px',
                    transition: 'all 0.3s ease'
                  }}
                >
                  📊 Dashboard
                </button>
              </li>
            )}
            {/* Form Configurations - Admin only */}
            {user.role === 'admin' && (
              <li className="nav-item">
                <button
                  className={`nav-link ${activeTab === 'forms' ? 'active' : ''}`}
                  onClick={() => setActiveTab('forms')}
                  style={{
                    backgroundColor: activeTab === 'forms' ? '#00BAED' : 'transparent',
                    color: activeTab === 'forms' ? 'white' : '#6c757d',
                    border: 'none',
                    borderRadius: '8px',
                    padding: '10px 20px',
                    fontWeight: '500',
                    fontSize: '14px',
                    transition: 'all 0.3s ease'
                  }}
                >
                  📋 Form Configurations
                </button>
              </li>
            )}
            {/* Validation Schemas - Admin only */}
            {user.role === 'admin' && (
              <li className="nav-item">
                <button
                  className={`nav-link ${activeTab === 'validations' ? 'active' : ''}`}
                  onClick={() => setActiveTab('validations')}
                  style={{
                    backgroundColor: activeTab === 'validations' ? '#00BAED' : 'transparent',
                    color: activeTab === 'validations' ? 'white' : '#6c757d',
                    border: 'none',
                    borderRadius: '8px',
                    padding: '10px 20px',
                    fontWeight: '500',
                    fontSize: '14px',
                    transition: 'all 0.3s ease'
                  }}
                >
                  ✓ Validation Schemas
                </button>
              </li>
            )}
            {/* Submissions - All roles */}
            <li className="nav-item">
              <button
                className={`nav-link ${activeTab === 'submissions' ? 'active' : ''}`}
                onClick={() => {
                  setActiveTab('submissions')
                  setViewingCandidateId(null)
                  clearWidgetFilter()
                }}
                style={{
                  backgroundColor: activeTab === 'submissions' ? '#00BAED' : 'transparent',
                  color: activeTab === 'submissions' ? 'white' : '#6c757d',
                  border: 'none',
                  borderRadius: '8px',
                  padding: '10px 20px',
                  fontWeight: '500',
                  fontSize: '14px',
                  transition: 'all 0.3s ease'
                }}
              >
                📝 Submissions
              </button>
            </li>
            {/* User Management - Admin only */}
            {user.role === 'admin' && (
              <li className="nav-item">
                <button
                  className={`nav-link ${activeTab === 'users' ? 'active' : ''}`}
                  onClick={() => setActiveTab('users')}
                  style={{
                    backgroundColor: activeTab === 'users' ? '#00BAED' : 'transparent',
                    color: activeTab === 'users' ? 'white' : '#6c757d',
                    border: 'none',
                    borderRadius: '8px',
                    padding: '10px 20px',
                    fontWeight: '500',
                    fontSize: '14px',
                    transition: 'all 0.3s ease'
                  }}
                >
                  👥 User Management
                </button>
              </li>
            )}
            {/* Custom Widgets - Admin only */}
            {user.role === 'admin' && (
              <li className="nav-item">
                <button
                  className={`nav-link ${activeTab === 'widgets' ? 'active' : ''}`}
                  onClick={() => {
                    setActiveTab('widgets')
                    setWidgetView('dashboard')
                    setEditingWidget(null)
                  }}
                  style={{
                    backgroundColor: activeTab === 'widgets' ? '#00BAED' : 'transparent',
                    color: activeTab === 'widgets' ? 'white' : '#6c757d',
                    border: 'none',
                    borderRadius: '8px',
                    padding: '10px 20px',
                    fontWeight: '500',
                    fontSize: '14px',
                    transition: 'all 0.3s ease'
                  }}
                >
                  🧩 Custom Widgets
                </button>
              </li>
            )}
            {/* Check-in - All roles */}
            <li className="nav-item">
              <button
                className={`nav-link ${activeTab === 'checkin' ? 'active' : ''}`}
                onClick={() => setActiveTab('checkin')}
                style={{
                  backgroundColor: activeTab === 'checkin' ? '#00BAED' : 'transparent',
                  color: activeTab === 'checkin' ? 'white' : '#6c757d',
                  border: 'none',
                  borderRadius: '8px',
                  padding: '10px 20px',
                  fontWeight: '500',
                  fontSize: '14px',
                  transition: 'all 0.3s ease'
                }}
              >
                📋 Check-in
              </button>
            </li>
          </ul>
        </div>

        {/* Dashboard Tab */}
        {activeTab === 'dashboard' && (
          <Dashboard token={token} onNavigateToSubmissions={handleWidgetNavigation} />
        )}

        {/* Form Configurations Tab */}
        {activeTab === 'forms' && (
          <div className="row g-4">
            {/* Left: Form List */}
            <div className="col-lg-4">
              <div className="card shadow-sm" style={{ borderRadius: '12px', border: 'none' }}>
                <div className="card-header" style={{ backgroundColor: '#00BAED', color: 'white', borderRadius: '12px 12px 0 0', padding: '16px 20px' }}>
                  <div className="d-flex align-items-center">
                    <span style={{ fontSize: '20px', marginRight: '10px' }}>📄</span>
                    <h5 className="mb-0" style={{ fontWeight: '600' }}>Form Versions</h5>
                  </div>
                  <small style={{ opacity: 0.9, fontSize: '12px' }}>{formConfigs.length} version{formConfigs.length !== 1 ? 's' : ''} available</small>
                </div>
                <div className="card-body" style={{ maxHeight: '70vh', overflowY: 'auto', padding: '16px' }}>
                  {formConfigs.length === 0 ? (
                    <div className="text-center text-muted py-4">
                      <div style={{ fontSize: '48px', opacity: 0.3 }}>📋</div>
                      <p className="mb-0">No configurations yet</p>
                    </div>
                  ) : (
                    formConfigs.map((config) => (
                      <div
                        key={config.id}
                        className={`card mb-2 ${selectedConfig?.id === config.id ? 'border-info' : ''}`}
                        style={{
                          cursor: 'pointer',
                          backgroundColor: selectedConfig?.id === config.id ? '#e7f7ff' : 'white',
                          borderWidth: selectedConfig?.id === config.id ? '2px' : '1px',
                          borderRadius: '10px',
                          transition: 'all 0.2s ease',
                          boxShadow: selectedConfig?.id === config.id ? '0 4px 12px rgba(0, 186, 237, 0.2)' : '0 1px 3px rgba(0,0,0,0.06)'
                        }}
                        onClick={() => loadConfigDetail(config.id)}
                        onMouseEnter={(e) => {
                          if (selectedConfig?.id !== config.id) {
                            e.currentTarget.style.boxShadow = '0 2px 8px rgba(0,0,0,0.1)'
                          }
                        }}
                        onMouseLeave={(e) => {
                          if (selectedConfig?.id !== config.id) {
                            e.currentTarget.style.boxShadow = '0 1px 3px rgba(0,0,0,0.06)'
                          }
                        }}
                      >
                        <div className="card-body p-3">
                          <div className="d-flex justify-content-between align-items-start">
                            <div>
                              <h6 className="mb-1" style={{ fontWeight: '600', color: '#2c3e50' }}>Version {config.version}</h6>
                              <div className="d-flex align-items-center gap-2 mb-1">
                                <span className="badge" style={{ backgroundColor: '#e3f2fd', color: '#1976d2', fontSize: '11px' }}>📅 {config.year}</span>
                              </div>
                              <small className="text-muted" style={{ fontSize: '12px', display: 'block', marginTop: '4px' }}>
                                {config.title || 'Untitled'}
                              </small>
                            </div>
                            <div>
                              {config.is_active && (
                                <span className="badge bg-success" style={{ fontSize: '11px', padding: '4px 8px' }}>
                                  ✓ Active
                                </span>
                              )}
                            </div>
                          </div>
                        </div>
                      </div>
                    ))
                  )}
                </div>
              </div>
            </div>

            {/* Right: JSON Editor */}
            <div className="col-lg-8">
              <div className="card shadow-sm" style={{ borderRadius: '12px', border: 'none' }}>
                <div className="card-header" style={{ backgroundColor: '#00BAED', color: 'white', borderRadius: '12px 12px 0 0', padding: '16px 20px' }}>
                  <div className="d-flex align-items-center justify-content-between">
                    <div className="d-flex align-items-center">
                      <span style={{ fontSize: '20px', marginRight: '10px' }}>✏️</span>
                      <div>
                        <h5 className="mb-0" style={{ fontWeight: '600' }}>Form JSON Editor</h5>
                        <small style={{ opacity: 0.9, fontSize: '12px' }}>Edit and save configuration</small>
                      </div>
                    </div>
                  </div>
                </div>
                <div className="card-body" style={{ padding: '20px' }}>
                  {selectedConfig ? (
                    <>
                      <div className="mb-3 p-3" style={{ backgroundColor: '#f8f9fa', borderRadius: '8px', border: '1px solid #e9ecef' }}>
                        <div className="d-flex justify-content-between align-items-center">
                          <div>
                            <h6 className="mb-1" style={{ color: '#2c3e50', fontWeight: '600' }}>
                              Version {selectedConfig.version} - Year {selectedConfig.year}
                            </h6>
                            <small className="text-muted" style={{ fontSize: '12px' }}>
                              📅 Created: {new Date(selectedConfig.created_at).toLocaleString()}
                            </small>
                          </div>
                          {!selectedConfig.is_active && (
                            <button
                              className="btn btn-success btn-sm"
                              onClick={() => handleActivateConfig(selectedConfig.id)}
                              disabled={loading}
                              style={{ borderRadius: '6px', padding: '6px 16px', fontWeight: '500' }}
                            >
                              {loading ? '⏳ Activating...' : '✓ Activate'}
                            </button>
                          )}
                          {selectedConfig.is_active && (
                            <span className="badge bg-success" style={{ fontSize: '12px', padding: '6px 12px' }}>
                              ✓ Currently Active
                            </span>
                          )}
                        </div>
                      </div>
                      <div className="alert alert-info" style={{ borderRadius: '8px', fontSize: '13px', border: 'none', backgroundColor: '#e7f7ff' }}>
                        <strong>ℹ️ Validation Requirements:</strong>
                        <ul className="mb-0 mt-2" style={{ paddingLeft: '20px' }}>
                          <li>Form must have 4 sections: <code>basic_info</code>, <code>educational_info</code>, <code>family_info</code>, <code>income_info</code></li>
                          <li>All fields from the original seed form must be included</li>
                          <li>Each field must have: <code>actual_name</code>, <code>label</code>, <code>type</code>, and <code>mandatory</code></li>
                        </ul>
                      </div>
                      <div className="mb-3">
                        <label className="form-label" style={{ fontWeight: '600', color: '#2c3e50', fontSize: '14px' }}>
                          JSON Configuration
                        </label>
                        <textarea
                          className="form-control font-monospace"
                          rows={20}
                          value={jsonEditor}
                          onChange={(e) => setJsonEditor(e.target.value)}
                          style={{
                            fontSize: '13px',
                            borderRadius: '8px',
                            border: '1px solid #dee2e6',
                            padding: '12px',
                            lineHeight: '1.6',
                            resize: 'vertical'
                          }}
                        />
                      </div>
                      <div className="d-flex justify-content-end gap-2">
                        <button
                          className="btn"
                          style={{
                            backgroundColor: '#00BAED',
                            color: 'white',
                            border: 'none',
                            borderRadius: '8px',
                            padding: '10px 24px',
                            fontWeight: '500',
                            fontSize: '14px'
                          }}
                          onClick={handleSaveNewVersion}
                          disabled={loading}
                        >
                          {loading ? '💾 Saving...' : '💾 Save as New Version'}
                        </button>
                        <button
                          className="btn btn-light"
                          onClick={() => {
                            setSelectedConfig(null)
                            setJsonEditor('')
                          }}
                          style={{
                            border: '1px solid #dee2e6',
                            borderRadius: '8px',
                            padding: '10px 24px',
                            fontWeight: '500',
                            fontSize: '14px'
                          }}
                        >
                          ✕ Cancel
                        </button>
                      </div>
                    </>
                  ) : (
                    <div className="text-center text-muted py-5">
                      <div style={{ fontSize: '64px', opacity: 0.2, marginBottom: '16px' }}>📝</div>
                      <h6 style={{ color: '#6c757d' }}>No Configuration Selected</h6>
                      <p style={{ fontSize: '14px', marginBottom: 0 }}>Select a form configuration from the list to view and edit</p>
                    </div>
                  )}
                </div>
              </div>
            </div>
          </div>
        )}

        {/* User Management Tab */}
        {activeTab === 'users' && (
          <div className="row g-4">
            {/* Left: Create User */}
            <div className="col-lg-4">
              <div className="card shadow-sm" style={{ borderRadius: '12px', border: 'none' }}>
                <div className="card-header" style={{ backgroundColor: '#00BAED', color: 'white', borderRadius: '12px 12px 0 0', padding: '16px 20px' }}>
                  <div className="d-flex align-items-center">
                    <span style={{ fontSize: '20px', marginRight: '10px' }}>➕</span>
                    <div>
                      <h5 className="mb-0" style={{ fontWeight: '600' }}>Create New User</h5>
                      <small style={{ opacity: 0.9, fontSize: '12px' }}>Add a new admin or user</small>
                    </div>
                  </div>
                </div>
                <div className="card-body" style={{ padding: '20px' }}>
                  <form onSubmit={handleCreateUser}>
                    <div className="mb-3">
                      <label className="form-label" style={{ fontWeight: '600', color: '#2c3e50', fontSize: '14px' }}>
                        📧 Email Address
                      </label>
                      <input
                        type="email"
                        className="form-control"
                        value={newUserEmail}
                        onChange={(e) => setNewUserEmail(e.target.value)}
                        placeholder="user@example.com"
                        required
                        style={{ borderRadius: '8px', padding: '10px 12px', fontSize: '14px' }}
                      />
                    </div>
                    <div className="mb-3">
                      <label className="form-label" style={{ fontWeight: '600', color: '#2c3e50', fontSize: '14px' }}>
                        🔒 Password
                      </label>
                      <input
                        type="password"
                        className="form-control"
                        value={newUserPassword}
                        onChange={(e) => setNewUserPassword(e.target.value)}
                        placeholder="Enter secure password"
                        required
                        style={{ borderRadius: '8px', padding: '10px 12px', fontSize: '14px' }}
                      />
                      <small className="text-muted" style={{ fontSize: '12px' }}>Minimum 6 characters recommended</small>
                    </div>
                    <div className="mb-4">
                      <label className="form-label" style={{ fontWeight: '600', color: '#2c3e50', fontSize: '14px' }}>
                        🛡️ User Role
                      </label>
                      <select
                        className="form-select"
                        value={newUserRole}
                        onChange={(e) => setNewUserRole(e.target.value)}
                        style={{ borderRadius: '8px', padding: '10px 12px', fontSize: '14px' }}
                      >
                        <option value="volunteer">Volunteer - View applications only</option>
                        <option value="panel_member">Panel Member - View and edit applications</option>
                        <option value="admin">Admin - Full access</option>
                      </select>
                      <small className="text-muted" style={{ fontSize: '12px', display: 'block', marginTop: '6px' }}>
                        {newUserRole === 'admin' && 'Can manage forms, validations, users, and edit applications'}
                        {newUserRole === 'panel_member' && 'Can view and edit application details'}
                        {newUserRole === 'volunteer' && 'Can only view application details'}
                      </small>
                    </div>
                    <button
                      type="submit"
                      className="btn w-100"
                      style={{
                        backgroundColor: '#00BAED',
                        color: 'white',
                        border: 'none',
                        borderRadius: '8px',
                        padding: '12px',
                        fontWeight: '500',
                        fontSize: '14px'
                      }}
                      disabled={loading}
                    >
                      {loading ? '⏳ Creating User...' : '✓ Create User'}
                    </button>
                  </form>
                </div>
              </div>
            </div>

            {/* Right: User List */}
            <div className="col-lg-8">
              <div className="card shadow-sm" style={{ borderRadius: '12px', border: 'none' }}>
                <div className="card-header" style={{ backgroundColor: '#00BAED', color: 'white', borderRadius: '12px 12px 0 0', padding: '16px 20px' }}>
                  <div className="d-flex align-items-center justify-content-between">
                    <div className="d-flex align-items-center">
                      <span style={{ fontSize: '20px', marginRight: '10px' }}>👥</span>
                      <div>
                        <h5 className="mb-0" style={{ fontWeight: '600' }}>All Users</h5>
                        <small style={{ opacity: 0.9, fontSize: '12px' }}>{users.length} user{users.length !== 1 ? 's' : ''} registered</small>
                      </div>
                    </div>
                  </div>
                </div>
                <div className="card-body" style={{ padding: '20px' }}>
                  {users.length === 0 ? (
                    <div className="text-center text-muted py-4">
                      <div style={{ fontSize: '48px', opacity: 0.3 }}>👤</div>
                      <p className="mb-0">No users found</p>
                    </div>
                  ) : (
                    <div className="table-responsive">
                      <table className="table table-hover" style={{ marginBottom: 0 }}>
                        <thead style={{ backgroundColor: '#f8f9fa' }}>
                          <tr>
                            <th style={{ borderTop: 'none', fontWeight: '600', color: '#2c3e50', fontSize: '13px', padding: '12px' }}>📧 Email</th>
                            <th style={{ borderTop: 'none', fontWeight: '600', color: '#2c3e50', fontSize: '13px', padding: '12px' }}>🛡️ Role</th>
                            <th style={{ borderTop: 'none', fontWeight: '600', color: '#2c3e50', fontSize: '13px', padding: '12px' }}>📅 Created</th>
                          </tr>
                        </thead>
                        <tbody>
                          {users.map((u) => (
                            <tr key={u.id} style={{ borderBottom: '1px solid #f0f0f0' }}>
                              <td style={{ padding: '14px 12px', fontSize: '14px', color: '#2c3e50' }}>
                                <div style={{ fontWeight: '500' }}>{u.email}</div>
                              </td>
                              <td style={{ padding: '14px 12px' }}>
                                {u.role === 'admin' ? (
                                  <span className="badge" style={{ backgroundColor: '#dc3545', color: 'white', fontSize: '11px', padding: '5px 10px', borderRadius: '6px' }}>
                                    🛡️ Admin
                                  </span>
                                ) : u.role === 'panel_member' ? (
                                  <span className="badge" style={{ backgroundColor: '#007bff', color: 'white', fontSize: '11px', padding: '5px 10px', borderRadius: '6px' }}>
                                    📋 Panel Member
                                  </span>
                                ) : (
                                  <span className="badge" style={{ backgroundColor: '#28a745', color: 'white', fontSize: '11px', padding: '5px 10px', borderRadius: '6px' }}>
                                    👤 Volunteer
                                  </span>
                                )}
                              </td>
                              <td style={{ padding: '14px 12px', fontSize: '13px', color: '#6c757d' }}>
                                {new Date(u.created_at).toLocaleDateString('en-US', {
                                  year: 'numeric',
                                  month: 'short',
                                  day: 'numeric'
                                })}
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  )}
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Validation Schemas Tab */}
        {activeTab === 'validations' && (
          <div className="row g-4">
            {/* Left: Validation Schema List */}
            <div className="col-lg-4">
              <div className="card shadow-sm" style={{ borderRadius: '12px', border: 'none' }}>
                <div className="card-header" style={{ backgroundColor: '#00BAED', color: 'white', borderRadius: '12px 12px 0 0', padding: '16px 20px' }}>
                  <div className="d-flex align-items-center">
                    <span style={{ fontSize: '20px', marginRight: '10px' }}>✓</span>
                    <h5 className="mb-0" style={{ fontWeight: '600' }}>Validation Versions</h5>
                  </div>
                </div>
                <div className="card-body" style={{ padding: '20px', maxHeight: '600px', overflowY: 'auto' }}>
                  {validationSchemas.length === 0 ? (
                    <div className="text-center py-5">
                      <div style={{ fontSize: '48px', opacity: 0.3, marginBottom: '16px' }}>📝</div>
                      <p style={{ color: '#6c757d', fontSize: '14px', marginBottom: 0 }}>No validation schemas yet</p>
                      <small style={{ color: '#adb5bd', fontSize: '12px' }}>Create your first version</small>
                    </div>
                  ) : (
                    <div className="list-group">
                      {validationSchemas.map((schema) => (
                        <button
                          key={schema.id}
                          className={`list-group-item list-group-item-action ${selectedValidationSchema?.id === schema.id ? 'active' : ''}`}
                          onClick={() => loadValidationSchemaDetail(schema.id)}
                          style={{
                            borderRadius: '8px',
                            marginBottom: '8px',
                            border: selectedValidationSchema?.id === schema.id ? '2px solid #00BAED' : '1px solid #dee2e6',
                            backgroundColor: selectedValidationSchema?.id === schema.id ? '#e7f7ff' : 'white',
                            cursor: 'pointer',
                            padding: '12px 16px'
                          }}
                        >
                          <div className="d-flex justify-content-between align-items-start">
                            <div style={{ flex: 1 }}>
                              <div className="d-flex align-items-center gap-2 mb-1">
                                <strong style={{ color: selectedValidationSchema?.id === schema.id ? '#00BAED' : '#2c3e50', fontSize: '14px' }}>
                                  {schema.name || `Schema ${schema.year}`}
                                </strong>
                                {schema.is_active && (
                                  <span className="badge" style={{ backgroundColor: '#28a745', fontSize: '10px', padding: '3px 8px' }}>
                                    ACTIVE
                                  </span>
                                )}
                              </div>
                              <div style={{ fontSize: '12px', color: '#6c757d' }}>
                                Year: {schema.year} • v{schema.version}
                              </div>
                              <div style={{ fontSize: '11px', color: '#adb5bd', marginTop: '4px' }}>
                                {new Date(schema.created_at).toLocaleDateString()}
                              </div>
                            </div>
                          </div>
                        </button>
                      ))}
                    </div>
                  )}
                </div>
              </div>
            </div>

            {/* Right: Validation Schema Editor */}
            <div className="col-lg-8">
              {selectedValidationSchema ? (
                <div className="card shadow-sm" style={{ borderRadius: '12px', border: 'none' }}>
                  <div className="card-header" style={{ backgroundColor: '#00BAED', color: 'white', borderRadius: '12px 12px 0 0', padding: '16px 20px' }}>
                    <div className="d-flex align-items-center justify-content-between">
                      <div className="d-flex align-items-center">
                        <span style={{ fontSize: '20px', marginRight: '10px' }}>📋</span>
                        <div>
                          <h5 className="mb-0" style={{ fontWeight: '600' }}>
                            {selectedValidationSchema.name || `Validation Schema ${selectedValidationSchema.year}`}
                          </h5>
                          <small style={{ opacity: 0.9, fontSize: '12px' }}>
                            Year {selectedValidationSchema.year} • Version {selectedValidationSchema.version}
                            {selectedValidationSchema.is_active && ' • Active'}
                          </small>
                        </div>
                      </div>
                      <button
                        className="btn btn-sm"
                        onClick={() => {
                          setSelectedValidationSchema(null)
                          setValidationJsonEditor('')
                        }}
                        style={{
                          backgroundColor: 'rgba(255, 255, 255, 0.2)',
                          color: 'white',
                          border: 'none',
                          borderRadius: '6px',
                          padding: '6px 12px',
                          fontSize: '12px'
                        }}
                      >
                        ✕ Close
                      </button>
                    </div>
                  </div>
                  <div className="card-body" style={{ padding: '20px' }}>
                    {selectedValidationSchema.description && (
                      <div className="alert alert-info" style={{ borderRadius: '8px', fontSize: '13px', marginBottom: '16px' }}>
                        <strong>Description:</strong> {selectedValidationSchema.description}
                      </div>
                    )}

                    <div className="mb-3">
                      <label className="form-label" style={{ fontWeight: '600', fontSize: '14px', color: '#2c3e50' }}>
                        Validation Schema JSON
                      </label>
                      <textarea
                        className="form-control font-monospace"
                        rows={18}
                        value={validationJsonEditor}
                        onChange={(e) => setValidationJsonEditor(e.target.value)}
                        style={{
                          fontSize: '13px',
                          borderRadius: '8px',
                          border: '1px solid #dee2e6',
                          padding: '12px',
                          lineHeight: '1.6',
                          backgroundColor: '#f8f9fa'
                        }}
                      />
                    </div>

                    <div className="d-flex gap-2">
                      <button
                        onClick={handleSaveNewValidationVersion}
                        className="btn flex-grow-1"
                        style={{
                          backgroundColor: '#28a745',
                          borderColor: '#28a745',
                          color: 'white',
                          borderRadius: '8px',
                          padding: '10px',
                          fontWeight: '500',
                          fontSize: '14px'
                        }}
                        disabled={loading}
                      >
                        {loading ? '⏳ Saving...' : '💾 Save as New Version'}
                      </button>
                      {!selectedValidationSchema.is_active && (
                        <button
                          onClick={() => handleActivateValidationSchema(selectedValidationSchema.id)}
                          className="btn"
                          style={{
                            backgroundColor: '#007bff',
                            borderColor: '#007bff',
                            color: 'white',
                            borderRadius: '8px',
                            padding: '10px 20px',
                            fontWeight: '500',
                            fontSize: '14px'
                          }}
                          disabled={loading}
                        >
                          ✓ Activate
                        </button>
                      )}
                    </div>
                  </div>
                </div>
              ) : (
                <div className="card shadow-sm" style={{ borderRadius: '12px', border: 'none' }}>
                  <div className="card-body text-center py-5" style={{ padding: '40px' }}>
                    <div style={{ fontSize: '64px', opacity: 0.3, marginBottom: '20px' }}>✓</div>
                    <h5 style={{ color: '#6c757d', marginBottom: '12px' }}>No Validation Schema Selected</h5>
                    <p style={{ color: '#adb5bd', fontSize: '14px', marginBottom: '24px' }}>
                      {validationSchemas.length === 0
                        ? 'Create your first validation schema by clicking the button below'
                        : 'Select a validation schema from the list to view or edit it'}
                    </p>
                    <button
                      className="btn"
                      onClick={() => {
                        // Load default validation schema
                        setValidationJsonEditor(JSON.stringify(FORM_VALIDATION_SCHEMA, null, 2))
                        setSelectedValidationSchema({ id: null, name: 'New Schema', year: new Date().getFullYear(), version: 'new' })
                      }}
                      style={{
                        backgroundColor: '#00BAED',
                        color: 'white',
                        border: 'none',
                        borderRadius: '8px',
                        padding: '12px 24px',
                        fontWeight: '500',
                        fontSize: '14px'
                      }}
                    >
                      ✏️ Create New Validation Schema
                    </button>
                  </div>
                </div>
              )}
            </div>
          </div>
        )}

        {/* Submissions Tab */}
        {activeTab === 'submissions' && (
          viewingCandidateId ? (
            <SubmissionView
              token={token}
              candidateId={viewingCandidateId}
              onBack={() => setViewingCandidateId(null)}
              userRole={user.role}
            />
          ) : (
            <SubmissionsList
              token={token}
              onViewApplication={(candidateId) => setViewingCandidateId(candidateId)}
              filterCandidateIds={widgetFilterCandidateIds}
              filterTitle={widgetFilterTitle}
              onClearFilter={clearWidgetFilter}
              userRole={user.role}
            />
          )
        )}

        {/* Custom Widgets Tab */}
        {activeTab === 'widgets' && (
          <div>
            {/* Sub-navigation for widgets */}
            <div className="mb-4">
              <div className="btn-group" role="group">
                <button
                  className={`btn ${widgetView === 'dashboard' ? 'btn-primary' : 'btn-outline-primary'}`}
                  onClick={() => {
                    setWidgetView('dashboard')
                    setEditingWidget(null)
                  }}
                  style={{ borderRadius: '8px 0 0 8px' }}
                >
                  📊 Dashboard
                </button>
                <button
                  className={`btn ${widgetView === 'list' ? 'btn-primary' : 'btn-outline-primary'}`}
                  onClick={() => {
                    setWidgetView('list')
                    setEditingWidget(null)
                  }}
                  style={{ borderRadius: '0 8px 8px 0' }}
                >
                  ⚙️ Manage Widgets
                </button>
              </div>
            </div>

            {widgetView === 'dashboard' && (
              <CustomDashboard token={token} onNavigateToSubmissions={handleWidgetNavigation} />
            )}

            {widgetView === 'list' && !editingWidget && (
              <WidgetList
                token={token}
                onEdit={(widget) => {
                  setEditingWidget(widget)
                  setWidgetView('builder')
                }}
                onCreateNew={() => {
                  setEditingWidget(null)
                  setWidgetView('builder')
                }}
                onCreateWithAgent={() => {
                  setEditingWidget(null)
                  setWidgetView('agent')
                }}
                refreshTrigger={widgetRefreshTrigger}
              />
            )}

            {widgetView === 'builder' && (
              <WidgetBuilder
                token={token}
                widget={editingWidget}
                onSave={() => {
                  setWidgetView('list')
                  setEditingWidget(null)
                  setWidgetRefreshTrigger(prev => prev + 1)
                }}
                onCancel={() => {
                  setWidgetView('list')
                  setEditingWidget(null)
                }}
              />
            )}

            {widgetView === 'agent' && (
              <AgentWidgetBuilder
                token={token}
                onSave={() => {
                  setWidgetView('list')
                  setWidgetRefreshTrigger(prev => prev + 1)
                }}
                onCancel={() => {
                  setWidgetView('list')
                }}
              />
            )}
          </div>
        )}

        {/* Check-in Tab */}
        {activeTab === 'checkin' && (
          <VolunteerCheckin token={token} />
        )}
      </div>

      {/* Validation Modal */}
      {showValidationModal && (
        <div
          className="position-fixed top-0 start-0 w-100 h-100"
          style={{
            backgroundColor: 'rgba(0, 0, 0, 0.5)',
            zIndex: 10000,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            padding: '20px'
          }}
          onClick={() => setShowValidationModal(false)}
        >
          <div
            className="card shadow-lg"
            style={{
              maxWidth: '800px',
              width: '100%',
              maxHeight: '80vh',
              borderRadius: '12px',
              border: 'none'
            }}
            onClick={(e) => e.stopPropagation()}
          >
            <div
              className="card-header"
              style={{
                backgroundColor: validationErrors.includes('Form validation failed') ? '#dc3545' : '#00BAED',
                color: 'white',
                borderRadius: '12px 12px 0 0',
                padding: '16px 20px'
              }}
            >
              <div className="d-flex justify-content-between align-items-center">
                <h5 className="mb-0" style={{ fontWeight: '600' }}>
                  {validationErrors.includes('Form validation failed') ? '❌ Validation Errors' : '📋 Form Validation Rules'}
                </h5>
                <button
                  className="btn-close btn-close-white"
                  onClick={() => setShowValidationModal(false)}
                  style={{ fontSize: '12px' }}
                ></button>
              </div>
            </div>
            <div className="card-body" style={{ padding: '20px', maxHeight: 'calc(80vh - 80px)', overflowY: 'auto' }}>
              {isEditingValidation ? (
                <>
                  <textarea
                    className="form-control font-monospace"
                    rows={20}
                    value={validationJsonEditor}
                    onChange={(e) => setValidationJsonEditor(e.target.value)}
                    style={{
                      fontSize: '13px',
                      borderRadius: '8px',
                      border: '1px solid #dee2e6',
                      padding: '12px',
                      lineHeight: '1.6',
                      resize: 'vertical'
                    }}
                  />
                  <div className="alert alert-success mt-3" style={{ borderRadius: '8px', fontSize: '13px' }}>
                    <strong>💾 Database Persistence:</strong> Changes will be saved to PostgreSQL database and create a new version. The new version will be automatically activated.
                  </div>
                </>
              ) : (
                <>
                  <pre
                    style={{
                      backgroundColor: '#f8f9fa',
                      padding: '16px',
                      borderRadius: '8px',
                      fontSize: '13px',
                      lineHeight: '1.6',
                      margin: 0,
                      whiteSpace: 'pre-wrap',
                      wordWrap: 'break-word',
                      border: '1px solid #dee2e6'
                    }}
                  >
                    {validationErrors}
                  </pre>
                  {validationErrors.includes('Form validation failed') && (
                    <div className="alert alert-warning mt-3" style={{ borderRadius: '8px', fontSize: '14px' }}>
                      <strong>⚠️ Note:</strong> Please fix these validation errors before saving the form configuration.
                    </div>
                  )}
                </>
              )}
            </div>
            <div className="card-footer bg-white" style={{ borderRadius: '0 0 12px 12px', padding: '16px 20px' }}>
              <div className="d-flex gap-2">
                {!validationErrors.includes('Form validation failed') && (
                  <button
                    className="btn flex-grow-1"
                    onClick={() => {
                      if (isEditingValidation) {
                        // Save changes to database
                        handleSaveValidationSchema()
                      } else {
                        setValidationJsonEditor(validationErrors)
                        setIsEditingValidation(true)
                      }
                    }}
                    style={{
                      backgroundColor: isEditingValidation ? '#28a745' : '#00BAED',
                      borderColor: isEditingValidation ? '#28a745' : '#00BAED',
                      color: 'white',
                      borderRadius: '8px',
                      padding: '10px',
                      fontWeight: '500',
                      fontSize: '14px'
                    }}
                    disabled={loading}
                  >
                    {isEditingValidation ? '💾 Save to Database' : '✏️ Edit'}
                  </button>
                )}
                <button
                  className="btn btn-secondary flex-grow-1"
                  onClick={() => {
                    setShowValidationModal(false)
                    setIsEditingValidation(false)
                  }}
                  style={{
                    borderRadius: '8px',
                    padding: '10px',
                    fontWeight: '500',
                    fontSize: '14px'
                  }}
                >
                  Close
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
