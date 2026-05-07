'use client'

import { useState } from 'react'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { toast } from 'sonner'
import { LogIn, UserPlus, Mail, Lock, Cloud, Loader2, Eye, EyeOff } from 'lucide-react'

import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { supabase, isCloudEnabled } from '@/lib/supabase'
import { pushToCloud } from '@/lib/cloudSync'

const schema = z.object({
  email:    z.string().email('อีเมลไม่ถูกต้อง'),
  password: z.string().min(6, 'รหัสผ่านต้องมีอย่างน้อย 6 ตัวอักษร'),
})
type FormValues = z.infer<typeof schema>

interface Props {
  open: boolean
  onOpenChange: (o: boolean) => void
}

export function AuthModal({ open, onOpenChange }: Props) {
  const [mode, setMode] = useState<'login' | 'signup'>('login')
  const [showPw, setShowPw] = useState(false)
  const [loading, setLoading] = useState(false)

  const { register, handleSubmit, reset, formState: { errors } } = useForm<FormValues>({
    resolver: zodResolver(schema),
  })

  const toggle = () => { setMode((m) => m === 'login' ? 'signup' : 'login'); reset() }

  const onSubmit = async (data: FormValues) => {
    if (!supabase) return
    setLoading(true)
    try {
      if (mode === 'login') {
        const { error } = await supabase.auth.signInWithPassword({
          email: data.email, password: data.password,
        })
        if (error) throw error
        toast.success('เข้าสู่ระบบสำเร็จ — กำลังซิงค์ข้อมูล...')
        onOpenChange(false)

      } else {
        const { data: authData, error } = await supabase.auth.signUp({
          email: data.email, password: data.password,
        })
        if (error) throw error

        // Upload existing local data to new account
        if (authData.user) {
          await pushToCloud(authData.user.id)
          toast.success('สมัครสมาชิกสำเร็จ — ข้อมูลในเครื่องถูกบันทึกขึ้น cloud แล้ว')
        } else {
          toast.success('สมัครสมาชิกสำเร็จ — กรุณาตรวจสอบอีเมลเพื่อยืนยันบัญชี')
        }
        onOpenChange(false)
      }
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'เกิดข้อผิดพลาด'
      toast.error(msg)
    } finally {
      setLoading(false)
    }
  }

  if (!isCloudEnabled) {
    return (
      <Dialog open={open} onOpenChange={onOpenChange}>
        <DialogContent className="max-w-sm">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Cloud className="w-5 h-5 text-violet-500" />
              Cloud Sync
            </DialogTitle>
          </DialogHeader>
          <div className="text-sm text-gray-500 dark:text-gray-400 space-y-3 py-2">
            <p>ยังไม่ได้ตั้งค่า Supabase credentials</p>
            <ol className="list-decimal list-inside space-y-1.5 text-xs">
              <li>สร้างโปรเจกต์ที่ <span className="font-mono text-violet-600">supabase.com</span></li>
              <li>รัน SQL จากไฟล์ <span className="font-mono">supabase-schema.sql</span></li>
              <li>คัดลอก URL + anon key จาก Settings → API</li>
              <li>วางใน <span className="font-mono">.env.local</span> ตามตัวอย่าง <span className="font-mono">.env.local.example</span></li>
              <li>Restart dev server</li>
            </ol>
          </div>
          <Button variant="outline" onClick={() => onOpenChange(false)}>ปิด</Button>
        </DialogContent>
      </Dialog>
    )
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-sm dark:bg-[rgba(8,14,30,0.97)] dark:border-white/[0.08]">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Cloud className="w-5 h-5 text-violet-500" />
            {mode === 'login' ? 'เข้าสู่ระบบ' : 'สมัครสมาชิก'} Cloud Sync
          </DialogTitle>
        </DialogHeader>

        <form onSubmit={handleSubmit(onSubmit)} className="space-y-4 py-1">
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
            <div className="px-3 py-2.5 rounded-xl bg-violet-50 dark:bg-violet-500/10 border border-violet-100 dark:border-violet-500/20 text-xs text-violet-700 dark:text-violet-400">
              📦 ข้อมูลที่มีอยู่ในเครื่องจะถูกอัปโหลดขึ้น cloud โดยอัตโนมัติ
            </div>
          )}

          <Button
            type="submit"
            disabled={loading}
            className="w-full bg-violet-600 hover:bg-violet-700 gap-2"
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
            <button type="button" onClick={toggle} className="text-violet-600 dark:text-violet-400 hover:underline font-medium">
              {mode === 'login' ? 'สมัครสมาชิก' : 'เข้าสู่ระบบ'}
            </button>
          </p>
        </form>
      </DialogContent>
    </Dialog>
  )
}
