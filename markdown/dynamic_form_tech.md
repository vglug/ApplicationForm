# Technical Specification Document
## Dynamic Form Builder (Multi-Step Wizard)
### Educational Application Form System

---

## 1. PROJECT OVERVIEW

### 1.1 Project Goal

To develop a robust and flexible system that allows for the creation and deployment of complex web forms by defining their structure entirely through a JSON schema served from the backend. The frontend, built with React, will dynamically render the form based on this JSON definition, presenting it as a multi-step wizard with support for local data persistence and conditional fields.

### 1.2 Target Users

End-users filling out educational application forms including undergraduate applications, scholarship applications, graduate program applications, and other academic enrollment processes.

### 1.3 Primary Use Cases

Educational institutions requiring students and applicants to complete structured multi-step application forms with validation, conditional logic, and draft saving capabilities.

---

## 2. SYSTEM ARCHITECTURE

### 2.1 Technology Stack

| Component | Technology |
|-----------|-----------|
| **Frontend Framework** | React with TypeScript |
| **Form Management** | React Hook Form or Formik |
| **UI Library** | Tailwind CSS (mobile-responsive, modern web standards) |
| **Data Persistence** | Browser Local Storage API (plain JSON, no encryption) |
| **Backend API** | Node.js (Express) or Python (Django/Flask) |
| **Database** | PostgreSQL |

### 2.2 System Components

#### 2.2.1 Frontend Components

• **DynamicForm Component:** Core React component that parses JSON and renders form elements

• **Multi-Step Wizard:** Section-based navigation with progress indicator

• **Conditional Field Renderer:** Evaluates conditions and shows/hides fields dynamically

• **Validation Engine:** Client-side validation for mandatory fields and format validation

• **Local Storage Manager:** Handles draft saving, loading, and expiration

#### 2.2.2 Backend Components

• **Form Configuration API:** Serves JSON schema based on year and is_active status

• **Email Validation API:** Validates email availability in real-time

• **Form Submission API:** Receives and stores completed form data

• **Email Notification Service:** Sends confirmation emails with application ID

• **Rate Limiting Service:** Prevents spam submissions

---

## 3. FEATURE SPECIFICATIONS

### 3.1 Supported Field Types

| Field Type | Description | UI Component |
|------------|-------------|--------------|
| **text** | String inputs (names, emails, contacts). Max 500 characters. Supports email and phone validation. | Text Input |
| **date** | Calendar inputs for dates like DOB. Format: DD/MM/YYYY (Indian standard) | Date Picker |
| **boolean** | Yes/No questions (e.g., "Is this the WhatsApp number?") | Single Checkbox |
| **select** | Dropdown with predefined options. Supports single-select and multi-select with searchable capability. | Searchable Dropdown |

### 3.2 Conditional Logic

The system supports conditional field rendering based on the values of other fields in the form. Conditions are evaluated in real-time as users interact with the form.

#### 3.2.1 Condition Syntax

• **Maximum Conditions:** Up to 5 conditions per field

• **Supported Operators:** AND, OR, ==, !=

• **Example:** `"age >= 18 AND country == 'India' OR has_guardian == true"`

• **Undefined Field Handling:** If a referenced field doesn't exist or is in a future section, condition evaluates to false (field hidden)

#### 3.2.2 Conditional Field Behavior

• When condition is TRUE: Field is rendered and included in validation/submission

• When condition is FALSE: Field is hidden and excluded from processing

• When dependency changes: Previously filled data in now-hidden fields is automatically cleared

### 3.3 Validation Rules

#### 3.3.1 Mandatory Field Validation

Fields marked with `mandatory: true` must be filled before proceeding to the next section or submitting the form.

#### 3.3.2 Format Validation

| Field Type | Validation Rules |
|------------|------------------|
| **Email** | RFC 5322 email format validation + real-time availability check on field blur |
| **Phone Number** | Indian 10-digit format (e.g., 9876543210) |
| **Text Fields** | Maximum 500 characters per field |

#### 3.3.3 Validation Timing

• **Inline Validation:** Errors displayed below each field as user types or leaves field

• **Section Validation:** Triggered when clicking 'Next' or 'Back' buttons

• **Email Availability:** Checked on field blur with immediate error display

• **Final Validation:** Comprehensive check on submit across all visible, mandatory fields

---

## 4. MULTI-STEP WIZARD FLOW

### 4.1 Section Management

The form consists of a maximum of 5 sections. Each section represents one step in the wizard, displaying only the fields within that section at any given time.

### 4.2 Progress Indicator

• **Type:** Linear step indicator with numbered circles (1, 2, 3, 4, 5)

• **Display:** Shows section names and current progress

• **Completed Sections:** Highlighted with distinct visual styling

• **Error Highlighting:** Sections with validation errors are highlighted in progress indicator

### 4.3 Navigation Controls

#### 4.3.1 Forward Navigation

• 'Next' button displayed on all sections except the last

• Clicking 'Next' validates current section before proceeding

• If validation passes, data is saved to Local Storage and next section is rendered

