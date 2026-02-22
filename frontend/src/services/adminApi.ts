const BASE = (import.meta.env.VITE_API_BASE_URL as string) || (typeof window !== 'undefined' && window.location.hostname !== 'localhost' ? '/api' : 'http://localhost:5001')

export async function adminLogin(email: string, password: string) {
  return fetch(`${BASE}/admin/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email, password })
  })
}

export async function getFormConfigs(token: string) {
  return fetch(`${BASE}/admin/form-configs`, {
    headers: { 'Authorization': `Bearer ${token}` }
  })
}

export async function getFormConfigDetail(token: string, configId: number) {
  return fetch(`${BASE}/admin/form-config/${configId}`, {
    headers: { 'Authorization': `Bearer ${token}` }
  })
}

export async function createFormConfig(token: string, templateJson: any, year: number, setActive: boolean = true) {
  return fetch(`${BASE}/admin/form-config`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${token}`
    },
    body: JSON.stringify({ template_json: templateJson, year, set_active: setActive })
  })
}

export async function activateFormConfig(token: string, configId: number) {
  return fetch(`${BASE}/admin/form-config/${configId}/activate`, {
    method: 'PUT',
    headers: { 'Authorization': `Bearer ${token}` }
  })
}

export async function getUsers(token: string) {
  return fetch(`${BASE}/admin/users`, {
    headers: { 'Authorization': `Bearer ${token}` }
  })
}

export async function createUser(token: string, email: string, password: string, role: string = 'volunteer') {
  return fetch(`${BASE}/admin/users`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${token}`
    },
    body: JSON.stringify({ email, password, role })
  })
}

export async function updateApplication(token: string, candidateId: string, data: any) {
  return fetch(`${BASE}/admin/application/${candidateId}`, {
    method: 'PUT',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${token}`
    },
    body: JSON.stringify(data)
  })
}

export async function getCurrentUser(token: string) {
  return fetch(`${BASE}/admin/me`, {
    headers: { 'Authorization': `Bearer ${token}` }
  })
}

// Validation Schema APIs
export async function getValidationSchemas(token: string) {
  return fetch(`${BASE}/admin/validation-schemas`, {
    headers: { 'Authorization': `Bearer ${token}` }
  })
}

export async function getValidationSchemaDetail(token: string, schemaId: number) {
  return fetch(`${BASE}/admin/validation-schema/${schemaId}`, {
    headers: { 'Authorization': `Bearer ${token}` }
  })
}

export async function createValidationSchema(token: string, schemaJson: any, year: number, name?: string, description?: string, setActive: boolean = true) {
  return fetch(`${BASE}/admin/validation-schema`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${token}`
    },
    body: JSON.stringify({ schema_json: schemaJson, year, name, description, set_active: setActive })
  })
}

export async function activateValidationSchema(token: string, schemaId: number) {
  return fetch(`${BASE}/admin/validation-schema/${schemaId}/activate`, {
    method: 'PUT',
    headers: { 'Authorization': `Bearer ${token}` }
  })
}

export interface ApplicationFilters {
  filterAppeared?: 'true' | 'false' | ''
  filterSelected?: 'true' | 'false' | ''
  filterConsidered?: 'true' | 'false' | ''
}

export async function getApplications(
  token: string,
  page: number = 1,
  perPage: number = 20,
  sortBy: string = 'created_at',
  sortOrder: string = 'desc',
  search: string = '',
  candidateIds: string = '',
  filters: ApplicationFilters = {}
) {
  const params = new URLSearchParams({
    page: page.toString(),
    per_page: perPage.toString(),
    sort_by: sortBy,
    sort_order: sortOrder,
    search,
    candidate_ids: candidateIds
  })

  // Add optional filters
  if (filters.filterAppeared) params.append('filter_appeared', filters.filterAppeared)
  if (filters.filterSelected) params.append('filter_selected', filters.filterSelected)
  if (filters.filterConsidered) params.append('filter_considered', filters.filterConsidered)

  return fetch(`${BASE}/admin/applications?${params}`, {
    headers: { 'Authorization': `Bearer ${token}` }
  })
}

export async function getApplicationDetail(token: string, candidateId: string) {
  return fetch(`${BASE}/admin/application/${candidateId}`, {
    headers: { 'Authorization': `Bearer ${token}` }
  })
}

export async function getDashboardStats(token: string) {
  return fetch(`${BASE}/admin/dashboard-stats`, {
    headers: { 'Authorization': `Bearer ${token}` }
  })
}

// Widget APIs
export async function getWidgetMetadata(token: string) {
  return fetch(`${BASE}/admin/widgets/metadata`, {
    headers: { 'Authorization': `Bearer ${token}` }
  })
}

export async function getWidgets(token: string) {
  return fetch(`${BASE}/admin/widgets`, {
    headers: { 'Authorization': `Bearer ${token}` }
  })
}

export async function getWidget(token: string, widgetId: number) {
  return fetch(`${BASE}/admin/widgets/${widgetId}`, {
    headers: { 'Authorization': `Bearer ${token}` }
  })
}

export async function createWidget(token: string, widget: {
  title: string
  description?: string
  widget_type: string
  config_json: any
  width?: string
}) {
  return fetch(`${BASE}/admin/widgets`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${token}`
    },
    body: JSON.stringify(widget)
  })
}

