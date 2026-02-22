# 💡 Project Idea: Dynamic Form Builder (Multi-Step Wizard)

## 🎯 Goal
To develop a robust and flexible system that allows for the creation and deployment of complex web forms by defining their structure entirely through a **JSON schema** served from the backend. The frontend, built with **React**, will dynamically render the form based on this JSON definition, presenting it as a **multi-step wizard** with support for local data persistence and conditional fields.

## ✨ Key Features

### 1. JSON-Driven Dynamic Rendering
* The frontend (React) will fetch a form configuration JSON from the backend API.
* A core React component (`<DynamicForm />`) will parse this JSON and render the form elements, sections, and fields dynamically.

### 2. Comprehensive Field Support
The system must support common input types as defined in the `type` field:
* `text` (for strings like names, emails, contacts)
* `date` (for calendar inputs like DOB)
* `boolean` (for switches or checkboxes, e.g., "Is this the WhatsApp number?")
* `select` (for dropdowns with predefined `options`)
* **Potential Future Fields:** `textarea`, `radio`, `checkbox-group`, `file`.

### 3. Conditional Logic & Dependencies
* Fields can include a `condition` property (e.g., `"condition": "contact_as_watsapp == false"`).
* The system will evaluate this condition in real-time based on the current form state (which includes data from previously completed sections).
* If the condition is **true**, the field is rendered and included in validation/submission.
* If the condition is **false**, the field is hidden and excluded from processing.

### 4. Client-Side Validation
* The `mandatory: true` flag will enforce required field validation before submission.
* Validation will occur:
    1.  **Per Section:** When clicking "Next" or "Back".
    2.  **Final:** Upon clicking "Submit" across all visible, mandatory fields.

---

## 🚀 Multi-Step Flow & Local Persistence

The dynamic form will function as a **step-by-step wizard**, showing one section per page to improve user experience.

### 1. Multi-Step Navigation (Wizard View) ➡️
* **Paging by Section:** Only the fields within the currently active section will be rendered at any given time.
* **Navigation Controls:**
    * A **"Next"** button will be displayed on all sections (except the last one).
    * A **"Back"** button will be displayed on all sections (except the first one).
    * A **"Submit"** button will replace "Next" on the final section.
* **Progress Indicator:** A visual element (e.g., a progress bar or step indicator) must show the user's progress through the defined `sections`.

### 2. Local Data Persistence (Draft Saving) 💾
* **Temporary Storage:** The primary data store for the user's input during navigation will be the browser's **Local Storage**. This ensures progress is retained even if the user leaves the page.
* **Data Hydration:** Upon loading, the application checks Local Storage. If a saved draft (keyed by the form identifier) exists, fields are **pre-filled** with this data.
* **State Update on Navigation:**
    1.  Clicking **"Next"** performs validation on the current section's visible fields.
    2.  If validation passes, the current section's data is merged with the existing draft and **persisted to Local Storage**.
    3.  The application then increments the section index, rendering the next page.

### 3. Final Submission 📤
* The **"Submit"** button triggers the final comprehensive validation against the complete form state (loaded from Local Storage).
* Upon successful validation, the complete, structured JSON object is sent via an API `POST` request to the backend.
* After confirmed submission, the temporary `form_draft` is **cleared** from Local Storage.

---

## 🛠️ Technical Stack (Proposed)

| Component | Technology | Rationale |
| :--- | :--- | :--- |
| **Frontend** | **React** (with **TypeScript**) | Component-based architecture is ideal for dynamic rendering and type safety. |
| **Form Management** | **React Hook Form** or **Formik** | Efficient state management, validation, and submission handling across multi-step flow. |
| **Local Storage** | **Browser API** (or a simple wrapper) | For saving and retrieving multi-step form progress locally. |
| **Styling/UI** | **Tailwind CSS** or a component library | Provides utilities for a professional, accessible UI and progress indicators. |
| **Backend/API** | **Node.js (Express)** or **Python (Django/Flask)** | To serve the form configuration JSON and receive the final submitted data. |

---

## 📐 JSON Structure Overview

```json
{
    "title": "FORM TITLE",
    "sections": {
        "section_key_1": {
            "label": "Display Label for Section Header",
            "fields": [
                {
                    "label": "Field Display Label",
                    "actual_name": "backend_data_key",
                    "type": "text | date | boolean | select",
                    "mandatory": true | false,
                    "condition": "other_field_name == value", // Optional
                    "options": [] // Required for type: 'select'
                }
            ]
        }
    }
}