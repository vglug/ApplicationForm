import React, { useState, useEffect, useCallback } from 'react'
import { Widget, WidgetMetadata, WidgetField, WidgetCondition, WidgetChartConfig, WidgetConfigJson } from '../../types/widget'
import * as adminApi from '../../services/adminApi'
import WidgetPreview from './WidgetPreview'

interface Props {
  token: string
  widget?: Widget | null
  onSave: (widget: Widget) => void
  onCancel: () => void
}

const DEFAULT_COLORS = ['#00BAED', '#0095C8', '#28a745', '#dc3545', '#ffc107', '#6f42c1', '#fd7e14', '#20c997']

export default function WidgetBuilder({ token, widget, onSave, onCancel }: Props) {
  const [metadata, setMetadata] = useState<WidgetMetadata | null>(null)
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [previewLoading, setPreviewLoading] = useState(false)
  const [previewData, setPreviewData] = useState<any[]>([])
  const [previewError, setPreviewError] = useState<string | null>(null)

  // Form state
  const [title, setTitle] = useState(widget?.title || '')
  const [description, setDescription] = useState(widget?.description || '')
  const [widgetType, setWidgetType] = useState<'pie' | 'bar' | 'line' | 'number' | 'table'>(widget?.widget_type || 'pie')
  const [width, setWidth] = useState(widget?.width || 'col-md-6')

  // Data source state
  const [baseTable] = useState('application')
  const [selectedTables, setSelectedTables] = useState<string[]>(
    widget?.config_json?.data_source?.joins || ['basic_info']
  )

  // Fields state
  const [fields, setFields] = useState<WidgetField[]>(
    widget?.config_json?.fields || []
  )

  // Conditions state
  const [conditions, setConditions] = useState<WidgetCondition[]>(
    widget?.config_json?.conditions || []
  )

  // Group by state
  const [groupBy, setGroupBy] = useState<string[]>(
    widget?.config_json?.group_by || []
  )

  // Chart config state
  const [chartConfig, setChartConfig] = useState<WidgetChartConfig>(
    widget?.config_json?.chart_config || {
      colors: DEFAULT_COLORS,
      show_legend: true,
      show_labels: true
    }
  )

  // Active step
  const [activeStep, setActiveStep] = useState(0)
  const steps = ['Data Source', 'Fields', 'Filters', 'Visualization', 'Preview & Save']

  useEffect(() => {
    loadMetadata()
  }, [])

  const loadMetadata = async () => {
    try {
      const res = await adminApi.getWidgetMetadata(token)
      if (res.ok) {
        const data = await res.json()
        setMetadata(data)
      }
    } catch (err) {
      console.error('Failed to load metadata:', err)
    } finally {
      setLoading(false)
    }
  }

  const buildConfigJson = useCallback((): WidgetConfigJson => {
    return {
      data_source: {
        base_table: baseTable,
        joins: selectedTables.filter(t => t !== baseTable)
      },
      fields,
      conditions,
      group_by: groupBy,
      order_by: fields.filter(f => f.aggregation).map(f => ({
        column: f.alias,
        direction: 'DESC' as const
      })),
      limit: 100,
      chart_config: { ...chartConfig, type: widgetType }
    }
  }, [baseTable, selectedTables, fields, conditions, groupBy, chartConfig, widgetType])

  const handlePreview = async () => {
    if (fields.length === 0) {
      setPreviewError('Please add at least one field')
      return
    }

    setPreviewLoading(true)
    setPreviewError(null)

    try {
      const config = buildConfigJson()
      const res = await adminApi.previewWidget(token, config)

      if (res.ok) {
        const data = await res.json()
        setPreviewData(data.data)
      } else {
        const error = await res.json()
        setPreviewError(error.msg || 'Preview failed')
      }
    } catch (err: any) {
      setPreviewError(err.message || 'Preview failed')
    } finally {
      setPreviewLoading(false)
    }
  }

  const handleSave = async () => {
    if (!title.trim()) {
      alert('Please enter a widget title')
      return
    }
    if (fields.length === 0) {
      alert('Please add at least one field')
      return
    }

    setSaving(true)

    try {
      const widgetData: Widget = {
        id: widget?.id,
        title: title.trim(),
        description: description.trim(),
        widget_type: widgetType,
        config_json: buildConfigJson(),
        width
      }

      if (widget?.id) {
        const res = await adminApi.updateWidget(token, widget.id, widgetData)
        if (res.ok) {
          onSave(widgetData)
        } else {
          const error = await res.json()
          alert(error.msg || 'Failed to update widget')
        }
      } else {
        const res = await adminApi.createWidget(token, widgetData)
        if (res.ok) {
          const data = await res.json()
          widgetData.id = data.id
          onSave(widgetData)
        } else {
          const error = await res.json()
          alert(error.msg || 'Failed to create widget')
        }
      }
    } catch (err: any) {
      alert(err.message || 'Failed to save widget')
    } finally {
      setSaving(false)
    }
  }

  const toggleTable = (tableName: string) => {
    if (tableName === baseTable) return
    setSelectedTables(prev =>
      prev.includes(tableName)
        ? prev.filter(t => t !== tableName)
        : [...prev, tableName]
    )
  }

  const addField = () => {
    const defaultTable = selectedTables[0] || baseTable
    setFields([...fields, {
      table: defaultTable,
      column: '',
      alias: '',
      aggregation: null
    }])
  }

  const updateField = (index: number, updates: Partial<WidgetField>) => {
    const newFields = [...fields]
    newFields[index] = { ...newFields[index], ...updates }
    if (updates.column && !newFields[index].alias) {
      newFields[index].alias = updates.column
    }
    setFields(newFields)
  }

  const removeField = (index: number) => {
    setFields(fields.filter((_, i) => i !== index))
  }

  const addCondition = () => {
    const defaultTable = selectedTables[0] || baseTable
    setConditions([...conditions, {
      logic: 'AND',
      table: defaultTable,
      column: '',
      operator: '=',
      value: ''
    }])
  }

  const updateCondition = (index: number, updates: Partial<WidgetCondition>) => {
    const newConditions = [...conditions]
    newConditions[index] = { ...newConditions[index], ...updates }
    setConditions(newConditions)
  }

  const removeCondition = (index: number) => {
    setConditions(conditions.filter((_, i) => i !== index))
  }

  const toggleGroupBy = (fieldAlias: string) => {
    setGroupBy(prev =>
      prev.includes(fieldAlias)
        ? prev.filter(g => g !== fieldAlias)
        : [...prev, fieldAlias]
    )
  }

  const getAvailableFields = (tableName: string) => {
    if (!metadata) return []
    const table = metadata.tables[tableName]
    return table?.fields || []
  }

  const getAllAvailableTables = () => {
    return [baseTable, ...selectedTables.filter(t => t !== baseTable)]
  }

  if (loading) {
    return (
      <div className="text-center py-5">
        <div className="spinner-border" style={{ color: '#00BAED' }}></div>
        <p className="mt-3 text-muted">Loading widget builder...</p>
      </div>
    )
  }

  return (
    <div className="widget-builder">
      {/* Header */}
      <div className="d-flex justify-content-between align-items-center mb-4">
        <h4 style={{ fontWeight: '600', color: '#2c3e50', marginBottom: 0 }}>
          {widget?.id ? 'Edit Widget' : 'Create New Widget'}
        </h4>
        <button className="btn btn-outline-secondary btn-sm" onClick={onCancel}>
          Cancel
        </button>
      </div>

      {/* Step Navigation */}
      <div className="d-flex gap-2 mb-4 flex-wrap">
        {steps.map((step, i) => (
          <button
            key={step}
            className="btn"
            onClick={() => setActiveStep(i)}
            style={{
              backgroundColor: activeStep === i ? '#00BAED' : 'white',
              color: activeStep === i ? 'white' : '#6c757d',
              border: `1px solid ${activeStep === i ? '#00BAED' : '#dee2e6'}`,
              borderRadius: '20px',
              padding: '8px 16px',
              fontSize: '13px',
              fontWeight: '500'
            }}
          >
            {i + 1}. {step}
          </button>
        ))}
      </div>

      {/* Step Content */}
      <div className="card shadow-sm" style={{ borderRadius: '12px', border: 'none' }}>
        <div className="card-body" style={{ padding: '24px' }}>

          {/* Step 1: Data Source */}
          {activeStep === 0 && (
            <div>
              <h5 className="mb-4" style={{ fontWeight: '600', color: '#2c3e50' }}>
                Select Data Tables
              </h5>
              <p className="text-muted mb-4">
                Choose which tables to include in your widget. The base table (Application) is always included.
              </p>

              <div className="row g-3">
                {metadata && Object.entries(metadata.tables).map(([tableName, table]) => (
                  <div key={tableName} className="col-md-4">
                    <div
                      className={`card h-100 ${tableName === baseTable || selectedTables.includes(tableName) ? 'border-primary' : ''}`}
                      style={{
                        cursor: tableName === baseTable ? 'default' : 'pointer',
                        backgroundColor: tableName === baseTable || selectedTables.includes(tableName) ? '#e7f7ff' : 'white',
                        borderWidth: '2px',
                        borderRadius: '10px',
                        transition: 'all 0.2s'
                      }}
                      onClick={() => toggleTable(tableName)}
                    >
                      <div className="card-body">
                        <div className="d-flex align-items-center justify-content-between mb-2">
                          <h6 className="mb-0" style={{ fontWeight: '600', color: '#2c3e50' }}>
                            {table.display_name}
                          </h6>
                          {(tableName === baseTable || selectedTables.includes(tableName)) && (
                            <span className="badge bg-primary" style={{ fontSize: '10px' }}>
                              {tableName === baseTable ? 'Base' : 'Selected'}
                            </span>
                          )}
                        </div>
                        <small className="text-muted">
                          {table.fields.length} fields available
                        </small>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Step 2: Fields */}
          {activeStep === 1 && (
            <div>
              <div className="d-flex justify-content-between align-items-center mb-4">
                <div>
                  <h5 className="mb-1" style={{ fontWeight: '600', color: '#2c3e50' }}>
                    Configure Fields
                  </h5>
                  <p className="text-muted mb-0" style={{ fontSize: '14px' }}>
                    Select which fields to display and optionally apply aggregations
                  </p>
                </div>
                <button className="btn btn-primary btn-sm" onClick={addField}>
                  + Add Field
                </button>
              </div>

              {fields.length === 0 ? (
                <div className="text-center py-5 text-muted">
                  <p>No fields added yet. Click "Add Field" to start.</p>
                </div>
              ) : (
                <div className="space-y-3">
                  {fields.map((field, index) => (
                    <div
                      key={index}
                      className="card mb-3"
                      style={{ borderRadius: '10px', border: '1px solid #e9ecef' }}
                    >
                      <div className="card-body p-3">
                        <div className="row g-3 align-items-end">
                          <div className="col-md-3">
                            <label className="form-label" style={{ fontSize: '12px', fontWeight: '600' }}>Table</label>
                            <select
                              className="form-select form-select-sm"
                              value={field.table}
                              onChange={(e) => updateField(index, { table: e.target.value, column: '' })}
                            >
                              {getAllAvailableTables().map(t => (
                                <option key={t} value={t}>
                                  {metadata?.tables[t]?.display_name || t}
                                </option>
                              ))}
                            </select>
                          </div>
                          <div className="col-md-3">
                            <label className="form-label" style={{ fontSize: '12px', fontWeight: '600' }}>Column</label>
                            <select
                              className="form-select form-select-sm"
                              value={field.column}
                              onChange={(e) => updateField(index, { column: e.target.value, alias: e.target.value })}
                            >
                              <option value="">Select column...</option>
                              {getAvailableFields(field.table).map(f => (
                                <option key={f.name} value={f.name}>{f.display}</option>
                              ))}
                            </select>
                          </div>
                          <div className="col-md-2">
                            <label className="form-label" style={{ fontSize: '12px', fontWeight: '600' }}>Aggregation</label>
                            <select
                              className="form-select form-select-sm"
                              value={field.aggregation || ''}
                              onChange={(e) => updateField(index, {
                                aggregation: e.target.value as any || null,
                                alias: e.target.value ? `${e.target.value.toLowerCase()}_${field.column}` : field.column
                              })}
                            >
                              <option value="">None</option>
                              {metadata?.aggregations.map(a => (
                                <option key={a.value} value={a.value}>{a.label}</option>
                              ))}
                            </select>
                          </div>
                          <div className="col-md-2">
                            <label className="form-label" style={{ fontSize: '12px', fontWeight: '600' }}>Alias</label>
                            <input
                              type="text"
                              className="form-control form-control-sm"
                              value={field.alias}
                              onChange={(e) => updateField(index, { alias: e.target.value })}
                              placeholder="Column alias"
                            />
                          </div>
                          <div className="col-md-2 text-end">
                            <button
                              className="btn btn-outline-danger btn-sm"
                              onClick={() => removeField(index)}
                            >
                              Remove
                            </button>
                          </div>
                        </div>

                        {/* Group By Toggle */}
                        {field.column && !field.aggregation && (
                          <div className="mt-2">
                            <div className="form-check">
                              <input
                                className="form-check-input"
                                type="checkbox"
                                id={`groupby-${index}`}
                                checked={groupBy.includes(`${field.table}.${field.column}`)}
                                onChange={() => toggleGroupBy(`${field.table}.${field.column}`)}
                              />
                              <label className="form-check-label" htmlFor={`groupby-${index}`} style={{ fontSize: '12px' }}>
                                Group by this field
                              </label>
                            </div>
                          </div>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

          {/* Step 3: Filters */}
          {activeStep === 2 && (
            <div>
              <div className="d-flex justify-content-between align-items-center mb-4">
                <div>
                  <h5 className="mb-1" style={{ fontWeight: '600', color: '#2c3e50' }}>
                    Add Filters (Optional)
                  </h5>
                  <p className="text-muted mb-0" style={{ fontSize: '14px' }}>
                    Filter your data by adding conditions
                  </p>
                </div>
                <button className="btn btn-primary btn-sm" onClick={addCondition}>
                  + Add Condition
                </button>
              </div>

              {conditions.length === 0 ? (
                <div className="text-center py-5 text-muted">
                  <p>No filters added. All data will be included.</p>
                </div>
              ) : (
                conditions.map((condition, index) => (
                  <div
                    key={index}
                    className="card mb-3"
                    style={{ borderRadius: '10px', border: '1px solid #e9ecef' }}
                  >
                    <div className="card-body p-3">
                      <div className="row g-3 align-items-end">
                        {index > 0 && (
                          <div className="col-md-1">
                            <select
                              className="form-select form-select-sm"
                              value={condition.logic}
                              onChange={(e) => updateCondition(index, { logic: e.target.value as 'AND' | 'OR' })}
                            >
                              <option value="AND">AND</option>
                              <option value="OR">OR</option>
                            </select>
                          </div>
                        )}
                        <div className={index > 0 ? 'col-md-2' : 'col-md-3'}>
                          <label className="form-label" style={{ fontSize: '12px', fontWeight: '600' }}>Table</label>
                          <select
                            className="form-select form-select-sm"
                            value={condition.table}
                            onChange={(e) => updateCondition(index, { table: e.target.value, column: '' })}
                          >
                            {getAllAvailableTables().map(t => (
                              <option key={t} value={t}>
                                {metadata?.tables[t]?.display_name || t}
                              </option>
                            ))}
                          </select>
                        </div>
                        <div className="col-md-2">
                          <label className="form-label" style={{ fontSize: '12px', fontWeight: '600' }}>Column</label>
                          <select
                            className="form-select form-select-sm"
                            value={condition.column}
                            onChange={(e) => updateCondition(index, { column: e.target.value })}
                          >
                            <option value="">Select...</option>
                            {getAvailableFields(condition.table).map(f => (
                              <option key={f.name} value={f.name}>{f.display}</option>
                            ))}
                          </select>
                        </div>
                        <div className="col-md-2">
                          <label className="form-label" style={{ fontSize: '12px', fontWeight: '600' }}>Operator</label>
                          <select
                            className="form-select form-select-sm"
                            value={condition.operator}
                            onChange={(e) => updateCondition(index, { operator: e.target.value })}
                          >
                            {metadata?.operators.map(o => (
                              <option key={o.value} value={o.value}>{o.label}</option>
                            ))}
                          </select>
                        </div>
                        <div className="col-md-3">
                          <label className="form-label" style={{ fontSize: '12px', fontWeight: '600' }}>Value</label>
                          {condition.operator === 'IS NULL' || condition.operator === 'IS NOT NULL' ? (
                            <input
                              type="text"
                              className="form-control form-control-sm"
                              value=""
                              disabled
                              placeholder="(no value needed)"
                            />
                          ) : (
                            <input
                              type="text"
                              className="form-control form-control-sm"
                              value={condition.value}
                              onChange={(e) => updateCondition(index, { value: e.target.value })}
                              placeholder="Enter value..."
                            />
                          )}
                        </div>
                        <div className="col-md-1 text-end">
                          <button
                            className="btn btn-outline-danger btn-sm"
                            onClick={() => removeCondition(index)}
                          >
                            X
                          </button>
                        </div>
                      </div>
                    </div>
                  </div>
                ))
              )}
            </div>
          )}

          {/* Step 4: Visualization */}
          {activeStep === 3 && (
            <div>
              <h5 className="mb-4" style={{ fontWeight: '600', color: '#2c3e50' }}>
                Configure Visualization
              </h5>

              <div className="row g-4">
                <div className="col-md-6">
                  <label className="form-label" style={{ fontWeight: '600' }}>Widget Title</label>
                  <input
                    type="text"
                    className="form-control"
                    value={title}
                    onChange={(e) => setTitle(e.target.value)}
                    placeholder="Enter widget title..."
                  />
                </div>
                <div className="col-md-6">
                  <label className="form-label" style={{ fontWeight: '600' }}>Widget Width</label>
                  <select
                    className="form-select"
                    value={width}
                    onChange={(e) => setWidth(e.target.value)}
                  >
                    <option value="col-md-4">Small (1/3 width)</option>
                    <option value="col-md-6">Medium (1/2 width)</option>
                    <option value="col-md-8">Large (2/3 width)</option>
                    <option value="col-md-12">Full width</option>
                  </select>
                </div>
                <div className="col-12">
                  <label className="form-label" style={{ fontWeight: '600' }}>Description (Optional)</label>
                  <textarea
                    className="form-control"
                    rows={2}
                    value={description}
                    onChange={(e) => setDescription(e.target.value)}
                    placeholder="Enter a brief description..."
                  />
                </div>
              </div>

              <hr className="my-4" />

              <label className="form-label" style={{ fontWeight: '600' }}>Chart Type</label>
              <div className="row g-3 mb-4">
                {[
                  { value: 'pie', label: 'Pie Chart', icon: '🥧' },
                  { value: 'bar', label: 'Bar Chart', icon: '📊' },
                  { value: 'line', label: 'Line Chart', icon: '📈' },
                  { value: 'number', label: 'Number Card', icon: '🔢' },
                  { value: 'table', label: 'Data Table', icon: '📋' }
                ].map(type => (
                  <div key={type.value} className="col-md-2">
                    <div
                      className={`card text-center h-100 ${widgetType === type.value ? 'border-primary' : ''}`}
                      style={{
                        cursor: 'pointer',
                        backgroundColor: widgetType === type.value ? '#e7f7ff' : 'white',
                        borderWidth: '2px',
                        borderRadius: '10px'
                      }}
                      onClick={() => setWidgetType(type.value as any)}
                    >
                      <div className="card-body py-3">
                        <div style={{ fontSize: '24px', marginBottom: '4px' }}>{type.icon}</div>
                        <small style={{ fontWeight: '500' }}>{type.label}</small>
                      </div>
                    </div>
                  </div>
                ))}
              </div>

              {(widgetType === 'pie' || widgetType === 'bar' || widgetType === 'line') && (
                <div className="row g-4">
                  <div className="col-md-6">
                    <label className="form-label" style={{ fontWeight: '600' }}>Name Field (X-axis / Labels)</label>
                    <select
                      className="form-select"
                      value={chartConfig.name_field || ''}
                      onChange={(e) => setChartConfig({ ...chartConfig, name_field: e.target.value })}
                    >
                      <option value="">Select field...</option>
                      {fields.map(f => (
                        <option key={f.alias} value={f.alias}>{f.alias}</option>
                      ))}
                    </select>
                  </div>
                  <div className="col-md-6">
                    <label className="form-label" style={{ fontWeight: '600' }}>Value Field (Y-axis / Values)</label>
                    <select
                      className="form-select"
                      value={chartConfig.value_field || ''}
                      onChange={(e) => setChartConfig({ ...chartConfig, value_field: e.target.value })}
                    >
                      <option value="">Select field...</option>
                      {fields.map(f => (
                        <option key={f.alias} value={f.alias}>{f.alias}</option>
                      ))}
                    </select>
                  </div>
                  <div className="col-md-6">
                    <div className="form-check">
                      <input
                        className="form-check-input"
                        type="checkbox"
                        id="showLegend"
                        checked={chartConfig.show_legend !== false}
                        onChange={(e) => setChartConfig({ ...chartConfig, show_legend: e.target.checked })}
                      />
                      <label className="form-check-label" htmlFor="showLegend">
                        Show Legend
                      </label>
                    </div>
                  </div>
                  <div className="col-md-6">
                    <div className="form-check">
                      <input
                        className="form-check-input"
                        type="checkbox"
                        id="showLabels"
                        checked={chartConfig.show_labels !== false}
                        onChange={(e) => setChartConfig({ ...chartConfig, show_labels: e.target.checked })}
                      />
                      <label className="form-check-label" htmlFor="showLabels">
                        Show Labels on Chart
                      </label>
                    </div>
                  </div>
                </div>
              )}

              {widgetType === 'number' && (
                <div className="row g-4">
                  <div className="col-md-6">
                    <label className="form-label" style={{ fontWeight: '600' }}>Value Field</label>
                    <select
                      className="form-select"
                      value={chartConfig.value_field || ''}
                      onChange={(e) => setChartConfig({ ...chartConfig, value_field: e.target.value })}
                    >
                      <option value="">Select field...</option>
                      {fields.map(f => (
                        <option key={f.alias} value={f.alias}>{f.alias}</option>
                      ))}
                    </select>
                  </div>
                </div>
              )}
            </div>
          )}

          {/* Step 5: Preview & Save */}
          {activeStep === 4 && (
            <div>
              <div className="d-flex justify-content-between align-items-center mb-4">
                <h5 className="mb-0" style={{ fontWeight: '600', color: '#2c3e50' }}>
                  Preview & Save
                </h5>
                <button
                  className="btn btn-info btn-sm"
                  onClick={handlePreview}
                  disabled={previewLoading || fields.length === 0}
                >
                  {previewLoading ? 'Loading...' : 'Refresh Preview'}
                </button>
              </div>

              {previewError && (
                <div className="alert alert-danger" style={{ borderRadius: '8px' }}>
                  <strong>Error:</strong> {previewError}
                </div>
              )}

              <div
                className="card mb-4"
                style={{ borderRadius: '12px', border: 'none', boxShadow: '0 2px 12px rgba(0,0,0,0.08)' }}
              >
                <div
                  className="card-header"
                  style={{
                    backgroundColor: '#00BAED',
                    color: 'white',
                    borderRadius: '12px 12px 0 0',
                    padding: '16px 20px'
                  }}
                >
                  <h6 className="mb-0" style={{ fontWeight: '600' }}>
                    {title || 'Untitled Widget'}
                  </h6>
                  {description && <small style={{ opacity: 0.9 }}>{description}</small>}
                </div>
                <div className="card-body" style={{ minHeight: '300px' }}>
                  {previewLoading ? (
                    <div className="text-center py-5">
                      <div className="spinner-border" style={{ color: '#00BAED' }}></div>
                      <p className="mt-3 text-muted">Loading preview...</p>
                    </div>
                  ) : (
                    <WidgetPreview
                      data={previewData}
                      widgetType={widgetType}
                      chartConfig={chartConfig}
                      title={title}
                    />
                  )}
                </div>
              </div>

              {/* Configuration Summary */}
              <div className="card" style={{ borderRadius: '10px', backgroundColor: '#f8f9fa' }}>
                <div className="card-body">
                  <h6 style={{ fontWeight: '600', marginBottom: '12px' }}>Configuration Summary</h6>
                  <div className="row g-3" style={{ fontSize: '13px' }}>
                    <div className="col-md-4">
                      <strong>Tables:</strong> {getAllAvailableTables().map(t => metadata?.tables[t]?.display_name || t).join(', ')}
                    </div>
                    <div className="col-md-4">
                      <strong>Fields:</strong> {fields.map(f => f.alias).join(', ') || 'None'}
                    </div>
                    <div className="col-md-4">
                      <strong>Filters:</strong> {conditions.length || 'None'}
                    </div>
                  </div>
                </div>
              </div>
            </div>
          )}

        </div>
      </div>

      {/* Footer */}
      <div className="d-flex justify-content-between mt-4">
        <button
          className="btn btn-outline-secondary"
          onClick={() => setActiveStep(Math.max(0, activeStep - 1))}
          disabled={activeStep === 0}
        >
          Previous
        </button>
        <div className="d-flex gap-2">
          {activeStep < steps.length - 1 ? (
            <button
              className="btn btn-primary"
              onClick={() => setActiveStep(activeStep + 1)}
            >
              Next
            </button>
          ) : (
            <button
              className="btn btn-success"
              onClick={handleSave}
              disabled={saving || !title.trim() || fields.length === 0}
              style={{ minWidth: '120px' }}
            >
              {saving ? 'Saving...' : (widget?.id ? 'Update Widget' : 'Save Widget')}
            </button>
          )}
        </div>
      </div>
    </div>
  )
}
