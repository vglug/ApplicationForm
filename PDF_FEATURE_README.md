# PDF Generation Feature

## Overview
After submitting the application form, a PDF is automatically generated and downloaded containing:
- Auto-generated application number (format: APP{YYYYMMDD}{sequence})
- Unique UUID for each submission (used in QR code)
- QR code containing the submission UUID
- All personal and educational details from the form

## What Was Implemented

### Backend Changes

1. **Database Model Updates** ([backend/models.py](backend/models.py))
   - Added `uuid` field (unique identifier for each submission)
   - Added `application_number` field (human-readable format: APP202512160001)

2. **API Endpoint Updates** ([backend/app.py](backend/app.py))
   - `/submit` endpoint now returns `uuid` and `application_number`
   - New `/download-pdf/<submission_uuid>` endpoint generates PDF on-the-fly

3. **PDF Generation Features**
   - Uses ReportLab library for PDF creation
   - Generates QR code using qrcode library
   - Professional layout with VGLUG branding (#00BAED color)
   - Includes all form sections with proper formatting
   - Handles conditional fields (e.g., WhatsApp number, passed out year)

4. **Dependencies Added** ([backend/requirements.txt](backend/requirements.txt))
   - `reportlab==4.0.7` - PDF generation
   - `qrcode==8.2` - QR code generation
   - `Pillow==12.0.0` - Image processing for QR codes

### Frontend Changes

1. **API Service** ([frontend/src/services/api.ts](frontend/src/services/api.ts))
   - Added `downloadPDF(uuid)` function

2. **App Component** ([frontend/src/App.tsx](frontend/src/App.tsx))
   - Automatically downloads PDF after successful form submission
   - PDF filename uses application number (e.g., APP202512160001.pdf)

## Application Number Format

```
APP{YYYY}{MM}{DD}{XXXX}
```

- `APP` - Prefix
- `YYYYMMDD` - Current date
- `XXXX` - Sequential number (0001, 0002, etc.) for that day

**Examples:**
- First submission on Dec 16, 2025: `APP202512160001`
- Second submission same day: `APP202512160002`
- First submission on Jan 1, 2026: `APP202601010001`

## QR Code

The QR code contains the submission's unique UUID. This can be used for:
- Quick lookup of submission in the database
- Verification of authenticity
- Mobile scanning for instant access to submission details

## How to Test

1. **Start Backend:**
   ```bash
   cd backend
   source .venv/bin/activate
   flask run
   ```

2. **Start Frontend:**
   ```bash
   cd frontend
   npm run dev
   ```

3. **Fill out the form completely and submit**
   - A notification will appear saying "Form submitted successfully!"
   - PDF will automatically download to your Downloads folder

4. **Check the PDF:**
   - Open the downloaded PDF
   - Verify application number, personal details, and QR code
   - Scan QR code with your phone to see the UUID

## Database Migration

A database migration was created and applied to add the new fields. If you need to reset:

```bash
cd backend
source .venv/bin/activate
flask db downgrade  # Go back one migration
flask db upgrade    # Apply migration again
```

## Future Enhancements

Possible improvements:
- Email the PDF to the user
- Admin dashboard to view all submissions
- Bulk PDF download
- Custom PDF templates
- Digital signatures
- Add organization logo to PDF
