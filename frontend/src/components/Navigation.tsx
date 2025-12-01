import { Link, useNavigate, useLocation } from 'react-router-dom'

function Navigation() {
  const navigate = useNavigate()
  const location = useLocation()

  const handleLogout = () => {
    localStorage.removeItem('token')
    navigate('/login')
    window.location.reload()
  }

  const navSections = [
    {
      title: 'Contact Management',
      items: [
        { name: 'People', path: '/people', icon: '👤' },
        { name: 'Addresses', path: '/addresses', icon: '📍' },
        { name: 'Emails', path: '/emails', icon: '📧' },
        { name: 'Phones', path: '/phones', icon: '📱' },
        { name: 'Notes', path: '/notes', icon: '📝' },
        { name: 'Links', path: '/links', icon: '🔗' },
      ]
    },
    {
      title: 'Security',
      items: [
        { name: 'Passwords', path: '/passwords', icon: '🔐' },
        { name: 'Accounts', path: '/accounts', icon: '👥' },
        { name: 'Users', path: '/users', icon: '🧑' },
        { name: 'Roles', path: '/roles', icon: '🎭' },
      ]
    }
  ]

  return (
    <header style={{ backgroundColor: '#646cff', color: 'white', boxShadow: '0 2px 4px rgba(0,0,0,0.1)', position: 'sticky', top: 0, zIndex: 1000 }}>
      {/* Top bar */}
      <div style={{ padding: '1rem 2rem', borderBottom: '1px solid rgba(255,255,255,0.2)' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <Link to="/dashboard" style={{ textDecoration: 'none', color: 'white' }}>
            <h1 style={{ margin: 0, fontSize: '1.5rem' }}>Manifimind CRM</h1>
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

      {/* Navigation menu */}
      <nav style={{ padding: '0.5rem 2rem', display: 'flex', gap: '2rem', flexWrap: 'wrap', alignItems: 'flex-start' }}>
        <Link
          to="/dashboard"
          style={{
            padding: '0.5rem 1rem',
            textDecoration: 'none',
            color: 'white',
            borderRadius: '4px',
            backgroundColor: location.pathname === '/dashboard' ? 'rgba(255,255,255,0.2)' : 'transparent',
            fontWeight: location.pathname === '/dashboard' ? 'bold' : 'normal'
          }}
        >
          🏠 Dashboard
        </Link>

        {navSections.map((section, idx) => (
          <div key={idx} style={{ position: 'relative', display: 'inline-block' }}>
            <span style={{ padding: '0.5rem 0', display: 'inline-block', fontWeight: '500', fontSize: '0.9rem', opacity: 0.9 }}>
              {section.title}:
            </span>
            <div style={{ display: 'inline-flex', gap: '0.5rem', marginLeft: '0.5rem', flexWrap: 'wrap' }}>
              {section.items.map((item, itemIdx) => (
                <Link
                  key={itemIdx}
                  to={item.path}
                  style={{
                    padding: '0.5rem 1rem',
                    textDecoration: 'none',
                    color: 'white',
                    borderRadius: '4px',
                    backgroundColor: location.pathname === item.path ? 'rgba(255,255,255,0.2)' : 'transparent',
                    fontWeight: location.pathname === item.path ? 'bold' : 'normal',
                    whiteSpace: 'nowrap',
                    fontSize: '0.9rem'
                  }}
                  title={item.name}
                >
                  {item.icon} {item.name}
                </Link>
              ))}
            </div>
          </div>
        ))}
      </nav>
    </header>
  )
}

export default Navigation
