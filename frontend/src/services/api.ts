const BASE = (import.meta.env.VITE_API_BASE_URL as string) || (typeof window !== 'undefined' && window.location.hostname !== 'localhost' ? '/api' : 'http://localhost:5001')

export async function submit(payload:any){
  return fetch(`${BASE}/submit`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload)
  })
}

export async function getForm(){
  return fetch(`${BASE}/form`)
}

export async function getValidationSchema(){
  return fetch(`${BASE}/validation-schema`)
}

export async function downloadPDF(uuid: string) {
  const response = await fetch(`${BASE}/download-pdf/${uuid}`)
  if (!response.ok) {
    throw new Error('Failed to download PDF')
  }
  const blob = await response.blob()
  return blob
}

// OTP Verification APIs
export async function sendOTP(email: string) {
  return fetch(`${BASE}/send-otp`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email })
  })
}

export async function verifyOTP(email: string, otp: string) {
  return fetch(`${BASE}/verify-otp`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email, otp })
  })
}

// Check if email is already registered
export async function checkEmail(email: string) {
  return fetch(`${BASE}/check-email`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email })
  })
}

// Send edit link to registered email
export async function sendEditLink(email: string) {
  return fetch(`${BASE}/send-edit-link`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email })
  })
}

// Validate edit token and get application data
export async function validateEditToken(token: string) {
  return fetch(`${BASE}/validate-edit-token/${token}`)
}

// Update application via edit token
export async function updateApplication(token: string, payload: any) {
  return fetch(`${BASE}/update-application/${token}`, {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload)
  })
}
