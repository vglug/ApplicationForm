# Prompt Plan for Dynamic Form Builder Implementation

This document provides a structured approach to implementing the Dynamic Form Builder using AI-assisted development. Each prompt is designed to be clear, specific, and focused on a discrete component or feature.

---

## Phase 1: Project Setup & Core Infrastructure

### Prompt 1.1: Initialize Project Structure
```
Create a React + TypeScript project setup for a Dynamic Form Builder application with the following requirements:
- Use Vite or Create React App with TypeScript template
- Install and configure Tailwind CSS for styling
- Install React Hook Form for form management
- Setup project folder structure with:
  - /src/components (for React components)
  - /src/types (for TypeScript interfaces)
  - /src/utils (for utility functions)
  - /src/services (for API calls)
  - /src/hooks (for custom React hooks)
- Create a basic .gitignore file
- Include package.json with all necessary dependencies
```

### Prompt 1.2: Define TypeScript Interfaces
```
Based on this JSON schema structure, create comprehensive TypeScript interfaces for the Dynamic Form Builder:

Form Structure:
- Form has title and sections
- Section has label and fields array
- Field has: label, actual_name, type, mandatory, condition (optional), options (for select), validation_type (optional), multiselect (optional)
- Field types: text, date, boolean, select
- Validation types: email, phone

Create interfaces for:
1. FormConfig
2. Section
3. Field
4. FieldType
5. ValidationType
6. FormData (for storing user input grouped by sections)
7. ValidationError

Include proper typing for conditional logic and multi-select arrays.
```

### Prompt 1.3: Create Local Storage Service
```
Create a TypeScript service class for managing Local Storage operations for the Dynamic Form Builder with these requirements:

Features needed:
- Save draft data (grouped by sections) to Local Storage
- Load draft data on page load
- Store timestamp of last modification
- Check if draft has expired (10 days of inactivity)
- Clear draft after successful submission
- Handle version mismatch (discard old draft if form config changed)
- Browser-specific storage (not user-specific)

Methods required:
- saveDraft(formId: string, data: FormData): void
- loadDraft(formId: string): FormData | null
- isDraftExpired(formId: string): boolean
- clearDraft(formId: string): void
- getLastModified(formId: string): Date | null

Include error handling for quota exceeded and invalid JSON parsing.
```

---

## Phase 2: Core Form Components

### Prompt 2.1: Create DynamicForm Component
```
Create a main DynamicForm React component with TypeScript that:

1. Accepts formConfig prop (JSON schema)
2. Manages current section index state
3. Renders only the current section's fields
4. Displays a linear progress indicator showing all 5 sections
5. Shows Next/Back/Submit buttons based on current section
6. Integrates with React Hook Form for form state management
7. Loads draft data from Local Storage on mount
8. Implements auto-save every 30 seconds

Component structure:
- Use useState for section navigation
- Use useEffect for auto-save timer
- Use React Hook Form's useForm hook
- Display section label as heading
- Render fields dynamically based on section.fields array

Props interface:
- formConfig: FormConfig
- onSubmit: (data: FormData) => Promise<void>
```

### Prompt 2.2: Create Field Renderer Component
```
Create a FieldRenderer component that dynamically renders different field types based on the field configuration:

Supported field types:
1. text - Text input with max 500 characters
2. date - Date picker with DD/MM/YYYY format (Indian standard)
3. boolean - Single checkbox
4. select - Searchable dropdown (single or multi-select based on multiselect flag)

Requirements:
- Accept field config and form control props
- Show field label
- Display inline validation errors below field
- Support validation_type for email (RFC 5322) and phone (Indian 10-digit)
- For select fields, render searchable dropdown using a library like react-select
- Handle multi-select values as arrays
- Apply Tailwind CSS styling for consistent appearance
- Show loading indicator for email validation

Props:
- field: Field
- control: Control from React Hook Form
- errors: FieldErrors
```

