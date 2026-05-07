'use client'

import { AlertTriangle, RotateCcw } from 'lucide-react'

export default function GlobalError({
  error,
  unstable_retry,
}: {
  error: Error & { digest?: string }
  unstable_retry: () => void
}) {
  return (
    <html lang="th">
      <body>
        <div
          style={{
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            justifyContent: 'center',
            minHeight: '100vh',
            textAlign: 'center',
            padding: '24px',
            fontFamily: 'system-ui, sans-serif',
            background: '#f9fafb',
            color: '#111827',
          }}
        >
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              width: '64px',
              height: '64px',
              borderRadius: '50%',
              background: '#fee2e2',
              marginBottom: '16px',
            }}
          >
            <AlertTriangle size={32} color="#ef4444" />
          </div>
          <h1 style={{ fontSize: '20px', fontWeight: 600, marginBottom: '8px' }}>
            แอปพลิเคชันเกิดข้อผิดพลาด
          </h1>
          <p style={{ fontSize: '14px', color: '#6b7280', marginBottom: '4px', maxWidth: '320px' }}>
            {error.message || 'เกิดข้อผิดพลาดร้ายแรง กรุณารีเฟรชหน้านี้'}
          </p>
          {error.digest && (
            <p style={{ fontSize: '12px', color: '#9ca3af', marginBottom: '24px', fontFamily: 'monospace' }}>
              Error ID: {error.digest}
            </p>
          )}
          <button
            onClick={unstable_retry}
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '8px',
              padding: '10px 20px',
              background: '#059669',
              color: '#fff',
              border: 'none',
              borderRadius: '8px',
              fontSize: '14px',
              fontWeight: 600,
              cursor: 'pointer',
              marginTop: error.digest ? '0' : '24px',
            }}
          >
            <RotateCcw size={16} />
            ลองใหม่
          </button>
        </div>
      </body>
    </html>
  )
}
