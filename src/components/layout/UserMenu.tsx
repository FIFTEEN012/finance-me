'use client'

import { useState } from 'react'
import { User, LogOut, Loader2 } from 'lucide-react'
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
import { authClient } from '@/lib/auth-client'
import { cn } from '@/lib/utils'

interface UserMenuProps {
  triggerClassName?: string
  menuContentClassName?: string
}

export function UserMenu({ triggerClassName, menuContentClassName }: UserMenuProps) {
  const user = useAuthStore((state) => state.user)
  const [authOpen, setAuthOpen] = useState(false)
  const [loggingOut, setLoggingOut] = useState(false)

  const handleLogout = async () => {
    setLoggingOut(true)
    try {
      await authClient.signOut()
      useAuthStore.getState().setUser(null)
      toast.success('ออกจากระบบเรียบร้อยแล้ว')
    } catch {
      toast.error('ไม่สามารถออกจากระบบได้')
    } finally {
      setLoggingOut(false)
    }
  }

  if (!user) {
    return (
      <>
        <button
          onClick={() => setAuthOpen(true)}
          className={cn(
            'flex items-center gap-1.5 rounded-full border-2 border-[#becbb1] bg-white px-3 py-1.5 text-xs font-bold text-[#454e3d] hover:bg-[#f4f3f3] dark:border-[#3b4630] dark:bg-[#1c2117] dark:text-[#c2cfb4] transition-all cursor-pointer',
            triggerClassName
          )}
        >
          <User className="w-3.5 h-3.5" />
          <span>เข้าสู่ระบบ</span>
        </button>
        <AuthModal open={authOpen} onOpenChange={setAuthOpen} />
      </>
    )
  }

  const userInitial = (user.name || user.email || 'U')[0].toUpperCase()

  return (
    <>
      <DropdownMenu>
        <DropdownMenuTrigger
          title="บัญชีผู้ใช้"
          className={cn(
            'flex items-center justify-center h-8 w-8 rounded-full border-2 border-[#becbb1] bg-emerald-100 text-emerald-800 font-black text-xs hover:ring-2 hover:ring-emerald-400 dark:border-[#3b4630] dark:bg-emerald-950 dark:text-emerald-300 transition-all cursor-pointer',
            triggerClassName
          )}
        >
          {userInitial}
        </DropdownMenuTrigger>

        <DropdownMenuContent align="end" className={cn('w-56 p-1.5', menuContentClassName)}>
          <div className="px-3 py-2 border-b border-gray-100 dark:border-white/[0.06]">
            <p className="text-xs font-bold text-gray-800 dark:text-white/90 truncate">
              {user.name || 'ผู้ใช้งาน'}
            </p>
            <p className="text-[11px] text-gray-400 dark:text-white/40 truncate">
              {user.email}
            </p>
          </div>

          <DropdownMenuSeparator />

          <DropdownMenuItem
            onClick={handleLogout}
            disabled={loggingOut}
            className="gap-2 text-red-500 focus:text-red-600 focus:bg-red-50 dark:text-red-400 dark:focus:bg-red-500/10 cursor-pointer"
          >
            {loggingOut ? (
              <Loader2 className="w-3.5 h-3.5 animate-spin" />
            ) : (
              <LogOut className="w-3.5 h-3.5" />
            )}
            ออกจากระบบ
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>

      <AuthModal open={false} onOpenChange={() => {}} />
    </>
  )
}
