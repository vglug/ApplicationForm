import React, { useState, useEffect } from 'react'
import { getApplications, shortlistApplication, bulkShortlistApplications, ApplicationFilters } from '../../services/adminApi'

interface Application {
  id: number
  candidate_id: string
  uuid: string
  status: string
  created_at: string
  basic_info: {
    full_name: string
    email: string
    contact: string
    gender: string
    dob: string | null
    shortlisted: boolean | null
    appeared_for_one_to_one?: boolean
    selected?: boolean | null
    considered?: boolean | null
  }
}

interface Props {
  token: string
  onViewApplication: (candidateId: string) => void
  filterCandidateIds?: string[]
  filterTitle?: string
  onClearFilter?: () => void
  userRole?: string
}

type QuickFilter = 'all' | 'appeared' | 'selected' | 'considered_not_selected'

export default function SubmissionsList({ token, onViewApplication, filterCandidateIds, filterTitle, onClearFilter, userRole }: Props) {
  const [applications, setApplications] = useState<Application[]>([])
  const [loading, setLoading] = useState(true)
  const [page, setPage] = useState(1)
  const [totalPages, setTotalPages] = useState(1)
  const [total, setTotal] = useState(0)
  const [sortBy, setSortBy] = useState('created_at')
  const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('desc')
  const [search, setSearch] = useState('')
  const [searchInput, setSearchInput] = useState('')

  // Quick filter for admin
  const [quickFilter, setQuickFilter] = useState<QuickFilter>(userRole === 'panel_member' ? 'appeared' : 'all')

  // Selection state for bulk actions
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set())
  const [bulkLoading, setBulkLoading] = useState(false)

  useEffect(() => {
    fetchApplications()
  }, [page, sortBy, sortOrder, search, filterCandidateIds, quickFilter])

  // Clear selection when page changes
  useEffect(() => {
    setSelectedIds(new Set())
  }, [page, filterCandidateIds])

  // Set default filter for panel members
  useEffect(() => {
    if (userRole === 'panel_member') {
      setQuickFilter('appeared')
    }
  }, [userRole])

  const fetchApplications = async () => {
    setLoading(true)
    try {
      const candidateIdsParam = filterCandidateIds?.join(',') || ''

      // Build filters based on quickFilter
      const filters: ApplicationFilters = {}
      if (quickFilter === 'appeared' || userRole === 'panel_member') {
        filters.filterAppeared = 'true'
      } else if (quickFilter === 'selected') {
        filters.filterSelected = 'true'
      } else if (quickFilter === 'considered_not_selected') {
        filters.filterConsidered = 'true'
        filters.filterSelected = 'false'
      }

      const res = await getApplications(token, page, 20, sortBy, sortOrder, search, candidateIdsParam, filters)
      if (res.ok) {
        const data = await res.json()
        setApplications(data.applications)
        setTotalPages(data.pages)
        setTotal(data.total)
      }
    } catch (error) {
      console.error('Failed to fetch applications:', error)
    } finally {
      setLoading(false)
    }
  }

  const handleSort = (column: string) => {
    if (sortBy === column) {
      setSortOrder(sortOrder === 'asc' ? 'desc' : 'asc')
    } else {
      setSortBy(column)
      setSortOrder('asc')
    }
  }

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault()
    setSearch(searchInput)
    setPage(1)
  }

  const formatDate = (dateStr: string) => {
    return new Date(dateStr).toLocaleDateString('en-IN', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    })
  }

  // Individual shortlist toggle
  const handleShortlistToggle = async (candidateId: string, currentlyShortlisted: boolean | null) => {
    const newValue = !currentlyShortlisted
    try {
      const res = await shortlistApplication(token, candidateId, newValue)
      if (res.ok) {
        // Update local state
        setApplications(prev => prev.map(app =>
          app.candidate_id === candidateId
            ? { ...app, basic_info: { ...app.basic_info, shortlisted: newValue } }
            : app
        ))
      } else {
        const error = await res.json()
        alert(`Failed to update shortlist status: ${error.msg}`)
      }
    } catch (err: any) {
      alert(`Error: ${err.message}`)
    }
  }

  // Selection handlers
  const handleSelectAll = () => {
    if (selectedIds.size === applications.length) {
      setSelectedIds(new Set())
    } else {
      setSelectedIds(new Set(applications.map(app => app.candidate_id)))
    }
  }

  const handleSelectOne = (candidateId: string) => {
    const newSelected = new Set(selectedIds)
    if (newSelected.has(candidateId)) {
      newSelected.delete(candidateId)
    } else {
      newSelected.add(candidateId)
    }
    setSelectedIds(newSelected)
  }

  // Bulk shortlist/unshortlist
  const handleBulkShortlist = async (shortlisted: boolean) => {
    if (selectedIds.size === 0) return

    setBulkLoading(true)
    try {
      const res = await bulkShortlistApplications(token, Array.from(selectedIds), shortlisted)
      if (res.ok) {
        const data = await res.json()
        // Update local state
        setApplications(prev => prev.map(app =>
          selectedIds.has(app.candidate_id)
            ? { ...app, basic_info: { ...app.basic_info, shortlisted } }
            : app
        ))
        setSelectedIds(new Set())
        alert(data.msg)
      } else {
        const error = await res.json()
        alert(`Failed to update: ${error.msg}`)
      }
    } catch (err: any) {
      alert(`Error: ${err.message}`)
    } finally {
      setBulkLoading(false)
    }
  }

  const SortIcon = ({ column }: { column: string }) => {
    if (sortBy !== column) {
      return <i className="bi bi-arrow-down-up text-muted ms-1" style={{ fontSize: '0.8rem' }}></i>
    }
    return sortOrder === 'asc'
      ? <i className="bi bi-arrow-up text-primary ms-1"></i>
      : <i className="bi bi-arrow-down text-primary ms-1"></i>
  }

  const ShortlistBadge = ({ shortlisted }: { shortlisted: boolean | null }) => {
    if (shortlisted === true) {
      return <span className="badge bg-success" style={{ fontSize: '10px' }}>Shortlisted</span>
    }
    return null
  }

  return (
    <div className="container-fluid py-4 px-3 px-md-4">
      <div className="d-flex flex-column flex-md-row justify-content-between align-items-start align-items-md-center mb-4 gap-2">
        <h2 className="h4 h-md-2 mb-0" style={{ color: '#00BAED' }}>Form Submissions</h2>
        <div className="text-muted">
          Total: {total} submission{total !== 1 ? 's' : ''}
        </div>
      </div>

      {/* Widget Filter Banner */}
      {filterCandidateIds && filterCandidateIds.length > 0 && (
        <div className="alert alert-info d-flex justify-content-between align-items-center mb-4" style={{ borderRadius: '8px' }}>
          <div>
            <strong>Filtered by Widget:</strong> {filterTitle || 'Custom Widget'}
            <span className="ms-2 badge bg-primary">{filterCandidateIds.length} records</span>
          </div>
          {onClearFilter && (
            <button
              className="btn btn-sm btn-outline-primary"
              onClick={onClearFilter}
            >
              Clear Filter
            </button>
          )}
        </div>
      )}

      {/* Quick Filters - Admin only */}
      {userRole === 'admin' && (
        <div className="mb-4">
          <div className="d-flex flex-wrap gap-2 align-items-center">
            <span className="text-muted me-2" style={{ fontSize: '14px' }}>Quick Filters:</span>
            <button
              className={`btn btn-sm ${quickFilter === 'all' ? 'btn-primary' : 'btn-outline-secondary'}`}
              onClick={() => { setQuickFilter('all'); setPage(1) }}
              style={{ borderRadius: '20px', padding: '4px 12px', fontSize: '13px' }}
            >
              All Submissions
            </button>
            <button
              className={`btn btn-sm ${quickFilter === 'appeared' ? 'btn-success' : 'btn-outline-success'}`}
              onClick={() => { setQuickFilter('appeared'); setPage(1) }}
              style={{ borderRadius: '20px', padding: '4px 12px', fontSize: '13px' }}
            >
              Appeared for Interview
            </button>
            <button
              className={`btn btn-sm ${quickFilter === 'selected' ? 'btn-info' : 'btn-outline-info'}`}
              onClick={() => { setQuickFilter('selected'); setPage(1) }}
              style={{ borderRadius: '20px', padding: '4px 12px', fontSize: '13px' }}
            >
              Selected
            </button>
            <button
              className={`btn btn-sm ${quickFilter === 'considered_not_selected' ? 'btn-warning' : 'btn-outline-warning'}`}
              onClick={() => { setQuickFilter('considered_not_selected'); setPage(1) }}
              style={{ borderRadius: '20px', padding: '4px 12px', fontSize: '13px' }}
            >
              Considered but Not Selected
            </button>
          </div>
        </div>
      )}

      {/* Panel Member Info Banner */}
      {userRole === 'panel_member' && (
        <div className="alert alert-success d-flex align-items-center mb-4" style={{ borderRadius: '8px' }}>
          <span style={{ fontSize: '20px', marginRight: '12px' }}>&#128100;</span>
          <div>
            <strong>Panel Member View:</strong> Showing only candidates who have appeared for one-to-one interview
          </div>
        </div>
      )}

      {/* Bulk Actions Bar */}
      {selectedIds.size > 0 && (
        <div className="alert alert-secondary d-flex justify-content-between align-items-center mb-4" style={{ borderRadius: '8px' }}>
          <div>
            <strong>{selectedIds.size}</strong> application{selectedIds.size !== 1 ? 's' : ''} selected
          </div>
          <div className="d-flex gap-2">
            <button
              className="btn btn-sm btn-success"
              onClick={() => handleBulkShortlist(true)}
              disabled={bulkLoading}
            >
              {bulkLoading ? 'Processing...' : 'Shortlist Selected'}
            </button>
            <button
              className="btn btn-sm btn-outline-danger"
              onClick={() => handleBulkShortlist(false)}
              disabled={bulkLoading}
            >
              {bulkLoading ? 'Processing...' : 'Remove from Shortlist'}
            </button>
            <button
              className="btn btn-sm btn-outline-secondary"
              onClick={() => setSelectedIds(new Set())}
            >
              Clear Selection
            </button>
          </div>
        </div>
      )}

      {/* Search Bar */}
      <div className="card shadow-sm mb-4">
        <div className="card-body">
          <form onSubmit={handleSearch} className="row g-3">
            <div className="col-12 col-md-10">
              <input
                type="text"
                className="form-control"
                placeholder="Search by Candidate ID, Name, Email, Contact, or Gender..."
                value={searchInput}
                onChange={(e) => setSearchInput(e.target.value)}
              />
            </div>
            <div className="col-12 col-md-2">
              <button type="submit" className="btn btn-primary w-100">
                <i className="bi bi-search me-2"></i>Search
              </button>
            </div>
          </form>
          {search && (
            <div className="mt-2">
              <small className="text-muted">
                Searching for: <strong>{search}</strong>
                <button
                  className="btn btn-sm btn-link text-danger"
                  onClick={() => {
                    setSearch('')
                    setSearchInput('')
                    setPage(1)
                  }}
                >
                  Clear
                </button>
              </small>
            </div>
          )}
        </div>
      </div>

      {/* Table */}
      <div className="card shadow-sm">
        <div className="card-body p-0">
          {loading ? (
            <div className="text-center py-5">
              <div className="spinner-border text-primary" role="status">
                <span className="visually-hidden">Loading...</span>
              </div>
            </div>
          ) : applications.length === 0 ? (
            <div className="text-center py-5 text-muted">
              <i className="bi bi-inbox" style={{ fontSize: '3rem' }}></i>
              <p className="mt-3">No submissions found</p>
            </div>
          ) : (
            <>
              {/* Desktop Table View - hidden on mobile */}
              <div className="table-responsive d-none d-lg-block">
                <table className="table table-hover mb-0">
                  <thead style={{ backgroundColor: '#f8f9fa', position: 'sticky', top: 0 }}>
                    <tr>
                      <th style={{ width: '40px' }}>
                        <input
                          type="checkbox"
                          className="form-check-input"
                          checked={selectedIds.size === applications.length && applications.length > 0}
                          onChange={handleSelectAll}
                        />
                      </th>
                      <th
                        style={{ cursor: 'pointer', userSelect: 'none' }}
                        onClick={() => handleSort('candidate_id')}
                      >
                        Candidate ID <SortIcon column="candidate_id" />
                      </th>
                      <th
                        style={{ cursor: 'pointer', userSelect: 'none' }}
                        onClick={() => handleSort('full_name')}
                      >
                        Name <SortIcon column="full_name" />
                      </th>
                      <th
                        style={{ cursor: 'pointer', userSelect: 'none' }}
                        onClick={() => handleSort('email')}
                      >
                        Email <SortIcon column="email" />
                      </th>
                      <th
                        style={{ cursor: 'pointer', userSelect: 'none' }}
                        onClick={() => handleSort('contact')}
                      >
                        Contact <SortIcon column="contact" />
                      </th>
                      <th
                        style={{ cursor: 'pointer', userSelect: 'none' }}
                        onClick={() => handleSort('gender')}
                      >
                        Gender <SortIcon column="gender" />
                      </th>
                      <th style={{ width: '100px' }}>Status</th>
                      <th className="text-center">Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {applications.map((app) => (
                      <tr key={app.id} className={app.basic_info.shortlisted ? 'table-success' : ''}>
                        <td>
                          <input
                            type="checkbox"
                            className="form-check-input"
                            checked={selectedIds.has(app.candidate_id)}
                            onChange={() => handleSelectOne(app.candidate_id)}
                          />
                        </td>
                        <td>
                          <code style={{ color: '#00BAED' }}>{app.candidate_id}</code>
                        </td>
                        <td>
                          {app.basic_info.full_name}
                          <div><ShortlistBadge shortlisted={app.basic_info.shortlisted} /></div>
                        </td>
                        <td><small>{app.basic_info.email}</small></td>
                        <td>{app.basic_info.contact}</td>
                        <td>{app.basic_info.gender}</td>
                        <td>
                          <button
                            className={`btn btn-sm ${app.basic_info.shortlisted ? 'btn-success' : 'btn-outline-secondary'}`}
                            onClick={() => handleShortlistToggle(app.candidate_id, app.basic_info.shortlisted)}
                            title={app.basic_info.shortlisted ? 'Click to remove from shortlist' : 'Click to shortlist'}
                            style={{ fontSize: '11px', padding: '2px 8px' }}
                          >
                            {app.basic_info.shortlisted ? '★ Shortlisted' : '☆ Shortlist'}
                          </button>
                        </td>
                        <td className="text-center">
                          <button
                            className="btn btn-sm btn-outline-primary"
                            onClick={() => onViewApplication(app.candidate_id)}
                          >
                            <i className="bi bi-eye me-1"></i>View
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              {/* Mobile Card View - shown only on mobile */}
              <div className="d-lg-none p-3">
                {applications.map((app) => (
                  <div key={app.id} className={`card mb-3 shadow-sm ${app.basic_info.shortlisted ? 'border-success' : ''}`}>
                    <div className="card-body">
                      <div className="d-flex justify-content-between align-items-start mb-2">
                        <div className="d-flex align-items-center gap-2">
                          <input
                            type="checkbox"
                            className="form-check-input"
                            checked={selectedIds.has(app.candidate_id)}
                            onChange={() => handleSelectOne(app.candidate_id)}
                          />
                          <code style={{ color: '#00BAED', fontSize: '0.9rem' }}>{app.candidate_id}</code>
                        </div>
                        <div className="d-flex gap-1">
                          <ShortlistBadge shortlisted={app.basic_info.shortlisted} />
                          <span className="badge bg-secondary" style={{ fontSize: '0.75rem' }}>{app.basic_info.gender}</span>
                        </div>
                      </div>
                      <h6 className="card-title mb-2">{app.basic_info.full_name}</h6>
                      <div className="mb-2">
                        <small className="text-muted d-block" style={{ fontSize: '0.85rem', wordBreak: 'break-all' }}>
                          <i className="bi bi-envelope me-1"></i>{app.basic_info.email}
                        </small>
                        <small className="text-muted d-block" style={{ fontSize: '0.85rem' }}>
                          <i className="bi bi-telephone me-1"></i>{app.basic_info.contact}
                        </small>
                        <small className="text-muted d-block" style={{ fontSize: '0.85rem' }}>
                          <i className="bi bi-calendar me-1"></i>{formatDate(app.created_at)}
                        </small>
                      </div>
                      <div className="d-flex gap-2">
                        <button
                          className={`btn btn-sm flex-grow-1 ${app.basic_info.shortlisted ? 'btn-success' : 'btn-outline-secondary'}`}
                          onClick={() => handleShortlistToggle(app.candidate_id, app.basic_info.shortlisted)}
                        >
                          {app.basic_info.shortlisted ? '★ Shortlisted' : '☆ Shortlist'}
                        </button>
                        <button
                          className="btn btn-sm btn-outline-primary flex-grow-1"
                          onClick={() => onViewApplication(app.candidate_id)}
                        >
                          <i className="bi bi-eye me-1"></i>View
                        </button>
                      </div>
                    </div>
                  </div>
                ))}
              </div>

              {/* Pagination */}
              {totalPages > 1 && (
                <div className="d-flex flex-column flex-md-row justify-content-between align-items-center p-3 border-top gap-2">
                  <div className="text-muted" style={{ fontSize: '0.9rem' }}>
                    Page {page} of {totalPages}
                  </div>
                  <nav>
                    <ul className="pagination mb-0" style={{ flexWrap: 'wrap', justifyContent: 'center' }}>
                      <li className={`page-item ${page === 1 ? 'disabled' : ''}`}>
                        <button
                          className="page-link"
                          onClick={() => setPage(page - 1)}
                          disabled={page === 1}
                          style={{ fontSize: '0.875rem', padding: '0.375rem 0.75rem' }}
                        >
                          Previous
                        </button>
                      </li>
                      {Array.from({ length: Math.min(5, totalPages) }, (_, i) => {
                        let pageNum;
                        if (totalPages <= 5) {
                          pageNum = i + 1;
                        } else if (page <= 3) {
                          pageNum = i + 1;
                        } else if (page >= totalPages - 2) {
                          pageNum = totalPages - 4 + i;
                        } else {
                          pageNum = page - 2 + i;
                        }
                        return (
                          <li key={pageNum} className={`page-item ${page === pageNum ? 'active' : ''}`}>
                            <button
                              className="page-link"
                              onClick={() => setPage(pageNum)}
                              style={{ fontSize: '0.875rem', padding: '0.375rem 0.75rem' }}
                            >
                              {pageNum}
                            </button>
                          </li>
                        );
                      })}
                      <li className={`page-item ${page === totalPages ? 'disabled' : ''}`}>
                        <button
                          className="page-link"
                          onClick={() => setPage(page + 1)}
                          disabled={page === totalPages}
                          style={{ fontSize: '0.875rem', padding: '0.375rem 0.75rem' }}
                        >
                          Next
                        </button>
                      </li>
                    </ul>
                  </nav>
                </div>
              )}
            </>
          )}
        </div>
      </div>
    </div>
  )
}
