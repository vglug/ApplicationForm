# VGLUG Application Form - Changelog

## Recent Updates

### Form Field Changes

#### 1. WhatsApp Number Field Default Behavior
**Changed:**
- WhatsApp number field now **shows by default** when form loads
- Default value for "Is this the WhatsApp number?" is set to `false`
- When checkbox is unchecked (default), WhatsApp field is visible
- Fixed spelling from "Watsapp" to "WhatsApp"
- Fixed spelling from "Gaurdian" to "Guardian"

**Before:**
```json
{
  "label": "Is this the watsapp number?",
  "actual_name": "contact_as_watsapp",
  "type": "boolean",
  "mandatory": true
}
```
(No default value - checkbox starts unchecked but field might not show)

**After:**
```json
{
  "label": "Is this the WhatsApp number?",
  "actual_name": "contact_as_whatsapp",
  "type": "boolean",
  "mandatory": true,
  "default": false
},
{
  "label": "WhatsApp Number",
  "actual_name": "watsapp_contact",
  "type": "text",
  "mandatory": true,
  "condition": "contact_as_whatsapp == false"
}
```
(Default is `false`, so WhatsApp field shows immediately on load)

#### 2. Parent/Guardian Number Validation
**Added:**
- Parent/Guardian number must be different from the student's contact number
- Validation occurs when user tries to proceed from Basic Info section
- Clear error message: "Parent/Guardian number must be different from your contact number"

**Implementation:**
- Frontend validation in `DynamicForm.tsx`
- Checks before allowing navigation to next section

#### 3. Spelling Corrections
**Fixed:**
- "Watsapp" → "WhatsApp" (correct capitalization)
- "Gaurdian" → "Guardian" (correct spelling)

### Validation Schema Updates

**Updated Files:**
- `frontend/src/utils/formValidation.ts`
- `FORM_VALIDATION_RULES.md`

**Changed Required Fields in basic_info:**
- Added: `contact_as_whatsapp` with default value of `false`
- Kept: `watsapp_contact` as mandatory conditional field

**Current Required Fields:**
```
basic_info:
  - first_name
  - last_name
  - dob
  - email
  - contact
  - contact_as_whatsapp (with default: false)
  - watsapp_contact (conditional: shows when contact_as_whatsapp == false)
  - parent_contact
  - differently_abled
```

### Seed Data Updates

**Updated Files:**
- `markdown/complete_form_example.json`
- `backend/seeds/seed_form_config.sql`
- `backend/seed_database.py` (uses updated JSON)

All seed files now reflect:
- WhatsApp number as mandatory, always visible
- Correct spelling ("WhatsApp", "Guardian")
- Removed conditional logic for WhatsApp number

## Migration Notes

### For Existing Installations

If you have an existing database with old form configurations:

1. **Option 1: Create New Version**
   - Log into admin panel
   - Edit existing configuration
   - Remove `contact_as_watsapp` field
   - Make `watsapp_contact` mandatory and remove condition
   - Fix spelling issues
   - Save as new version

2. **Option 2: Fresh Seed**
   - Backup existing data if needed
   - Run: `python backend/seed_database.py`
   - This creates version 1 for 2025 with all updates

### For New Installations

Simply run the seed script:
```bash
cd backend
python seed_database.py
```

## User Impact

### Before
1. User enters contact number
2. User sees "Is this the WhatsApp number?" checkbox (unchecked by default)
3. WhatsApp field might not show initially
4. User could enter same number for parent contact

### After
1. User enters contact number
2. User sees "Is this the WhatsApp number?" checkbox (unchecked by default)
3. **WhatsApp field shows immediately** (because default is false)
4. User can check the box if contact number IS their WhatsApp number (field hides)
5. User enters parent/guardian number
6. **System validates** parent number is different from contact number

## Benefits

✅ **Better UX**: WhatsApp field visible by default on page load
✅ **Clear default behavior**: Field appears immediately, no confusion
✅ **Flexible**: User can still indicate contact number is WhatsApp number
✅ **Data validation**: Ensures parent contact is truly different
✅ **Correct spelling**: Professional appearance ("WhatsApp", "Guardian")
✅ **Clear labels**: Improved field labels throughout

## Technical Details

### Validation Logic

**File:** `frontend/src/components/DynamicForm.tsx`

```typescript
// Additional validation for basic_info section
if (sections[current].key === 'basic_info') {
  const contact = values['contact']
  const parentContact = values['parent_contact']

  if (contact && parentContact && contact === parentContact) {
    alert('Parent/Guardian number must be different from your contact number')
    return
  }
}
```

### Schema Changes

**File:** `frontend/src/utils/formValidation.ts`

```typescript
basic_info: {
  required: true,
  requiredFields: [
    'first_name',
    'last_name',
    'dob',
    'email',
    'contact',
    'contact_as_whatsapp',  // Added with default: false
    'watsapp_contact',      // Conditional: shows when contact_as_whatsapp == false
    'parent_contact',
    'differently_abled'
  ]
}
```

### Default Value Support

**File:** `frontend/src/components/DynamicForm.tsx`

Added support for default values in form fields:
```typescript
<Controller
  name={field.actual_name}
  control={control}
  defaultValue={field.default !== undefined ? field.default : ''}
  // ... rest of props
/>
```

This ensures that when `contact_as_whatsapp` has `"default": false`, it initializes unchecked, which triggers the condition to show the WhatsApp field immediately.

## Date: 2025-12-16
