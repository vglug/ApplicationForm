import React, { useState, useEffect } from 'react'
import AdminLogin from './pages/AdminLogin'
import AdminDashboard from './pages/AdminDashboard'

export default function AdminApp() {
  const [token, setToken] = useState<string | null>(null)
  const [user, setUser] = useState<any>(null)

  useEffect(() => {
    // Check if token exists in localStorage
    const savedToken = localStorage.getItem('admin_token')
    const savedUser = localStorage.getItem('admin_user')

    if (savedToken && savedUser) {
      setToken(savedToken)
      setUser(JSON.parse(savedUser))
    }
  }, [])

  const handleLoginSuccess = (accessToken: string, userData: any) => {
    setToken(accessToken)
    setUser(userData)
    localStorage.setItem('admin_token', accessToken)
    localStorage.setItem('admin_user', JSON.stringify(userData))
  }

  const handleLogout = () => {
    setToken(null)
    setUser(null)
    localStorage.removeItem('admin_token')
    localStorage.removeItem('admin_user')
  }

  if (!token || !user) {
    return <AdminLogin onLoginSuccess={handleLoginSuccess} />
  }

  return <AdminDashboard token={token} user={user} onLogout={handleLogout} />
}
