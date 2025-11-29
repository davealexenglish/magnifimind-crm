// Table configuration for all CRM tables
import TableManager from './TableManager'

export function AddressesTable() {
  const columns = [
    { field: 'pdat_address_id', label: 'ID', readOnly: true },
    { field: 'addr_1', label: 'Address 1' },
    { field: 'addr_2', label: 'Address 2' },
    { field: 'city', label: 'City' },
    { field: 'state', label: 'State' },
    { field: 'zip', label: 'ZIP' },
    { field: 'country', label: 'Country' },
  ]
  return <TableManager title="Addresses" apiEndpoint="addresses" columns={columns} idField="pdat_address_id" />
}

export function EmailsTable() {
  const columns = [
    { field: 'pdat_pers_email_id', label: 'ID', readOnly: true },
    { field: 'pdat_person_id', label: 'Person ID', type: 'number' },
    { field: 'email', label: 'Email', type: 'email' },
    { field: 'primary_email_flag', label: 'Primary', type: 'checkbox' },
  ]
  return <TableManager title="Email Addresses" apiEndpoint="emails" columns={columns} idField="pdat_pers_email_id" />
}

export function PhonesTable() {
  const columns = [
    { field: 'pdat_pers_phone_id', label: 'ID', readOnly: true },
    { field: 'pdat_person_id', label: 'Person ID', type: 'number' },
    { field: 'phone_number', label: 'Phone Number', type: 'tel' },
    { field: 'primary_phone_flag', label: 'Primary', type: 'checkbox' },
  ]
  return <TableManager title="Phone Numbers" apiEndpoint="phones" columns={columns} idField="pdat_pers_phone_id" />
}

export function NotesTable() {
  const columns = [
    { field: 'pdat_pers_notes_id', label: 'ID', readOnly: true },
    { field: 'pdat_person_id', label: 'Person ID', type: 'number' },
    { field: 'note_text', label: 'Note', type: 'textarea' },
    { field: 'note_date', label: 'Date', type: 'date' },
  ]
  return <TableManager title="Notes" apiEndpoint="notes" columns={columns} idField="pdat_pers_notes_id" />
}

export function LinksTable() {
  const columns = [
    { field: 'pdat_links_id', label: 'ID', readOnly: true },
    { field: 'link_text', label: 'Link Text' },
    { field: 'link_url', label: 'URL', type: 'url' },
    { field: 'note', label: 'Note', type: 'textarea' },
    { field: 'pdat_person_id', label: 'Person ID', type: 'number' },
  ]
  return <TableManager title="Links" apiEndpoint="links" columns={columns} idField="pdat_links_id" />
}

export function AccountsTable() {
  const columns = [
    { field: 'sec_accounts_id', label: 'ID', readOnly: true },
    { field: 'name', label: 'Account Name' },
    { field: 'sec_users_id', label: 'User ID', type: 'number' },
    { field: 'create_date', label: 'Created', type: 'date', readOnly: true },
  ]
  return <TableManager title="User Accounts" apiEndpoint="accounts" columns={columns} idField="sec_accounts_id" />
}

export function UsersTable() {
  const columns = [
    { field: 'sec_users_id', label: 'ID', readOnly: true },
    { field: 'pdat_person_id', label: 'Person ID', type: 'number' },
    { field: 'email', label: 'Email', type: 'email' },
    { field: 'email_verified', label: 'Email Verified', type: 'checkbox', readOnly: true },
    { field: 'active_flag', label: 'Active' },
  ]
  return <TableManager title="Users" apiEndpoint="users-table" columns={columns} idField="sec_users_id" />
}

export function RolesTable() {
  const columns = [
    { field: 'sec_roles_id', label: 'ID', readOnly: true },
    { field: 'name', label: 'Role Name' },
    { field: 'descr', label: 'Description', type: 'textarea' },
  ]
  return <TableManager title="Roles" apiEndpoint="roles" columns={columns} idField="sec_roles_id" />
}
