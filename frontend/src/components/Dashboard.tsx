import { Link, useNavigate } from 'react-router-dom'

function Dashboard() {
  const navigate = useNavigate()

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
        { name: 'Email Addresses', path: '/emails', icon: '📧' },
        { name: 'Phone Numbers', path: '/phones', icon: '📱' },
        { name: 'Notes', path: '/notes', icon: '📝' },
        { name: 'Links', path: '/links', icon: '🔗' },
      ]
    },
    {
      title: 'Security',
      items: [
        { name: 'Password Vault', path: '/passwords', icon: '🔐' },
        { name: 'User Accounts', path: '/accounts', icon: '👥' },
        { name: 'Users', path: '/users', icon: '🧑' },
        { name: 'Roles', path: '/roles', icon: '🎭' },
      ]
    }
  ]

  return (
    <div style={{ minHeight: '100vh', backgroundColor: '#f5f5f5' }}>
      <header style={{ backgroundColor: '#646cff', color: 'white', padding: '1rem 2rem', boxShadow: '0 2px 4px rgba(0,0,0,0.1)' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <h1 style={{ margin: 0, fontSize: '1.5rem' }}>Manifimind CRM</h1>
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
      </header>

      <main style={{ padding: '2rem', maxWidth: '1200px', margin: '0 auto' }}>
        <h2 style={{ color: '#213547', marginBottom: '2rem' }}>Welcome to Manifimind CRM</h2>

        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))', gap: '2rem' }}>
          {navSections.map((section, idx) => (
            <div key={idx} style={{ backgroundColor: 'white', padding: '1.5rem', borderRadius: '8px', boxShadow: '0 2px 4px rgba(0,0,0,0.1)' }}>
              <h3 style={{ color: '#213547', marginTop: 0, marginBottom: '1rem', borderBottom: '2px solid #646cff', paddingBottom: '0.5rem' }}>
                {section.title}
              </h3>
              <ul style={{ listStyle: 'none', padding: 0, margin: 0 }}>
                {section.items.map((item, itemIdx) => (
                  <li key={itemIdx} style={{ marginBottom: '0.5rem' }}>
                    <Link
                      to={item.path}
                      style={{
                        display: 'flex',
                        alignItems: 'center',
                        gap: '0.5rem',
                        padding: '0.75rem',
                        textDecoration: 'none',
                        color: '#213547',
                        backgroundColor: '#f9f9f9',
                        borderRadius: '4px',
                        transition: 'all 0.2s',
                        border: '1px solid transparent'
                      }}
                      onMouseEnter={(e) => {
                        e.currentTarget.style.backgroundColor = '#e9e9e9'
                        e.currentTarget.style.borderColor = '#646cff'
                      }}
                      onMouseLeave={(e) => {
                        e.currentTarget.style.backgroundColor = '#f9f9f9'
                        e.currentTarget.style.borderColor = 'transparent'
                      }}
                    >
                      <span style={{ fontSize: '1.2rem' }}>{item.icon}</span>
                      <span>{item.name}</span>
                    </Link>
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </div>
      </main>
    </div>
  )
}

export default Dashboard
