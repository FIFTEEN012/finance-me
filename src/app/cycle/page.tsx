'use client'

import { useState } from 'react'
import { Droplets, Settings, Plus, Calendar, History, Trash2, Sparkles } from 'lucide-react'
import { toast } from 'sonner'
import { Button } from '@/components/ui/button'
import { PressCard } from '@/components/ui/PressCard'
import { CycleWheel } from '@/components/cycle/CycleWheel'
import { CycleSettingsDialog } from '@/components/cycle/CycleSettingsDialog'
import { useCycleStore, getTodayDateString } from '@/store/useCycleStore'
import { formatDateShort } from '@/lib/utils'

export default function CyclePage() {
  const [settingsOpen, setSettingsOpen] = useState(false)
  const getCurrentCycleInfo = useCycleStore((state) => state.getCurrentCycleInfo)
  const periodLength = useCycleStore((state) => state.periodLength)
  const lastPeriodDate = useCycleStore((state) => state.lastPeriodDate)
  const logs = useCycleStore((state) => state.logs)
  const logPeriodStart = useCycleStore((state) => state.logPeriodStart)
  const deleteLog = useCycleStore((state) => state.deleteLog)

  const cycleInfo = getCurrentCycleInfo()

  const handleStartToday = () => {
    const today = getTodayDateString()
    if (lastPeriodDate === today) {
      toast.info('บันทึกวันแรกของรอบเดือนวันนี้ไว้แล้ว')
      return
    }

    logPeriodStart(today)
    toast.success('บันทึกการเริ่มมีประจำเดือนรอบใหม่แล้ว ✨', {
      description: 'ระบบอัปเดตวันเริ่มต้นและคำนวณระยะรอบเดือนใหม่อัตโนมัติ',
    })
  }

  return (
    <div className="space-y-6 pb-20 max-w-2xl mx-auto font-quest-body">
      {/* Header Banner */}
      <PressCard
        shadow="0 6px 0 0 #be123c"
        shadowHover="0 4px 0 0 #be123c"
        className="rounded-3xl border-[3px] border-rose-300 dark:border-rose-900 bg-gradient-to-br from-rose-400 via-pink-500 to-purple-600 p-5 text-white"
      >
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3.5">
            <div className="flex h-12 w-12 items-center justify-center rounded-2xl border-2 border-white/30 bg-white/20 text-2xl shadow-inner">
              🌸
            </div>
            <div>
              <h1 className="font-quest-heading text-2xl sm:text-3xl font-black leading-tight">
                วงล้อรอบเดือน
              </h1>
              <p className="text-xs sm:text-sm font-bold text-white/90">
                ติดตามระยะฮอร์โมนและวันรอบเดือนของคุณ
              </p>
            </div>
          </div>

          <Button
            variant="outline"
            size="icon"
            onClick={() => setSettingsOpen(true)}
            className="h-11 w-11 rounded-2xl border-2 border-white/40 bg-white/20 text-white hover:bg-white/30 active:translate-y-0.5"
          >
            <Settings className="h-5 w-5" />
          </Button>
        </div>
      </PressCard>

      {/* Main Wheel Card */}
      <PressCard
        shadow="0 6px 0 0 #e2e8f0"
        shadowHover="0 4px 0 0 #e2e8f0"
        className="rounded-3xl border-[3px] border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-6 sm:p-8"
      >
        <CycleWheel info={cycleInfo} periodLength={periodLength} />

        {/* Action Button Section */}
        <div className="mt-8 flex flex-col sm:flex-row items-center justify-center gap-3">
          <Button
            onClick={handleStartToday}
            className="w-full sm:w-auto h-13 px-6 rounded-2xl bg-rose-500 hover:bg-rose-600 text-white font-black text-base shadow-[0_4px_0_0_#be123c] active:translate-y-[2px] transition-all flex items-center justify-center gap-2"
          >
            <Droplets className="h-5 w-5 fill-white" />
            <span>เริ่มมีประจำเดือนวันนี้</span>
          </Button>

          <Button
            variant="outline"
            onClick={() => setSettingsOpen(true)}
            className="w-full sm:w-auto h-13 px-5 rounded-2xl border-2 border-slate-200 dark:border-slate-700 font-black text-slate-700 dark:text-slate-200 hover:bg-slate-50 dark:hover:bg-slate-800"
          >
            <Calendar className="h-4 w-4 mr-1.5 text-slate-400" />
            ปรับวันเริ่ม / รอบเดือน
          </Button>
        </div>
      </PressCard>

      {/* Period History Logs */}
      {logs.length > 0 && (
        <section className="space-y-3">
          <div className="flex items-center gap-2 px-1">
            <History className="h-4 w-4 text-slate-400" />
            <h2 className="text-sm font-black text-slate-700 dark:text-slate-300">
              ประวัติการบันทึกรอบเดือน
            </h2>
          </div>

          <div className="space-y-2">
            {logs.slice(0, 5).map((log) => (
              <div
                key={log.id}
                className="flex items-center justify-between p-3.5 rounded-2xl border-2 border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900"
              >
                <div className="flex items-center gap-3">
                  <span className="text-lg">🩸</span>
                  <div>
                    <p className="text-sm font-black text-slate-800 dark:text-slate-100">
                      เริ่มมีประจำเดือน: {formatDateShort(log.startDate)}
                    </p>
                    <p className="text-[11px] font-bold text-slate-400">
                      บันทึกเมื่อ {formatDateShort(log.createdAt.slice(0, 10))}
                    </p>
                  </div>
                </div>

                <Button
                  variant="ghost"
                  size="icon"
                  onClick={() => {
                    if (window.confirm('ต้องการลบประวัตินี้ใช่ไหม?')) {
                      deleteLog(log.id)
                      toast.success('ลบประวัติเรียบร้อย')
                    }
                  }}
                  className="h-8 w-8 text-slate-400 hover:text-rose-500 rounded-xl"
                >
                  <Trash2 className="h-4 w-4" />
                </Button>
              </div>
            ))}
          </div>
        </section>
      )}

      {/* Settings Dialog */}
      <CycleSettingsDialog open={settingsOpen} onOpenChange={setSettingsOpen} />
    </div>
  )
}