• Users cannot access next section without filling current section

#### 4.3.2 Backward Navigation

• 'Back' button displayed on all sections except the first

• Sequential navigation: Users click 'Back' to move to previous section

• Direct navigation: Once sections are completed, users can click on previous steps in progress indicator to jump directly

• When dependency field changes: Data in conditional fields that become hidden is automatically cleared

#### 4.3.3 Form Submission

• 'Submit' button replaces 'Next' on the final section

• No review step - submission occurs directly from last section

• Triggers comprehensive validation across all sections

• On validation errors: Navigates user to first section with errors and highlights affected sections

• On success: Sends data to backend and clears Local Storage draft

---

## 5. DATA PERSISTENCE & DRAFT MANAGEMENT

### 5.1 Local Storage Strategy

• **Storage Method:** Browser Local Storage (browser-specific, not user-specific)

• **Data Format:** Plain JSON (no encryption)

• **Draft Key:** Based on form identifier only

• **Scope:** Any user on the same browser sees the same draft

• **Expiration:** Drafts expire after 10 days of inactivity

### 5.2 Auto-Save Functionality

• **Trigger:** Every 30 seconds or on field blur

• **User Feedback:** Transparent to user (no explicit 'Save Draft' button)

• **Additional Saves:** Data saved when clicking 'Next' or 'Back'

• **Timestamp:** Last modification timestamp stored but not displayed to user

### 5.3 Draft Loading

• On page load, check Local Storage for existing draft

• If draft exists and is within 10 days: Pre-fill form fields with saved data

• If draft expired: Discard and start fresh

• Version mismatch: If form configuration changed, discard old draft and start fresh

### 5.4 Draft Cleanup

• After successful submission: Draft is immediately cleared from Local Storage

• Expired drafts: Automatically removed on next page load

---

## 6. API SPECIFICATIONS

### 6.1 Form Configuration Endpoint

**GET /api/form-config**

Returns the active form configuration based on year and is_active flag. Backend determines which form to serve internally.

**Response Format:**
```json
{
  "title": "Form Title",
  "sections": {
    "section_key": {
      "label": "Section Label",
      "fields": [...]
    }
  }
}
```

### 6.2 Email Validation Endpoint

**POST /api/validate-email**

Validates email format (RFC 5322) and checks availability. Called on field blur for real-time validation.

**Request:**
```json
{
  "email": "user@example.com"
}
```

**Response:**
```json
{
  "valid": true/false,
  "available": true/false,
  "message": "Error message if any"
}
```

### 6.3 Form Submission Endpoint

**POST /api/form-submit**

Receives completed form data grouped by sections. Backend validates, stores data, generates application ID, and triggers confirmation email.

**Request Structure:**
```json
{
  "personal_info": {
    "name": "...",
    "email": "..."
  },
  "education": {
    "school": "..."
  }
}
```

**Success Response (200):**
```json
{
  "success": true,
  "application_id": "BACKEND-GENERATED-ID",
  "message": "Application submitted successfully"
}
```

**Error Response (400/500):**
```json
{
  "success": false,
  "error": "Error description"
}
```

### 6.4 Rate Limiting

Backend implements rate limiting to prevent spam submissions. Specific limits defined at infrastructure level.

### 6.5 HTTP Status Codes

• **200:** Successful request

• **400:** Bad request (validation errors, malformed data)

• **429:** Too many requests (rate limit exceeded)

• **500:** Internal server error

---

## 7. USER EXPERIENCE SPECIFICATIONS

### 7.1 Loading States

• **Initial Load:** Display loading spinner until form configuration is fetched

• **Email Validation:** Show inline loading indicator during availability check

• **Form Submission:** Disable submit button and show loading state during API call

### 7.2 Error Handling

#### 7.2.1 Network Errors

• Display error message to user

• Provide 'Retry' button to attempt submission again

• Data remains in Local Storage until successful submission

#### 7.2.2 Validation Errors

• Inline errors displayed below each field as user types or leaves field

• On submit with errors: Navigate to first section with errors

• Highlight affected sections in progress indicator

#### 7.2.3 Email Availability Error

If email is already registered, show error immediately on field blur. Form cannot be stored or submitted with unavailable email.

### 7.3 Post-Submission Experience

• **Success View:** Display application ID generated by backend

• **Email Confirmation:** User receives confirmation email with application ID

• **Read-Only View:** User can view submitted data in collapsible sections

• **Re-access:** If user accesses form again, show read-only summary of previous submission

### 7.4 Accessibility

• **Keyboard Navigation:** Full support for Tab, Enter, and Arrow keys

• **Semantic HTML:** Proper use of form elements, labels, and ARIA attributes

• **Mobile Responsive:** Optimized for mobile devices using modern web standards

---

## 8. JSON SCHEMA STRUCTURE

### 8.1 Top-Level Structure

```json
{
  "title": "string",
  "sections": { ... }
}
```

Metadata fields like version, description, or timestamps are not included. Only title and sections are required.

### 8.2 Section Structure

