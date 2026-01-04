import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom'
import { useState, type ReactNode } from 'react'
import Login from './components/Login'
import Layout from './components/Layout'
import Dashboard from './components/Dashboard'
import PasswordVault from './components/PasswordVault'
import BackupRestore from './components/BackupRestore'
import PeopleManager from './components/PeopleManager'
import {
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
            element={<ProtectedRoute><PeopleManager /></ProtectedRoute>}
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

          {/* Administration */}
          <Route
            path="/backup-restore"
            element={<ProtectedRoute><BackupRestore /></ProtectedRoute>}
          />

          {/* Default route */}
          <Route path="/" element={<Navigate to="/dashboard" />} />
        </Routes>
      </div>
    </Router>
  )
}

export default App
