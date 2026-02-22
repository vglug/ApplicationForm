import React, { useState, useEffect, useRef } from 'react'
import * as adminApi from '../../services/adminApi'

interface Props {
  token: string
}

interface CandidateResult {
  candidate_id: string
  full_name: string
  college_name: string
  department: string
  appeared_for_one_to_one: boolean
  appeared_marked_at: string | null
}

interface CheckinStats {
  total_shortlisted: number
  total_appeared: number
  shortlisted_appeared: number
  pending: number
}

interface RecentCheckin {
  candidate_id: string
  full_name: string
  college_name: string
  appeared_marked_at: string | null
}

export default function VolunteerCheckin({ token }: Props) {
  const [searchTerm, setSearchTerm] = useState('')
  const [searching, setSearching] = useState(false)
  const [candidates, setCandidates] = useState<CandidateResult[]>([])
  const [error, setError] = useState<string | null>(null)
  const [success, setSuccess] = useState<string | null>(null)
  const [marking, setMarking] = useState<string | null>(null)
  const [stats, setStats] = useState<CheckinStats | null>(null)
  const [recentCheckins, setRecentCheckins] = useState<RecentCheckin[]>([])
  const [showScanner, setShowScanner] = useState(false)
  const videoRef = useRef<HTMLVideoElement>(null)
  const streamRef = useRef<MediaStream | null>(null)
  const inputRef = useRef<HTMLInputElement>(null)

  useEffect(() => {
    loadStats()
    loadRecentCheckins()
    // Focus input on mount
    inputRef.current?.focus()
  }, [])

  useEffect(() => {
    // Cleanup camera stream on unmount
    return () => {
      if (streamRef.current) {
        streamRef.current.getTracks().forEach(track => track.stop())
      }
    }
  }, [])

  const loadStats = async () => {
    try {
      const res = await adminApi.getCheckinStats(token)
      if (res.ok) {
        const data = await res.json()
        setStats(data)
      }
    } catch (err) {
      console.error('Failed to load stats:', err)
    }
  }

  const loadRecentCheckins = async () => {
    try {
      const res = await adminApi.getRecentCheckins(token, 10)
      if (res.ok) {
        const data = await res.json()
        setRecentCheckins(data.recent_checkins)
      }
    } catch (err) {
      console.error('Failed to load recent checkins:', err)
    }
  }

  const handleSearch = async (term?: string) => {
    const searchValue = term || searchTerm.trim()
    if (!searchValue || searchValue.length < 4) {
      setError('Please enter at least 4 characters')
      return
    }

    setSearching(true)
    setError(null)
    setSuccess(null)
    setCandidates([])

    try {
      const res = await adminApi.searchCandidateForCheckin(token, searchValue)
      const data = await res.json()

      if (res.ok) {
        if (data.candidates && data.candidates.length > 0) {
          setCandidates(data.candidates)
        } else {
          setError('No candidate found with this ID')
        }
      } else {
        setError(data.msg || 'Search failed')
      }
    } catch (err: any) {
      setError(err.message || 'Search failed')
    } finally {
      setSearching(false)
    }
  }

  const handleMarkAppeared = async (candidateId: string, currentStatus: boolean) => {
    setMarking(candidateId)
    setError(null)
    setSuccess(null)

    try {
      const res = await adminApi.markCandidateAppeared(token, candidateId, !currentStatus)
      const data = await res.json()

      if (res.ok) {
        setSuccess(data.msg)
        // Update the candidate in the list
        setCandidates(prev => prev.map(c =>
          c.candidate_id === candidateId
            ? { ...c, appeared_for_one_to_one: !currentStatus, appeared_marked_at: data.appeared_marked_at }
            : c
        ))
        // Reload stats and recent checkins
        loadStats()
        loadRecentCheckins()
        // Clear search after successful mark
        if (!currentStatus) {
          setTimeout(() => {
            setSearchTerm('')
            setCandidates([])
            setSuccess(null)
            inputRef.current?.focus()
          }, 2000)
        }
      } else {
        setError(data.msg || 'Failed to update status')
      }
    } catch (err: any) {
      setError(err.message || 'Failed to update status')
    } finally {
      setMarking(null)
    }
  }

  const startScanner = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: 'environment' }
      })
      streamRef.current = stream
      setShowScanner(true)
      setError(null)
    } catch (err: any) {
      setError('Camera access denied. Please enter the ID manually.')
      setShowScanner(false)
    }
  }

  // Effect to attach stream to video element when scanner is shown
  useEffect(() => {
    if (showScanner && streamRef.current && videoRef.current) {
      const video = videoRef.current
      video.srcObject = streamRef.current

      const handleLoadedMetadata = () => {
        video.play().catch(console.error)

        // Use BarcodeDetector if available
        if ('BarcodeDetector' in window) {
          const barcodeDetector = new (window as any).BarcodeDetector({
            formats: ['qr_code']
          })

          const detectBarcode = async () => {
            if (!videoRef.current || !streamRef.current?.active) return

            try {
              const barcodes = await barcodeDetector.detect(videoRef.current)
              if (barcodes.length > 0) {
                const value = barcodes[0].rawValue
                stopScanner()
                setSearchTerm(value)
                handleSearch(value)
                return
              }
            } catch (e) {
              // Continue scanning
            }

            if (streamRef.current?.active) {
              requestAnimationFrame(detectBarcode)
            }
          }

          detectBarcode()
        } else {
          setError('QR scanning is not supported in this browser. Please enter the ID manually.')
          stopScanner()
        }
      }

      video.addEventListener('loadedmetadata', handleLoadedMetadata)

      return () => {
        video.removeEventListener('loadedmetadata', handleLoadedMetadata)
      }
    }
  }, [showScanner])

  const stopScanner = () => {
    if (streamRef.current) {
      streamRef.current.getTracks().forEach(track => track.stop())
      streamRef.current = null
    }
    setShowScanner(false)
  }

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      handleSearch()
    }
  }

  return (
    <div className="container-fluid">
      {/* Header with Stats */}
      <div className="row mb-4">
        <div className="col-12">
          <div className="card shadow-sm" style={{ borderRadius: '12px', border: 'none' }}>
            <div
              className="card-header"
              style={{
                backgroundColor: '#00BAED',
                color: 'white',
                borderRadius: '12px 12px 0 0',
                padding: '20px 24px'
              }}
            >
              <h4 className="mb-1" style={{ fontWeight: '600' }}>Candidate Check-in</h4>
              <small style={{ opacity: 0.9 }}>Scan QR code or enter last 4 digits of Candidate ID</small>
            </div>
            <div className="card-body">
              {/* Stats Row */}
              {stats && (
                <div className="row g-3 mb-4">
                  <div className="col-6 col-md-3">
                    <div className="text-center p-3" style={{ backgroundColor: '#e7f7ff', borderRadius: '8px' }}>
                      <div style={{ fontSize: '28px', fontWeight: '700', color: '#00BAED' }}>
                        {stats.total_shortlisted}
                      </div>
                      <small className="text-muted">Total Shortlisted</small>
                    </div>
                  </div>
                  <div className="col-6 col-md-3">
                    <div className="text-center p-3" style={{ backgroundColor: '#d4edda', borderRadius: '8px' }}>
                      <div style={{ fontSize: '28px', fontWeight: '700', color: '#28a745' }}>
                        {stats.total_appeared}
                      </div>
                      <small className="text-muted">Total Appeared</small>
                    </div>
                  </div>
                  <div className="col-6 col-md-3">
                    <div className="text-center p-3" style={{ backgroundColor: '#cce5ff', borderRadius: '8px' }}>
                      <div style={{ fontSize: '28px', fontWeight: '700', color: '#0056b3' }}>
                        {stats.shortlisted_appeared}
                      </div>
                      <small className="text-muted">Shortlisted & Appeared</small>
                    </div>
                  </div>
                  <div className="col-6 col-md-3">
                    <div className="text-center p-3" style={{ backgroundColor: '#fff3cd', borderRadius: '8px' }}>
                      <div style={{ fontSize: '28px', fontWeight: '700', color: '#856404' }}>
                        {stats.pending}
                      </div>
                      <small className="text-muted">Pending</small>
                    </div>
                  </div>
                </div>
              )}

              {/* Search Input */}
              <div className="row justify-content-center">
                <div className="col-md-8 col-lg-6">
                  <div className="input-group input-group-lg mb-3">
                    <input
                      ref={inputRef}
                      type="text"
                      className="form-control"
                      placeholder="Enter last 4 digits or full Candidate ID"
                      value={searchTerm}
                      onChange={(e) => setSearchTerm(e.target.value.toUpperCase())}
                      onKeyPress={handleKeyPress}
                      disabled={searching || showScanner}
                      style={{
                        borderRadius: '8px 0 0 8px',
                        fontSize: '18px',
                        padding: '12px 16px'
                      }}
                      autoComplete="off"
                      autoFocus
                    />
                    <button
                      className="btn"
                      onClick={() => handleSearch()}
                      disabled={searching || !searchTerm.trim()}
                      style={{
                        backgroundColor: '#00BAED',
                        color: 'white',
                        borderRadius: '0',
                        padding: '12px 24px'
                      }}
                    >
                      {searching ? (
                        <span className="spinner-border spinner-border-sm"></span>
                      ) : (
                        'Search'
                      )}
                    </button>
                    <button
                      className="btn"
                      onClick={showScanner ? stopScanner : startScanner}
                      style={{
                        backgroundColor: showScanner ? '#dc3545' : '#6f42c1',
                        color: 'white',
                        borderRadius: '0 8px 8px 0',
                        padding: '12px 16px'
                      }}
                      title={showScanner ? 'Stop Scanner' : 'Scan QR Code'}
                    >
                      {showScanner ? 'Stop' : 'Scan QR'}
                    </button>
                  </div>

                  {/* QR Scanner */}
                  {showScanner && (
                    <div className="mb-4 text-center">
                      <div
                        style={{
                          position: 'relative',
                          maxWidth: '400px',
                          margin: '0 auto',
                          borderRadius: '12px',
                          overflow: 'hidden',
                          border: '3px solid #6f42c1'
                        }}
                      >
                        <video
                          ref={videoRef}
                          style={{ width: '100%', height: '300px', display: 'block', backgroundColor: '#000', objectFit: 'cover' }}
                          playsInline
                          muted
                          autoPlay
                        />
                        <div
                          style={{
                            position: 'absolute',
                            top: '50%',
                            left: '50%',
                            transform: 'translate(-50%, -50%)',
                            width: '200px',
                            height: '200px',
                            border: '2px dashed rgba(255,255,255,0.5)',
                            borderRadius: '12px'
                          }}
                        />
                      </div>
                      <p className="text-muted mt-2" style={{ fontSize: '14px' }}>
                        Position the QR code within the frame
                      </p>
                    </div>
                  )}

                  {/* Error/Success Messages */}
                  {error && (
                    <div className="alert alert-danger" style={{ borderRadius: '8px' }}>
                      {error}
                    </div>
                  )}
                  {success && (
                    <div className="alert alert-success" style={{ borderRadius: '8px' }}>
                      {success}
                    </div>
                  )}
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Search Results */}
      {candidates.length > 0 && (
        <div className="row mb-4">
          <div className="col-12">
            <div className="card shadow-sm" style={{ borderRadius: '12px', border: 'none' }}>
              <div className="card-header" style={{ backgroundColor: '#f8f9fa', padding: '16px 20px' }}>
                <h5 className="mb-0" style={{ fontWeight: '600' }}>Search Results</h5>
              </div>
              <div className="card-body p-0">
                {candidates.map((candidate) => (
                  <div
                    key={candidate.candidate_id}
                    className="d-flex align-items-center justify-content-between p-4"
                    style={{
                      borderBottom: '1px solid #e9ecef',
                      backgroundColor: candidate.appeared_for_one_to_one ? '#d4edda' : 'white'
                    }}
                  >
                    <div>
                      <h5 className="mb-1" style={{ fontWeight: '600' }}>
                        {candidate.full_name}
                        {candidate.appeared_for_one_to_one && (
                          <span
                            className="badge ms-2"
                            style={{
                              backgroundColor: '#28a745',
                              fontSize: '11px',
                              padding: '4px 8px',
                              verticalAlign: 'middle'
                            }}
                          >
                            APPEARED
                          </span>
                        )}
                      </h5>
                      <p className="mb-1 text-muted" style={{ fontSize: '14px' }}>
                        <strong>ID:</strong> {candidate.candidate_id}
                      </p>
                      <p className="mb-0 text-muted" style={{ fontSize: '14px' }}>
                        <strong>College:</strong> {candidate.college_name} | <strong>Dept:</strong> {candidate.department}
                      </p>
                      {candidate.appeared_marked_at && (
                        <small className="text-success">
                          Marked at: {new Date(candidate.appeared_marked_at).toLocaleString()}
                        </small>
                      )}
                    </div>
                    <div className="flex-shrink-0">
                      <button
                        className="btn"
                        onClick={() => handleMarkAppeared(candidate.candidate_id, candidate.appeared_for_one_to_one)}
                        disabled={marking === candidate.candidate_id}
                        style={{
                          backgroundColor: candidate.appeared_for_one_to_one ? '#dc3545' : '#28a745',
                          color: 'white',
                          borderRadius: '6px',
                          padding: '8px 12px',
                          fontSize: '13px',
                          whiteSpace: 'nowrap'
                        }}
                      >
                        {marking === candidate.candidate_id ? (
                          <span className="spinner-border spinner-border-sm"></span>
                        ) : candidate.appeared_for_one_to_one ? (
                          'Unmark'
                        ) : (
                          'Mark Appeared'
                        )}
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Recent Check-ins */}
      {recentCheckins.length > 0 && (
        <div className="row">
          <div className="col-12">
            <div className="card shadow-sm" style={{ borderRadius: '12px', border: 'none' }}>
              <div className="card-header" style={{ backgroundColor: '#f8f9fa', padding: '16px 20px' }}>
                <h5 className="mb-0" style={{ fontWeight: '600' }}>Recent Check-ins</h5>
              </div>
              <div className="table-responsive">
                <table className="table table-hover mb-0">
                  <thead style={{ backgroundColor: '#f8f9fa' }}>
                    <tr>
                      <th style={{ padding: '12px 16px' }}>Candidate ID</th>
                      <th style={{ padding: '12px 16px' }}>Name</th>
                      <th style={{ padding: '12px 16px' }}>College</th>
                      <th style={{ padding: '12px 16px' }}>Check-in Time</th>
                    </tr>
                  </thead>
                  <tbody>
                    {recentCheckins.map((checkin) => (
                      <tr key={checkin.candidate_id}>
                        <td style={{ padding: '12px 16px', fontWeight: '500' }}>{checkin.candidate_id}</td>
                        <td style={{ padding: '12px 16px' }}>{checkin.full_name}</td>
                        <td style={{ padding: '12px 16px' }}>{checkin.college_name}</td>
                        <td style={{ padding: '12px 16px' }}>
                          {checkin.appeared_marked_at
                            ? new Date(checkin.appeared_marked_at).toLocaleString()
                            : '-'}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
