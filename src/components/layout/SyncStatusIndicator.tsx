'use client'

import { CloudAlert, CloudCheck, CloudUpload, Loader2 } from 'lucide-react'
import { getAppSyncEngine, useSyncStatus } from '@/lib/sync/appEngine'
import { useAuthStore } from '@/store/useAuthStore'
import { cn } from '@/lib/utils'

/**
 * Sync status of the User Data records on the engine (ซิงก์แล้ว / ยังไม่ได้ซิงก์ /
 * ล้มเหลว). Click to sync now. Shown only when signed in.
 */
export function SyncStatusIndicator() {
  const user = useAuthStore((s) => s.user)
  const { state, pending, syncing, lastSyncedAt } = useSyncStatus()
  if (!user) return null

  const label =
    state === 'error'
      ? 'ซิงก์ล้มเหลว แตะเพื่อลองใหม่'
      : state === 'pending'
        ? `ยังไม่ได้ซิงก์ ${pending} รายการ`
        : lastSyncedAt
          ? `ซิงก์แล้ว ${new Date(lastSyncedAt).toLocaleTimeString('th-TH', { hour: '2-digit', minute: '2-digit' })}`
          : 'ซิงก์แล้ว'
  const Icon = syncing ? Loader2 : state === 'error' ? CloudAlert : state === 'pending' ? CloudUpload : CloudCheck

  return (
    <button
      type="button"
      onClick={() => void getAppSyncEngine().sync()}
      aria-label={label}
      title={label}
      className={cn(
        'flex items-center gap-1 rounded-full border-2 px-2.5 py-1.5 transition-all cursor-pointer',
        state === 'error'
          ? 'border-red-300 bg-red-50 text-red-600 dark:border-red-900 dark:bg-red-950/40 dark:text-red-400'
          : 'border-[#becbb1] bg-white text-[#6f7b64] hover:bg-[#f4f3f3] hover:text-[var(--quest-primary)] dark:border-[#3b4630] dark:bg-[#1c2117] dark:text-[#c2cfb4] dark:hover:bg-[#22281c]',
      )}
    >
      <Icon className={cn('h-4 w-4 stroke-[2.5px]', syncing && 'animate-spin')} />
      {state === 'pending' && <span className="text-[10px] font-black">{pending}</span>}
    </button>
  )
}