### Prompt 2.3: Create Progress Indicator Component
```
Create a ProgressIndicator component for the multi-step wizard with these features:

Visual Design:
- Linear horizontal layout with numbered circles (1-5)
- Display section names below each circle
- Highlight completed sections with distinct color
- Highlight current section with different styling
- Highlight sections with errors in red
- Show connecting lines between circles

Interaction:
- Allow clicking on completed sections for direct navigation
- Disable clicking on incomplete future sections
- Current section should be visually emphasized

Props:
- sections: Section[]
- currentSectionIndex: number
- completedSections: number[]
- sectionsWithErrors: number[]
- onSectionClick: (index: number) => void

Use Tailwind CSS for responsive design.
```

---

## Phase 3: Validation & Conditional Logic

### Prompt 3.1: Create Validation Service
```
Create a validation service that handles all form validation logic:

Validation Rules:
1. Mandatory field validation (required fields must be filled)
2. Email format validation (RFC 5322 standard)
3. Phone number validation (Indian 10-digit format: 9876543210)
4. Text field max length (500 characters)
5. Date format validation (DD/MM/YYYY)

Functions needed:
- validateField(field: Field, value: any): string | null
- validateSection(section: Section, data: Record<string, any>): Record<string, string>
- validateEmail(email: string): boolean
- validatePhone(phone: string): boolean
- isFieldVisible(field: Field, formData: FormData): boolean

Include clear error messages for each validation type.
Return null if valid, error message string if invalid.
```

### Prompt 3.2: Create Conditional Logic Engine
```
Create a conditional logic evaluation engine for showing/hiding fields based on conditions:

Requirements:
- Parse condition strings like: "contact_as_whatsapp == false"
- Support complex conditions with AND/OR operators (max 5 conditions)
- Example: "age >= 18 AND country == 'India' OR has_guardian == true"
- Return false if referenced field doesn't exist or is undefined
- Evaluate conditions against current form data

Functions:
- evaluateCondition(condition: string, formData: FormData): boolean
- parseCondition(condition: string): ConditionAST
- checkFieldDependencies(field: Field): string[]

Handle operators:
- Equality: ==, !=
- Comparison: >, <, >=, <=
- Logical: AND, OR

Include robust error handling for malformed conditions.
```

### Prompt 3.3: Implement Auto-Clear on Dependency Change
```
Create a custom React hook that monitors field dependencies and automatically clears data when conditions change:

Hook: useConditionalFieldClearing

Features:
- Monitor all fields with conditions
- Track their dependency fields
- When a dependency field value changes:
  - Re-evaluate all dependent field conditions
  - If a field becomes hidden (condition now false), clear its data
  - Update form state
- Maintain a list of currently visible fields

Parameters:
- formConfig: FormConfig
- formData: FormData
- setValue: UseFormSetValue (from React Hook Form)

Return:
- visibleFields: Set<string>
- clearHiddenFields: () => void

Use useEffect to watch for changes in dependency fields.
```

---

## Phase 4: API Integration

### Prompt 4.1: Create API Service
```
Create an API service for all backend communication:

Endpoints needed:
1. GET /api/form-config - Fetch form configuration
2. POST /api/validate-email - Real-time email availability check
3. POST /api/form-submit - Submit completed form

Service methods:
- fetchFormConfig(): Promise<FormConfig>
- validateEmailAvailability(email: string): Promise<{valid: boolean, available: boolean, message: string}>
- submitForm(data: FormData): Promise<{success: boolean, application_id: string, message: string}>

Features:
- Use axios or fetch for HTTP requests
- Include proper error handling
- Set appropriate headers (Content-Type: application/json)
- Handle network errors with user-friendly messages
- Return typed responses
- Support retry logic for failed submissions

Use environment variables for API base URL.
```