```json
"section_key": {
  "label": "Section Display Name",
  "fields": [ ... ]
}
```

### 8.3 Field Structure

| Property | Description | Required |
|----------|-------------|----------|
| **label** | Display label shown to user | Yes |
| **actual_name** | Backend data key for submission | Yes |
| **type** | Field type: text \| date \| boolean \| select | Yes |
| **mandatory** | true \| false - Whether field is required | Yes |
| **condition** | Conditional expression (max 5 conditions with AND/OR) | No |
| **options** | Array of options for select type. Multi-select values stored as array. | For select |
| **validation_type** | Optional: 'email' or 'phone' for format validation | No |
| **multiselect** | true \| false - For select fields, enables multi-selection | For select |

### 8.4 Example JSON Configuration

```json
{
  "title": "University Application Form 2025",
  "sections": {
    "personal_info": {
      "label": "Personal Information",
      "fields": [
        {
          "label": "Full Name",
          "actual_name": "full_name",
          "type": "text",
          "mandatory": true
        },
        {
          "label": "Email Address",
          "actual_name": "email",
          "type": "text",
          "mandatory": true,
          "validation_type": "email"
        },
        {
          "label": "Contact Number",
          "actual_name": "contact",
          "type": "text",
          "mandatory": true,
          "validation_type": "phone"
        },
        {
          "label": "Is this your WhatsApp number?",
          "actual_name": "contact_as_whatsapp",
          "type": "boolean",
          "mandatory": false
        },
        {
          "label": "WhatsApp Number",
          "actual_name": "whatsapp_number",
          "type": "text",
          "mandatory": true,
          "validation_type": "phone",
          "condition": "contact_as_whatsapp == false"
        }
      ]
    }
  }
}
```

---

## 9. DATA SUBMISSION FORMAT

### 9.1 Submission Structure

Form data is submitted to the backend grouped by sections. Each section becomes a top-level object containing its fields.

### 9.2 Example Submission Payload

```json
{
  "personal_info": {
    "full_name": "John Doe",
    "email": "john@example.com",
    "contact": "9876543210",
    "contact_as_whatsapp": false,
    "whatsapp_number": "9123456789"
  },
  "education": {
    "school_name": "ABC High School",
    "graduation_year": "2024",
    "subjects": ["Mathematics", "Physics", "Chemistry"]
  }
}
```

### 9.3 Multi-Select Values

Multi-select dropdown values are submitted as arrays: `["option1", "option2", "option3"]`

---

## 10. NON-FUNCTIONAL REQUIREMENTS

### 10.1 Performance

• Form rendering should be near-instantaneous after configuration fetch

• Auto-save operations should not block user interaction

• Email validation should respond within 1-2 seconds

### 10.2 Browser Compatibility

• Modern browsers using latest web standards

• No specific browser version requirements

• Full mobile responsiveness required

### 10.3 Security Considerations

• Local Storage data is not encrypted (acceptable for educational applications)

• Backend implements rate limiting to prevent abuse

• Email validation prevents duplicate registrations

• All API communication over HTTPS

### 10.4 Scalability

• Maximum 5 sections per form (sufficient for educational applications)

• No limit on number of fields per section (within reasonable bounds)

• 500 character limit per text field

---

## 11. EXCLUDED FEATURES (OUT OF SCOPE)

• File upload functionality (deferred to future release)

• Analytics and tracking (not included in initial version)

• Multi-language support (English only for initial version)

• Server-side draft storage (client-side Local Storage only)

• Advanced accessibility features beyond keyboard navigation and semantic HTML

• Review & submit step (direct submission from last section)

• Custom styling in JSON configuration (default theme only)

• Audit trail of user modifications

• Advanced field types (textarea, radio, checkbox-group, file)

---

## 12. DEVELOPMENT PHASES

### Phase 1: Core Infrastructure

• Setup React + TypeScript project with Tailwind CSS

• Implement DynamicForm component with JSON parsing

• Basic field rendering (text, date, boolean, select)

• Setup PostgreSQL database and basic API endpoints

### Phase 2: Multi-Step Wizard

• Implement section-based navigation

• Add linear progress indicator

• Next/Back button logic with validation

• Direct navigation to completed sections

### Phase 3: Validation & Conditional Logic

• Mandatory field validation

• Email and phone number format validation

• Conditional field rendering with AND/OR operators

• Auto-clear data on dependency changes

• Real-time email availability check

### Phase 4: Draft Management

• Local Storage integration

• Auto-save every 30 seconds and on field blur

• Draft loading on page load

• 10-day expiration logic

• Version mismatch handling

### Phase 5: Submission & Post-Submission

• Form submission with grouped section data

• Error handling and retry mechanism

• Application ID generation and display

• Email confirmation service

• Read-only collapsible summary view

• Draft cleanup after successful submission

### Phase 6: Polish & Testing

• Mobile responsiveness optimization

• Keyboard navigation testing

• Loading states and error messages

• Cross-browser compatibility testing

• Performance optimization

• End-to-end testing of complete user journey

---

**--- END OF DOCUMENT ---**