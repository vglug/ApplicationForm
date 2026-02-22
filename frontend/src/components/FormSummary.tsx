import React from 'react'

type Field = any
type Section = { key: string, label: string, fields: Field[] }

type FormSummaryProps = {
  formConfig: any
  formData: any
  onEdit: () => void
  onConfirm: () => void
}

export default function FormSummary({ formConfig, formData, onEdit, onConfirm }: FormSummaryProps) {
  const sections: Section[] = formConfig.sections

  const formatValue = (field: Field, value: any) => {
    if (value === undefined || value === null || value === '') {
      return <span style={{ color: '#999', fontStyle: 'italic' }}>Not provided</span>
    }

    if (field.type === 'boolean') {
      return value ? 'Yes' : 'No'
    }

    if (field.type === 'date' && value) {
      return new Date(value).toLocaleDateString('en-US', {
        year: 'numeric',
        month: 'long',
        day: 'numeric'
      })
    }

    if (Array.isArray(value)) {
      return value.join(', ')
    }

    return String(value)
  }

  return (
    <div>
      <div className="alert alert-info mb-4" style={{ backgroundColor: '#e7f7ff', borderColor: '#00BAED' }}>
        <strong>Review Your Submission</strong>
        <p className="mb-0 mt-2">Please review all the information below carefully before final submission.</p>
      </div>

      {sections.map((section, sectionIdx) => (
        <div key={section.key} className="mb-4">
          <h5 className="mb-3 pb-2" style={{
            borderBottom: '2px solid #00BAED',
            color: '#00BAED',
            fontWeight: '600'
          }}>
            {section.label}
          </h5>

          <div className="row">
            {section.fields.map((field, fieldIdx) => {
              // Check if field should be shown based on condition
              if (field.condition) {
                try {
                  const conditionMet = new Function(...Object.keys(formData), `return ${field.condition}`)(...Object.values(formData))
                  if (!conditionMet) return null
                } catch (e) {
                  return null
                }
              }

              return (
                <div key={field.actual_name || fieldIdx} className="col-md-6 mb-3">
                  <div className="p-3" style={{
                    backgroundColor: '#f8f9fa',
                    borderRadius: '8px',
                    border: '1px solid #e0e0e0'
                  }}>
                    <div style={{
                      fontSize: '13px',
                      fontWeight: '600',
                      color: '#666',
                      marginBottom: '8px',
                      textTransform: 'uppercase',
                      letterSpacing: '0.5px'
                    }}>
                      {field.label}
                      {field.mandatory && <span style={{ color: '#dc3545' }}> *</span>}
                    </div>
                    <div style={{
                      fontSize: '15px',
                      fontWeight: '500',
                      color: '#333'
                    }}>
                      {formatValue(field, formData[field.actual_name])}
                    </div>
                  </div>
                </div>
              )
            })}
          </div>
        </div>
      ))}

      <div className="d-flex justify-content-between mt-4 pt-3" style={{ borderTop: '2px solid #e0e0e0' }}>
        <button
          type="button"
          className="btn btn-outline-secondary"
          onClick={onEdit}
        >
          ← Edit Form
        </button>
        <button
          type="button"
          className="btn"
          onClick={onConfirm}
          style={{
            backgroundColor: '#00BAED',
            borderColor: '#00BAED',
            color: 'white'
          }}
        >
          Confirm & Submit
        </button>
      </div>
    </div>
  )
}
