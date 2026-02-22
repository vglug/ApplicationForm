import React, { useState, useEffect } from 'react'
import { Widget } from '../../types/widget'
import * as adminApi from '../../services/adminApi'

interface Props {
  token: string
  onEdit: (widget: Widget) => void
  onCreateNew: () => void
  onCreateWithAgent: () => void
  refreshTrigger?: number
}

export default function WidgetList({ token, onEdit, onCreateNew, onCreateWithAgent, refreshTrigger }: Props) {
  const [widgets, setWidgets] = useState<Widget[]>([])
  const [loading, setLoading] = useState(true)
  const [deleting, setDeleting] = useState<number | null>(null)
  const [showCreateOptions, setShowCreateOptions] = useState(false)

  useEffect(() => {
    loadWidgets()
  }, [refreshTrigger])

  const loadWidgets = async () => {
    try {
      setLoading(true)
      const res = await adminApi.getWidgets(token)
      if (res.ok) {
        const data = await res.json()
        setWidgets(data)
      }
    } catch (err) {
      console.error('Failed to load widgets:', err)
    } finally {
      setLoading(false)
    }
  }

  const handleDelete = async (widgetId: number) => {
    if (!confirm('Are you sure you want to delete this widget?')) return

    setDeleting(widgetId)
    try {
      const res = await adminApi.deleteWidget(token, widgetId)
      if (res.ok) {
        loadWidgets()
      } else {
        const error = await res.json()
        alert(error.msg || 'Failed to delete widget')
      }
    } catch (err) {
      console.error('Failed to delete widget:', err)
      alert('Failed to delete widget')
    } finally {
      setDeleting(null)
    }
  }

  const getWidgetIcon = (type: string) => {
    switch (type) {
      case 'pie': return '🥧'
      case 'bar': return '📊'
      case 'line': return '📈'
      case 'number': return '🔢'
      case 'table': return '📋'
      default: return '📊'
    }
  }

  const getWidgetTypeName = (type: string) => {
    switch (type) {
      case 'pie': return 'Pie Chart'
      case 'bar': return 'Bar Chart'
      case 'line': return 'Line Chart'
      case 'number': return 'Number Card'
      case 'table': return 'Data Table'
      default: return type
    }
  }

  if (loading) {
    return (
      <div className="text-center py-5">
        <div className="spinner-border" style={{ color: '#00BAED' }}></div>
        <p className="mt-3 text-muted">Loading widgets...</p>
      </div>
    )
  }

  return (
    <div>
      <div className="d-flex justify-content-between align-items-center mb-4">
        <div>
          <h4 style={{ fontWeight: '600', color: '#2c3e50', marginBottom: '4px' }}>
            Widget Manager
          </h4>
          <p className="text-muted mb-0" style={{ fontSize: '14px' }}>
            Create and manage custom dashboard widgets
          </p>
        </div>
        <button
          className="btn"
          onClick={() => setShowCreateOptions(true)}
          style={{
            backgroundColor: '#00BAED',
            color: 'white',
            border: 'none',
            borderRadius: '8px',
            padding: '10px 20px',
            fontWeight: '500'
          }}
        >
          + Create Widget
        </button>
      </div>

      {/* Create Widget Options Modal */}
      {showCreateOptions && (
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
          onClick={() => setShowCreateOptions(false)}
        >
          <div
            className="card shadow-lg"
            style={{
              maxWidth: '600px',
              width: '100%',
              borderRadius: '16px',
              border: 'none',
              overflow: 'hidden'
            }}
            onClick={(e) => e.stopPropagation()}
          >
            <div
              className="card-header"
              style={{
                backgroundColor: '#00BAED',
                color: 'white',
                padding: '20px 24px',
                border: 'none'
              }}
            >
              <h5 className="mb-1" style={{ fontWeight: '600' }}>Create New Widget</h5>
              <small style={{ opacity: 0.9 }}>Choose how you want to create your widget</small>
            </div>
            <div className="card-body" style={{ padding: '24px' }}>
              <div className="row g-4">
                {/* Manual Option */}
                <div className="col-md-6">
                  <div
                    className="card h-100"
                    style={{
                      cursor: 'pointer',
                      border: '2px solid #e9ecef',
                      borderRadius: '12px',
                      transition: 'all 0.2s'
                    }}
                    onClick={() => {
                      setShowCreateOptions(false)
                      onCreateNew()
                    }}
                    onMouseEnter={(e) => {
                      e.currentTarget.style.borderColor = '#00BAED'
                      e.currentTarget.style.transform = 'translateY(-4px)'
                      e.currentTarget.style.boxShadow = '0 8px 24px rgba(0, 186, 237, 0.15)'
                    }}
                    onMouseLeave={(e) => {
                      e.currentTarget.style.borderColor = '#e9ecef'
                      e.currentTarget.style.transform = 'translateY(0)'
                      e.currentTarget.style.boxShadow = 'none'
                    }}
                  >
                    <div className="card-body text-center p-4">
                      <div
                        style={{
                          width: '64px',
                          height: '64px',
                          borderRadius: '16px',
                          backgroundColor: '#e7f7ff',
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          margin: '0 auto 16px',
                          fontSize: '28px'
                        }}
                      >
                        🛠️
                      </div>
                      <h6 style={{ fontWeight: '600', color: '#2c3e50', marginBottom: '8px' }}>
                        Manual Builder
                      </h6>
                      <p className="text-muted mb-0" style={{ fontSize: '13px', lineHeight: '1.5' }}>
                        Step-by-step wizard to select tables, fields, filters, and visualization options
                      </p>
                    </div>
                  </div>
                </div>

                {/* Agent Option */}
                <div className="col-md-6">
                  <div
                    className="card h-100"
                    style={{
                      cursor: 'pointer',
                      border: '2px solid #e9ecef',
                      borderRadius: '12px',
                      transition: 'all 0.2s',
                      background: 'linear-gradient(135deg, #f8f0ff 0%, #fff 100%)'
                    }}
                    onClick={() => {
                      setShowCreateOptions(false)
                      onCreateWithAgent()
                    }}
                    onMouseEnter={(e) => {
                      e.currentTarget.style.borderColor = '#6f42c1'
                      e.currentTarget.style.transform = 'translateY(-4px)'
                      e.currentTarget.style.boxShadow = '0 8px 24px rgba(111, 66, 193, 0.15)'
                    }}
                    onMouseLeave={(e) => {
                      e.currentTarget.style.borderColor = '#e9ecef'
                      e.currentTarget.style.transform = 'translateY(0)'
                      e.currentTarget.style.boxShadow = 'none'
                    }}
                  >
                    <div className="card-body text-center p-4">
                      <div
                        style={{
                          width: '64px',
                          height: '64px',
                          borderRadius: '16px',
                          backgroundColor: '#f0e6ff',
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          margin: '0 auto 16px',
                          fontSize: '28px'
                        }}
                      >
                        🤖
                      </div>
                      <h6 style={{ fontWeight: '600', color: '#2c3e50', marginBottom: '8px' }}>
                        AI Agent
                        <span
                          className="badge ms-2"
                          style={{
                            backgroundColor: '#6f42c1',
                            fontSize: '9px',
                            padding: '3px 6px',
                            verticalAlign: 'middle'
                          }}
                        >
                          NEW
                        </span>
                      </h6>
                      <p className="text-muted mb-0" style={{ fontSize: '13px', lineHeight: '1.5' }}>
                        Describe your widget in plain English and let AI create it for you
                      </p>
                    </div>
                  </div>
                </div>
              </div>
            </div>
            <div
              className="card-footer bg-white text-center"
              style={{ borderTop: '1px solid #e9ecef', padding: '16px' }}
            >
              <button
                className="btn btn-link text-muted"
                onClick={() => setShowCreateOptions(false)}
                style={{ textDecoration: 'none', fontSize: '14px' }}
              >
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}

      {widgets.length === 0 ? (
        <div className="card shadow-sm" style={{ borderRadius: '12px', border: 'none' }}>
          <div className="card-body text-center py-5">
            <div style={{ fontSize: '64px', opacity: 0.3, marginBottom: '16px' }}>📊</div>
            <h5 style={{ color: '#6c757d', marginBottom: '12px' }}>No Widgets Yet</h5>
            <p className="text-muted mb-4" style={{ fontSize: '14px' }}>
              Create your first custom widget to visualize application data
            </p>
            <button
              className="btn"
              onClick={() => setShowCreateOptions(true)}
              style={{
                backgroundColor: '#00BAED',
                color: 'white',
                border: 'none',
                borderRadius: '8px',
                padding: '12px 24px',
                fontWeight: '500'
              }}
            >
              Create Your First Widget
            </button>
          </div>
        </div>
      ) : (
        <div className="row g-4">
          {widgets.map(widget => (
            <div key={widget.id} className="col-md-4">
              <div
                className="card h-100 shadow-sm"
                style={{
                  borderRadius: '12px',
                  border: 'none',
                  transition: 'transform 0.2s, box-shadow 0.2s'
                }}
                onMouseEnter={(e) => {
                  e.currentTarget.style.transform = 'translateY(-4px)'
                  e.currentTarget.style.boxShadow = '0 8px 24px rgba(0,0,0,0.12)'
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.transform = 'translateY(0)'
                  e.currentTarget.style.boxShadow = '0 2px 8px rgba(0,0,0,0.08)'
                }}
              >
                <div className="card-body p-4">
                  <div className="d-flex justify-content-between align-items-start mb-3">
                    <div className="d-flex align-items-center">
                      <span style={{ fontSize: '28px', marginRight: '12px' }}>
                        {getWidgetIcon(widget.widget_type)}
                      </span>
                      <div>
                        <h6 className="mb-1" style={{ fontWeight: '600', color: '#2c3e50' }}>
                          {widget.title}
                        </h6>
                        <span
                          className="badge"
                          style={{
                            backgroundColor: '#e7f7ff',
                            color: '#00BAED',
                            fontSize: '11px',
                            fontWeight: '500'
                          }}
                        >
                          {getWidgetTypeName(widget.widget_type)}
                        </span>
                      </div>
                    </div>
                  </div>

                  {widget.description && (
                    <p
                      className="text-muted mb-3"
                      style={{
                        fontSize: '13px',
                        lineHeight: '1.5',
                        overflow: 'hidden',
                        textOverflow: 'ellipsis',
                        display: '-webkit-box',
                        WebkitLineClamp: 2,
                        WebkitBoxOrient: 'vertical'
                      }}
                    >
                      {widget.description}
                    </p>
                  )}

                  <div className="d-flex gap-2 mb-3">
                    <span
                      className="badge"
                      style={{
                        backgroundColor: '#f8f9fa',
                        color: '#6c757d',
                        fontSize: '11px'
                      }}
                    >
                      {widget.width === 'col-md-12' ? 'Full' : widget.width === 'col-md-8' ? 'Large' : widget.width === 'col-md-4' ? 'Small' : 'Medium'}
                    </span>
                    <span
                      className="badge"
                      style={{
                        backgroundColor: '#f8f9fa',
                        color: '#6c757d',
                        fontSize: '11px'
                      }}
                    >
                      {widget.config_json?.fields?.length || 0} fields
                    </span>
                    {(widget.config_json?.conditions?.length || 0) > 0 && (
                      <span
                        className="badge"
                        style={{
                          backgroundColor: '#fff3cd',
                          color: '#856404',
                          fontSize: '11px'
                        }}
                      >
                        {widget.config_json.conditions.length} filter{widget.config_json.conditions.length > 1 ? 's' : ''}
                      </span>
                    )}
                  </div>

                  <div className="d-flex gap-2">
                    <button
                      className="btn btn-sm flex-grow-1"
                      onClick={() => onEdit(widget)}
                      style={{
                        backgroundColor: '#e7f7ff',
                        color: '#00BAED',
                        border: 'none',
                        borderRadius: '6px',
                        fontWeight: '500'
                      }}
                    >
                      Edit
                    </button>
                    <button
                      className="btn btn-outline-danger btn-sm"
                      onClick={() => widget.id && handleDelete(widget.id)}
                      disabled={deleting === widget.id}
                      style={{ borderRadius: '6px' }}
                    >
                      {deleting === widget.id ? '...' : 'Delete'}
                    </button>
                  </div>
                </div>

                <div
                  className="card-footer bg-transparent"
                  style={{
                    borderTop: '1px solid #f0f0f0',
                    padding: '12px 16px',
                    fontSize: '12px',
                    color: '#adb5bd'
                  }}
                >
                  Created by {widget.created_by}
                  {widget.created_at && (
                    <> on {new Date(widget.created_at).toLocaleDateString()}</>
                  )}
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
