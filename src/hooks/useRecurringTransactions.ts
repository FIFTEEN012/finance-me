'use client'

import { useEffect } from 'react'
import { toast } from 'sonner'
import { useRecurringStore } from '@/store/useRecurringStore'

const CHECK_INTERVAL_MS = 60 * 60 * 1000

/** Runs once server data is merged, so ids already on the server are not generated again. */
export function useRecurringTransactions(dataLoaded: boolean) {
  useEffect(() => {
    if (!dataLoaded) return

    const run = () => {
      const count = useRecurringStore.getState().generateDue()
      if (count > 0) toast.success(`บันทึกรายการประจำอัตโนมัติ ${count} รายการ`)
    }
    const onVisible = () => {
      if (document.visibilityState === 'visible') run()
    }

    run()
    const timer = setInterval(run, CHECK_INTERVAL_MS)
    document.addEventListener('visibilitychange', onVisible)
    return () => {
      clearInterval(timer)
      document.removeEventListener('visibilitychange', onVisible)
    }
  }, [dataLoaded])
}
