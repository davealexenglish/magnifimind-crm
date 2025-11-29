// Common types for the CRM application

export interface TableColumn {
  field: string
  label: string
  type?: 'text' | 'email' | 'tel' | 'url' | 'number' | 'date' | 'checkbox' | 'textarea'
  readOnly?: boolean
}

export interface GenericRecord {
  [key: string]: any
}

export interface TableManagerProps {
  title: string
  apiEndpoint: string
  columns: TableColumn[]
  idField: string
}

export interface LoginProps {
  onLogin: () => void
}
