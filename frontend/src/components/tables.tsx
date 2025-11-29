// Table configuration for all CRM tables
import TableManager from './TableManager'
import type { TableColumn } from '../types'

export function AddressesTable() {
  const columns: TableColumn[] = [
    { field: 'pdat_address_id', label: 'ID', readOnly: true },
    { field: 'pdat_person_id', label: 'Person ID', type: 'number' },
    { field: 'addr1', label: 'Address 1' },
    { field: 'addr2', label: 'Address 2' },
    { field: 'city', label: 'City' },
    { field: 'cmn_states_id', label: 'State ID', type: 'number' },
    { field: 'zip', label: 'ZIP' },
    { field: 'zip_plus_4', label: 'ZIP+4' },
    { field: 'country', label: 'Country' },
  ]
  return <TableManager title="Addresses" apiEndpoint="addresses" columns={columns} idField="pdat_address_id" />
}

export function EmailsTable() {
  const columns: TableColumn[] = [
    { field: 'pdat_pers_emails_id', label: 'ID', readOnly: true },
    { field: 'pdat_person_id', label: 'Person ID', type: 'number' },
    { field: 'email_addr', label: 'Email', type: 'email' },
    { field: 'pdat_email_types_id', label: 'Email Type ID', type: 'number' },
  ]
  return <TableManager title="Email Addresses" apiEndpoint="emails" columns={columns} idField="pdat_pers_emails_id" />
}

export function PhonesTable() {
  const columns: TableColumn[] = [
    { field: 'pdat_pers_phone_id', label: 'ID', readOnly: true },
    { field: 'pdat_person_id', label: 'Person ID', type: 'number' },
    { field: 'phone_num', label: 'Phone Number', type: 'tel' },
    { field: 'phone_ext', label: 'Extension' },
    { field: 'country_code', label: 'Country Code' },
    { field: 'pdat_phone_type_id', label: 'Phone Type ID', type: 'number' },
  ]
  return <TableManager title="Phone Numbers" apiEndpoint="phones" columns={columns} idField="pdat_pers_phone_id" />
}

export function NotesTable() {
  const columns: TableColumn[] = [
    { field: 'pdat_pers_notes_id', label: 'ID', readOnly: true },
    { field: 'pdat_person_id', label: 'Person ID', type: 'number' },
    { field: 'note_text', label: 'Note', type: 'textarea' },
    { field: 'create_date', label: 'Date', type: 'date', readOnly: true },
  ]
  return <TableManager title="Notes" apiEndpoint="notes" columns={columns} idField="pdat_pers_notes_id" />
}

export function LinksTable() {
  const columns: TableColumn[] = [
    { field: 'pdat_links_id', label: 'ID', readOnly: true },
    { field: 'link_text', label: 'Link Text' },
    { field: 'link_url', label: 'URL', type: 'url' },
    { field: 'note', label: 'Note', type: 'textarea' },
    { field: 'pdat_person_id', label: 'Person ID', type: 'number' },
  ]
  return <TableManager title="Links" apiEndpoint="links" columns={columns} idField="pdat_links_id" />
}

export function AccountsTable() {
  const columns: TableColumn[] = [
    { field: 'sec_accounts_id', label: 'ID', readOnly: true },
    { field: 'name', label: 'Account Name' },
    { field: 'sec_users_id', label: 'User ID', type: 'number' },
    { field: 'create_date', label: 'Created', type: 'date', readOnly: true },
  ]
  return <TableManager title="User Accounts" apiEndpoint="accounts" columns={columns} idField="sec_accounts_id" />
}

export function UsersTable() {
  const columns: TableColumn[] = [
    { field: 'sec_users_id', label: 'ID', readOnly: true },
    { field: 'pdat_person_id', label: 'Person ID', type: 'number' },
    { field: 'email', label: 'Email', type: 'email' },
    { field: 'email_verified', label: 'Email Verified', type: 'checkbox', readOnly: true },
    { field: 'active_flag', label: 'Active' },
  ]
  return <TableManager title="Users" apiEndpoint="users-table" columns={columns} idField="sec_users_id" />
}

export function RolesTable() {
  const columns: TableColumn[] = [
    { field: 'sec_roles_id', label: 'ID', readOnly: true },
    { field: 'name', label: 'Role Name' },
    { field: 'descr', label: 'Description', type: 'textarea' },
  ]
  return <TableManager title="Roles" apiEndpoint="roles" columns={columns} idField="sec_roles_id" />
}
