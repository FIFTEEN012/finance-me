import { PiggyBank } from 'lucide-react'
import type { DashboardHeroData } from './forestDashboard'

interface DashboardHeroMissionProps {
  hero: DashboardHeroData
}

export function DashboardHeroMission({ hero }: DashboardHeroMissionProps) {
  return (
    <section className="relative overflow-hidden rounded-[1.5rem] border-2 border-[var(--forest-primary)] bg-gradient-to-br from-[var(--forest-primary-container)] via-[var(--forest-primary-container)] to-[var(--forest-primary)] p-5 text-white shadow-[0_6px_0_0_#1b4300] md:p-6">
      <div className="absolute -bottom-10 -right-10 opacity-10">
        <PiggyBank className="h-44 w-44" />
      </div>

      <div className="relative z-10 flex flex-col gap-5 md:flex-row md:items-center md:justify-between">
        <div className="space-y-3">
          <span className="forest-chip border-white/30 bg-white/20 text-white">Daily Quest</span>

          <div>
            <h1 className="font-quest-heading text-[1.85rem] font-black tracking-[-0.03em] md:text-[2.15rem]">
              {hero.title}
            </h1>
            <p className="mt-1 max-w-2xl text-sm font-bold text-white/85 md:text-base">
              {hero.subtitle}
            </p>
          </div>

          <div className="flex flex-wrap gap-3">
            <div className="min-w-[104px] rounded-xl border border-white/20 bg-white/10 px-3 py-2.5 backdrop-blur-sm">
              <p className="text-[11px] font-bold text-white/80">XP รวม</p>
              <div className="mt-1 flex items-baseline gap-1.5 text-white">
                <span className="num text-2xl font-extrabold tracking-tight">{hero.xpTotalLabel}</span>
                <span className="text-[12px] font-bold">XP</span>
              </div>
            </div>

            <div className="min-w-[104px] rounded-xl border border-white/20 bg-white/10 px-3 py-2.5 backdrop-blur-sm">
              <p className="text-[11px] font-bold text-white/80">การบันทึก</p>
              <div className="mt-1 flex items-center gap-1.5 text-white">
                <span className="num text-2xl font-extrabold tracking-tight">{hero.monthlyLogCount}</span>
                <span className="text-[12px] font-bold">ครั้ง</span>
              </div>
            </div>
          </div>
        </div>

        <div className="relative z-10 flex h-28 w-28 items-center justify-center self-start rounded-full border-4 border-white/40 bg-white/20 shadow-xl md:h-32 md:w-32 md:self-center">
          <PiggyBank className="h-16 w-16 text-white md:h-20 md:w-20" />
        </div>
      </div>
    </section>
  )
}
