'use client'

import { useEffect } from 'react'
import { toast } from 'sonner'
import { useRecurringStore } from '@/store/useRecurringStore'
import { getAppSyncEngine } from '@/lib/sync/appEngine'
import { generateDueAfterEachSync } from '@/lib/sync/recurringAfterSync'

const CHECK_INTERVAL_MS = 60 * 60 * 1000

const announce = (count: number) => toast.success(`บันทึกรายการประจำอัตโนมัติ ${count} รายการ`)

/**
 * Runs once server data is merged, so ids already on the server are not generated again.
 * Signed in, it records only right after each record sync (which runs on load, when the
 * tab turns visible and every minute), so rules carry the cursor another device left.
 */
export function useRecurringTransactions(dataLoaded: boolean, signedIn: boolean) {
  useEffect(() => {
    if (!dataLoaded) return
    if (signedIn) return generateDueAfterEachSync(getAppSyncEngine(), announce)

    const run = () => {
      const count = useRecurringStore.getState().generateDue()
      if (count > 0) announce(count)
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
  }, [dataLoaded, signedIn])
}
