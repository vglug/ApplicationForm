export interface WidgetField {
  table: string
  column: string
  alias: string
  aggregation?: 'COUNT' | 'SUM' | 'AVG' | 'MIN' | 'MAX' | null
}

export interface WidgetCondition {
  logic: 'AND' | 'OR'
  table: string
  column: string
  operator: string
  value: any
}

export interface WidgetChartConfig {
  type?: 'pie' | 'bar' | 'line' | 'number' | 'table'
  name_field?: string
  value_field?: string
  colors?: string[]
  show_legend?: boolean
  show_labels?: boolean
  label_format?: 'value' | 'percentage' | 'both'
}

export interface WidgetDataSource {
  base_table: string
  joins: string[]
  join_type?: 'left' | 'inner'
}

export interface WidgetConfigJson {
  data_source: WidgetDataSource
  fields: WidgetField[]
  conditions: WidgetCondition[]
  group_by: string[]
  order_by: { column: string; direction: 'ASC' | 'DESC' }[]
  limit?: number
  chart_config: WidgetChartConfig
}

export interface Widget {
  id?: number
  title: string
  description?: string
  widget_type: 'pie' | 'bar' | 'line' | 'number' | 'table'
  config_json: WidgetConfigJson
  position?: number
  width?: string
  is_active?: boolean
  created_by?: string
  created_at?: string
  updated_at?: string
}

export interface TableField {
  name: string
  type: string
  display: string
  values?: string[]
}

export interface TableMetadata {
  display_name: string
  join_column?: string
  fields: TableField[]
}

export interface WidgetMetadata {
  tables: {
    [key: string]: TableMetadata
  }
  aggregations: { value: string; label: string }[]
  operators: { value: string; label: string }[]
  widget_types: { value: string; label: string }[]
}

export interface WidgetPreviewData {
  data: any[]
  row_count: number
}
