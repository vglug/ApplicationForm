import React, { useState, useEffect } from 'react'
import { Widget } from '../../types/widget'
import * as adminApi from '../../services/adminApi'
import WidgetPreview from './WidgetPreview'

interface Props {
  token: string
  onNavigateToSubmissions?: (candidateIds: string[], widgetTitle: string) => void
}

interface WidgetWithData extends Widget {
  data?: any[]
  loading?: boolean
  error?: string
}

export default function CustomDashboard({ token, onNavigateToSubmissions }: Props) {
  const [widgets, setWidgets] = useState<WidgetWithData[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    loadWidgetsAndData()
  }, [])

  const loadWidgetsAndData = async () => {
    try {
      setLoading(true)
      const res = await adminApi.getWidgets(token)
      if (res.ok) {
        const widgetsList = await res.json()

        // Initialize widgets with loading state
        const widgetsWithLoading = widgetsList.map((w: Widget) => ({
          ...w,
          loading: true,
          data: []
        }))
        setWidgets(widgetsWithLoading)

        // Load data for each widget
        widgetsList.forEach(async (widget: Widget, index: number) => {
          if (!widget.id) return

          try {
            const dataRes = await adminApi.getWidgetData(token, widget.id)
            if (dataRes.ok) {
              const data = await dataRes.json()
              setWidgets(prev => prev.map((w, i) =>
                i === index ? { ...w, data: data.data, loading: false } : w
              ))
            } else {
              const error = await dataRes.json()
              setWidgets(prev => prev.map((w, i) =>
                i === index ? { ...w, loading: false, error: error.msg } : w
              ))
            }
          } catch (err: any) {
            setWidgets(prev => prev.map((w, i) =>
              i === index ? { ...w, loading: false, error: err.message } : w
            ))
          }
        })
      }
    } catch (err) {
      console.error('Failed to load dashboard:', err)
    } finally {
      setLoading(false)
    }
  }

  const refreshWidget = async (widgetId: number, index: number) => {
    setWidgets(prev => prev.map((w, i) =>
      i === index ? { ...w, loading: true, error: undefined } : w
    ))

    try {
      const dataRes = await adminApi.getWidgetData(token, widgetId)
      if (dataRes.ok) {
        const data = await dataRes.json()
        setWidgets(prev => prev.map((w, i) =>
          i === index ? { ...w, data: data.data, loading: false } : w
        ))
      } else {
        const error = await dataRes.json()
        setWidgets(prev => prev.map((w, i) =>
          i === index ? { ...w, loading: false, error: error.msg } : w
        ))
      }
    } catch (err: any) {
      setWidgets(prev => prev.map((w, i) =>
        i === index ? { ...w, loading: false, error: err.message } : w
      ))
    }
  }

  const handleViewRecords = async (widget: WidgetWithData) => {
    if (!widget.id || !onNavigateToSubmissions) return

    try {
      const res = await adminApi.getWidgetCandidates(token, widget.id)
      if (res.ok) {
        const data = await res.json()
        if (data.candidate_ids && data.candidate_ids.length > 0) {
          onNavigateToSubmissions(data.candidate_ids, widget.title)
        } else {
          alert('No matching records found for this widget.')
        }
      } else {
        const error = await res.json()
        alert(`Failed to get records: ${error.msg}`)
      }
    } catch (err: any) {
      alert(`Error: ${err.message}`)
    }
  }

  const handleSegmentClick = async (widget: WidgetWithData, segmentData: { name: string; value: any; nameField: string }) => {
    if (!widget.id || !onNavigateToSubmissions) return

    try {
      const res = await adminApi.getWidgetSegmentCandidates(
        token,
        widget.id,
        segmentData.nameField,
        segmentData.value
      )
      if (res.ok) {
        const data = await res.json()
        if (data.candidate_ids && data.candidate_ids.length > 0) {
          const filterTitle = `${widget.title} - ${segmentData.name}`
          onNavigateToSubmissions(data.candidate_ids, filterTitle)
        } else {
          alert(`No records found for "${segmentData.name}".`)
        }
      } else {
        const error = await res.json()
        alert(`Failed to get records: ${error.msg}`)
      }
    } catch (err: any) {
      alert(`Error: ${err.message}`)
    }
  }

  if (loading) {
    return (
      <div className="text-center py-5">
        <div className="spinner-border" style={{ color: '#00BAED' }}></div>
        <p className="mt-3 text-muted">Loading custom dashboard...</p>
      </div>
    )
  }

  if (widgets.length === 0) {
    return (
      <div className="card shadow-sm" style={{ borderRadius: '12px', border: 'none' }}>
        <div className="card-body text-center py-5">
          <div style={{ fontSize: '64px', opacity: 0.3, marginBottom: '16px' }}>📊</div>
          <h5 style={{ color: '#6c757d', marginBottom: '12px' }}>No Widgets Configured</h5>
          <p className="text-muted mb-0" style={{ fontSize: '14px' }}>
            Go to Widget Manager to create custom widgets for your dashboard
          </p>
        </div>
      </div>
    )
  }

  return (
    <div>
      <div className="d-flex justify-content-between align-items-center mb-4">
        <div>
          <h4 style={{ fontWeight: '600', color: '#2c3e50', marginBottom: '4px' }}>
            Custom Dashboard
          </h4>
          <p className="text-muted mb-0" style={{ fontSize: '14px' }}>
            {widgets.length} widget{widgets.length !== 1 ? 's' : ''} configured
          </p>
        </div>
        <button
          className="btn btn-outline-primary btn-sm"
          onClick={loadWidgetsAndData}
          style={{ borderRadius: '6px' }}
        >
          Refresh All
        </button>
      </div>

      <div className="row g-4">
        {widgets.map((widget, index) => (
          <div key={widget.id} className={widget.width || 'col-md-6'}>
            <div
              className="card shadow-sm h-100"
              style={{
                borderRadius: '12px',
                border: 'none',
                overflow: 'hidden'
              }}
            >
              <div
                className="card-header d-flex justify-content-between align-items-center"
                style={{
                  backgroundColor: '#00BAED',
                  color: 'white',
                  padding: '16px 20px',
                  border: 'none'
                }}
              >
                <div>
                  <h5
                    className="mb-0"
                    style={{
                      fontWeight: '600',
                      fontSize: '16px'
                    }}
                  >
                    {widget.title}
                  </h5>
                  {widget.description && (
                    <small style={{ opacity: 0.9, fontSize: '12px' }}>
                      {widget.description}
                    </small>
                  )}
                </div>
                <button
                  className="btn btn-sm"
                  onClick={() => widget.id && refreshWidget(widget.id, index)}
                  disabled={widget.loading}
                  style={{
                    backgroundColor: 'rgba(255,255,255,0.2)',
                    color: 'white',
                    border: 'none',
                    borderRadius: '6px',
                    padding: '4px 12px',
                    fontSize: '12px'
                  }}
                >
                  {widget.loading ? '...' : '↻'}
                </button>
              </div>

              <div className="card-body" style={{ padding: '20px', minHeight: '250px' }}>
                {widget.loading ? (
                  <div className="text-center py-5">
                    <div className="spinner-border spinner-border-sm" style={{ color: '#00BAED' }}></div>
                    <p className="mt-2 text-muted mb-0" style={{ fontSize: '13px' }}>Loading data...</p>
                  </div>
                ) : widget.error ? (
                  <div className="text-center py-5">
                    <div style={{ fontSize: '36px', opacity: 0.5, marginBottom: '12px' }}>⚠️</div>
                    <p className="text-danger mb-0" style={{ fontSize: '13px' }}>{widget.error}</p>
                  </div>
                ) : (
                  <WidgetPreview
                    data={widget.data || []}
                    widgetType={widget.widget_type}
                    chartConfig={widget.config_json?.chart_config || {}}
                    title={widget.title}
                    onSegmentClick={
                      onNavigateToSubmissions && ['pie', 'bar', 'line'].includes(widget.widget_type)
                        ? (segmentData) => handleSegmentClick(widget, segmentData)
                        : undefined
                    }
                  />
                )}
              </div>

              <div
                className="card-footer bg-transparent"
                style={{
                  borderTop: '1px solid #f0f0f0',
                  padding: '10px 16px',
                  fontSize: '11px',
                  color: '#adb5bd'
                }}
              >
                <div className="d-flex justify-content-between align-items-center">
                  <span>
                    {widget.data?.length || 0} record{(widget.data?.length || 0) !== 1 ? 's' : ''}
                    {(widget.config_json?.conditions?.length || 0) > 0 && (
                      <> | {widget.config_json.conditions.length} filter{widget.config_json.conditions.length !== 1 ? 's' : ''}</>
                    )}
                  </span>
                  {onNavigateToSubmissions && (
                    <button
                      className="btn btn-link btn-sm p-0"
                      onClick={() => handleViewRecords(widget)}
                      disabled={widget.loading}
                      style={{
                        fontSize: '11px',
                        color: '#00BAED',
                        textDecoration: 'none'
                      }}
                    >
                      View Records →
                    </button>
                  )}
                </div>
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}