export async function updateWidget(token: string, widgetId: number, widget: {
  title?: string
  description?: string
  widget_type?: string
  config_json?: any
  position?: number
  width?: string
  is_active?: boolean
}) {
  return fetch(`${BASE}/admin/widgets/${widgetId}`, {
    method: 'PUT',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${token}`
    },
    body: JSON.stringify(widget)
  })
}

export async function deleteWidget(token: string, widgetId: number) {
  return fetch(`${BASE}/admin/widgets/${widgetId}`, {
    method: 'DELETE',
    headers: { 'Authorization': `Bearer ${token}` }
  })
}

export async function previewWidget(token: string, configJson: any) {
  return fetch(`${BASE}/admin/widgets/preview`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${token}`
    },
    body: JSON.stringify({ config_json: configJson })
  })
}

export async function getWidgetData(token: string, widgetId: number) {
  return fetch(`${BASE}/admin/widgets/${widgetId}/data`, {
    headers: { 'Authorization': `Bearer ${token}` }
  })
}

export async function reorderWidgets(token: string, positions: { id: number; position: number }[]) {
  return fetch(`${BASE}/admin/widgets/reorder`, {
    method: 'PUT',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${token}`
    },
    body: JSON.stringify({ positions })
  })
}

export async function getWidgetCandidates(token: string, widgetId: number) {
  return fetch(`${BASE}/admin/widgets/${widgetId}/candidates`, {
    headers: { 'Authorization': `Bearer ${token}` }
  })
}

export async function getWidgetSegmentCandidates(token: string, widgetId: number, segmentField: string, segmentValue: any) {
  return fetch(`${BASE}/admin/widgets/${widgetId}/segment-candidates`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${token}`
    },
    body: JSON.stringify({
      segment_field: segmentField,
      segment_value: segmentValue
    })
  })
}

// Dashboard filter API - get candidate IDs for generic dashboard widget filters
export async function getDashboardFilterCandidates(token: string, filterType: string, filterValue: string) {
  return fetch(`${BASE}/admin/dashboard-filter-candidates`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${token}`
    },
    body: JSON.stringify({
      filter_type: filterType,
      filter_value: filterValue
    })
  })
}

// Shortlisting APIs
export async function shortlistApplication(token: string, candidateId: string, shortlisted: boolean = true) {
  return fetch(`${BASE}/admin/application/${candidateId}/shortlist`, {
    method: 'PUT',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${token}`
    },
    body: JSON.stringify({ shortlisted })
  })
}

export async function bulkShortlistApplications(token: string, candidateIds: string[], shortlisted: boolean = true) {
  return fetch(`${BASE}/admin/applications/bulk-shortlist`, {
    method: 'PUT',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${token}`
    },
    body: JSON.stringify({ candidate_ids: candidateIds, shortlisted })
  })
}

// Widget Agent APIs - AI-powered widget generation
export interface AgentOptions {
  provider: 'local' | 'anthropic' | 'openai'
  apiKey?: string
  ollamaUrl?: string
  ollamaModel?: string
}

export async function generateWidgetWithAgent(token: string, prompt: string, options: AgentOptions) {
  return fetch(`${BASE}/admin/widgets/agent/generate`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${token}`
    },
    body: JSON.stringify({
      prompt,
      provider: options.provider,
      api_key: options.apiKey,
      ollama_url: options.ollamaUrl,
      ollama_model: options.ollamaModel
    })
  })
}

export async function refineWidgetWithAgent(token: string, currentConfig: any, feedback: string, options: AgentOptions) {
  return fetch(`${BASE}/admin/widgets/agent/refine`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${token}`
    },
    body: JSON.stringify({
      current_config: currentConfig,
      feedback,
      provider: options.provider,
      api_key: options.apiKey,
      ollama_url: options.ollamaUrl,
      ollama_model: options.ollamaModel
    })
  })
}

export async function getAIProviders(token: string) {
  return fetch(`${BASE}/admin/widgets/agent/providers`, {
    headers: { 'Authorization': `Bearer ${token}` }
  })
}

export async function executeWidgetQuery(token: string, configJson: any) {
  return fetch(`${BASE}/admin/widgets/agent/execute`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${token}`
    },
    body: JSON.stringify({ config_json: configJson })
  })
}

// Volunteer Check-in APIs
export async function searchCandidateForCheckin(token: string, searchTerm: string) {
  return fetch(`${BASE}/admin/checkin/search`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${token}`
    },
    body: JSON.stringify({ search_term: searchTerm })
  })
}

export async function markCandidateAppeared(token: string, candidateId: string, appeared: boolean = true) {
  return fetch(`${BASE}/admin/checkin/mark-appeared`, {
    method: 'PUT',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${token}`
    },
    body: JSON.stringify({ candidate_id: candidateId, appeared })
  })
}

export async function getCheckinStats(token: string) {
  return fetch(`${BASE}/admin/checkin/stats`, {
    headers: { 'Authorization': `Bearer ${token}` }
  })
}

export async function getRecentCheckins(token: string, limit: number = 10) {
  return fetch(`${BASE}/admin/checkin/recent?limit=${limit}`, {
    headers: { 'Authorization': `Bearer ${token}` }
  })
}
