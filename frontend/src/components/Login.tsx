import { useState, type FormEvent } from 'react'
import { useNavigate } from 'react-router-dom'
import axios, { type AxiosError } from 'axios'
import type { LoginProps } from '../types'

function Login({ onLogin }: LoginProps) {
  const [username, setUsername] = useState<string>('')
  const [password, setPassword] = useState<string>('')
  const [showPassword, setShowPassword] = useState<boolean>(false)
  const [error, setError] = useState<string>('')
  const navigate = useNavigate()

  const handleSubmit = async (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault()
    setError('')

    try {
      const response = await axios.post<{ token: string }>('/api/v1/auth/login', {
        username,
        password
      })

      if (response.data.token) {
        localStorage.setItem('token', response.data.token)
        onLogin()
        navigate('/dashboard')
      }
    } catch (err) {
      const error = err as AxiosError<{ error: string }>
      setError(error.response?.data?.error || 'Login failed')
      console.error('Login error:', err)
    }
  }

  return (
    <div style={{ maxWidth: '450px', margin: '100px auto', padding: '2rem', backgroundColor: '#f5f5f5', borderRadius: '8px', boxShadow: '0 2px 4px rgba(0,0,0,0.1)' }}>
      <h2 style={{ color: '#213547', marginBottom: '1.5rem', textAlign: 'center' }}>Manifimind CRM - Login</h2>
      <form onSubmit={handleSubmit}>
        <table style={{ width: '100%', borderCollapse: 'collapse' }}>
          <tbody>
            <tr>
              <td style={{ padding: '0.5rem', textAlign: 'right', paddingRight: '1rem', width: '100px', fontWeight: '500', color: '#213547' }}>
                Username:
              </td>
              <td style={{ padding: '0.5rem' }}>
                <input
                  type="text"
                  value={username}
                  onChange={(e) => setUsername(e.target.value)}
                  required
                  style={{ width: '100%', padding: '0.5rem', fontSize: '1rem', border: '1px solid #ccc', borderRadius: '4px', boxSizing: 'border-box' }}
                />
              </td>
            </tr>
            <tr>
              <td style={{ padding: '0.5rem', textAlign: 'right', paddingRight: '1rem', width: '100px', fontWeight: '500', color: '#213547' }}>
                Password:
              </td>
              <td style={{ padding: '0.5rem' }}>
                <div style={{ display: 'flex', gap: '0.5rem' }}>
                  <input
                    type={showPassword ? 'text' : 'password'}
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    required
                    style={{ flex: 1, padding: '0.5rem', fontSize: '1rem', border: '1px solid #ccc', borderRadius: '4px', boxSizing: 'border-box' }}
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    style={{
                      padding: '0.5rem 0.75rem',
                      backgroundColor: '#e0e0e0',
                      border: '1px solid #ccc',
                      borderRadius: '4px',
                      cursor: 'pointer',
                      fontSize: '0.9rem'
                    }}
                    title={showPassword ? 'Hide password' : 'Show password'}
                  >
                    {showPassword ? 'Hide' : 'Show'}
                  </button>
                </div>
              </td>
            </tr>
          </tbody>
        </table>
        {error && <div style={{ color: '#d32f2f', marginTop: '1rem', padding: '0.5rem', backgroundColor: '#ffebee', borderRadius: '4px' }}>{error}</div>}
        <div style={{ marginTop: '1.5rem', textAlign: 'center' }}>
          <button type="submit" style={{ padding: '0.75rem 2rem', fontSize: '1rem', backgroundColor: '#646cff', color: 'white', border: 'none', borderRadius: '4px', cursor: 'pointer' }}>
            Login
          </button>
        </div>
      </form>
    </div>
  )
}

export default Login
