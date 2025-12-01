import { type ReactNode } from 'react'
import Navigation from './Navigation'

interface LayoutProps {
  children: ReactNode
}

function Layout({ children }: LayoutProps) {
  return (
    <div style={{ minHeight: '100vh', backgroundColor: '#f5f5f5' }}>
      <Navigation />
      <main style={{ padding: '2rem' }}>
        {children}
      </main>
    </div>
  )
}

export default Layout
