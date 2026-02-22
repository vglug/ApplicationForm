import React, { useState, useEffect, useRef } from 'react'
import * as adminApi from '../../services/adminApi'
import WidgetPreview from './WidgetPreview'

interface Props {
  token: string
  onSave: () => void
  onCancel: () => void
}

interface Message {
  role: 'user' | 'assistant' | 'system'
  content: string
  timestamp: Date
  config?: any
  previewData?: any[]
  previewError?: string
  queryConfig?: any
}

interface Provider {
  id: 'local' | 'anthropic' | 'openai'
  name: string
  description: string
  available: boolean
  configured?: boolean
  has_model?: boolean
  model?: string
  available_models?: string[]
  error?: string
  requires_api_key: boolean
  key_prefix?: string
}

export default function AgentWidgetBuilder({ token, onSave, onCancel }: Props) {
  const [messages, setMessages] = useState<Message[]>([])
  const [input, setInput] = useState('')
  const [loading, setLoading] = useState(false)
  const [currentConfig, setCurrentConfig] = useState<any>(null)
  const [saving, setSaving] = useState(false)
  const messagesEndRef = useRef<HTMLDivElement>(null)

  // Provider selection
  const [providers, setProviders] = useState<Provider[]>([])
  const [selectedProvider, setSelectedProvider] = useState<'local' | 'anthropic' | 'openai' | null>(null)
  const [showProviderSelection, setShowProviderSelection] = useState(true)
  const [loadingProviders, setLoadingProviders] = useState(true)

  // API key input for cloud providers
  const [customApiKey, setCustomApiKey] = useState('')
  const [showApiKeyInput, setShowApiKeyInput] = useState(false)

  // Query editing state
  const [editableQuery, setEditableQuery] = useState<string>('')
  const [isEditingQuery, setIsEditingQuery] = useState(false)
  const [queryError, setQueryError] = useState<string | null>(null)
  const [runningQuery, setRunningQuery] = useState(false)
  const [expandedQuery, setExpandedQuery] = useState(false)

  useEffect(() => {
    loadProviders()
  }, [])

  useEffect(() => {
    scrollToBottom()
  }, [messages])

  const loadProviders = async () => {
    try {
      setLoadingProviders(true)
      const res = await adminApi.getAIProviders(token)
      if (res.ok) {
        const data = await res.json()
        setProviders(data.providers)
      }
    } catch (err) {
      console.error('Failed to load providers:', err)
    } finally {
      setLoadingProviders(false)
    }
  }

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' })
  }

  const handleProviderSelect = (providerId: 'local' | 'anthropic' | 'openai') => {
    const provider = providers.find(p => p.id === providerId)
    if (!provider) return

    setSelectedProvider(providerId)

    // Check if API key is needed
    if (provider.requires_api_key && !provider.configured) {
      setShowApiKeyInput(true)
    } else {
      setShowApiKeyInput(false)
      setShowProviderSelection(false)
      initializeChat(providerId, provider)
    }
  }

  const handleApiKeySubmit = () => {
    if (!selectedProvider) return
    const provider = providers.find(p => p.id === selectedProvider)
    if (!provider) return

    setShowApiKeyInput(false)
    setShowProviderSelection(false)
    initializeChat(selectedProvider, provider)
  }

  const initializeChat = (providerId: string, provider: Provider) => {
    const providerName = provider.name
    setMessages([{
      role: 'system',
      content: `Connected to ${providerName}! Describe the widget you want to create in natural language. For example:\n\n- "Show me a pie chart of gender distribution"\n- "Create a bar chart showing applications by college"\n- "Show a table of all shortlisted candidates with their names and colleges"\n- "Display a number card showing total applications from government school students"`,
      timestamp: new Date()
    }])
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!input.trim() || loading || !selectedProvider) return

    const userMessage = input.trim()
    setInput('')

    // Add user message
    setMessages(prev => [...prev, {
      role: 'user',
      content: userMessage,
      timestamp: new Date()
    }])

    setLoading(true)

    try {
      const options: adminApi.AgentOptions = {
        provider: selectedProvider,
        apiKey: customApiKey || undefined
      }

      let res
      if (currentConfig) {
        // Refine existing config
        res = await adminApi.refineWidgetWithAgent(token, currentConfig, userMessage, options)
      } else {
        // Generate new config
        res = await adminApi.generateWidgetWithAgent(token, userMessage, options)
      }

      const data = await res.json()

      if (data.success) {
        setCurrentConfig(data.config)
        setIsEditingQuery(false)
        setEditableQuery('')
        setExpandedQuery(false)
        setMessages(prev => [...prev, {
          role: 'assistant',
          content: `I've ${currentConfig ? 'updated' : 'created'} the widget configuration based on your request.`,
          timestamp: new Date(),
          config: data.config,
          previewData: data.preview_data,
          previewError: data.preview_error,
          queryConfig: data.query_config
        }])
      } else {
        setMessages(prev => [...prev, {
          role: 'assistant',
          content: `Sorry, I couldn't process your request: ${data.error || data.msg || 'Unknown error'}`,
          timestamp: new Date()
        }])
      }
    } catch (err: any) {
      setMessages(prev => [...prev, {
        role: 'assistant',
        content: `Error: ${err.message || 'Failed to communicate with the AI service'}`,
        timestamp: new Date()
      }])
    } finally {
      setLoading(false)
    }
  }

  const handleSaveWidget = async () => {
    if (!currentConfig) return

    setSaving(true)
    try {
      const widgetData = {
        title: currentConfig.title,
        description: currentConfig.description || '',
        widget_type: currentConfig.widget_type,
        config_json: currentConfig.config_json,
        width: currentConfig.width || 'col-md-6'
      }

      const res = await adminApi.createWidget(token, widgetData)
      if (res.ok) {
        setMessages(prev => [...prev, {
          role: 'system',
          content: 'Widget saved successfully! You can now view it in your dashboard.',
          timestamp: new Date()
        }])
        setTimeout(() => onSave(), 1500)
      } else {
        const error = await res.json()
        setMessages(prev => [...prev, {
          role: 'system',
          content: `Failed to save widget: ${error.msg || 'Unknown error'}`,
          timestamp: new Date()
        }])
      }
    } catch (err: any) {
      setMessages(prev => [...prev, {
        role: 'system',
        content: `Error saving widget: ${err.message}`,
        timestamp: new Date()
      }])
    } finally {
      setSaving(false)
    }
  }

  const handleStartOver = () => {
    setCurrentConfig(null)
    setIsEditingQuery(false)
    setEditableQuery('')
    setQueryError(null)
    setExpandedQuery(false)
    if (selectedProvider) {
      const provider = providers.find(p => p.id === selectedProvider)
      if (provider) {
        initializeChat(selectedProvider, provider)
      }
    }
  }

  const handleEditQuery = (config: any) => {
    setEditableQuery(JSON.stringify(config.config_json, null, 2))
    setIsEditingQuery(true)
    setQueryError(null)
    setExpandedQuery(true)
  }

  const handleCancelEdit = () => {
    setIsEditingQuery(false)
    setEditableQuery('')
    setQueryError(null)
  }

  const handleRunEditedQuery = async () => {
    if (!editableQuery.trim()) return

    // Validate JSON
    let parsedConfig: any
    try {
      parsedConfig = JSON.parse(editableQuery)
    } catch (e) {
      setQueryError('Invalid JSON format. Please check your syntax.')
      return
    }

    setRunningQuery(true)
    setQueryError(null)

    try {
      const res = await adminApi.executeWidgetQuery(token, parsedConfig)
      const data = await res.json()

      if (data.success) {
        // Update the current config with the edited query
        const updatedConfig = {
          ...currentConfig,
          config_json: parsedConfig
        }
        setCurrentConfig(updatedConfig)

        // Update the last message with new preview data
        setMessages(prev => {
          const updated = [...prev]
          // Find the last assistant message with config
          for (let i = updated.length - 1; i >= 0; i--) {
            if (updated[i].config) {
              updated[i] = {
                ...updated[i],
                config: updatedConfig,
                previewData: data.data,
                previewError: undefined,
                queryConfig: parsedConfig
              }
              break
            }
          }
          return updated
        })

        setIsEditingQuery(false)
        setEditableQuery('')
      } else {
        setQueryError(data.error || 'Failed to execute query')
      }
    } catch (err: any) {
      setQueryError(err.message || 'Failed to execute query')
    } finally {
      setRunningQuery(false)
    }
  }

  const handleChangeProvider = () => {
    setShowProviderSelection(true)
    setSelectedProvider(null)
    setCustomApiKey('')
    setShowApiKeyInput(false)
    setMessages([])
    setCurrentConfig(null)
  }

  const getWidgetIcon = (type: string) => {
    switch (type) {
      case 'pie': return '🥧'
      case 'bar': return '📊'
      case 'line': return '📈'
      case 'number': return '🔢'
      case 'table': return '📋'
      default: return '📊'
    }
  }

  const getProviderIcon = (id: string) => {
    switch (id) {
      case 'local': return '💻'
      case 'anthropic': return '🤖'
      case 'openai': return '🧠'
      default: return '🔌'
    }
  }

  const getProviderColor = (id: string) => {
    switch (id) {
      case 'local': return '#28a745'
      case 'anthropic': return '#6f42c1'
      case 'openai': return '#00a67e'
      default: return '#6c757d'
    }
  }

  // Provider Selection Screen
  if (showProviderSelection) {
    return (
      <div className="card shadow-sm" style={{ borderRadius: '12px', border: 'none', minHeight: '500px' }}>
        <div
          className="card-header d-flex justify-content-between align-items-center"
          style={{
            backgroundColor: '#6f42c1',
            color: 'white',
            borderRadius: '12px 12px 0 0',
            padding: '16px 20px'
          }}
        >
          <div className="d-flex align-items-center">
            <span style={{ fontSize: '24px', marginRight: '12px' }}>🤖</span>
            <div>
              <h5 className="mb-0" style={{ fontWeight: '600' }}>AI Widget Builder</h5>
              <small style={{ opacity: 0.9 }}>Select an AI provider to get started</small>
            </div>
          </div>
          <button
            className="btn btn-sm"
            onClick={onCancel}
            style={{
              backgroundColor: 'rgba(255,255,255,0.2)',
              color: 'white',
              border: 'none',
              borderRadius: '6px'
            }}
          >
            Back to Manual Builder
          </button>
        </div>

        <div className="card-body" style={{ padding: '24px' }}>
          {loadingProviders ? (
            <div className="text-center py-5">
              <div className="spinner-border" style={{ color: '#6f42c1' }}></div>
              <p className="mt-3 text-muted">Loading AI providers...</p>
            </div>
          ) : (
            <>
              <h6 className="text-muted mb-4">Choose how you want to generate widgets:</h6>
              <div className="row g-4">
                {providers.map(provider => (
                  <div key={provider.id} className="col-md-4">
                    <div
                      className="card h-100"
                      style={{
                        cursor: provider.available || provider.id !== 'local' ? 'pointer' : 'not-allowed',
                        border: `2px solid ${selectedProvider === provider.id ? getProviderColor(provider.id) : '#e9ecef'}`,
                        borderRadius: '12px',
                        transition: 'all 0.2s',
                        opacity: provider.id === 'local' && !provider.available ? 0.6 : 1
                      }}
                      onClick={() => {
                        if (provider.id === 'local' && !provider.available) return
                        handleProviderSelect(provider.id)
                      }}
                      onMouseEnter={(e) => {
                        if (provider.id === 'local' && !provider.available) return
                        e.currentTarget.style.borderColor = getProviderColor(provider.id)
                        e.currentTarget.style.transform = 'translateY(-4px)'
                        e.currentTarget.style.boxShadow = `0 8px 24px ${getProviderColor(provider.id)}25`
                      }}
                      onMouseLeave={(e) => {
                        e.currentTarget.style.borderColor = selectedProvider === provider.id ? getProviderColor(provider.id) : '#e9ecef'
                        e.currentTarget.style.transform = 'translateY(0)'
                        e.currentTarget.style.boxShadow = 'none'
                      }}
                    >
                      <div className="card-body text-center p-4">
                        <div
                          style={{
                            width: '64px',
                            height: '64px',
                            borderRadius: '16px',
                            backgroundColor: `${getProviderColor(provider.id)}15`,
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            margin: '0 auto 16px',
                            fontSize: '28px'
                          }}
                        >
                          {getProviderIcon(provider.id)}
                        </div>
                        <h6 style={{ fontWeight: '600', color: '#2c3e50', marginBottom: '8px' }}>
                          {provider.name}
                          {provider.id === 'local' && provider.available && (
                            <span
                              className="badge ms-2"
                              style={{
                                backgroundColor: '#28a745',
                                fontSize: '9px',
                                padding: '3px 6px',
                                verticalAlign: 'middle'
                              }}
                            >
                              RUNNING
                            </span>
                          )}
                        </h6>
                        <p className="text-muted mb-2" style={{ fontSize: '13px', lineHeight: '1.5' }}>
                          {provider.description}
                        </p>

                        {/* Provider-specific status */}
                        {provider.id === 'local' && (
                          <div style={{ fontSize: '12px' }}>
                            {provider.available ? (
                              <span className="text-success">
                                Model: {provider.model}
                              </span>
                            ) : (
                              <span className="text-danger">
                                {provider.error || 'Ollama not running'}
                              </span>
                            )}
                          </div>
                        )}

                        {(provider.id === 'anthropic' || provider.id === 'openai') && (
                          <div style={{ fontSize: '12px' }}>
                            {provider.configured ? (
                              <span className="text-success">API key configured</span>
                            ) : (
                              <span className="text-muted">API key required</span>
                            )}
                          </div>
                        )}
                      </div>
                    </div>
                  </div>
                ))}
              </div>

              {/* API Key Input */}
              {showApiKeyInput && selectedProvider && (
                <div className="mt-4 p-4" style={{ backgroundColor: '#f8f9fa', borderRadius: '12px' }}>
                  <h6 style={{ fontWeight: '600', marginBottom: '12px' }}>
                    Enter your {selectedProvider === 'anthropic' ? 'Anthropic' : 'OpenAI'} API Key
                  </h6>
                  <div className="input-group">
                    <input
                      type="password"
                      className="form-control"
                      placeholder={providers.find(p => p.id === selectedProvider)?.key_prefix + '...'}
                      value={customApiKey}
                      onChange={(e) => setCustomApiKey(e.target.value)}
                      style={{ borderRadius: '8px 0 0 8px' }}
                    />
                    <button
                      className="btn"
                      onClick={handleApiKeySubmit}
                      disabled={!customApiKey.startsWith(providers.find(p => p.id === selectedProvider)?.key_prefix || '')}
                      style={{
                        backgroundColor: getProviderColor(selectedProvider),
                        color: 'white',
                        borderRadius: '0 8px 8px 0'
                      }}
                    >
                      Connect
                    </button>
                  </div>
                  <small className="text-muted mt-2 d-block">
                    Your API key is sent securely and not stored on the server.
                  </small>
                </div>
              )}
            </>
          )}
        </div>
      </div>
    )
  }

  // Chat Interface
  return (
    <div className="card shadow-sm" style={{ borderRadius: '12px', border: 'none', height: 'calc(100vh - 250px)', minHeight: '600px' }}>
      <div
        className="card-header d-flex justify-content-between align-items-center"
        style={{
          backgroundColor: selectedProvider ? getProviderColor(selectedProvider) : '#6f42c1',
          color: 'white',
          borderRadius: '12px 12px 0 0',
          padding: '16px 20px'
        }}
      >
        <div className="d-flex align-items-center">
          <span style={{ fontSize: '24px', marginRight: '12px' }}>
            {selectedProvider ? getProviderIcon(selectedProvider) : '🤖'}
          </span>
          <div>
            <h5 className="mb-0" style={{ fontWeight: '600' }}>
              AI Widget Builder
              <span
                className="badge ms-2"
                style={{
                  backgroundColor: 'rgba(255,255,255,0.2)',
                  fontSize: '10px',
                  padding: '4px 8px',
                  fontWeight: '500'
                }}
              >
                {providers.find(p => p.id === selectedProvider)?.name || 'AI'}
              </span>
            </h5>
            <small style={{ opacity: 0.9 }}>Describe your widget in natural language</small>
          </div>
        </div>
        <div className="d-flex gap-2">
          <button
            className="btn btn-sm"
            onClick={handleChangeProvider}
            style={{
              backgroundColor: 'rgba(255,255,255,0.2)',
              color: 'white',
              border: 'none',
              borderRadius: '6px'
            }}
          >
            Change Provider
          </button>
          <button
            className="btn btn-sm"
            onClick={onCancel}
            style={{
              backgroundColor: 'rgba(255,255,255,0.2)',
              color: 'white',
              border: 'none',
              borderRadius: '6px'
            }}
          >
            Back to Manual Builder
          </button>
        </div>
      </div>

      <div className="card-body d-flex flex-column" style={{ padding: '0', height: 'calc(100% - 70px)' }}>
        {/* Messages Area */}
        <div
          className="flex-grow-1"
          style={{
            overflowY: 'auto',
            padding: '20px',
            backgroundColor: '#f8f9fa'
          }}
        >
          {messages.map((msg, idx) => (
            <div
              key={idx}
              className={`mb-3 ${msg.role === 'user' ? 'd-flex justify-content-end' : ''}`}
            >
              <div
                style={{
                  maxWidth: msg.config ? '100%' : '80%',
                  padding: '12px 16px',
                  borderRadius: msg.role === 'user' ? '16px 16px 4px 16px' : '16px 16px 16px 4px',
                  backgroundColor: msg.role === 'user'
                    ? (selectedProvider ? getProviderColor(selectedProvider) : '#6f42c1')
                    : msg.role === 'system' ? '#e7f7ff' : 'white',
                  color: msg.role === 'user' ? 'white' : '#2c3e50',
                  boxShadow: '0 1px 3px rgba(0,0,0,0.1)'
                }}
              >
                {msg.role === 'assistant' && (
                  <div className="d-flex align-items-center mb-2">
                    <span style={{ fontSize: '16px', marginRight: '8px' }}>
                      {selectedProvider ? getProviderIcon(selectedProvider) : '🤖'}
                    </span>
                    <strong style={{ fontSize: '12px', color: '#6c757d' }}>AI Assistant</strong>
                  </div>
                )}
                {msg.role === 'system' && (
                  <div className="d-flex align-items-center mb-2">
                    <span style={{ fontSize: '16px', marginRight: '8px' }}>💡</span>
                    <strong style={{ fontSize: '12px', color: '#00BAED' }}>System</strong>
                  </div>
                )}
                <p className="mb-0" style={{ whiteSpace: 'pre-wrap', fontSize: '14px' }}>
                  {msg.content}
                </p>

                {/* Widget Config Preview */}
                {msg.config && (
                  <div className="mt-3">
                    <div
                      className="p-3 mb-3"
                      style={{
                        backgroundColor: '#f8f9fa',
                        borderRadius: '8px',
                        border: '1px solid #e9ecef'
                      }}
                    >
                      <div className="d-flex align-items-center mb-2">
                        <span style={{ fontSize: '24px', marginRight: '10px' }}>
                          {getWidgetIcon(msg.config.widget_type)}
                        </span>
                        <div>
                          <h6 className="mb-0" style={{ fontWeight: '600' }}>{msg.config.title}</h6>
                          <small className="text-muted">{msg.config.description}</small>
                        </div>
                      </div>

                      <div className="d-flex gap-2 mb-3">
                        <span className="badge" style={{ backgroundColor: '#e7f7ff', color: '#00BAED' }}>
                          {msg.config.widget_type}
                        </span>
                        <span className="badge" style={{ backgroundColor: '#f0f0f0', color: '#6c757d' }}>
                          {msg.config.width || 'col-md-6'}
                        </span>
                        {msg.config.config_json?.conditions?.length > 0 && (
                          <span className="badge" style={{ backgroundColor: '#fff3cd', color: '#856404' }}>
                            {msg.config.config_json.conditions.length} filter(s)
                          </span>
                        )}
                      </div>

                      {/* Data Preview */}
                      {msg.previewData && msg.previewData.length > 0 && (
                        <div style={{ height: '250px' }}>
                          <WidgetPreview
                            data={msg.previewData}
                            widgetType={msg.config.widget_type}
                            chartConfig={msg.config.config_json?.chart_config || {}}
                            title={msg.config.title}
                          />
                        </div>
                      )}

                      {msg.previewError && (
                        <div className="alert alert-warning mb-0" style={{ fontSize: '12px' }}>
                          Preview error: {msg.previewError}
                        </div>
                      )}

                      {/* Query Configuration Section */}
                      <div className="mt-3">
                        <div
                          className="d-flex align-items-center justify-content-between"
                          style={{
                            cursor: 'pointer',
                            padding: '8px 12px',
                            backgroundColor: '#f1f3f4',
                            borderRadius: expandedQuery ? '8px 8px 0 0' : '8px',
                            marginBottom: expandedQuery ? 0 : 0
                          }}
                          onClick={() => setExpandedQuery(!expandedQuery)}
                        >
                          <span style={{ fontSize: '13px', fontWeight: '600', color: '#5f6368' }}>
                            {expandedQuery ? '▼' : '▶'} Query Configuration
                          </span>
                          {!isEditingQuery && (
                            <button
                              className="btn btn-sm"
                              onClick={(e) => {
                                e.stopPropagation()
                                handleEditQuery(msg.config)
                              }}
                              style={{
                                backgroundColor: '#e8f0fe',
                                color: '#1967d2',
                                border: 'none',
                                borderRadius: '4px',
                                fontSize: '11px',
                                padding: '4px 8px'
                              }}
                            >
                              Edit Query
                            </button>
                          )}
                        </div>

                        {expandedQuery && (
                          <div
                            style={{
                              border: '1px solid #e0e0e0',
                              borderTop: 'none',
                              borderRadius: '0 0 8px 8px',
                              backgroundColor: '#fafafa'
                            }}
                          >
                            {isEditingQuery ? (
                              <div style={{ padding: '12px' }}>
                                <textarea
                                  value={editableQuery}
                                  onChange={(e) => setEditableQuery(e.target.value)}
                                  style={{
                                    width: '100%',
                                    minHeight: '200px',
                                    fontFamily: 'monospace',
                                    fontSize: '12px',
                                    padding: '10px',
                                    border: queryError ? '2px solid #dc3545' : '1px solid #ced4da',
                                    borderRadius: '6px',
                                    backgroundColor: '#fff',
                                    resize: 'vertical'
                                  }}
                                  spellCheck={false}
                                />
                                {queryError && (
                                  <div style={{ color: '#dc3545', fontSize: '12px', marginTop: '8px' }}>
                                    {queryError}
                                  </div>
                                )}
                                <div className="d-flex gap-2 mt-2">
                                  <button
                                    className="btn btn-sm"
                                    onClick={handleRunEditedQuery}
                                    disabled={runningQuery}
                                    style={{
                                      backgroundColor: '#1967d2',
                                      color: 'white',
                                      border: 'none',
                                      borderRadius: '4px',
                                      fontSize: '12px',
                                      padding: '6px 12px'
                                    }}
                                  >
                                    {runningQuery ? (
                                      <>
                                        <span className="spinner-border spinner-border-sm me-1"></span>
                                        Running...
                                      </>
                                    ) : (
                                      'Run Query'
                                    )}
                                  </button>
                                  <button
                                    className="btn btn-sm"
                                    onClick={handleCancelEdit}
                                    disabled={runningQuery}
                                    style={{
                                      backgroundColor: '#f1f3f4',
                                      color: '#5f6368',
                                      border: 'none',
                                      borderRadius: '4px',
                                      fontSize: '12px',
                                      padding: '6px 12px'
                                    }}
                                  >
                                    Cancel
                                  </button>
                                </div>
                              </div>
                            ) : (
                              <pre
                                style={{
                                  margin: 0,
                                  padding: '12px',
                                  fontSize: '11px',
                                  maxHeight: '300px',
                                  overflowY: 'auto',
                                  backgroundColor: 'transparent'
                                }}
                              >
                                {JSON.stringify(msg.config.config_json || msg.queryConfig, null, 2)}
                              </pre>
                            )}
                          </div>
                        )}
                      </div>
                    </div>

                    <div className="d-flex gap-2 mt-3">
                      <button
                        className="btn btn-sm"
                        onClick={handleSaveWidget}
                        disabled={saving || isEditingQuery}
                        style={{
                          backgroundColor: '#28a745',
                          color: 'white',
                          border: 'none',
                          borderRadius: '6px',
                          padding: '8px 16px'
                        }}
                      >
                        {saving ? 'Saving...' : '💾 Save Widget'}
                      </button>
                      <button
                        className="btn btn-outline-secondary btn-sm"
                        onClick={handleStartOver}
                        style={{ borderRadius: '6px' }}
                      >
                        Start Over
                      </button>
                    </div>
                  </div>
                )}

                <div style={{ fontSize: '10px', color: msg.role === 'user' ? 'rgba(255,255,255,0.7)' : '#adb5bd', marginTop: '8px' }}>
                  {msg.timestamp.toLocaleTimeString()}
                </div>
              </div>
            </div>
          ))}

          {loading && (
            <div className="d-flex align-items-center">
              <div
                style={{
                  padding: '12px 16px',
                  borderRadius: '16px 16px 16px 4px',
                  backgroundColor: 'white',
                  boxShadow: '0 1px 3px rgba(0,0,0,0.1)'
                }}
              >
                <div className="d-flex align-items-center">
                  <div className="spinner-border spinner-border-sm me-2" style={{ color: selectedProvider ? getProviderColor(selectedProvider) : '#6f42c1' }}></div>
                  <span style={{ color: '#6c757d', fontSize: '14px' }}>AI is thinking...</span>
                </div>
              </div>
            </div>
          )}

          <div ref={messagesEndRef} />
        </div>

        {/* Input Area */}
        <div
          style={{
            padding: '16px 20px',
            borderTop: '1px solid #e9ecef',
            backgroundColor: 'white'
          }}
        >
          <form onSubmit={handleSubmit}>
            <div className="input-group">
              <input
                type="text"
                className="form-control"
                placeholder={currentConfig
                  ? "Describe changes you want to make..."
                  : "Describe the widget you want to create..."
                }
                value={input}
                onChange={(e) => setInput(e.target.value)}
                disabled={loading}
                style={{
                  borderRadius: '24px 0 0 24px',
                  padding: '12px 20px',
                  border: '2px solid #e9ecef',
                  fontSize: '14px'
                }}
              />
              <button
                type="submit"
                className="btn"
                disabled={loading || !input.trim()}
                style={{
                  backgroundColor: selectedProvider ? getProviderColor(selectedProvider) : '#6f42c1',
                  color: 'white',
                  border: 'none',
                  borderRadius: '0 24px 24px 0',
                  padding: '12px 24px',
                  fontWeight: '500'
                }}
              >
                {loading ? (
                  <span className="spinner-border spinner-border-sm"></span>
                ) : (
                  '→'
                )}
              </button>
            </div>
            {currentConfig && (
              <div className="mt-2 text-center">
                <small className="text-muted">
                  You can refine the widget by describing changes, or save it as is.
                </small>
              </div>
            )}
          </form>
        </div>
      </div>
    </div>
  )
}
