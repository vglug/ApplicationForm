import React from 'react'

interface FieldRendererProps {
  field: any
  value: any
  onChange: any
  error: any
  watch: any
  readOnly?: boolean
  control?: any
}

export default function FieldRenderer({ field, value, onChange, error, watch, readOnly = false }: FieldRendererProps) {
  const visible = (()=>{
    if(!field.condition) return true
    try{
      const expr = field.condition.replace(/==/g,'===')
      const vals = watch()
      // eslint-disable-next-line no-new-func
      return Function('values', `with(values){ return ${expr} }`)(vals)
    }catch(e){ return true }
  })()

  if(!visible) return null

  const label = <label className="form-label">{field.label}{field.mandatory? ' *':''}</label>

  // Read-only badge for verified fields
  const verifiedBadge = readOnly ? (
    <span className="badge bg-success ms-2" style={{ fontSize: '10px', verticalAlign: 'middle' }}>
      Verified
    </span>
  ) : null

  if(field.type === 'text'){
    return (
      <div>
        <label className="form-label">
          {field.label}{field.mandatory? ' *':''}
          {verifiedBadge}
        </label>
        <input
          className={`form-control ${error? 'is-invalid':''} ${readOnly ? 'bg-light' : ''}`}
          value={value||''}
          onChange={e=>onChange(e.target.value)}
          maxLength={500}
          readOnly={readOnly}
          disabled={readOnly}
          style={readOnly ? { cursor: 'not-allowed', backgroundColor: '#e9ecef' } : undefined}
        />
        {readOnly && (
          <small className="text-muted">This field is verified and cannot be changed</small>
        )}
        {error && <div className="invalid-feedback">{error.message || 'Invalid'}</div>}
      </div>
    )
  }

  if(field.type === 'date'){
    return (
      <div>
        {label}
        <input type="date" className={`form-control ${error? 'is-invalid':''}`} value={value||''} onChange={e=>onChange(e.target.value)} />
        {error && <div className="invalid-feedback">{error.message || 'Invalid'}</div>}
      </div>
    )
  }

  if(field.type === 'boolean'){
    return (
      <div className="form-check">
        <input className="form-check-input" type="checkbox" checked={!!value} onChange={e=>onChange(e.target.checked)} id={field.actual_name} />
        <label className="form-check-label" htmlFor={field.actual_name}>{field.label}</label>
      </div>
    )
  }

  if(field.type === 'select'){
    return (
      <div>
        {label}
        <select className={`form-select ${error? 'is-invalid':''}`} value={value||''} onChange={e=>onChange(e.target.value)}>
          <option value="">Choose...</option>
          {(field.options||[]).map((o:any)=> <option key={o} value={o}>{o}</option>)}
        </select>
        {error && <div className="invalid-feedback">{error.message || 'Invalid'}</div>}
      </div>
    )
  }

  if(field.type === 'number'){
    return (
      <div>
        {label}
        <input
          type="number"
          className={`form-control ${error? 'is-invalid':''}`}
          value={value||''}
          onChange={e=>onChange(e.target.value)}
          min="0"
        />
        {error && <div className="invalid-feedback">{error.message || 'Invalid'}</div>}
      </div>
    )
  }

  if(field.type === 'textarea'){
    return (
      <div>
        {label}
        <textarea
          className={`form-control ${error? 'is-invalid':''}`}
          value={value||''}
          onChange={e=>onChange(e.target.value)}
          rows={4}
          maxLength={2000}
        />
        {error && <div className="invalid-feedback">{error.message || 'Invalid'}</div>}
      </div>
    )
  }

  return null
}
