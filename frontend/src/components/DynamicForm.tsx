import React, { useEffect, useMemo, useState } from 'react'
import { useForm, Controller } from 'react-hook-form'
import FieldRenderer from './FieldRenderer'
import ProgressIndicator from './ProgressIndicator'
import FormSummary from './FormSummary'

type Field = any
type Section = { key: string, label: string, fields: Field[] }

interface DynamicFormProps {
  formConfig: any
  onSubmit: (data: any) => Promise<void> | void
  prefilledFields?: Record<string, any>  // Read-only fields (e.g., verified email)
  initialData?: Record<string, any>  // Editable initial values (e.g., from existing application)
}

export default function DynamicForm({ formConfig, onSubmit, prefilledFields = {}, initialData = {} }: DynamicFormProps) {
  const sections: Section[] = formConfig.sections
  const [current, setCurrent] = useState(0)
  const [showSummary, setShowSummary] = useState(false)
  const [isInitialized, setIsInitialized] = useState(false)
  const { control, handleSubmit, watch, reset, getValues, setValue, formState: { errors, touchedFields } } = useForm({mode:'onBlur'})

  // Initialize form with initial data and prefilled fields
  useEffect(() => {
    if (isInitialized) return

    const hasInitialData = initialData && Object.keys(initialData).length > 0

    if (hasInitialData) {
      // Edit mode: merge initial data with prefilled fields
      const mergedData = { ...initialData, ...prefilledFields }
      reset(mergedData)
      setIsInitialized(true)
    } else {
      // New form: just set prefilled fields
      if (prefilledFields && Object.keys(prefilledFields).length > 0) {
        Object.entries(prefilledFields).forEach(([fieldName, value]) => {
          if (value !== undefined && value !== null) {
            setValue(fieldName, value)
          }
        })
      }
      setIsInitialized(true)
    }
  }, [prefilledFields, initialData, setValue, reset, isInitialized])

  useEffect(()=>{
    // Only load draft if no initial data (new application) and not initialized
    if (initialData && Object.keys(initialData).length > 0) {
      return // Skip draft loading for edit mode
    }
    if (isInitialized) return

    const draft = localStorage.getItem(`draft_${formConfig.title}`)
    if(draft){
      try{
        const draftData = JSON.parse(draft)
        // Don't overwrite prefilled fields from draft
        if (prefilledFields) {
          Object.keys(prefilledFields).forEach(key => {
            if (prefilledFields[key]) {
              draftData[key] = prefilledFields[key]
            }
          })
        }
        reset(draftData)
      }catch(e){/* ignore */}
    }
  },[formConfig, reset, prefilledFields, initialData])

  useEffect(()=>{
    const id = setInterval(()=>{
      const vals = getValues()
      localStorage.setItem(`draft_${formConfig.title}`, JSON.stringify(vals))
    }, 30000)
    return ()=>clearInterval(id)
  },[getValues, formConfig.title])

  const values = watch()

  const currentSectionFields = sections[current].fields
  const incompleteMandatory = currentSectionFields.filter(f => {
    if(!f.mandatory) return false
    const val = values[f.actual_name]
    return !val || val === '' || (Array.isArray(val) && val.length === 0)
  })
  const canGoNext = incompleteMandatory.length === 0

  const goNext = () => {
    if(canGoNext) {
      // Additional validation for basic_info section
      if (sections[current].key === 'basic_info') {
        const contact = values['contact']
        const parentContact = values['parent_contact']

        if (contact && parentContact && contact === parentContact) {
          alert('Parent/Guardian number must be different from your contact number')
          return
        }
      }

      if (current === sections.length - 1) {
        // Last section, show summary
        setShowSummary(true)
      } else {
        setCurrent((s)=>Math.min(s+1, sections.length-1))
      }
    } else {
      alert('Please fill all required fields in this section')
    }
  }
  const goBack = () => setCurrent((s)=>Math.max(s-1,0))

  const handleEditFromSummary = () => {
    setShowSummary(false)
    setCurrent(sections.length - 1)
  }

  const handleConfirmSubmit = async () => {
    const data = getValues()
    localStorage.removeItem(`draft_${formConfig.title}`)
    await onSubmit(data)
  }

  if (showSummary) {
    return (
      <FormSummary
        formConfig={formConfig}
        formData={getValues()}
        onEdit={handleEditFromSummary}
        onConfirm={handleConfirmSubmit}
      />
    )
  }

  return (
    <form>
      <ProgressIndicator sections={sections} currentSectionIndex={current} completedSections={[]} sectionsWithErrors={[]} onSectionClick={(i)=>{ if(i<=current) setCurrent(i)}} />

      <h5 className="mt-4">{sections[current].label}</h5>
      <div className="row">
        {sections[current].fields.map((field:Field, idx:number)=> {
          const isReadOnly = !!(prefilledFields && prefilledFields[field.actual_name])
          return (
            <div className="col-12 mb-3" key={field.actual_name || idx}>
              <Controller
                name={field.actual_name}
                control={control}
                defaultValue={field.default !== undefined ? field.default : (field.type === 'boolean' ? false : '')}
                rules={{ required: field.mandatory ? 'Required' : false, maxLength: field.type==='text' ? 500 : undefined }}
                render={({ field: ctrl }) => (
                  <FieldRenderer
                    field={field}
                    control={control}
                    value={ctrl.value}
                    onChange={isReadOnly ? () => {} : ctrl.onChange}
                    error={touchedFields[field.actual_name] ? errors[field.actual_name] : undefined}
                    watch={watch}
                    readOnly={isReadOnly}
                  />
                )}
              />
            </div>
          )
        })}
      </div>

      <div className="d-flex justify-content-between mt-3">
        <button type="button" className="btn btn-light" onClick={goBack} disabled={current===0}>Back</button>
        {current < sections.length-1 ? (
          <button type="button" className="btn btn-primary" onClick={goNext} disabled={!canGoNext} style={{backgroundColor:'#00BAED', borderColor:'#00BAED', opacity: canGoNext ? 1 : 0.5}}>Next</button>
        ) : (
          <button type="button" className="btn btn-primary" onClick={goNext} disabled={!canGoNext} style={{backgroundColor:'#00BAED', borderColor:'#00BAED', opacity: canGoNext ? 1 : 0.5}}>Review & Submit</button>
        )}
      </div>
    </form>
  )
}
