'use client'

import { useState } from 'react'
import {
  Cloud, CloudOff, CloudUpload, CheckCircle2, AlertCircle,
  Loader2, LogOut, RefreshCw, User,
} from 'lucide-react'
import { toast } from 'sonner'
import {
  DropdownMenu, DropdownMenuContent, DropdownMenuItem,
  DropdownMenuSeparator, DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import { AuthModal } from '@/components/auth/AuthModal'
import { useAuthStore } from '@/store/useAuthStore'
import { supabase, isCloudEnabled } from '@/lib/supabase'
import { pushToCloud, pullFromCloud } from '@/lib/cloudSync'
import { cn } from '@/lib/utils'

export function SyncButton() {
  const { user, syncStatus, lastSyncAt } = useAuthStore()
  const [authOpen, setAuthOpen]         = useState(false)

  const handleManualPush = async () => {
    if (!user) return
    useAuthStore.getState().setSyncStatus('syncing')
    const result = await pushToCloud(user.id)
    if (result.ok) {
      useAuthStore.getState().setLastSyncAt(new Date().toISOString())
      toast.success('ซิงค์ข้อมูลสำเร็จ')
    } else {
      useAuthStore.getState().setSyncError(result.error)
      toast.error('ซิงค์ไม่สำเร็จ: ' + result.error)
    }
  }

  const handlePull = async () => {
    if (!user) return
    useAuthStore.getState().setSyncStatus('syncing')
    const result = await pullFromCloud(user.id)
    if (result.ok) {
      useAuthStore.getState().setLastSyncAt(new Date().toISOString())
      toast.success('โหลดข้อมูลจาก cloud สำเร็จ')
    } else {
      useAuthStore.getState().setSyncError(result.error)
      toast.error('โหลดไม่สำเร็จ: ' + result.error)
    }
  }

  const handleLogout = async () => {
    if (!supabase) return
    await supabase.auth.signOut()
    toast.success('ออกจากระบบแล้ว')
  }

  const lastSyncLabel = lastSyncAt
    ? new Date(lastSyncAt).toLocaleTimeString('th-TH', { hour: '2-digit', minute: '2-digit' })
    : null

  /* ── Icon + color per sync state ── */
  const icon = !isCloudEnabled || !user
    ? <CloudOff className="w-4 h-4" />
    : syncStatus === 'syncing'
      ? <Loader2 className="w-4 h-4 animate-spin" />
      : syncStatus === 'error'
        ? <AlertCircle className="w-4 h-4" />
        : syncStatus === 'success'
          ? <CheckCircle2 className="w-4 h-4" />
          : <Cloud className="w-4 h-4" />

  const color = !user
    ? 'text-gray-400 dark:text-white/30'
    : syncStatus === 'error'
      ? 'text-red-400'
      : syncStatus === 'success'
        ? 'text-emerald-500 dark:text-emerald-400'
        : 'text-violet-500 dark:text-violet-400'

  /* ── Not logged in: just show button to open login modal ── */
  if (!user) {
    return (
      <>
        <button
          onClick={() => setAuthOpen(true)}
          title="เข้าสู่ระบบเพื่อ cloud sync"
          className={cn(
            'p-1.5 rounded-lg transition-colors',
            'text-gray-400 dark:text-white/30 hover:text-violet-500 dark:hover:text-violet-400 hover:bg-violet-50 dark:hover:bg-violet-500/10',
          )}
        >
          <CloudOff className="w-4 h-4" />
        </button>
        <AuthModal open={authOpen} onOpenChange={setAuthOpen} />
      </>
    )
  }

  /* ── Logged in: dropdown with status + actions ── */
  return (
    <>
      <DropdownMenu>
        <DropdownMenuTrigger
          title="Cloud sync"
          className={cn(
            'p-1.5 rounded-lg transition-colors hover:bg-gray-100 dark:hover:bg-white/[0.05]',
            color,
          )}
        >
          {icon}
        </DropdownMenuTrigger>

        <DropdownMenuContent align="end" className="w-56">
          {/* Status header */}
          <div className="px-3 py-2.5 border-b border-gray-100 dark:border-white/[0.06]">
            <div className="flex items-center gap-2 mb-0.5">
              <User className="w-3.5 h-3.5 text-gray-400 dark:text-white/30 flex-shrink-0" />
              <p className="text-xs font-medium text-gray-700 dark:text-white/70 truncate">{user.email}</p>
            </div>
            <p className="text-[10px] text-gray-400 dark:text-white/30 pl-5">
              {syncStatus === 'syncing'
                ? 'กำลังซิงค์...'
                : syncStatus === 'error'
                  ? '⚠️ ซิงค์ไม่สำเร็จ'
                  : lastSyncLabel
                    ? `✓ ซิงค์แล้ว ${lastSyncLabel}`
                    : 'ยังไม่ได้ซิงค์'
              }
            </p>
          </div>

          <DropdownMenuItem onClick={handleManualPush} className="gap-2">
            <CloudUpload className="w-3.5 h-3.5" />
            อัปโหลดขึ้น cloud
          </DropdownMenuItem>
          <DropdownMenuItem onClick={handlePull} className="gap-2">
            <RefreshCw className="w-3.5 h-3.5" />
            โหลดจาก cloud
          </DropdownMenuItem>

          <DropdownMenuSeparator />

          <DropdownMenuItem
            onClick={handleLogout}
            className="gap-2 text-red-500 dark:text-red-400 focus:text-red-600 focus:bg-red-50 dark:focus:bg-red-500/10"
          >
            <LogOut className="w-3.5 h-3.5" />
            ออกจากระบบ
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>

      <AuthModal open={false} onOpenChange={() => {}} />
    </>
  )
}
