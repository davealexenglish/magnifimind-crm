import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom'
import { useState, type ReactNode } from 'react'
import Login from './components/Login'
import Layout from './components/Layout'
import Dashboard from './components/Dashboard'
import PasswordVault from './components/PasswordVault'
import PeopleTable from './components/PeopleTable'
import {
  AddressesTable,
  EmailsTable,
  PhonesTable,
  NotesTable,
  LinksTable,
  AccountsTable,
  UsersTable,
  RolesTable
} from './components/tables'

function App() {
  const [isAuthenticated, setIsAuthenticated] = useState(() => {
    // Check if user has a token on initial load
    return !!localStorage.getItem('token')
  })

  // Protected route wrapper
  const ProtectedRoute = ({ children }: { children: ReactNode }) => {
    return isAuthenticated ? <Layout>{children}</Layout> : <Navigate to="/login" />
  }

  return (
    <Router>
      <div className="App">
        <Routes>
          <Route path="/login" element={<Login onLogin={() => setIsAuthenticated(true)} />} />

          {/* Dashboard */}
          <Route
            path="/dashboard"
            element={<ProtectedRoute><Dashboard /></ProtectedRoute>}
          />

          {/* Contact Management */}
          <Route
            path="/people"
            element={<ProtectedRoute><PeopleTable /></ProtectedRoute>}
          />
          <Route
            path="/addresses"
            element={<ProtectedRoute><AddressesTable /></ProtectedRoute>}
          />
          <Route
            path="/emails"
            element={<ProtectedRoute><EmailsTable /></ProtectedRoute>}
          />
          <Route
            path="/phones"
            element={<ProtectedRoute><PhonesTable /></ProtectedRoute>}
          />
          <Route
            path="/notes"
            element={<ProtectedRoute><NotesTable /></ProtectedRoute>}
          />
          <Route
            path="/links"
            element={<ProtectedRoute><LinksTable /></ProtectedRoute>}
          />

          {/* Security */}
          <Route
            path="/passwords"
            element={<ProtectedRoute><PasswordVault /></ProtectedRoute>}
          />
          <Route
            path="/accounts"
            element={<ProtectedRoute><AccountsTable /></ProtectedRoute>}
          />
          <Route
            path="/users"
            element={<ProtectedRoute><UsersTable /></ProtectedRoute>}
          />
          <Route
            path="/roles"
            element={<ProtectedRoute><RolesTable /></ProtectedRoute>}
          />

          {/* Default route */}
          <Route path="/" element={<Navigate to="/dashboard" />} />
        </Routes>
      </div>
    </Router>
  )
}

export default App
