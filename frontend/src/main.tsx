import React from 'react'
import { createRoot } from 'react-dom/client'
import App from './App'
import AdminApp from './AdminApp'
import EditForm from './components/EditForm'
import './styles.css'

// Simple routing based on URL path
const RootApp = () => {
  const pathname = window.location.pathname

  // "/form" goes to App (application form)
  if (pathname === '/form') {
    return <App />
  }

  // "/edit/:token" goes to EditForm for editing existing applications
  if (pathname.startsWith('/edit/')) {
    const token = pathname.replace('/edit/', '')
    if (token) {
      return <EditForm token={token} />
    }
  }

  // Everything else goes to AdminApp (login or dashboard)
  return <AdminApp />
}

createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <RootApp />
  </React.StrictMode>
)
