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
    <div style={{ maxWidth: '400px', margin: '0 auto', padding: '2rem', backgroundColor: '#f5f5f5', borderRadius: '8px', boxShadow: '0 2px 4px rgba(0,0,0,0.1)' }}>
      <h2 style={{ color: '#213547', marginBottom: '1.5rem' }}>Manifimind CRM - Login</h2>
      <form onSubmit={handleSubmit}>
        <div style={{ marginBottom: '1rem' }}>
          <input
            type="text"
            placeholder="Username"
            value={username}
            onChange={(e) => setUsername(e.target.value)}
            required
            style={{ width: '100%', padding: '0.75rem', fontSize: '1rem', border: '1px solid #ccc', borderRadius: '4px' }}
          />
        </div>
        <div style={{ marginBottom: '1rem', position: 'relative' }}>
          <input
            type={showPassword ? 'text' : 'password'}
            placeholder="Password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            required
            style={{ width: '100%', padding: '0.75rem', paddingRight: '3rem', fontSize: '1rem', border: '1px solid #ccc', borderRadius: '4px' }}
          />
          <button
            type="button"
            onClick={() => setShowPassword(!showPassword)}
            style={{
              position: 'absolute',
              right: '10px',
              top: '50%',
              transform: 'translateY(-50%)',
              background: 'none',
              border: 'none',
              cursor: 'pointer',
              padding: '0.25rem',
              fontSize: '0.9rem',
              color: '#646cff'
            }}
          >
            {showPassword ? '👁️' : '👁️‍🗨️'}
          </button>
        </div>
        {error && <div style={{ color: '#d32f2f', marginBottom: '1rem', padding: '0.5rem', backgroundColor: '#ffebee', borderRadius: '4px' }}>{error}</div>}
        <button type="submit" style={{ width: '100%', padding: '0.75rem', fontSize: '1rem', backgroundColor: '#646cff', color: 'white', border: 'none', borderRadius: '4px', cursor: 'pointer' }}>
          Login
        </button>
      </form>
    </div>
  )
}

export default Login
