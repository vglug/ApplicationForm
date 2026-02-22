// Form configuration validation schema
export const FORM_VALIDATION_SCHEMA = {
  sections: {
    basic_info: {
      required: true,
      requiredFields: [
        'first_name',
        'last_name',
        'dob',
        'email',
        'contact',
        'contact_as_whatsapp',
        'watsapp_contact',
        'parent_contact',
        'differently_abled'
      ]
    },
    educational_info: {
      required: true,
      requiredFields: [
        '5_to_8_school',
        '5_to_8_govt_school',
        '9_to_10_school',
        '9_to_10_govt_school',
        '11_to_12_school',
        '11_to_12_govt_school',
        'degree',
        'department',
        'year',
        'passed_out_year'
      ]
    },
    family_info: {
      required: true,
      requiredFields: [
        'raised_by_parents',
        'family_members_count'
      ]
    },
    income_info: {
      required: true,
      requiredFields: [
        'own_house_or_rental',
        'house_type',
        'family_income'
      ]
    }
  }
}

interface ValidationError {
  section?: string
  field?: string
  message: string
}

export function validateFormConfig(config: any, validationSchema?: any): { valid: boolean; errors: ValidationError[] } {
  const errors: ValidationError[] = []

  // If no validation schema provided or it's empty, skip validation
  if (!validationSchema || !validationSchema.sections || Object.keys(validationSchema.sections).length === 0) {
    return { valid: true, errors: [] }
  }

  const schema = validationSchema

  // Check if config has required top-level properties
  if (!config.title) {
    errors.push({ message: 'Form configuration must have a "title" field' })
  }

  if (!config.sections || !Array.isArray(config.sections)) {
    errors.push({ message: 'Form configuration must have a "sections" array' })
    return { valid: false, errors }
  }

  // Check required sections
  const sectionKeys = config.sections.map((s: any) => s.key)
  const requiredSections = Object.keys(schema.sections)

  for (const requiredSection of requiredSections) {
    if (!sectionKeys.includes(requiredSection)) {
      errors.push({
        section: requiredSection,
        message: `Missing required section: "${requiredSection}"`
      })
    }
  }

  // Validate each section
  for (const section of config.sections) {
    if (!section.key) {
      errors.push({ message: 'Each section must have a "key" field' })
      continue
    }

    if (!section.label) {
      errors.push({
        section: section.key,
        message: `Section "${section.key}" must have a "label" field`
      })
    }

    if (!section.fields || !Array.isArray(section.fields)) {
      errors.push({
        section: section.key,
        message: `Section "${section.key}" must have a "fields" array`
      })
      continue
    }

    // Check if this section has validation requirements
    const sectionValidation = schema.sections[section.key as keyof typeof schema.sections]

    if (sectionValidation && sectionValidation.requiredFields && Array.isArray(sectionValidation.requiredFields)) {
      const fieldActualNames = section.fields.map((f: any) => f.actual_name)

      for (const requiredField of sectionValidation.requiredFields) {
        if (!fieldActualNames.includes(requiredField)) {
          errors.push({
            section: section.key,
            field: requiredField,
            message: `Section "${section.key}" is missing required field: "${requiredField}"`
          })
        }
      }
    }

    // Validate field structure
    for (const field of section.fields) {
      if (!field.actual_name) {
        errors.push({
          section: section.key,
          message: `Field in section "${section.key}" is missing "actual_name"`
        })
      }

      if (!field.label) {
        errors.push({
          section: section.key,
          field: field.actual_name,
          message: `Field "${field.actual_name}" in section "${section.key}" is missing "label"`
        })
      }

      if (!field.type) {
        errors.push({
          section: section.key,
          field: field.actual_name,
          message: `Field "${field.actual_name}" in section "${section.key}" is missing "type"`
        })
      }

      // Validate field types
      const validTypes = ['text', 'date', 'boolean', 'select', 'number', 'textarea']
      if (field.type && !validTypes.includes(field.type)) {
        errors.push({
          section: section.key,
          field: field.actual_name,
          message: `Field "${field.actual_name}" has invalid type: "${field.type}". Must be one of: ${validTypes.join(', ')}`
        })
      }

      // Check if select type has options
      if (field.type === 'select' && (!field.options || !Array.isArray(field.options))) {
        errors.push({
          section: section.key,
          field: field.actual_name,
          message: `Field "${field.actual_name}" with type "select" must have an "options" array`
        })
      }

      // Check mandatory field
      if (field.mandatory === undefined) {
        errors.push({
          section: section.key,
          field: field.actual_name,
          message: `Field "${field.actual_name}" must have a "mandatory" property (true or false)`
        })
      }
    }
  }

  return {
    valid: errors.length === 0,
    errors
  }
}

export function formatValidationErrors(errors: ValidationError[]): string {
  if (errors.length === 0) return ''

  let message = 'Form validation failed:\n\n'

  errors.forEach((error, index) => {
    if (error.section && error.field) {
      message += `${index + 1}. [${error.section} → ${error.field}] ${error.message}\n`
    } else if (error.section) {
      message += `${index + 1}. [${error.section}] ${error.message}\n`
    } else {
      message += `${index + 1}. ${error.message}\n`
    }
  })

  return message
}