### Prompt 4.2: Implement Email Validation with Real-Time Check
```
Create a custom hook for email field validation with real-time availability checking:

Hook: useEmailValidation

Features:
- Validate email format on field blur
- Call API to check email availability
- Show inline loading indicator during check
- Display error if email is unavailable
- Debounce API calls (wait 500ms after user stops typing)
- Cache results to avoid duplicate API calls

Parameters:
- fieldName: string
- control: Control from React Hook Form

Return:
- isChecking: boolean
- emailError: string | null
- checkEmail: (email: string) => Promise<void>

Integration with React Hook Form validation rules.
```

---

## Phase 5: Navigation & State Management

### Prompt 5.1: Create Section Navigation Logic
```
Create a custom hook for managing multi-step section navigation:

Hook: useSectionNavigation

Features:
- Track current section index
- Maintain list of completed sections
- Handle Next button: validate current section, save to Local Storage, move forward
- Handle Back button: move to previous section
- Handle direct navigation: jump to completed section from progress indicator
- Prevent navigation to incomplete sections
- Identify sections with validation errors

Parameters:
- formConfig: FormConfig
- formData: FormData
- validateSection: (sectionIndex: number) => Promise<boolean>

Return:
- currentSectionIndex: number
- completedSections: number[]
- sectionsWithErrors: number[]
- goToNextSection: () => Promise<void>
- goToPreviousSection: () => void
- goToSection: (index: number) => void
- canNavigateToSection: (index: number) => boolean
```

### Prompt 5.2: Implement Auto-Save Functionality
```
Create a custom hook for auto-saving form data to Local Storage:

Hook: useAutoSave

Features:
- Auto-save every 30 seconds
- Save on field blur
- Save on section navigation (Next/Back)
- Don't block user interaction during save
- Track last save timestamp
- Show subtle "saved" indicator (optional)

Parameters:
- formId: string
- formData: FormData
- enabled: boolean

Implementation:
- Use useEffect with setInterval for 30-second timer
- Debounce field blur events
- Use the Local Storage service created earlier
- Clean up timers on unmount

Return:
- lastSaved: Date | null
- isSaving: boolean
```

---

## Phase 6: Submission & Post-Submission

### Prompt 6.1: Create Form Submission Handler
```
Create a comprehensive form submission handler component:

Features:
- Validate all sections before submission
- If validation fails:
  - Navigate to first section with errors
  - Highlight error sections in progress indicator
  - Show error summary
- If validation passes:
  - Show loading state
  - Call API to submit form (data grouped by sections)
  - Handle success: display application ID
  - Handle error: show error message with retry button
  - Clear Local Storage draft on success

Component: FormSubmitHandler

Props:
- formConfig: FormConfig
- formData: FormData
- onSuccess: (applicationId: string) => void
- onError: (error: string) => void

Include proper error handling for network failures.
```

### Prompt 6.2: Create Post-Submission Success View
```
Create a success view component that displays after form submission:

Features:
- Show success message
- Display application ID prominently
- Show submitted data in collapsible sections (read-only)
- Include timestamp of submission
- Mention that confirmation email has been sent
- Style with celebratory UI (checkmark icon, success colors)

Component: SubmissionSuccessView

Props:
- applicationId: string
- submittedData: FormData
- submissionTime: Date

Use Tailwind CSS for styling.
Make sections collapsible using details/summary or custom accordion.
```

### Prompt 6.3: Create Read-Only Form View
```
Create a read-only view for users who return after submitting:

Features:
- Detect if user has already submitted (check Local Storage or API)
- Display all form sections in collapsible format
- Show submitted values (not editable)
- Display application ID at top
- Show submission timestamp
- Use distinct styling to indicate read-only mode

Component: ReadOnlyFormView

Props:
- formConfig: FormConfig
- submittedData: FormData
- applicationId: string

Reuse ProgressIndicator but in read-only mode (all sections accessible).
```

---

## Phase 7: Error Handling & Loading States

### Prompt 7.1: Create Error Boundary Component
```
Create a React Error Boundary for graceful error handling:

Features:
- Catch React component errors
- Display user-friendly error message
- Provide "Try Again" button to reset
- Log errors to console (or error tracking service)
- Preserve form data in Local Storage if error occurs

Component: FormErrorBoundary

Include fallback UI with:
- Error icon
- Error message
- Retry button
- Support contact information
```

