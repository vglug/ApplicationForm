// VGLUG Form 2025 Validation Schema
// This schema defines the required sections and fields for the VGLUG application form

export const VGLUG_FORM_VALIDATION_SCHEMA = {
  sections: {
    basic_info: {
      required: true,
      requiredFields: [
        'full_name',
        'dob',
        'gender',
        'email',
        'differently_abled',
        'contact',
        'contact_as_whatsapp',
        'whatsapp_contact',  // Conditionally mandatory via custom validation
        'has_laptop'
      ]
    },
    educational_info: {
      required: true,
      requiredFields: [
        'college_name',
        'degree',
        'department',
        'year',
        'tamil_medium',
        '6_to_8_govt_school',
        '6_to_8_school_name',
        '9_to_10_govt_school',
        '9_to_10_school_name',
        '11_to_12_govt_school',
        '11_to_12_school_name',
        'received_scholarship',
        'transport_mode',
        'vglug_applied_before'
      ]
    },
    family_info: {
      required: true,
      requiredFields: [
        'family_environment',
        'single_parent_info',  // Conditionally mandatory when family_environment == 'Raised by Single Parent'
        'family_members_count',
        'family_members_details',
        'earning_members_count',
        'earning_members_details'
      ]
    },
    income_info: {
      required: true,
      requiredFields: [
        'house_ownership',
        'full_address',
        'pincode',
        'district'
      ]
    },
    course_info: {
      required: true,
      requiredFields: [
        'preferred_course',
        'training_benefit',
        'heard_about_vglug',
        'participated_in_vglug_events'
      ]
    }
  }
}

export interface ValidationError {
  section?: string
  field?: string
  message: string
}

/**
 * Validates a complete form configuration against the VGLUG schema
 */
export function validateVGLUGFormConfig(config: any): ValidationError[] {
  const errors: ValidationError[] = []

  // Check if config has sections
  if (!config.sections || !Array.isArray(config.sections)) {
    errors.push({ message: 'Form must have a sections array' })
    return errors
  }

  // Check for required sections
  const sectionKeys = config.sections.map((s: any) => s.key)
  const requiredSections = Object.keys(VGLUG_FORM_VALIDATION_SCHEMA.sections)

  requiredSections.forEach(reqSection => {
    if (!sectionKeys.includes(reqSection)) {
      errors.push({
        section: reqSection,
        message: `Missing required section: ${reqSection}`
      })
    }
  })

  // Validate each section
  config.sections.forEach((section: any) => {
    const sectionSchema = VGLUG_FORM_VALIDATION_SCHEMA.sections[section.key as keyof typeof VGLUG_FORM_VALIDATION_SCHEMA.sections]

    if (!sectionSchema) {
      errors.push({
        section: section.key,
        message: `Unknown section: ${section.key}`
      })
      return
    }

    // Check for required fields in section
    const fieldNames = section.fields.map((f: any) => f.actual_name)

    sectionSchema.requiredFields.forEach((reqField: string) => {
      if (!fieldNames.includes(reqField)) {
        errors.push({
          section: section.key,
          field: reqField,
          message: `Missing required field: ${reqField} in section ${section.key}`
        })
      }
    })
  })

  return errors
}

/**
 * Validates form data submitted by a user
 */
export function validateVGLUGFormData(formData: any, config: any): ValidationError[] {
  const errors: ValidationError[] = []

  config.sections.forEach((section: any) => {
    section.fields.forEach((field: any) => {
      // Skip validation if field has condition and it's not met
      if (field.condition) {
        try {
          const conditionMet = evaluateCondition(field.condition, formData)
          if (!conditionMet) return
        } catch (e) {
          // If condition evaluation fails, skip validation
          return
        }
      }

      // Check if mandatory field is filled
      if (field.mandatory) {
        const value = formData[field.actual_name]
        if (value === undefined || value === null || value === '') {
          errors.push({
            section: section.key,
            field: field.actual_name,
            message: `${field.label} is required`
          })
        }
      }
    })
  })

  return errors
}

/**
 * Simple condition evaluator
 */
function evaluateCondition(condition: string, formData: any): boolean {
  try {
    // Replace == with ===
    const expr = condition.replace(/==/g, '===')
    // Create a function that evaluates the expression with form data
    const func = new Function('data', `with(data) { return ${expr} }`)
    return func(formData)
  } catch (e) {
    console.error('Error evaluating condition:', condition, e)
    return true // Default to showing field if condition fails
  }
}

/**
 * Formats validation errors into a readable string
 */
export function formatValidationErrors(errors: ValidationError[]): string {
  if (errors.length === 0) return ''

  let message = 'Validation Errors:\n\n'

  errors.forEach((error, index) => {
    if (error.field) {
      message += `${index + 1}. [${error.section}/${error.field}] ${error.message}\n`
    } else if (error.section) {
      message += `${index + 1}. [${error.section}] ${error.message}\n`
    } else {
      message += `${index + 1}. ${error.message}\n`
    }
  })

  return message
}

/**
 * Check if all required sections are present in form data
 */
export function checkRequiredSections(formData: any, config: any): string[] {
  const missingSections: string[] = []

  const requiredSections = Object.keys(VGLUG_FORM_VALIDATION_SCHEMA.sections)

  requiredSections.forEach(sectionKey => {
    const section = config.sections.find((s: any) => s.key === sectionKey)
    if (!section) return

    const hasAnyData = section.fields.some((field: any) => {
      const value = formData[field.actual_name]
      return value !== undefined && value !== null && value !== ''
    })

    if (!hasAnyData) {
      missingSections.push(section.label)
    }
  })

  return missingSections
}
