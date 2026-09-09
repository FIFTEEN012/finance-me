'use client'

import { useState } from 'react'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { toast } from 'sonner'
import { LogIn, UserPlus, Mail, Lock, Database, Loader2, Eye, EyeOff, User } from 'lucide-react'

import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { authClient } from '@/lib/auth-client'
import { migrateLocalDataToNeon } from '@/lib/migrateLocalData'
import { pullFromNeon } from '@/lib/neonSync'
import { useAuthStore } from '@/store/useAuthStore'

const schema = z.object({
  name:     z.string().optional(),
  email:    z.string().email('อีเมลไม่ถูกต้อง'),
  password: z.string().min(6, 'รหัสผ่านต้องมีอย่างน้อย 6 ตัวอักษร'),
})
type FormValues = z.infer<typeof schema>

interface Props {
  open: boolean
  onOpenChange: (o: boolean) => void
  forced?: boolean
}

export function AuthModal({ open, onOpenChange, forced = false }: Props) {
  const [mode, setMode] = useState<'login' | 'signup'>('login')
  const [showPw, setShowPw] = useState(false)
  const [loading, setLoading] = useState(false)

  const { register, handleSubmit, reset, formState: { errors } } = useForm<FormValues>({
    resolver: zodResolver(schema),
  })

  const toggle = () => { setMode((m) => m === 'login' ? 'signup' : 'login'); reset() }

  const handleOpenChange = (nextOpen: boolean) => {
    if (forced && !nextOpen) {
      // Prevent closing when auth is required
      return
    }
    onOpenChange(nextOpen)
  }

  const onSubmit = async (data: FormValues) => {
    setLoading(true)
    try {
      if (mode === 'login') {
        const res = await authClient.signIn.email({
          email: data.email,
          password: data.password,
        })

        if (res.data?.user) {
          useAuthStore.getState().setUser(res.data.user)
          // Auto migrate local items to Neon if any exist
          await migrateLocalDataToNeon()
          // Pull and sync latest records
          await pullFromNeon()
          toast.success('เข้าสู่ระบบสำเร็จ — ข้อมูลเชื่อมต่อกับ Neon PostgreSQL แล้ว')
          onOpenChange(false)
          return
        }

        if (res.error) throw new Error(res.error.message || 'อีเมลหรือรหัสผ่านไม่ถูกต้อง')
      } else {
        const res = await authClient.signUp.email({
          email: data.email,
          password: data.password,
          name: data.name?.trim() || data.email.split('@')[0],
        })

        if (res.data?.user) {
          useAuthStore.getState().setUser(res.data.user)
          const migrateRes = await migrateLocalDataToNeon()
          await pullFromNeon()
          if (migrateRes.ok && migrateRes.count) {
            toast.success(`สมัครสมาชิกสำเร็จ — นำเข้าข้อมูลเดิม ${migrateRes.count} รายการขึ้น Neon แล้ว`)
          } else {
            toast.success('สมัครสมาชิกและสร้างบัญชี Neon สำเร็จ')
          }
          onOpenChange(false)
          return
        }

        if (res.error) throw new Error(res.error.message || 'ไม่สามารถสมัครสมาชิกได้')
      }
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'เกิดข้อผิดพลาดในการเชื่อมต่อ'
      toast.error(msg)
    } finally {
      setLoading(false)
    }
  }

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogContent
        className="max-w-sm dark:bg-[rgba(8,14,30,0.97)] dark:border-white/[0.08]"
        showCloseButton={!forced}
      >
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Database className="w-5 h-5 text-emerald-500" />
            {mode === 'login' ? 'เข้าสู่ระบบ' : 'สมัครสมาชิก'} Neon PostgreSQL
          </DialogTitle>
        </DialogHeader>

        {forced && (
          <p className="text-xs text-amber-600 dark:text-amber-400 bg-amber-50 dark:bg-amber-500/10 p-2 rounded-lg border border-amber-200 dark:border-amber-500/20">
            🔒 กรุณาเข้าสู่ระบบเพื่อเข้าใช้งานและบันทึกข้อมูลเข้าสู่ฐานข้อมูลของคุณ
          </p>
        )}

        <form onSubmit={handleSubmit(onSubmit)} className="space-y-4 py-1">
          {/* Name (for signup only) */}
          {mode === 'signup' && (
            <div>
              <Label className="text-sm mb-1.5 block">ชื่อที่ใช้แสดง</Label>
              <div className="relative">
                <User className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                <Input
                  {...register('name')}
                  type="text"
                  placeholder="เช่น มะนาว หรือ ต้น"
                  className="pl-9"
                  autoComplete="name"
                />
              </div>
            </div>
          )}

          {/* Email */}
          <div>
            <Label className="text-sm mb-1.5 block">อีเมล</Label>
            <div className="relative">
              <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
              <Input
                {...register('email')}
                type="email"
                placeholder="you@example.com"
                className={`pl-9 ${errors.email ? 'border-red-400' : ''}`}
                autoComplete="email"
              />
            </div>
            {errors.email && <p className="text-xs text-red-500 mt-1">{errors.email.message}</p>}
          </div>

          {/* Password */}
          <div>
            <Label className="text-sm mb-1.5 block">รหัสผ่าน</Label>
            <div className="relative">
              <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
              <Input
                {...register('password')}
                type={showPw ? 'text' : 'password'}
                placeholder={mode === 'signup' ? 'อย่างน้อย 6 ตัวอักษร' : '••••••••'}
                className={`pl-9 pr-10 ${errors.password ? 'border-red-400' : ''}`}
                autoComplete={mode === 'login' ? 'current-password' : 'new-password'}
              />
              <button
                type="button"
                onClick={() => setShowPw((v) => !v)}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
              >
                {showPw ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
              </button>
            </div>
            {errors.password && <p className="text-xs text-red-500 mt-1">{errors.password.message}</p>}
          </div>

          {/* Info for signup */}
          {mode === 'signup' && (
            <div className="px-3 py-2.5 rounded-xl bg-emerald-50 dark:bg-emerald-500/10 border border-emerald-100 dark:border-emerald-500/20 text-xs text-emerald-700 dark:text-emerald-400">
              📦 ข้อมูลที่มีอยู่ในเครื่องจะถูกนำเข้าสู่ฐานข้อมูล Neon ของคุณให้อัตโนมัติ
            </div>
          )}

          <Button
            type="submit"
            disabled={loading}
            className="w-full bg-emerald-600 hover:bg-emerald-700 text-white gap-2"
          >
            {loading
              ? <Loader2 className="w-4 h-4 animate-spin" />
              : mode === 'login'
                ? <LogIn className="w-4 h-4" />
                : <UserPlus className="w-4 h-4" />
            }
            {loading ? 'กำลังดำเนินการ...' : mode === 'login' ? 'เข้าสู่ระบบ' : 'สมัครสมาชิก'}
          </Button>

          <p className="text-center text-xs text-gray-500 dark:text-gray-400">
            {mode === 'login' ? 'ยังไม่มีบัญชี?' : 'มีบัญชีอยู่แล้ว?'}{' '}
            <button type="button" onClick={toggle} className="text-emerald-600 dark:text-emerald-400 hover:underline font-medium">
              {mode === 'login' ? 'สมัครสมาชิก' : 'เข้าสู่ระบบ'}
            </button>
          </p>
        </form>
      </DialogContent>
    </Dialog>
  )
}
