// Common types for the CRM application

export interface TableColumn {
  field: string
  label: string
  type?: 'text' | 'email' | 'tel' | 'url' | 'number' | 'date' | 'checkbox' | 'textarea' | 'select' | 'person-picker'
  readOnly?: boolean
  showInTable?: boolean     // Whether to show this column in the table view (default: true)
  lookupEndpoint?: string  // API endpoint to fetch dropdown options (e.g., 'email-types')
  lookupLabel?: string      // Field name to display in dropdown (e.g., 'name')
  lookupValue?: string      // Field name to use as value (e.g., 'pdat_email_types_id')
}

export interface GenericRecord {
  [key: string]: any
}

export interface TableManagerProps {
  title: string
  apiEndpoint: string
  columns: TableColumn[]
  idField: string
  hardDeleteEndpoint?: string  // API endpoint for permanent deletion (bulk)
}

export interface LoginProps {
  onLogin: () => void
}
