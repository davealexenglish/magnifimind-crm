import TableManager from './TableManager'
import type { TableColumn } from '../types'

function PeopleTable() {
  const columns: TableColumn[] = [
    { field: 'pdat_person_id', label: 'ID', readOnly: true },
    { field: 'fname', label: 'First Name' },
    { field: 'lname', label: 'Last Name' },
    { field: 'birthday', label: 'Birthday', type: 'date' },
    { field: 'business_flag', label: 'Business' },
    { field: 'sec_users_id', label: 'User ID', type: 'number' },
    { field: 'create_date', label: 'Created', type: 'date', readOnly: true },
    { field: 'modify_date', label: 'Modified', type: 'date', readOnly: true },
  ]

  return (
    <TableManager
      title="People"
      apiEndpoint="people"
      columns={columns}
      idField="pdat_person_id"
    />
  )
}

export default PeopleTable