### Prompt 7.2: Create Loading States Component
```
Create reusable loading state components:

1. FormLoadingSpinner - Full page loader while fetching config
2. InlineFieldLoader - Small spinner for email validation
3. SubmitLoadingButton - Button with loading state

Requirements:
- Use Tailwind CSS for styling
- Include animation (spinning, pulsing)
- Accessible (proper ARIA labels)
- Disable interactions during loading

Components:
- LoadingSpinner (props: size, message)
- LoadingButton (props: isLoading, onClick, children)
- LoadingField (props: message)
```

### Prompt 7.3: Create Error Display Components
```
Create components for displaying different types of errors:

1. InlineFieldError - Below each field
2. SectionErrorSummary - At top of section showing all errors
3. NetworkErrorModal - For API failures with retry option
4. ValidationErrorAlert - For submission validation failures

Components needed:
- FieldErrorMessage (props: error: string)
- ErrorAlert (props: type, message, onRetry, onDismiss)

Use Tailwind CSS with appropriate colors (red for errors).
Include icons for visual clarity.
```

---

## Phase 8: Responsive Design & Accessibility

### Prompt 8.1: Implement Mobile Responsive Design
```
Create responsive CSS classes and component modifications for mobile devices:

Requirements:
- Progress indicator stacks vertically on small screens
- Form fields take full width on mobile
- Larger touch targets for buttons and inputs (min 44px)
- Optimized date picker for mobile
- Readable font sizes (min 16px to prevent zoom)
- Proper spacing for thumb navigation

Use Tailwind CSS responsive modifiers:
- sm: (640px)
- md: (768px)
- lg: (1024px)

Test on:
- Mobile (320px - 480px)
- Tablet (768px - 1024px)
- Desktop (1024px+)
```

### Prompt 8.2: Implement Keyboard Navigation
```
Add comprehensive keyboard navigation support:

Features:
- Tab through all form fields in order
- Enter to submit (on last field)
- Escape to cancel/close modals
- Arrow keys for select dropdown navigation
- Space to toggle checkboxes
- Proper focus indicators (visible outline)
- Focus management after section navigation

Implementation:
- Add tabIndex to interactive elements
- Implement onKeyDown handlers
- Use focus() after section changes
- Ensure logical tab order

Test keyboard-only navigation through entire form.
```

### Prompt 8.3: Implement Semantic HTML & ARIA
```
Enhance accessibility with semantic HTML and ARIA attributes:

Requirements:
- Use proper form elements (form, input, label, button)
- Associate labels with inputs using htmlFor/id
- Add ARIA labels for icon-only buttons
- Use role="alert" for error messages
- Add aria-required for mandatory fields
- Use aria-invalid for fields with errors
- Include aria-describedby for field descriptions
- Implement proper heading hierarchy (h1, h2, h3)

Update all form components with:
- Semantic HTML elements
- Proper ARIA attributes
- Screen reader announcements for state changes
```

---

## Phase 9: Testing & Optimization

### Prompt 9.1: Create Unit Tests
```
Create comprehensive unit tests for core utilities:

Test files needed:
1. validationService.test.ts - Test all validation functions
2. conditionalLogic.test.ts - Test condition evaluation
3. localStorageService.test.ts - Test draft save/load/clear
4. formDataTransform.test.ts - Test data grouping by sections

Use Jest and React Testing Library.

For each function, test:
- Happy path (valid inputs)
- Edge cases (empty, null, undefined)
- Error cases (invalid format, malformed data)
- Boundary conditions

Include mock data for form configs and user inputs.
```

