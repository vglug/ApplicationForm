import React from 'react'
import {
  PieChart, Pie, Cell, BarChart, Bar, LineChart, Line,
  XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer
} from 'recharts'
import { WidgetChartConfig } from '../../types/widget'

interface SegmentClickData {
  name: string
  value: any
  nameField: string
}

interface Props {
  data: any[]
  widgetType: 'pie' | 'bar' | 'line' | 'number' | 'table'
  chartConfig: WidgetChartConfig
  title?: string
  onSegmentClick?: (segmentData: SegmentClickData) => void
}

const DEFAULT_COLORS = ['#00BAED', '#0095C8', '#28a745', '#dc3545', '#ffc107', '#6f42c1', '#fd7e14', '#20c997', '#e83e8c', '#6610f2']

export default function WidgetPreview({ data, widgetType, chartConfig, title, onSegmentClick }: Props) {
  const {
    name_field = 'name',
    value_field = 'count',
    colors = DEFAULT_COLORS,
    show_legend = true,
    show_labels = true
  } = chartConfig || {}

  const handleSegmentClick = (entry: any) => {
    if (onSegmentClick && entry) {
      const name = entry[name_field] ?? entry.name ?? entry.payload?.[name_field]
      onSegmentClick({
        name: String(name),
        value: name,
        nameField: name_field
      })
    }
  }

  if (!data || data.length === 0) {
    return (
      <div className="text-center text-muted py-5">
        <div style={{ fontSize: '48px', opacity: 0.3, marginBottom: '16px' }}>📊</div>
        <p className="mb-0">No data to display</p>
        <small>Configure your widget and click Preview</small>
      </div>
    )
  }

  const renderCustomLabel = ({ cx, cy, midAngle, innerRadius, outerRadius, percent, name }: any) => {
    if (!show_labels) return null
    const RADIAN = Math.PI / 180
    const radius = innerRadius + (outerRadius - innerRadius) * 0.5
    const x = cx + radius * Math.cos(-midAngle * RADIAN)
    const y = cy + radius * Math.sin(-midAngle * RADIAN)

    return (
      <text
        x={x}
        y={y}
        fill="white"
        textAnchor={x > cx ? 'start' : 'end'}
        dominantBaseline="central"
        fontSize={12}
        fontWeight={500}
      >
        {`${(percent * 100).toFixed(0)}%`}
      </text>
    )
  }

  // Custom tooltip that shows clickable hint
  const CustomTooltip = ({ active, payload, label }: any) => {
    if (active && payload && payload.length) {
      return (
        <div style={{
          backgroundColor: 'white',
          borderRadius: '8px',
          padding: '10px 14px',
          boxShadow: '0 4px 12px rgba(0,0,0,0.15)',
          border: 'none'
        }}>
          <p style={{ margin: 0, fontWeight: 600, color: '#2c3e50' }}>
            {payload[0].name || label}
          </p>
          <p style={{ margin: '4px 0 0', color: '#6c757d' }}>
            Count: <strong>{payload[0].value?.toLocaleString()}</strong>
          </p>
          {onSegmentClick && (
            <p style={{ margin: '6px 0 0', fontSize: '11px', color: '#00BAED' }}>
              Click to view records
            </p>
          )}
        </div>
      )
    }
    return null
  }

  switch (widgetType) {
    case 'pie':
      return (
        <ResponsiveContainer width="100%" height={300}>
          <PieChart>
            <Pie
              data={data}
              cx="50%"
              cy="50%"
              labelLine={false}
              label={renderCustomLabel}
              outerRadius={100}
              dataKey={value_field}
              nameKey={name_field}
              onClick={(entry) => handleSegmentClick(entry)}
              style={{ cursor: onSegmentClick ? 'pointer' : 'default' }}
            >
              {data.map((entry, index) => (
                <Cell
                  key={`cell-${index}`}
                  fill={colors[index % colors.length]}
                  style={{ cursor: onSegmentClick ? 'pointer' : 'default' }}
                />
              ))}
            </Pie>
            <Tooltip content={<CustomTooltip />} />
            {show_legend && (
              <Legend
                onClick={(e) => {
                  if (onSegmentClick && e.value) {
                    const entry = data.find(d => d[name_field] === e.value)
                    if (entry) handleSegmentClick(entry)
                  }
                }}
                wrapperStyle={{ cursor: onSegmentClick ? 'pointer' : 'default' }}
              />
            )}
          </PieChart>
        </ResponsiveContainer>
      )

    case 'bar':
      return (
        <ResponsiveContainer width="100%" height={300}>
          <BarChart data={data} margin={{ top: 5, right: 30, left: 20, bottom: 5 }}>
            <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
            <XAxis
              dataKey={name_field}
              tick={{ fontSize: 12 }}
              tickLine={false}
              axisLine={{ stroke: '#e0e0e0' }}
            />
            <YAxis
              tick={{ fontSize: 12 }}
              tickLine={false}
              axisLine={{ stroke: '#e0e0e0' }}
            />
            <Tooltip content={<CustomTooltip />} />
            {show_legend && <Legend />}
            <Bar
              dataKey={value_field}
              fill={colors[0]}
              radius={[4, 4, 0, 0]}
              name={title || 'Count'}
              onClick={(entry) => handleSegmentClick(entry)}
              style={{ cursor: onSegmentClick ? 'pointer' : 'default' }}
            >
              {data.map((entry, index) => (
                <Cell
                  key={`cell-${index}`}
                  fill={colors[index % colors.length]}
                  style={{ cursor: onSegmentClick ? 'pointer' : 'default' }}
                />
              ))}
            </Bar>
          </BarChart>
        </ResponsiveContainer>
      )

    case 'line':
      return (
        <ResponsiveContainer width="100%" height={300}>
          <LineChart data={data} margin={{ top: 5, right: 30, left: 20, bottom: 5 }}>
            <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
            <XAxis
              dataKey={name_field}
              tick={{ fontSize: 12 }}
              tickLine={false}
              axisLine={{ stroke: '#e0e0e0' }}
            />
            <YAxis
              tick={{ fontSize: 12 }}
              tickLine={false}
              axisLine={{ stroke: '#e0e0e0' }}
            />
            <Tooltip content={<CustomTooltip />} />
            {show_legend && <Legend />}
            <Line
              type="monotone"
              dataKey={value_field}
              stroke={colors[0]}
              strokeWidth={2}
              dot={{ fill: colors[0], strokeWidth: 2, cursor: onSegmentClick ? 'pointer' : 'default' }}
              activeDot={{
                r: 6,
                fill: colors[0],
                cursor: onSegmentClick ? 'pointer' : 'default',
                onClick: (e: any, payload: any) => {
                  if (payload && payload.payload) {
                    handleSegmentClick(payload.payload)
                  }
                }
              }}
              name={title || 'Value'}
            />
          </LineChart>
        </ResponsiveContainer>
      )

    case 'number':
      // For number widget, sum up all values or show single value
      const total = data.reduce((sum, item) => {
        const val = item[value_field]
        return sum + (typeof val === 'number' ? val : 0)
      }, 0)

      return (
        <div className="text-center py-4">
          <div
            style={{
              fontSize: '56px',
              fontWeight: '700',
              color: colors[0],
              lineHeight: 1.2
            }}
          >
            {total.toLocaleString()}
          </div>
          <p
            className="mb-0"
            style={{
              color: '#6c757d',
              fontSize: '16px',
              fontWeight: '500',
              marginTop: '8px'
            }}
          >
            {title || chartConfig.name_field || 'Total'}
          </p>
        </div>
      )

    case 'table':
      if (data.length === 0) {
        return (
          <div className="text-center py-4 text-muted">
            No data available
          </div>
        )
      }

      const columns = Object.keys(data[0] || {})

      return (
        <div className="table-responsive" style={{ maxHeight: '400px', overflowY: 'auto' }}>
          <table className="table table-hover table-sm mb-0">
            <thead style={{ position: 'sticky', top: 0, backgroundColor: '#f8f9fa', zIndex: 1 }}>
              <tr>
                {columns.map(col => (
                  <th
                    key={col}
                    style={{
                      textTransform: 'capitalize',
                      fontWeight: '600',
                      fontSize: '13px',
                      color: '#2c3e50',
                      padding: '12px 8px',
                      borderBottom: '2px solid #dee2e6'
                    }}
                  >
                    {col.replace(/_/g, ' ')}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {data.map((row, i) => (
                <tr key={i}>
                  {columns.map(col => (
                    <td
                      key={col}
                      style={{
                        fontSize: '13px',
                        padding: '10px 8px',
                        color: '#495057'
                      }}
                    >
                      {typeof row[col] === 'boolean'
                        ? (row[col] ? 'Yes' : 'No')
                        : (row[col] ?? '-')}
                    </td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )

    default:
      return (
        <div className="text-center py-4 text-muted">
          Unknown widget type: {widgetType}
        </div>
      )
  }
}
