'use client'

import { useState } from 'react'
import {
  Cloud,
  CloudOff,
  CloudUpload,
  CheckCircle2,
  AlertCircle,
  Loader2,
  LogOut,
  RefreshCw,
  User,
} from 'lucide-react'
import { toast } from 'sonner'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import { AuthModal } from '@/components/auth/AuthModal'
import { useAuthStore } from '@/store/useAuthStore'
import { supabase, isCloudEnabled } from '@/lib/supabase'
import { pushToCloud, pullFromCloud } from '@/lib/cloudSync'
import { cn } from '@/lib/utils'

interface SyncButtonProps {
  triggerClassName?: string
  menuContentClassName?: string
}

export function SyncButton({ triggerClassName, menuContentClassName }: SyncButtonProps) {
  const { user, syncStatus, lastSyncAt } = useAuthStore()
  const [authOpen, setAuthOpen] = useState(false)

  const handleManualPush = async () => {
    if (!user) return
    useAuthStore.getState().setSyncStatus('syncing')
    const result = await pushToCloud(user.id)
    if (result.ok) {
      useAuthStore.getState().setLastSyncAt(new Date().toISOString())
      toast.success('ซิงค์ข้อมูลสำเร็จ')
    } else {
      useAuthStore.getState().setSyncError(result.error)
      toast.error(`ซิงค์ไม่สำเร็จ: ${result.error}`)
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
      toast.error(`โหลดไม่สำเร็จ: ${result.error}`)
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
        : 'text-[var(--quest-primary)] dark:text-[var(--quest-primary-container)]'

  if (!user) {
    return (
      <>
        <button
          onClick={() => setAuthOpen(true)}
          title="เข้าสู่ระบบเพื่อ cloud sync"
          className={cn(
            'p-1.5 rounded-lg transition-colors',
            'text-gray-400 hover:bg-[var(--quest-primary-container)]/10 hover:text-[var(--quest-primary)] dark:text-white/30 dark:hover:bg-[var(--quest-primary-container)]/20 dark:hover:text-[var(--quest-primary-container)]',
            triggerClassName
          )}
        >
          <CloudOff className="w-4 h-4" />
        </button>
        <AuthModal open={authOpen} onOpenChange={setAuthOpen} />
      </>
    )
  }

  return (
    <>
      <DropdownMenu>
        <DropdownMenuTrigger
          title="Cloud sync"
          className={cn(
            'p-1.5 rounded-lg transition-colors hover:bg-gray-100 dark:hover:bg-white/[0.05]',
            color,
            triggerClassName
          )}
        >
          {icon}
        </DropdownMenuTrigger>

        <DropdownMenuContent align="end" className={cn('w-56', menuContentClassName)}>
          <div className="px-3 py-2.5 border-b border-gray-100 dark:border-white/[0.06]">
            <div className="mb-0.5 flex items-center gap-2">
              <User className="w-3.5 h-3.5 flex-shrink-0 text-gray-400 dark:text-white/30" />
              <p className="truncate text-xs font-medium text-gray-700 dark:text-white/70">{user.email}</p>
            </div>
            <p className="pl-5 text-[10px] text-gray-400 dark:text-white/30">
              {syncStatus === 'syncing'
                ? 'กำลังซิงค์...'
                : syncStatus === 'error'
                  ? 'ซิงค์ไม่สำเร็จ'
                  : lastSyncLabel
                    ? `ซิงค์แล้ว ${lastSyncLabel}`
                    : 'ยังไม่ได้ซิงค์'}
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
            className="gap-2 text-red-500 focus:text-red-600 focus:bg-red-50 dark:text-red-400 dark:focus:bg-red-500/10"
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
