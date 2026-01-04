import { useState, useEffect, useRef } from 'react'
import { Link, useNavigate, useLocation } from 'react-router-dom'

function Navigation() {
  const navigate = useNavigate()
  const location = useLocation()
  const [openDropdown, setOpenDropdown] = useState<string | null>(null)
  const navRef = useRef<HTMLElement>(null)

  const handleLogout = () => {
    localStorage.removeItem('token')
    navigate('/login')
    window.location.reload()
  }

  // Close dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (navRef.current && !navRef.current.contains(event.target as Node)) {
        setOpenDropdown(null)
      }
    }
    document.addEventListener('mousedown', handleClickOutside)
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [])

  // Close dropdown when route changes
  useEffect(() => {
    setOpenDropdown(null)
  }, [location.pathname])

  const navSections = [
    {
      id: 'contacts',
      title: 'Contact Management',
      icon: '📇',
      items: [
        { name: 'People', path: '/people', icon: '👤' },
      ]
    },
    {
      id: 'security',
      title: 'Security',
      icon: '🔒',
      items: [
        { name: 'Passwords', path: '/passwords', icon: '🔐' },
        { name: 'Accounts', path: '/accounts', icon: '👥' },
        { name: 'Users', path: '/users', icon: '🧑' },
        { name: 'Roles', path: '/roles', icon: '🎭' },
      ]
    },
    {
      id: 'admin',
      title: 'Administration',
      icon: '⚙️',
      items: [
        { name: 'Backup & Restore', path: '/backup-restore', icon: '💾' },
      ]
    }
  ]

  const toggleDropdown = (id: string) => {
    setOpenDropdown(openDropdown === id ? null : id)
  }

  const isActiveSection = (section: typeof navSections[0]) => {
    return section.items.some(item => location.pathname === item.path)
  }

  return (
    <header
      ref={navRef}
      style={{
        backgroundColor: '#646cff',
        color: 'white',
        boxShadow: '0 2px 4px rgba(0,0,0,0.1)',
        position: 'sticky',
        top: 0,
        zIndex: 1000
      }}
    >
      {/* Top bar with title and logout */}
      <div style={{ padding: '0.75rem 2rem', borderBottom: '1px solid rgba(255,255,255,0.2)' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <Link to="/dashboard" style={{ textDecoration: 'none', color: 'white' }}>
            <h1 style={{ margin: 0, fontSize: '1.5rem' }}>Magnifimind CRM</h1>
          </Link>
          <button
            onClick={handleLogout}
            style={{
              padding: '0.5rem 1rem',
              backgroundColor: 'white',
              color: '#646cff',
              border: 'none',
              borderRadius: '4px',
              cursor: 'pointer',
              fontWeight: '500'
            }}
          >
            Logout
          </button>
        </div>
      </div>

      {/* Navigation menu with dropdowns */}
      <nav style={{ padding: '0.5rem 2rem', display: 'flex', gap: '0.5rem', alignItems: 'center' }}>
        {/* Dashboard link */}
        <Link
          to="/dashboard"
          style={{
            padding: '0.5rem 1rem',
            textDecoration: 'none',
            color: 'white',
            borderRadius: '4px',
            backgroundColor: location.pathname === '/dashboard' ? 'rgba(255,255,255,0.2)' : 'transparent',
            fontWeight: location.pathname === '/dashboard' ? 'bold' : 'normal',
            display: 'flex',
            alignItems: 'center',
            gap: '0.5rem'
          }}
        >
          🏠 Dashboard
        </Link>

        {/* Dropdown menus */}
        {navSections.map((section) => (
          <div key={section.id} style={{ position: 'relative' }}>
            <button
              onClick={() => toggleDropdown(section.id)}
              style={{
                padding: '0.5rem 1rem',
                backgroundColor: isActiveSection(section) ? 'rgba(255,255,255,0.2)' : 'transparent',
                color: 'white',
                border: 'none',
                borderRadius: '4px',
                cursor: 'pointer',
                fontWeight: isActiveSection(section) ? 'bold' : 'normal',
                display: 'flex',
                alignItems: 'center',
                gap: '0.5rem',
                fontSize: '1rem'
              }}
            >
              {section.icon} {section.title}
              <span style={{
                fontSize: '0.7rem',
                marginLeft: '0.25rem',
                transform: openDropdown === section.id ? 'rotate(180deg)' : 'rotate(0deg)',
                transition: 'transform 0.2s'
              }}>
                ▼
              </span>
            </button>

            {/* Dropdown menu */}
            {openDropdown === section.id && (
              <div
                style={{
                  position: 'absolute',
                  top: '100%',
                  left: 0,
                  marginTop: '0.25rem',
                  backgroundColor: 'white',
                  borderRadius: '8px',
                  boxShadow: '0 4px 12px rgba(0,0,0,0.15)',
                  minWidth: '200px',
                  overflow: 'hidden',
                  zIndex: 1001
                }}
              >
                {section.items.map((item, itemIdx) => (
                  <Link
                    key={itemIdx}
                    to={item.path}
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      gap: '0.75rem',
                      padding: '0.75rem 1rem',
                      textDecoration: 'none',
                      color: location.pathname === item.path ? '#646cff' : '#213547',
                      backgroundColor: location.pathname === item.path ? '#f0f0ff' : 'transparent',
                      fontWeight: location.pathname === item.path ? '600' : 'normal',
                      borderBottom: itemIdx < section.items.length - 1 ? '1px solid #eee' : 'none',
                      transition: 'background-color 0.15s'
                    }}
                    onMouseEnter={(e) => {
                      if (location.pathname !== item.path) {
                        e.currentTarget.style.backgroundColor = '#f5f5f5'
                      }
                    }}
                    onMouseLeave={(e) => {
                      if (location.pathname !== item.path) {
                        e.currentTarget.style.backgroundColor = 'transparent'
                      }
                    }}
                  >
                    <span style={{ fontSize: '1.1rem' }}>{item.icon}</span>
                    <span>{item.name}</span>
                  </Link>
                ))}
              </div>
            )}
          </div>
        ))}
      </nav>
    </header>
  )
}

export default Navigation