### Prompt 9.2: Create Integration Tests
```
Create integration tests for complete user flows:

Test scenarios:
1. Complete form submission flow (all sections)
2. Navigation between sections
3. Draft saving and loading
4. Conditional field showing/hiding
5. Validation error handling
6. Email availability check
7. Form submission with network error

Use React Testing Library and MSW (Mock Service Worker) for API mocking.

Each test should:
- Render complete DynamicForm component
- Simulate user interactions
- Assert expected UI changes
- Verify API calls
- Check Local Storage state
```

### Prompt 9.3: Performance Optimization
```
Implement performance optimizations:

Optimizations needed:
1. Memoize expensive computations (useMemo for condition evaluation)
2. Prevent unnecessary re-renders (React.memo for components)
3. Debounce auto-save operations
4. Lazy load large dropdown options
5. Optimize re-renders when form data changes
6. Virtual scrolling for sections with many fields

Use React DevTools Profiler to identify bottlenecks.

Create custom hooks:
- useDebouncedValue (for auto-save)
- useMemoizedConditions (for conditional logic)
- useThrottledValidation (for inline validation)

Target metrics:
- Initial render < 1s
- Section navigation < 100ms
- Field interaction response < 50ms
```

---

## Phase 10: Documentation & Deployment

### Prompt 10.1: Create Developer Documentation
```
Create comprehensive developer documentation:

Documents needed:
1. README.md - Project overview, setup, and running instructions
2. ARCHITECTURE.md - System architecture and component relationships
3. API.md - API endpoint documentation
4. CONTRIBUTING.md - Guidelines for contributing code
5. DEPLOYMENT.md - Deployment instructions

Include:
- Project structure explanation
- Setup instructions (dependencies, environment variables)
- Development workflow
- Code style guidelines
- Testing instructions
- Build and deployment commands

Use clear examples and diagrams where helpful.
```

### Prompt 10.2: Create User Guide
```
Create an end-user guide for filling out the form:

Guide contents:
1. Getting started
2. Navigating between sections
3. Understanding validation errors
4. Auto-save functionality
5. Submitting the form
6. What to do if submission fails
7. Viewing submitted data
8. FAQ section

Format: Simple markdown with screenshots/illustrations.

Include:
- Step-by-step instructions
- Troubleshooting common issues
- Contact information for support
```

### Prompt 10.3: Create Deployment Configuration
```
Create deployment configuration files:

Files needed:
1. Dockerfile - For containerized deployment
2. docker-compose.yml - For local development with database
3. .env.example - Template for environment variables
4. nginx.conf - For serving production build
5. CI/CD pipeline config (GitHub Actions / GitLab CI)

Environment variables:
- REACT_APP_API_BASE_URL
- REACT_APP_FORM_ID
- Database connection strings (backend)
- Email service credentials (backend)

Include:
- Production build optimization
- Environment-specific configurations
- Health check endpoints
- Logging configuration
```

---

## Phase 11: Backend Implementation

### Prompt 11.1: Create Backend API Structure
```
Create the backend API using Node.js (Express) or Python (Django/Flask):

Required endpoints:
1. GET /api/form-config - Returns form JSON based on year and is_active
2. POST /api/validate-email - Checks email format and availability
3. POST /api/form-submit - Receives and stores form data

Project structure:
- /routes - API route definitions
- /controllers - Business logic
- /models - Database models
- /middleware - Auth, validation, rate limiting
- /services - Email service, external integrations
- /utils - Helper functions

Include:
- Error handling middleware
- Request validation
- CORS configuration
- Rate limiting setup
```

### Prompt 11.2: Create Database Schema
```
Design PostgreSQL database schema for the Dynamic Form Builder:

Tables needed:
1. forms - Store form configurations
   - id, title, config_json, year, is_active, created_at, updated_at

2. submissions - Store submitted form data
   - id, form_id, application_id, data_json, submitted_at, user_email

3. users - Track email registrations
   - id, email, created_at

SQL schema with:
- Proper data types
- Primary keys
- Foreign keys
- Indexes for performance
- Constraints (unique email, etc.)

Include migration scripts for schema creation.
```

