import TableManager from './TableManager'

function PeopleTable() {
  const columns = [
    { field: 'pdat_person_id', label: 'ID', readOnly: true },
    { field: 'first_name', label: 'First Name' },
    { field: 'middle_name', label: 'Middle Name' },
    { field: 'last_name', label: 'Last Name' },
    { field: 'suffix', label: 'Suffix' },
    { field: 'nickname', label: 'Nickname' },
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
