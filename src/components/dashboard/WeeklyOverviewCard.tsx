import { BarChart3 } from 'lucide-react'
import { cn } from '@/lib/utils'
import type { WeeklyOverviewDay } from './forestDashboard'

interface WeeklyOverviewCardProps {
  days: WeeklyOverviewDay[]
}

export function WeeklyOverviewCard({ days }: WeeklyOverviewCardProps) {
  const hasActivity = days.some((day) => day.incomeTotal > 0 || day.expenseTotal > 0)

  return (
    <section className="forest-panel p-5">
      <div className="mb-4 flex items-center justify-between gap-3">
        <div>
          <h2 className="font-quest-heading text-[1.2rem] font-black tracking-[-0.02em] text-[var(--forest-foreground)]">
            ภาพรวม 7 วันล่าสุด
          </h2>
          <p className="text-[11px] font-bold text-[var(--forest-muted)]">รายรับและรายจ่ายแบบวันต่อวัน</p>
        </div>
        <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-[var(--forest-surface-low)] text-[var(--forest-primary)]">
          <BarChart3 className="h-5 w-5" />
        </div>
      </div>

      {hasActivity ? (
        <>
          <div className="flex h-48 items-end justify-between gap-1.5 px-1">
            {days.map((day) => (
              <div key={day.id} className="flex flex-1 flex-col items-center gap-2">
                <div className="flex h-full w-full flex-col justify-end gap-1.5">
                  <div
                    className="w-full rounded-t-md bg-[#58cc02] transition-all"
                    style={{ height: `${day.incomeHeight}%` }}
                  />
                  <div
                    className="w-full rounded-t-md bg-[#ba1a1a]/35 transition-all"
                    style={{ height: `${day.expenseHeight}%` }}
                  />
                </div>
                <span className={cn('text-[9px] font-bold', day.isToday ? 'text-[#1b4300]' : 'text-[var(--forest-foreground)]')}>
                  {day.label}
                </span>
              </div>
            ))}
          </div>

          <div className="mt-4 flex items-center gap-4 text-[11px] font-bold text-[var(--forest-muted)]">
            <span className="flex items-center gap-1.5">
              <span className="h-2.5 w-2.5 rounded-full bg-[#58cc02]" />
              รายรับ
            </span>
            <span className="flex items-center gap-1.5">
              <span className="h-2.5 w-2.5 rounded-full bg-[#ba1a1a]/70" />
              รายจ่าย
            </span>
          </div>
        </>
      ) : (
        <div className="flex h-48 flex-col items-center justify-center gap-3 rounded-2xl border border-dashed border-[var(--forest-outline-variant)] bg-[var(--forest-surface-low)] text-center">
          <BarChart3 className="h-9 w-9 text-[var(--forest-outline)]" />
          <div>
            <p className="font-quest-heading text-lg font-black text-[var(--forest-foreground)]">ยังไม่มีข้อมูลรายวัน</p>
            <p className="text-sm font-medium text-[var(--forest-muted)]">บันทึกรายการเพิ่มเพื่อให้กราฟสัปดาห์นี้เริ่มมีชีวิต</p>
          </div>
        </div>
      )}
    </section>
  )
}