### Prompt 11.3: Implement Email Service
```
Create email notification service for sending confirmation emails:

Features:
- Send confirmation email after successful submission
- Include application ID in email
- Professional email template (HTML)
- Use service like SendGrid, AWS SES, or Nodemailer

Email template should include:
- University/organization branding
- Application ID prominently displayed
- Submission timestamp
- Next steps information
- Contact information

Service interface:
- sendConfirmationEmail(email: string, applicationId: string, data: FormData): Promise<void>

Include error handling and retry logic.
```

---

## Phase 12: Quality Assurance

### Prompt 12.1: Create End-to-End Test Suite
```
Create comprehensive E2E tests using Cypress or Playwright:

Test scenarios:
1. Happy path - Complete form submission
2. Draft saving and resuming
3. Validation error paths
4. Conditional field logic
5. Email validation with existing email
6. Network error handling and retry
7. Multi-device testing (desktop, tablet, mobile)
8. Accessibility testing (keyboard navigation)

For each scenario:
- Set up test data
- Navigate through form
- Assert UI state at each step
- Verify API calls
- Check final results

Include screenshots and videos on failure.
```

### Prompt 12.2: Create Testing Checklist
```
Create a comprehensive QA testing checklist:

Categories:
1. Functional Testing
   - All field types work correctly
   - Validation rules are enforced
   - Conditional logic works
   - Navigation functions properly
   - Submission succeeds

2. UI/UX Testing
   - Visual design matches mockups
   - Responsive on all screen sizes
   - Loading states display correctly
   - Error messages are clear

3. Performance Testing
   - Page load time < 2s
   - Form interactions feel instant
   - Large forms (many fields) perform well

4. Security Testing
   - No XSS vulnerabilities
   - API endpoints are secure
   - Rate limiting works

5. Browser Compatibility
   - Chrome, Firefox, Safari, Edge
   - Mobile browsers (iOS Safari, Chrome Android)

Include pass/fail criteria for each item.
```

---

## Usage Instructions

### How to Use This Prompt Plan

1. **Sequential Implementation**: Follow the phases in order, as later phases depend on earlier ones.

2. **Copy and Paste**: Copy each prompt directly to your AI assistant (Claude, ChatGPT, etc.).

3. **Customize**: Adjust prompts based on your specific needs or tech stack preferences.

4. **Iterate**: After receiving code, test it and ask follow-up questions to refine.

5. **Integrate**: Combine the outputs from different prompts into your project structure.

6. **Review**: Always review AI-generated code for correctness, security, and best practices.

### Tips for Best Results

- Provide context from previous prompts when needed
- Share error messages for debugging help
- Ask for explanations of complex code
- Request code comments for clarity
- Ask for alternative approaches if needed
- Request refactoring for better code quality

### Customization Options

You can modify these prompts to:
- Use different form libraries (Formik instead of React Hook Form)
- Change backend framework (Python/Django instead of Node.js)
- Add features not in the original spec
- Remove features you don't need
- Adjust styling approach (styled-components instead of Tailwind)

---

## Appendix: Quick Reference

### Key Technologies
- **Frontend**: React, TypeScript, Tailwind CSS, React Hook Form
- **Backend**: Node.js/Express or Python/Django
- **Database**: PostgreSQL
- **Testing**: Jest, React Testing Library, Cypress/Playwright

### Project Timeline Estimate
- Phase 1-2: 1 week (Setup & Core Components)
- Phase 3-4: 1 week (Validation & API)
- Phase 5-6: 1 week (Navigation & Submission)
- Phase 7-8: 1 week (UX & Accessibility)
- Phase 9-10: 1 week (Testing & Documentation)
- Phase 11-12: 1 week (Backend & QA)

**Total: ~6 weeks for complete implementation**

### Resource Requirements
- 1 Frontend Developer (React/TypeScript)
- 1 Backend Developer (Node.js or Python)
- 1 QA Engineer (Testing)
- 1 DevOps Engineer (Deployment)

---

**End of Prompt Plan**
