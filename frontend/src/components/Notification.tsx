import React, { useEffect } from 'react'

type NotificationProps = {
  message: string
  type: 'success' | 'error' | 'info'
  show: boolean
  onClose: () => void
  duration?: number
}

export default function Notification({ message, type, show, onClose, duration = 3000 }: NotificationProps) {
  useEffect(() => {
    if (show) {
      const timer = setTimeout(() => {
        onClose()
      }, duration)
      return () => clearTimeout(timer)
    }
  }, [show, duration, onClose])

  if (!show) return null

  const bgColor = type === 'success' ? '#28a745' : type === 'error' ? '#dc3545' : '#17a2b8'
  const icon = type === 'success' ? '✓' : type === 'error' ? '✕' : 'ℹ'

  return (
    <div
      style={{
        position: 'fixed',
        top: '20px',
        left: '50%',
        transform: 'translateX(-50%)',
        backgroundColor: bgColor,
        color: 'white',
        padding: '16px 24px',
        borderRadius: '12px',
        boxShadow: '0 8px 24px rgba(0,0,0,0.2)',
        zIndex: 9999,
        display: 'flex',
        alignItems: 'center',
        gap: '16px',
        minWidth: '350px',
        animation: 'slideDown 0.3s ease-out',
      }}
    >
      <span style={{ fontSize: '24px', fontWeight: 'bold' }}>{icon}</span>
      <span style={{ flex: 1, fontSize: '16px', fontWeight: '500' }}>{message}</span>
      <button
        onClick={onClose}
        style={{
          background: 'transparent',
          border: 'none',
          color: 'white',
          fontSize: '24px',
          cursor: 'pointer',
          padding: '0',
          lineHeight: '1',
        }}
      >
        ×
      </button>
      <style>{`
        @keyframes slideDown {
          from {
            transform: translateX(-50%) translateY(-100px);
            opacity: 0;
          }
          to {
            transform: translateX(-50%) translateY(0);
            opacity: 1;
          }
        }
      `}</style>
    </div>
  )
}
