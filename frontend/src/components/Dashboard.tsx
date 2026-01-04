import { Link } from 'react-router-dom'

function Dashboard() {
  const navSections = [
    {
      title: 'Contact Management',
      icon: '📇',
      items: [
        { name: 'People', path: '/people', icon: '👤' },
      ]
    },
    {
      title: 'Security',
      icon: '🔒',
      items: [
        { name: 'Password Vault', path: '/passwords', icon: '🔐' },
        { name: 'User Accounts', path: '/accounts', icon: '👥' },
        { name: 'Users', path: '/users', icon: '🧑' },
        { name: 'Roles', path: '/roles', icon: '🎭' },
      ]
    },
    {
      title: 'Administration',
      icon: '⚙️',
      items: [
        { name: 'Backup & Restore', path: '/backup-restore', icon: '💾' },
      ]
    }
  ]

  return (
    <div style={{ maxWidth: '1200px', margin: '0 auto' }}>
      <h2 style={{ color: '#213547', marginBottom: '2rem' }}>Welcome to Magnifimind CRM</h2>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))', gap: '2rem' }}>
        {navSections.map((section, idx) => (
          <div key={idx} style={{ backgroundColor: 'white', padding: '1.5rem', borderRadius: '8px', boxShadow: '0 2px 4px rgba(0,0,0,0.1)' }}>
            <h3 style={{ color: '#213547', marginTop: 0, marginBottom: '1rem', borderBottom: '2px solid #646cff', paddingBottom: '0.5rem' }}>
              {section.icon} {section.title}
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
    </div>
  )
}

export default Dashboard
