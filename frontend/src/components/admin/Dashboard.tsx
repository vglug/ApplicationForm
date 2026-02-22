import React, { useState, useEffect } from 'react'
import * as adminApi from '../../services/adminApi'
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
  LineChart,
  Line
} from 'recharts'

interface DashboardProps {
  token: string
  onNavigateToSubmissions?: (candidateIds: string[], filterTitle: string) => void
}

interface DashboardStats {
  overview: {
    total_applications: number
    considered: number
    not_considered: number
    pending_review: number
    selected: number
    not_selected: number
  }
  educational: {
    govt_school_by_year: {
      '6_to_8': { govt: number; private: number }
      '9_to_10': { govt: number; private: number }
      '11_to_12': { govt: number; private: number }
    }
    college_distribution: Array<{ name: string; count: number }>
    degree_distribution: Array<{ name: string; count: number }>
    department_distribution: Array<{ name: string; count: number }>
    year_distribution: Array<{ name: string; count: number }>
    scholarship: { received: number; not_received: number }
    medium: { tamil: number; english: number }
    transport_distribution: Array<{ name: string; count: number }>
    vglug_applied_before: Array<{ name: string; count: number }>
  }
  family: {
    family_environment: Array<{ name: string; count: number }>
    single_parent: Array<{ name: string; count: number }>
    family_members: Array<{ name: string; count: number }>
    earning_members: Array<{ name: string; count: number }>
  }
  income: {
    income_distribution: Array<{ name: string; count: number }>
    house_ownership: Array<{ name: string; count: number }>
    district_distribution: Array<{ name: string; count: number }>
  }
  basic: {
    gender: Array<{ name: string; count: number }>
    differently_abled: { yes: number; no: number }
    laptop: { has: number; no: number }
  }
  course: {
    preferred_course: Array<{ name: string; count: number }>
    heard_about_vglug: { yes: number; no: number }
    participated_in_events: { yes: number; no: number }
  }
}

// Color palette
const COLORS = ['#00BAED', '#0095C8', '#28a745', '#dc3545', '#ffc107', '#6f42c1', '#fd7e14', '#20c997', '#e83e8c', '#17a2b8']
const PRIMARY_COLOR = '#00BAED'
const SECONDARY_COLOR = '#0095C8'

