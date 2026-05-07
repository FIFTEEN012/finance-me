'use client'

import { useEffect } from 'react'
import { AlertTriangle, RotateCcw } from 'lucide-react'
import { Button } from '@/components/ui/button'

export default function ErrorPage({
  error,
  unstable_retry,
}: {
  error: Error & { digest?: string }
  unstable_retry: () => void
}) {
  useEffect(() => {
    console.error(error)
  }, [error])

  return (
    <div className="flex flex-col items-center justify-center min-h-[60vh] text-center px-4">
      <div className="flex items-center justify-center w-16 h-16 rounded-full bg-red-100 dark:bg-red-900/30 mb-4">
        <AlertTriangle className="w-8 h-8 text-red-500 dark:text-red-400" />
      </div>
      <h2 className="text-lg font-semibold text-gray-900 dark:text-gray-100 mb-2">
        เกิดข้อผิดพลาด
      </h2>
      <p className="text-sm text-gray-500 dark:text-gray-400 mb-1 max-w-sm">
        {error.message || 'มีบางอย่างผิดพลาด กรุณาลองใหม่อีกครั้ง'}
      </p>
      {error.digest && (
        <p className="text-xs text-gray-400 dark:text-gray-600 mb-6 font-mono">
          Error ID: {error.digest}
        </p>
      )}
      {!error.digest && <div className="mb-6" />}
      <Button
        onClick={unstable_retry}
        className="bg-violet-600 hover:bg-violet-700 gap-2"
      >
        <RotateCcw className="w-4 h-4" />
        ลองใหม่
      </Button>
    </div>
  )
}
