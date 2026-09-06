'use client'

import { useState } from 'react'
import { BarChart3, TrendingUp, TrendingDown } from 'lucide-react'
import { cn, formatCurrency } from '@/lib/utils'
import type { WeeklyOverviewDay } from './forestDashboard'

interface WeeklyOverviewCardProps {
  days: WeeklyOverviewDay[]
}

export function WeeklyOverviewCard({ days }: WeeklyOverviewCardProps) {
  const [hoveredDay, setHoveredDay] = useState<WeeklyOverviewDay | null>(null)
  const hasActivity = days.some((day) => day.incomeTotal > 0 || day.expenseTotal > 0)

  const totalIncome = days.reduce((sum, day) => sum + day.incomeTotal, 0)
  const totalExpense = days.reduce((sum, day) => sum + day.expenseTotal, 0)

  return (
    <section className="forest-panel p-5 relative">
      <div className="mb-4 flex items-start justify-between gap-3">
        <div>
          <h2 className="font-quest-heading text-[1.2rem] font-black tracking-[-0.02em] text-[var(--forest-foreground)]">
            ภาพรวม 7 วันล่าสุด
          </h2>
          <p className="text-[11px] font-bold text-[var(--forest-muted)]">รายรับและรายจ่ายแบบวันต่อวัน</p>
        </div>
        <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-[var(--forest-surface-low)] text-[var(--forest-primary)] shrink-0">
          <BarChart3 className="h-5 w-5" />
        </div>
      </div>

      {hasActivity ? (
        <div className="space-y-4">
          {/* Chart Container */}
          <div className="relative pt-2">
            {/* Hover Tooltip Overlay */}
            <div className="min-h-[28px] mb-2 flex items-center justify-between px-1 text-xs">
              {hoveredDay ? (
                <div className="flex items-center gap-2.5 font-bold animate-fade-in text-[var(--forest-foreground)]">
                  <span className="bg-[var(--forest-surface-high)] px-2 py-0.5 rounded-lg border border-[var(--forest-outline-variant)]">
                    {hoveredDay.id} ({hoveredDay.label})
                  </span>
                  <span className="text-emerald-600 dark:text-emerald-400 flex items-center gap-1">
                    <TrendingUp className="h-3.5 w-3.5" />
                    +{formatCurrency(hoveredDay.incomeTotal)}
                  </span>
                  <span className="text-[#ba1a1a] dark:text-[#ffb4ab] flex items-center gap-1">
                    <TrendingDown className="h-3.5 w-3.5" />
                    -{formatCurrency(hoveredDay.expenseTotal)}
                  </span>
                </div>
              ) : (
                <p className="text-[11px] font-medium text-[var(--forest-muted)]">
                  แตะหรือวางเมาส์บนแท่งกราฟเพื่อดูรายละเอียดยอดเงิน
                </p>
              )}
            </div>

            {/* Background Grid Guidelines */}
            <div className="relative h-40 w-full flex items-end">
              <div className="absolute inset-0 flex flex-col justify-between pointer-events-none opacity-20">
                <div className="w-full border-b border-dashed border-[var(--forest-outline)]" />
                <div className="w-full border-b border-dashed border-[var(--forest-outline)]" />
                <div className="w-full border-b border-[var(--forest-outline)]" />
              </div>

              {/* Day Columns */}
              <div className="relative z-10 grid grid-cols-7 gap-2 w-full h-full items-end px-1">
                {days.map((day) => {
                  const isHovered = hoveredDay?.id === day.id
                  const hasDayActivity = day.incomeTotal > 0 || day.expenseTotal > 0

                  return (
                    <div
                      key={day.id}
                      onMouseEnter={() => setHoveredDay(day)}
                      onMouseLeave={() => setHoveredDay(null)}
                      className={cn(
                        'flex flex-col items-center h-full justify-end group cursor-pointer transition-transform',
                        isHovered && 'scale-105'
                      )}
                    >
                      {/* Bars Track Area */}
                      <div className="w-full h-full flex items-end justify-center gap-1 pb-1">
                        {/* Income Bar (Emerald) */}
                        <div className="flex-1 max-w-[14px] h-full flex items-end justify-center">
                          <div
                            className={cn(
                              'w-full rounded-t-md bg-emerald-500 shadow-[0_2px_0_0_#047857] transition-all duration-300',
                              isHovered ? 'brightness-110' : ''
                            )}
                            style={{
                              height: `${day.incomeHeight}%`,
                              minHeight: day.incomeTotal > 0 ? '6px' : '0px',
                            }}
                          />
                        </div>

                        {/* Expense Bar (Red/Coral) */}
                        <div className="flex-1 max-w-[14px] h-full flex items-end justify-center">
                          <div
                            className={cn(
                              'w-full rounded-t-md bg-[#ef4444] shadow-[0_2px_0_0_#991b1b] transition-all duration-300',
                              isHovered ? 'brightness-110' : ''
                            )}
                            style={{
                              height: `${day.expenseHeight}%`,
                              minHeight: day.expenseTotal > 0 ? '6px' : '0px',
                            }}
                          />
                        </div>
                      </div>

                      {/* Day Label */}
                      <div className="pt-2 border-t-2 border-[var(--forest-outline-variant)] w-full flex justify-center">
                        <span
                          className={cn(
                            'text-[10px] font-black rounded-md px-1.5 py-0.5 transition-colors',
                            day.isToday
                              ? 'bg-[var(--forest-primary-container)] text-white shadow-sm'
                              : hasDayActivity
                                ? 'text-[var(--forest-foreground)]'
                                : 'text-[var(--forest-muted)]'
                          )}
                        >
                          {day.label}
                        </span>
                      </div>
                    </div>
                  )
                })}
              </div>
            </div>
          </div>

          {/* Legend & Weekly Totals */}
          <div className="pt-2 flex flex-wrap items-center justify-between gap-3 text-[11px] font-bold border-t border-[var(--forest-outline-variant)]/40">
            <div className="flex items-center gap-4 text-[var(--forest-muted)]">
              <span className="flex items-center gap-1.5">
                <span className="h-2.5 w-2.5 rounded-full bg-emerald-500 shadow-[0_1px_0_0_#047857]" />
                รายรับ <span className="text-[var(--forest-foreground)] font-extrabold">{formatCurrency(totalIncome)}</span>
              </span>
              <span className="flex items-center gap-1.5">
                <span className="h-2.5 w-2.5 rounded-full bg-[#ef4444] shadow-[0_1px_0_0_#991b1b]" />
                รายจ่าย <span className="text-[var(--forest-foreground)] font-extrabold">{formatCurrency(totalExpense)}</span>
              </span>
            </div>

            <div className="text-[10px] uppercase tracking-wider font-extrabold text-[var(--forest-muted)]">
              7 วันล่าสุด
            </div>
          </div>
        </div>
      ) : (
        <div className="flex h-48 flex-col items-center justify-center gap-3 rounded-2xl border-2 border-dashed border-[var(--forest-outline-variant)] bg-[var(--forest-surface-low)] text-center p-4">
          <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-[var(--forest-surface-high)] text-[var(--forest-primary)] border border-[var(--forest-outline-variant)]">
            <BarChart3 className="h-6 w-6 text-[var(--forest-outline)]" />
          </div>
          <div>
            <p className="font-quest-heading text-base font-black text-[var(--forest-foreground)]">ยังไม่มีรายการใน 7 วันนี้</p>
            <p className="text-xs font-semibold text-[var(--forest-muted)] mt-0.5">บันทึกรายรับหรือรายจ่ายเพื่อให้กราฟแสดงสถิติล่าสุด</p>
          </div>
        </div>
      )}
    </section>
  )
}