export default function Dashboard({ token, onNavigateToSubmissions }: DashboardProps) {
  const [stats, setStats] = useState<DashboardStats | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [activeSection, setActiveSection] = useState<'overview' | 'educational' | 'family' | 'income'>('overview')

  useEffect(() => {
    loadStats()
  }, [])

  const handleChartClick = async (filterType: string, filterValue: string, filterTitle: string) => {
    if (!onNavigateToSubmissions) return

    try {
      const res = await adminApi.getDashboardFilterCandidates(token, filterType, filterValue)
      if (res.ok) {
        const data = await res.json()
        if (data.candidate_ids && data.candidate_ids.length > 0) {
          onNavigateToSubmissions(data.candidate_ids, filterTitle)
        } else {
          alert(`No records found for "${filterTitle}".`)
        }
      } else {
        const error = await res.json()
        alert(`Failed to get records: ${error.msg}`)
      }
    } catch (err: any) {
      alert(`Error: ${err.message}`)
    }
  }

  const loadStats = async () => {
    try {
      setLoading(true)
      const res = await adminApi.getDashboardStats(token)
      if (res.ok) {
        const data = await res.json()
        setStats(data)
      } else {
        setError('Failed to load dashboard statistics')
      }
    } catch (err) {
      setError('Network error while loading statistics')
    } finally {
      setLoading(false)
    }
  }

  if (loading) {
    return (
      <div className="text-center py-5">
        <div className="spinner-border" style={{ color: PRIMARY_COLOR }} role="status">
          <span className="visually-hidden">Loading...</span>
        </div>
        <p className="mt-3 text-muted">Loading dashboard statistics...</p>
      </div>
    )
  }

  if (error || !stats) {
    return (
      <div className="alert alert-danger" role="alert">
        {error || 'Failed to load statistics'}
      </div>
    )
  }

  // Prepare data for government school chart
  const govtSchoolData = [
    {
      name: '6th-8th',
      'Government': stats.educational.govt_school_by_year['6_to_8'].govt,
      'Private': stats.educational.govt_school_by_year['6_to_8'].private
    },
    {
      name: '9th-10th',
      'Government': stats.educational.govt_school_by_year['9_to_10'].govt,
      'Private': stats.educational.govt_school_by_year['9_to_10'].private
    },
    {
      name: '11th-12th',
      'Government': stats.educational.govt_school_by_year['11_to_12'].govt,
      'Private': stats.educational.govt_school_by_year['11_to_12'].private
    }
  ]

  // Prepare scholarship data
  const scholarshipData = [
    { name: 'Received', value: stats.educational.scholarship.received },
    { name: 'Not Received', value: stats.educational.scholarship.not_received }
  ]

  // Prepare medium data
  const mediumData = [
    { name: 'Tamil Medium', value: stats.educational.medium.tamil },
    { name: 'English Medium', value: stats.educational.medium.english }
  ]

  // Prepare review status data
  const reviewStatusData = [
    { name: 'Considered', value: stats.overview.considered },
    { name: 'Not Considered', value: stats.overview.not_considered },
    { name: 'Pending', value: stats.overview.pending_review }
  ]

  // Prepare selection data
  const selectionData = [
    { name: 'Selected', value: stats.overview.selected },
    { name: 'Not Selected', value: stats.overview.not_selected }
  ]

  // Prepare laptop data
  const laptopData = [
    { name: 'Has Laptop', value: stats.basic.laptop.has },
    { name: 'No Laptop', value: stats.basic.laptop.no }
  ]

  // Prepare differently abled data
  const differentlyAbledData = [
    { name: 'Yes', value: stats.basic.differently_abled.yes },
    { name: 'No', value: stats.basic.differently_abled.no }
  ]

  return (
    <div>
      {/* Section Tabs */}
      <div className="mb-4">
        <ul className="nav nav-pills gap-2" style={{ backgroundColor: 'white', padding: '8px', borderRadius: '10px', boxShadow: '0 2px 4px rgba(0,0,0,0.08)' }}>
          {(['overview', 'educational', 'family', 'income'] as const).map((section) => (
            <li className="nav-item" key={section}>
              <button
                className={`nav-link ${activeSection === section ? 'active' : ''}`}
                onClick={() => setActiveSection(section)}
                style={{
                  backgroundColor: activeSection === section ? PRIMARY_COLOR : 'transparent',
                  color: activeSection === section ? 'white' : '#6c757d',
                  border: 'none',
                  borderRadius: '8px',
                  padding: '10px 20px',
                  fontWeight: '500',
                  fontSize: '14px',
                  textTransform: 'capitalize'
                }}
              >
                {section === 'overview' && '📊 '}
                {section === 'educational' && '🎓 '}
                {section === 'family' && '👨‍👩‍👧‍👦 '}
                {section === 'income' && '🏠 '}
                {section}
              </button>
            </li>
          ))}
        </ul>
      </div>

      {/* Overview Section */}
      {activeSection === 'overview' && (
        <div>
          {/* Stats Cards */}
          <div className="row g-4 mb-4">
            <div className="col-md-4">
              <div className="card shadow-sm h-100" style={{ borderRadius: '12px', border: 'none' }}>
                <div className="card-body text-center">
                  <h2 style={{ color: PRIMARY_COLOR, fontSize: '48px', fontWeight: '700' }}>{stats.overview.total_applications}</h2>
                  <p className="text-muted mb-0">Total Applications</p>
                </div>
              </div>
            </div>
            <div className="col-md-4">
              <div className="card shadow-sm h-100" style={{ borderRadius: '12px', border: 'none' }}>
                <div className="card-body text-center">
                  <h2 style={{ color: '#28a745', fontSize: '48px', fontWeight: '700' }}>{stats.overview.considered}</h2>
                  <p className="text-muted mb-0">Considered</p>
                </div>
              </div>
            </div>
            <div className="col-md-4">
              <div className="card shadow-sm h-100" style={{ borderRadius: '12px', border: 'none' }}>
                <div className="card-body text-center">
                  <h2 style={{ color: '#007bff', fontSize: '48px', fontWeight: '700' }}>{stats.overview.selected}</h2>
                  <p className="text-muted mb-0">Selected</p>
                </div>
              </div>
            </div>
          </div>

          {/* Charts Row */}
          <div className="row g-4 mb-4">
            {/* Review Status Pie Chart */}
            <div className="col-md-6">
              <div className="card shadow-sm" style={{ borderRadius: '12px', border: 'none' }}>
                <div className="card-header" style={{ backgroundColor: PRIMARY_COLOR, color: 'white', borderRadius: '12px 12px 0 0', padding: '16px 20px' }}>
                  <h5 className="mb-0" style={{ fontWeight: '600' }}>Review Status</h5>
                  {onNavigateToSubmissions && <small style={{ opacity: 0.8 }}>Click segments to filter</small>}
                </div>
                <div className="card-body">
                  <ResponsiveContainer width="100%" height={300}>
                    <PieChart>
                      <Pie
                        data={reviewStatusData}
                        cx="50%"
                        cy="50%"
                        labelLine={false}
                        label={({ name, percent }) => `${name}: ${(percent * 100).toFixed(0)}%`}
                        outerRadius={100}
                        fill="#8884d8"
                        dataKey="value"
                        onClick={(entry) => entry && handleChartClick('review_status', entry.name, `Review Status: ${entry.name}`)}
                        style={{ cursor: onNavigateToSubmissions ? 'pointer' : 'default' }}
                      >
                        {reviewStatusData.map((entry, index) => (
                          <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} style={{ cursor: onNavigateToSubmissions ? 'pointer' : 'default' }} />
                        ))}
                      </Pie>
                      <Tooltip />
                      <Legend
                        onClick={(e) => e.value && handleChartClick('review_status', e.value as string, `Review Status: ${e.value}`)}
                        wrapperStyle={{ cursor: onNavigateToSubmissions ? 'pointer' : 'default' }}
                      />
                    </PieChart>
                  </ResponsiveContainer>
                </div>
              </div>
            </div>

            {/* Gender Distribution */}
            <div className="col-md-6">
              <div className="card shadow-sm" style={{ borderRadius: '12px', border: 'none' }}>
                <div className="card-header" style={{ backgroundColor: PRIMARY_COLOR, color: 'white', borderRadius: '12px 12px 0 0', padding: '16px 20px' }}>
                  <h5 className="mb-0" style={{ fontWeight: '600' }}>Gender Distribution</h5>
                  {onNavigateToSubmissions && <small style={{ opacity: 0.8 }}>Click segments to filter</small>}
                </div>
                <div className="card-body">
                  <ResponsiveContainer width="100%" height={300}>
                    <PieChart>
                      <Pie
                        data={stats.basic.gender}
                        cx="50%"
                        cy="50%"
                        labelLine={false}
                        label={({ name, percent }) => `${name}: ${(percent * 100).toFixed(0)}%`}
                        outerRadius={100}
                        fill="#8884d8"
                        dataKey="count"
                        onClick={(entry) => entry && handleChartClick('gender', entry.name, `Gender: ${entry.name}`)}
                        style={{ cursor: onNavigateToSubmissions ? 'pointer' : 'default' }}
                      >
                        {stats.basic.gender.map((entry, index) => (
                          <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} style={{ cursor: onNavigateToSubmissions ? 'pointer' : 'default' }} />
                        ))}
                      </Pie>
                      <Tooltip />
                      <Legend
                        onClick={(e) => e.value && handleChartClick('gender', e.value as string, `Gender: ${e.value}`)}
                        wrapperStyle={{ cursor: onNavigateToSubmissions ? 'pointer' : 'default' }}
                      />
                    </PieChart>
                  </ResponsiveContainer>
                </div>
              </div>
            </div>
          </div>

          {/* Additional Overview Charts */}
          <div className="row g-4">
            {/* Laptop Availability */}
            <div className="col-md-6">
              <div className="card shadow-sm" style={{ borderRadius: '12px', border: 'none' }}>
                <div className="card-header" style={{ backgroundColor: PRIMARY_COLOR, color: 'white', borderRadius: '12px 12px 0 0', padding: '16px 20px' }}>
                  <h5 className="mb-0" style={{ fontWeight: '600' }}>Laptop Availability</h5>
                  {onNavigateToSubmissions && <small style={{ opacity: 0.8 }}>Click segments to filter</small>}
                </div>
                <div className="card-body">
                  <ResponsiveContainer width="100%" height={300}>
                    <PieChart>
                      <Pie
                        data={laptopData}
                        cx="50%"
                        cy="50%"
                        labelLine={false}
                        label={({ name, percent }) => `${name}: ${(percent * 100).toFixed(0)}%`}
                        outerRadius={100}
                        fill="#8884d8"
                        dataKey="value"
                        onClick={(entry) => entry && handleChartClick('laptop', entry.name, `Laptop: ${entry.name}`)}
                        style={{ cursor: onNavigateToSubmissions ? 'pointer' : 'default' }}
                      >
                        <Cell fill="#28a745" style={{ cursor: onNavigateToSubmissions ? 'pointer' : 'default' }} />
                        <Cell fill="#dc3545" style={{ cursor: onNavigateToSubmissions ? 'pointer' : 'default' }} />
                      </Pie>
                      <Tooltip />
                      <Legend
                        onClick={(e) => e.value && handleChartClick('laptop', e.value as string, `Laptop: ${e.value}`)}
                        wrapperStyle={{ cursor: onNavigateToSubmissions ? 'pointer' : 'default' }}
                      />
                    </PieChart>
                  </ResponsiveContainer>
                </div>
              </div>
            </div>

            {/* Preferred Course Distribution */}
            <div className="col-md-6">
              <div className="card shadow-sm" style={{ borderRadius: '12px', border: 'none' }}>
                <div className="card-header" style={{ backgroundColor: PRIMARY_COLOR, color: 'white', borderRadius: '12px 12px 0 0', padding: '16px 20px' }}>
                  <h5 className="mb-0" style={{ fontWeight: '600' }}>Preferred Course</h5>
                  {onNavigateToSubmissions && <small style={{ opacity: 0.8 }}>Click bars to filter</small>}
                </div>
                <div className="card-body">
                  <ResponsiveContainer width="100%" height={300}>
                    <BarChart data={stats.course.preferred_course} layout="vertical">
                      <CartesianGrid strokeDasharray="3 3" />
                      <XAxis type="number" />
                      <YAxis dataKey="name" type="category" width={100} tick={{ fontSize: 12 }} />
                      <Tooltip />
                      <Bar
                        dataKey="count"
                        fill={PRIMARY_COLOR}
                        radius={[0, 4, 4, 0]}
                        onClick={(entry) => entry && handleChartClick('preferred_course', entry.name, `Preferred Course: ${entry.name}`)}
                        style={{ cursor: onNavigateToSubmissions ? 'pointer' : 'default' }}
                      />
                    </BarChart>
                  </ResponsiveContainer>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Educational Section */}
      {activeSection === 'educational' && (
        <div>
          {/* Government vs Private School Chart */}
          <div className="row g-4 mb-4">
            <div className="col-12">
              <div className="card shadow-sm" style={{ borderRadius: '12px', border: 'none' }}>
                <div className="card-header" style={{ backgroundColor: PRIMARY_COLOR, color: 'white', borderRadius: '12px 12px 0 0', padding: '16px 20px' }}>
                  <h5 className="mb-0" style={{ fontWeight: '600' }}>Government vs Private School by Year</h5>
                  {onNavigateToSubmissions && <small style={{ opacity: 0.8 }}>Click bars to filter</small>}
                </div>
                <div className="card-body">
                  <ResponsiveContainer width="100%" height={350}>
                    <BarChart data={govtSchoolData}>
                      <CartesianGrid strokeDasharray="3 3" />
                      <XAxis dataKey="name" />
                      <YAxis />
                      <Tooltip />
                      <Legend />
                      <Bar
                        dataKey="Government"
                        fill="#28a745"
                        radius={[4, 4, 0, 0]}
                        onClick={(entry) => {
                          if (!entry) return
                          const yearMap: Record<string, string> = { '6th-8th': 'govt_school_6_to_8', '9th-10th': 'govt_school_9_to_10', '11th-12th': 'govt_school_11_to_12' }
                          const filterType = yearMap[entry.name] || 'govt_school_6_to_8'
                          handleChartClick(filterType, 'Government', `${entry.name} Government School`)
                        }}
                        style={{ cursor: onNavigateToSubmissions ? 'pointer' : 'default' }}
                      />
                      <Bar
                        dataKey="Private"
                        fill="#dc3545"
                        radius={[4, 4, 0, 0]}
                        onClick={(entry) => {
                          if (!entry) return
                          const yearMap: Record<string, string> = { '6th-8th': 'govt_school_6_to_8', '9th-10th': 'govt_school_9_to_10', '11th-12th': 'govt_school_11_to_12' }
                          const filterType = yearMap[entry.name] || 'govt_school_6_to_8'
                          handleChartClick(filterType, 'Private', `${entry.name} Private School`)
                        }}
                        style={{ cursor: onNavigateToSubmissions ? 'pointer' : 'default' }}
                      />
                    </BarChart>
                  </ResponsiveContainer>
                </div>
              </div>
            </div>
          </div>

          {/* College and Degree Distribution */}
          <div className="row g-4 mb-4">
            <div className="col-md-6">
              <div className="card shadow-sm" style={{ borderRadius: '12px', border: 'none' }}>
                <div className="card-header" style={{ backgroundColor: PRIMARY_COLOR, color: 'white', borderRadius: '12px 12px 0 0', padding: '16px 20px' }}>
                  <h5 className="mb-0" style={{ fontWeight: '600' }}>College Distribution (Top 10)</h5>
                  {onNavigateToSubmissions && <small style={{ opacity: 0.8 }}>Click bars to filter</small>}
                </div>
                <div className="card-body">
                  <ResponsiveContainer width="100%" height={400}>
                    <BarChart data={stats.educational.college_distribution} layout="vertical">
                      <CartesianGrid strokeDasharray="3 3" />
                      <XAxis type="number" />
                      <YAxis dataKey="name" type="category" width={150} tick={{ fontSize: 11 }} />
                      <Tooltip />
                      <Bar
                        dataKey="count"
                        fill={PRIMARY_COLOR}
                        radius={[0, 4, 4, 0]}
                        onClick={(entry) => entry && handleChartClick('college', entry.name, `College: ${entry.name}`)}
                        style={{ cursor: onNavigateToSubmissions ? 'pointer' : 'default' }}
                      />
                    </BarChart>
                  </ResponsiveContainer>
                </div>
              </div>
            </div>
            <div className="col-md-6">
              <div className="card shadow-sm" style={{ borderRadius: '12px', border: 'none' }}>
                <div className="card-header" style={{ backgroundColor: PRIMARY_COLOR, color: 'white', borderRadius: '12px 12px 0 0', padding: '16px 20px' }}>
                  <h5 className="mb-0" style={{ fontWeight: '600' }}>Degree Distribution</h5>
                  {onNavigateToSubmissions && <small style={{ opacity: 0.8 }}>Click segments to filter</small>}
                </div>
                <div className="card-body">
                  <ResponsiveContainer width="100%" height={400}>
                    <PieChart>
                      <Pie
                        data={stats.educational.degree_distribution}
                        cx="50%"
                        cy="50%"
                        labelLine={false}
                        label={({ name, percent }) => `${name}: ${(percent * 100).toFixed(0)}%`}
                        outerRadius={120}
                        fill="#8884d8"
                        dataKey="count"
                        onClick={(entry) => entry && handleChartClick('degree', entry.name, `Degree: ${entry.name}`)}
                        style={{ cursor: onNavigateToSubmissions ? 'pointer' : 'default' }}
                      >
                        {stats.educational.degree_distribution.map((entry, index) => (
                          <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} style={{ cursor: onNavigateToSubmissions ? 'pointer' : 'default' }} />
                        ))}
                      </Pie>
                      <Tooltip />
                      <Legend
                        onClick={(e) => e.value && handleChartClick('degree', e.value as string, `Degree: ${e.value}`)}
                        wrapperStyle={{ cursor: onNavigateToSubmissions ? 'pointer' : 'default' }}
                      />
                    </PieChart>
                  </ResponsiveContainer>
                </div>
              </div>
            </div>
          </div>

          {/* Scholarship and Medium Charts */}
          <div className="row g-4 mb-4">
            <div className="col-md-4">
              <div className="card shadow-sm" style={{ borderRadius: '12px', border: 'none' }}>
                <div className="card-header" style={{ backgroundColor: PRIMARY_COLOR, color: 'white', borderRadius: '12px 12px 0 0', padding: '16px 20px' }}>
                  <h5 className="mb-0" style={{ fontWeight: '600' }}>Scholarship Status</h5>
                  {onNavigateToSubmissions && <small style={{ opacity: 0.8 }}>Click to filter</small>}
                </div>
                <div className="card-body">
                  <ResponsiveContainer width="100%" height={250}>
                    <PieChart>
                      <Pie
                        data={scholarshipData}
                        cx="50%"
                        cy="50%"
                        labelLine={false}
                        label={({ name, percent }) => `${(percent * 100).toFixed(0)}%`}
                        outerRadius={80}
                        fill="#8884d8"
                        dataKey="value"
                        onClick={(entry) => entry && handleChartClick('scholarship', entry.name, `Scholarship: ${entry.name}`)}
                        style={{ cursor: onNavigateToSubmissions ? 'pointer' : 'default' }}
                      >
                        <Cell fill="#28a745" style={{ cursor: onNavigateToSubmissions ? 'pointer' : 'default' }} />
                        <Cell fill="#6c757d" style={{ cursor: onNavigateToSubmissions ? 'pointer' : 'default' }} />
                      </Pie>
                      <Tooltip />
                      <Legend
                        onClick={(e) => e.value && handleChartClick('scholarship', e.value as string, `Scholarship: ${e.value}`)}
                        wrapperStyle={{ cursor: onNavigateToSubmissions ? 'pointer' : 'default' }}
                      />
                    </PieChart>
                  </ResponsiveContainer>
                </div>
              </div>
            </div>
            <div className="col-md-4">
              <div className="card shadow-sm" style={{ borderRadius: '12px', border: 'none' }}>
                <div className="card-header" style={{ backgroundColor: PRIMARY_COLOR, color: 'white', borderRadius: '12px 12px 0 0', padding: '16px 20px' }}>
                  <h5 className="mb-0" style={{ fontWeight: '600' }}>Medium of Instruction</h5>
                  {onNavigateToSubmissions && <small style={{ opacity: 0.8 }}>Click to filter</small>}
                </div>
                <div className="card-body">
                  <ResponsiveContainer width="100%" height={250}>
                    <PieChart>
                      <Pie
                        data={mediumData}
                        cx="50%"
                        cy="50%"
                        labelLine={false}
                        label={({ name, percent }) => `${(percent * 100).toFixed(0)}%`}
                        outerRadius={80}
                        fill="#8884d8"
                        dataKey="value"
                        onClick={(entry) => entry && handleChartClick('medium', entry.name, `Medium: ${entry.name}`)}
                        style={{ cursor: onNavigateToSubmissions ? 'pointer' : 'default' }}
                      >
                        <Cell fill="#ffc107" style={{ cursor: onNavigateToSubmissions ? 'pointer' : 'default' }} />
                        <Cell fill="#007bff" style={{ cursor: onNavigateToSubmissions ? 'pointer' : 'default' }} />
                      </Pie>
                      <Tooltip />
                      <Legend
                        onClick={(e) => e.value && handleChartClick('medium', e.value as string, `Medium: ${e.value}`)}
                        wrapperStyle={{ cursor: onNavigateToSubmissions ? 'pointer' : 'default' }}
                      />
                    </PieChart>
                  </ResponsiveContainer>
                </div>
              </div>
            </div>
            <div className="col-md-4">
              <div className="card shadow-sm" style={{ borderRadius: '12px', border: 'none' }}>
                <div className="card-header" style={{ backgroundColor: PRIMARY_COLOR, color: 'white', borderRadius: '12px 12px 0 0', padding: '16px 20px' }}>
                  <h5 className="mb-0" style={{ fontWeight: '600' }}>Year of Study</h5>
                  {onNavigateToSubmissions && <small style={{ opacity: 0.8 }}>Click bars to filter</small>}
                </div>
                <div className="card-body">
                  <ResponsiveContainer width="100%" height={250}>
                    <BarChart data={stats.educational.year_distribution}>
                      <CartesianGrid strokeDasharray="3 3" />
                      <XAxis dataKey="name" tick={{ fontSize: 11 }} />
                      <YAxis />
                      <Tooltip />
                      <Bar
                        dataKey="count"
                        fill={SECONDARY_COLOR}
                        radius={[4, 4, 0, 0]}
                        onClick={(entry) => entry && handleChartClick('year', entry.name, `Year: ${entry.name}`)}
                        style={{ cursor: onNavigateToSubmissions ? 'pointer' : 'default' }}
                      />
                    </BarChart>
                  </ResponsiveContainer>
                </div>
              </div>
            </div>
          </div>

          {/* Transport and Department */}
          <div className="row g-4">
            <div className="col-md-6">
              <div className="card shadow-sm" style={{ borderRadius: '12px', border: 'none' }}>
                <div className="card-header" style={{ backgroundColor: PRIMARY_COLOR, color: 'white', borderRadius: '12px 12px 0 0', padding: '16px 20px' }}>
                  <h5 className="mb-0" style={{ fontWeight: '600' }}>Transport Mode</h5>
                  {onNavigateToSubmissions && <small style={{ opacity: 0.8 }}>Click to filter</small>}
                </div>
                <div className="card-body">
                  <ResponsiveContainer width="100%" height={300}>
                    <PieChart>
                      <Pie
                        data={stats.educational.transport_distribution}
                        cx="50%"
                        cy="50%"
                        labelLine={false}
                        label={({ name, percent }) => `${name}: ${(percent * 100).toFixed(0)}%`}
                        outerRadius={100}
                        fill="#8884d8"
                        dataKey="count"
                        onClick={(entry) => entry && handleChartClick('transport', entry.name, `Transport: ${entry.name}`)}
                        style={{ cursor: onNavigateToSubmissions ? 'pointer' : 'default' }}
                      >
                        {stats.educational.transport_distribution.map((entry, index) => (
                          <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} style={{ cursor: onNavigateToSubmissions ? 'pointer' : 'default' }} />
                        ))}
                      </Pie>
                      <Tooltip />
                      <Legend
                        onClick={(e) => e.value && handleChartClick('transport', e.value as string, `Transport: ${e.value}`)}
                        wrapperStyle={{ cursor: onNavigateToSubmissions ? 'pointer' : 'default' }}
                      />
                    </PieChart>
                  </ResponsiveContainer>
                </div>
              </div>
            </div>
            <div className="col-md-6">
              <div className="card shadow-sm" style={{ borderRadius: '12px', border: 'none' }}>
                <div className="card-header" style={{ backgroundColor: PRIMARY_COLOR, color: 'white', borderRadius: '12px 12px 0 0', padding: '16px 20px' }}>
                  <h5 className="mb-0" style={{ fontWeight: '600' }}>Department Distribution (Top 10)</h5>
                  {onNavigateToSubmissions && <small style={{ opacity: 0.8 }}>Click bars to filter</small>}
                </div>
                <div className="card-body">
                  <ResponsiveContainer width="100%" height={300}>
                    <BarChart data={stats.educational.department_distribution} layout="vertical">
                      <CartesianGrid strokeDasharray="3 3" />
                      <XAxis type="number" />
                      <YAxis dataKey="name" type="category" width={120} tick={{ fontSize: 11 }} />
                      <Tooltip />
                      <Bar
                        dataKey="count"
                        fill={SECONDARY_COLOR}
                        radius={[0, 4, 4, 0]}
                        onClick={(entry) => entry && handleChartClick('department', entry.name, `Department: ${entry.name}`)}
                        style={{ cursor: onNavigateToSubmissions ? 'pointer' : 'default' }}
                      />
                    </BarChart>
                  </ResponsiveContainer>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Family Section */}
      {activeSection === 'family' && (
        <div>
          <div className="row g-4 mb-4">
            {/* Family Environment */}
            <div className="col-md-6">
              <div className="card shadow-sm" style={{ borderRadius: '12px', border: 'none' }}>
                <div className="card-header" style={{ backgroundColor: PRIMARY_COLOR, color: 'white', borderRadius: '12px 12px 0 0', padding: '16px 20px' }}>
                  <h5 className="mb-0" style={{ fontWeight: '600' }}>Family Environment</h5>
                  {onNavigateToSubmissions && <small style={{ opacity: 0.8 }}>Click to filter</small>}
                </div>
                <div className="card-body">
                  <ResponsiveContainer width="100%" height={300}>
                    <PieChart>
                      <Pie
                        data={stats.family.family_environment}
                        cx="50%"
                        cy="50%"
                        labelLine={false}
                        label={({ name, percent }) => `${name}: ${(percent * 100).toFixed(0)}%`}
                        outerRadius={100}
                        fill="#8884d8"
                        dataKey="count"
                        onClick={(entry) => entry && handleChartClick('family_environment', entry.name, `Family Environment: ${entry.name}`)}
                        style={{ cursor: onNavigateToSubmissions ? 'pointer' : 'default' }}
                      >
                        {stats.family.family_environment.map((entry, index) => (
                          <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} style={{ cursor: onNavigateToSubmissions ? 'pointer' : 'default' }} />
                        ))}
                      </Pie>
                      <Tooltip />
                      <Legend
                        onClick={(e) => e.value && handleChartClick('family_environment', e.value as string, `Family Environment: ${e.value}`)}
                        wrapperStyle={{ cursor: onNavigateToSubmissions ? 'pointer' : 'default' }}
                      />
                    </PieChart>
                  </ResponsiveContainer>
                </div>
              </div>
            </div>

            {/* Single Parent Info */}
            <div className="col-md-6">
              <div className="card shadow-sm" style={{ borderRadius: '12px', border: 'none' }}>
                <div className="card-header" style={{ backgroundColor: PRIMARY_COLOR, color: 'white', borderRadius: '12px 12px 0 0', padding: '16px 20px' }}>
                  <h5 className="mb-0" style={{ fontWeight: '600' }}>Single Parent Distribution</h5>
                  {onNavigateToSubmissions && <small style={{ opacity: 0.8 }}>Click to filter</small>}
                </div>
                <div className="card-body">
                  {stats.family.single_parent.length > 0 ? (
                    <ResponsiveContainer width="100%" height={300}>
                      <PieChart>
                        <Pie
                          data={stats.family.single_parent}
                          cx="50%"
                          cy="50%"
                          labelLine={false}
                          label={({ name, percent }) => `${name}: ${(percent * 100).toFixed(0)}%`}
                          outerRadius={100}
                          fill="#8884d8"
                          dataKey="count"
                          onClick={(entry) => entry && handleChartClick('single_parent', entry.name, `Single Parent: ${entry.name}`)}
                          style={{ cursor: onNavigateToSubmissions ? 'pointer' : 'default' }}
                        >
                          {stats.family.single_parent.map((entry, index) => (
                            <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} style={{ cursor: onNavigateToSubmissions ? 'pointer' : 'default' }} />
                          ))}
                        </Pie>
                        <Tooltip />
                        <Legend
                          onClick={(e) => e.value && handleChartClick('single_parent', e.value as string, `Single Parent: ${e.value}`)}
                          wrapperStyle={{ cursor: onNavigateToSubmissions ? 'pointer' : 'default' }}
                        />
                      </PieChart>
                    </ResponsiveContainer>
                  ) : (
                    <div className="text-center text-muted py-5">
                      <p>No single parent data available</p>
                    </div>
                  )}
                </div>
              </div>
            </div>
          </div>

          {/* Family Members and Earning Members */}
          <div className="row g-4">
            <div className="col-md-6">
              <div className="card shadow-sm" style={{ borderRadius: '12px', border: 'none' }}>
                <div className="card-header" style={{ backgroundColor: PRIMARY_COLOR, color: 'white', borderRadius: '12px 12px 0 0', padding: '16px 20px' }}>
                  <h5 className="mb-0" style={{ fontWeight: '600' }}>Family Members Count</h5>
                  {onNavigateToSubmissions && <small style={{ opacity: 0.8 }}>Click bars to filter</small>}
                </div>
                <div className="card-body">
                  <ResponsiveContainer width="100%" height={300}>
                    <BarChart data={stats.family.family_members}>
                      <CartesianGrid strokeDasharray="3 3" />
                      <XAxis dataKey="name" label={{ value: 'Members', position: 'bottom' }} />
                      <YAxis label={{ value: 'Applications', angle: -90, position: 'insideLeft' }} />
                      <Tooltip />
                      <Bar
                        dataKey="count"
                        fill={PRIMARY_COLOR}
                        radius={[4, 4, 0, 0]}
                        onClick={(entry) => entry && handleChartClick('family_members', entry.name, `Family Members: ${entry.name}`)}
                        style={{ cursor: onNavigateToSubmissions ? 'pointer' : 'default' }}
                      />
                    </BarChart>
                  </ResponsiveContainer>
                </div>
              </div>
            </div>
            <div className="col-md-6">
              <div className="card shadow-sm" style={{ borderRadius: '12px', border: 'none' }}>
                <div className="card-header" style={{ backgroundColor: PRIMARY_COLOR, color: 'white', borderRadius: '12px 12px 0 0', padding: '16px 20px' }}>
                  <h5 className="mb-0" style={{ fontWeight: '600' }}>Earning Members Count</h5>
                  {onNavigateToSubmissions && <small style={{ opacity: 0.8 }}>Click bars to filter</small>}
                </div>
                <div className="card-body">
                  <ResponsiveContainer width="100%" height={300}>
                    <BarChart data={stats.family.earning_members}>
                      <CartesianGrid strokeDasharray="3 3" />
                      <XAxis dataKey="name" label={{ value: 'Members', position: 'bottom' }} />
                      <YAxis label={{ value: 'Applications', angle: -90, position: 'insideLeft' }} />
                      <Tooltip />
                      <Bar
                        dataKey="count"
                        fill={SECONDARY_COLOR}
                        radius={[4, 4, 0, 0]}
                        onClick={(entry) => entry && handleChartClick('earning_members', entry.name, `Earning Members: ${entry.name}`)}
                        style={{ cursor: onNavigateToSubmissions ? 'pointer' : 'default' }}
                      />
                    </BarChart>
                  </ResponsiveContainer>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Income Section */}
      {activeSection === 'income' && (
        <div>
          {/* Total Family Income Distribution */}
          <div className="row g-4 mb-4">
            <div className="col-12">
              <div className="card shadow-sm" style={{ borderRadius: '12px', border: 'none' }}>
                <div className="card-header" style={{ backgroundColor: PRIMARY_COLOR, color: 'white', borderRadius: '12px 12px 0 0', padding: '16px 20px' }}>
                  <h5 className="mb-0" style={{ fontWeight: '600' }}>Total Family Income Distribution</h5>
                  {onNavigateToSubmissions && <small style={{ opacity: 0.8 }}>Click bars to filter</small>}
                </div>
                <div className="card-body">
                  {stats.income.income_distribution && stats.income.income_distribution.length > 0 ? (
                    <ResponsiveContainer width="100%" height={350}>
                      <BarChart data={stats.income.income_distribution}>
                        <CartesianGrid strokeDasharray="3 3" />
                        <XAxis dataKey="name" tick={{ fontSize: 11 }} />
                        <YAxis />
                        <Tooltip />
                        <Bar
                          dataKey="count"
                          fill={PRIMARY_COLOR}
                          radius={[4, 4, 0, 0]}
                          onClick={(entry) => entry && handleChartClick('income_range', entry.name, `Income: ${entry.name}`)}
                          style={{ cursor: onNavigateToSubmissions ? 'pointer' : 'default' }}
                        />
                      </BarChart>
                    </ResponsiveContainer>
                  ) : (
                    <div className="text-center text-muted py-5">
                      <p>No income data available</p>
                    </div>
                  )}
                </div>
              </div>
            </div>
          </div>

          <div className="row g-4 mb-4">
            {/* House Ownership */}
            <div className="col-md-6">
              <div className="card shadow-sm" style={{ borderRadius: '12px', border: 'none' }}>
                <div className="card-header" style={{ backgroundColor: PRIMARY_COLOR, color: 'white', borderRadius: '12px 12px 0 0', padding: '16px 20px' }}>
                  <h5 className="mb-0" style={{ fontWeight: '600' }}>House Ownership</h5>
                  {onNavigateToSubmissions && <small style={{ opacity: 0.8 }}>Click to filter</small>}
                </div>
                <div className="card-body">
                  <ResponsiveContainer width="100%" height={350}>
                    <PieChart>
                      <Pie
                        data={stats.income.house_ownership}
                        cx="50%"
                        cy="50%"
                        labelLine={false}
                        label={({ name, percent }) => `${name}: ${(percent * 100).toFixed(0)}%`}
                        outerRadius={120}
                        fill="#8884d8"
                        dataKey="count"
                        onClick={(entry) => entry && handleChartClick('house_ownership', entry.name, `House: ${entry.name}`)}
                        style={{ cursor: onNavigateToSubmissions ? 'pointer' : 'default' }}
                      >
                        {stats.income.house_ownership.map((entry, index) => (
                          <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} style={{ cursor: onNavigateToSubmissions ? 'pointer' : 'default' }} />
                        ))}
                      </Pie>
                      <Tooltip />
                      <Legend
                        onClick={(e) => e.value && handleChartClick('house_ownership', e.value as string, `House: ${e.value}`)}
                        wrapperStyle={{ cursor: onNavigateToSubmissions ? 'pointer' : 'default' }}
                      />
                    </PieChart>
                  </ResponsiveContainer>
                </div>
              </div>
            </div>

            {/* District Distribution */}
            <div className="col-md-6">
              <div className="card shadow-sm" style={{ borderRadius: '12px', border: 'none' }}>
                <div className="card-header" style={{ backgroundColor: PRIMARY_COLOR, color: 'white', borderRadius: '12px 12px 0 0', padding: '16px 20px' }}>
                  <h5 className="mb-0" style={{ fontWeight: '600' }}>District Distribution (Top 10)</h5>
                  {onNavigateToSubmissions && <small style={{ opacity: 0.8 }}>Click bars to filter</small>}
                </div>
                <div className="card-body">
                  <ResponsiveContainer width="100%" height={350}>
                    <BarChart data={stats.income.district_distribution} layout="vertical">
                      <CartesianGrid strokeDasharray="3 3" />
                      <XAxis type="number" />
                      <YAxis dataKey="name" type="category" width={120} tick={{ fontSize: 12 }} />
                      <Tooltip />
                      <Bar
                        dataKey="count"
                        fill={PRIMARY_COLOR}
                        radius={[0, 4, 4, 0]}
                        onClick={(entry) => entry && handleChartClick('district', entry.name, `District: ${entry.name}`)}
                        style={{ cursor: onNavigateToSubmissions ? 'pointer' : 'default' }}
                      />
                    </BarChart>
                  </ResponsiveContainer>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
