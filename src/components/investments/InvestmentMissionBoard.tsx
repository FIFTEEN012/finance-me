'use client'

import { Pencil, PieChart as PieChartIcon, Plus, RefreshCw, Sparkles, Trash2, TrendingDown, TrendingUp, Wallet } from 'lucide-react'
import { Cell, Pie, PieChart as RechartsPieChart, ResponsiveContainer, Tooltip } from 'recharts'
import { Button } from '@/components/ui/button'
import { PressCard } from '@/components/ui/PressCard'
import { cn } from '@/lib/utils'
import { ASSET_CLASS_META } from '@/components/investments/InvestmentForm'
import type { AssetClass } from '@/types'

export interface GrowthProgressModel {
  level: number
  progressPercent: number
  remainingLabel: string
}

export interface SummaryStatItem {
  accent: 'orange' | 'blue' | 'green'
  label: string
  value: string
}

export interface AllocationItem {
  color: string
  name: string
  value: number
}

export interface MissionHoldingItem {
  canSync: boolean
  currentValueLabel: string
  currentValueNativeLabel?: string
  gainLossLabel: string
  id: string
  isPositive: boolean
  isSyncing: boolean
  lastUpdatedLabel: string
  name: string
  onDelete: () => void
  onEdit: () => void
  onManualUpdate: () => void
  onSync: () => void
  priceLabel: string
  returnLabel: string
  ticker?: string
  unitsLabel: string
}

export interface MissionSectionItem {
  assetClass: AssetClass
  holdings: MissionHoldingItem[]
  stage: number
  totalValueLabel: string
}

interface InvestmentMissionBoardProps {
  allocationData: AllocationItem[]
  canSyncAll: boolean
  growth: GrowthProgressModel
  holdingsCount: number
  isPositive: boolean
  onAddHolding: () => void
  onBuyInvestment: () => void
  onSyncAll: () => void
  sections: MissionSectionItem[]
  summaryCards: SummaryStatItem[]
  syncingAll: boolean
  totalGainLossLabel: string
  totalReturnLabel: string
  totalValueLabel: string
}

const SUMMARY_STYLES: Record<SummaryStatItem['accent'], { border: string; shadow: string; text: string }> = {
  orange: { border: '#ff9c27', shadow: '0 4px 0 0 #ff9c27', text: '#8c5000' },
  blue: { border: '#2fb8ff', shadow: '0 4px 0 0 #2fb8ff', text: '#006590' },
  green: { border: '#58cc02', shadow: '0 4px 0 0 #58cc02', text: '#2b6c00' },
}

export function InvestmentMissionBoard({
  allocationData,
  canSyncAll,
  growth,
  holdingsCount,
  isPositive,
  onAddHolding,
  onBuyInvestment,
  onSyncAll,
  sections,
  summaryCards,
  syncingAll,
  totalGainLossLabel,
  totalReturnLabel,
  totalValueLabel,
}: InvestmentMissionBoardProps) {
  if (!holdingsCount) {
    return (
      <div className="space-y-6">
        <PressCard
          shadow="0 6px 0 0 #becbb1"
          shadowHover="0 3px 0 0 #becbb1"
          className="border-[#becbb1] bg-[var(--quest-surface)] px-6 py-10 text-center dark:border-[#3b4630] dark:bg-[var(--quest-surface)]"
        >
          <div className="mx-auto flex h-24 w-24 items-center justify-center rounded-full border-4 border-[#becbb1] bg-[var(--quest-surface-low)] text-[#58cc02] dark:border-[#3b4630] dark:bg-[var(--quest-surface-low)]">
            <Sparkles className="h-10 w-10" />
          </div>
          <h2 className="mt-6 font-quest-heading text-[1.7rem] font-black text-[var(--quest-foreground)]">
            ยังไม่มีภารกิจการลงทุน?
          </h2>
          <p className="mx-auto mt-2 max-w-lg text-base text-[var(--quest-muted)]">
            เริ่มเพิ่มสินทรัพย์แรกของคุณวันนี้ เพื่อปลดล็อกการเติบโตและติดตามความคืบหน้าของพอร์ตแบบ Finance Quest
          </p>
          <button
            type="button"
            onClick={onBuyInvestment}
            className="mt-6 inline-flex items-center justify-center gap-2 rounded-2xl border-2 border-[#2b6c00] bg-[#58cc02] px-6 py-3 font-bold text-[#1e5000] shadow-[0_6px_0_0_#1e5000] transition-all hover:-translate-y-0.5 active:translate-y-1 active:shadow-[0_2px_0_0_#1e5000]"
          >
            <Plus className="h-4 w-4" />
            เริ่มภารกิจใหม่
          </button>
        </PressCard>
      </div>
    )
  }

  return (
    <div className="space-y-8">
      <PortfolioHero
        isPositive={isPositive}
        totalGainLossLabel={totalGainLossLabel}
        totalReturnLabel={totalReturnLabel}
        totalValueLabel={totalValueLabel}
      />

      <GrowthProgress growth={growth} />

      <section className="grid grid-cols-1 gap-4 md:grid-cols-3">
        {summaryCards.map((item) => (
          <SummaryStatCard key={item.label} item={item} />
        ))}
      </section>

      <section className="flex flex-col gap-4 md:flex-row">
        <button
          type="button"
          onClick={onBuyInvestment}
          className="flex flex-1 items-center justify-center gap-2 rounded-2xl border-2 border-[#2b6c00] bg-[#58cc02] px-6 py-4 font-bold text-[#1e5000] shadow-[0_6px_0_0_#1e5000] transition-all hover:-translate-y-0.5 active:translate-y-1 active:shadow-[0_2px_0_0_#1e5000]"
        >
          <Plus className="h-5 w-5" />
          เพิ่มสินทรัพย์ใหม่
        </button>
        <Button
          type="button"
          variant="outline"
          onClick={onAddHolding}
          className="h-auto rounded-2xl border-2 border-[#6f7b64] bg-[var(--quest-surface)] px-6 py-4 font-bold text-[var(--quest-muted)] shadow-[0_6px_0_0_#6f7b64] transition-all hover:-translate-y-0.5 hover:bg-[var(--quest-surface-low)] active:translate-y-1 active:shadow-[0_2px_0_0_#6f7b64] dark:border-[#5f6e52] dark:bg-[var(--quest-surface)] dark:text-[var(--quest-muted)]"
        >
          <Plus className="h-4 w-4" />
          เพิ่มพอร์ตย้อนหลัง
        </Button>
        <Button
          type="button"
          variant="outline"
          onClick={onSyncAll}
          disabled={!canSyncAll || syncingAll}
          className="h-auto rounded-2xl border-2 border-[#6f7b64] bg-[var(--quest-surface)] px-6 py-4 font-bold text-[var(--quest-muted)] shadow-[0_6px_0_0_#6f7b64] transition-all hover:-translate-y-0.5 hover:bg-[var(--quest-surface-low)] active:translate-y-1 active:shadow-[0_2px_0_0_#6f7b64] disabled:translate-y-0 disabled:shadow-none dark:border-[#5f6e52] dark:bg-[var(--quest-surface)] dark:text-[var(--quest-muted)]"
        >
          <RefreshCw className={cn('h-4 w-4', syncingAll && 'animate-spin')} />
          {syncingAll ? 'กำลังอัปเดต...' : 'อัปเดตราคา'}
        </Button>
      </section>

      <AllocationCard allocationData={allocationData} totalValueLabel={totalValueLabel} />

      <section className="space-y-8">
        {sections.map((section) => (
          <MissionSection key={section.assetClass} section={section} />
        ))}
      </section>
    </div>
  )
}

export function PortfolioHero({
  isPositive,
  totalGainLossLabel,
  totalReturnLabel,
  totalValueLabel,
}: {
  isPositive: boolean
  totalGainLossLabel: string
  totalReturnLabel: string
  totalValueLabel: string
}) {
  return (
    <PressCard
      shadow={isPositive ? '0 8px 0 0 #1e5000' : '0 8px 0 0 #7f1d1d'}
      shadowHover={isPositive ? '0 4px 0 0 #1e5000' : '0 4px 0 0 #7f1d1d'}
      className={cn(
        'border-4 px-6 py-7 text-[var(--quest-on-primary-container)] md:px-8',
        isPositive
          ? 'border-[#2b6c00] bg-[#58cc02]'
          : 'border-rose-700 bg-rose-400 text-rose-950'
      )}
    >
      <div className="flex items-start justify-between gap-4">
        <div className="min-w-0">
          <p className="font-quest-body text-sm font-bold uppercase tracking-[0.18em] text-current/80">
            มูลค่าพอร์ตทั้งหมด
          </p>
          <h1 className="mt-2 font-quest-heading text-3xl font-black tracking-tight text-current md:text-[2.2rem]">
            {totalValueLabel}
          </h1>
        </div>
        <div className="flex h-14 w-14 shrink-0 items-center justify-center rounded-2xl border-2 border-white/30 bg-white/20 text-current">
          <Wallet className="h-7 w-7" />
        </div>
      </div>

      <div className="mt-5 flex flex-wrap items-center gap-3">
        <div className="flex items-center gap-2 rounded-xl border-2 border-white/30 bg-[rgb(30_80_0_/_0.16)] px-4 py-2 text-sm font-bold text-[var(--quest-background)]">
          {isPositive ? <TrendingUp className="h-4 w-4" /> : <TrendingDown className="h-4 w-4" />}
          <span>
            {totalGainLossLabel} ({totalReturnLabel})
          </span>
        </div>
        <p className="font-quest-body text-sm font-bold text-current/85">ผลตอบแทนรวม Mission นี้!</p>
      </div>
    </PressCard>
  )
}

export function GrowthProgress({ growth }: { growth: GrowthProgressModel }) {
  return (
    <section className="space-y-3">
      <div className="flex items-end justify-between gap-3">
        <h2 className="font-quest-heading text-[1.35rem] font-black text-[#2b6c00] dark:text-[#87fe45]">
          พลังการเติบโต (Growth XP)
        </h2>
        <span className="font-quest-body text-xs font-bold uppercase tracking-[0.18em] text-[var(--quest-muted)]">
          LVL {growth.level}
        </span>
      </div>
      <div className="h-6 rounded-full border-2 border-[#becbb1] bg-[#e3e2e2] p-1 dark:border-[#3b4630] dark:bg-[#272e21]">
        <div
          className="quest-progress-fill h-full rounded-full border-b-2 border-[#006590] bg-[#2fb8ff] transition-[width] duration-500"
          style={{ width: `${Math.max(8, growth.progressPercent)}%` }}
        />
      </div>
      <p className="text-center font-quest-body text-xs font-bold tracking-[0.12em] text-[var(--quest-muted)]">
        อีก {growth.remainingLabel} เพื่อปลดล็อกเลเวลถัดไป!
      </p>
    </section>
  )
}

export function SummaryStatCard({ item }: { item: SummaryStatItem }) {
  const accent = SUMMARY_STYLES[item.accent]

  return (
    <PressCard
      shadow={accent.shadow}
      shadowHover={accent.shadow.replace('4px', '2px')}
      className="border-[var(--quest-outline-variant)] bg-[var(--quest-surface)] p-4 dark:border-[#3b4630] dark:bg-[var(--quest-surface)]"
      style={{ borderColor: accent.border }}
    >
      <p className="font-quest-body text-xs font-bold tracking-[0.16em] text-[var(--quest-muted)]">
        {item.label}
      </p>
      <p className="mt-2 font-quest-heading text-2xl font-black tracking-tight" style={{ color: accent.text }}>
        {item.value}
      </p>
    </PressCard>
  )
}

export function AllocationCard({
  allocationData,
  totalValueLabel,
}: {
  allocationData: AllocationItem[]
  totalValueLabel: string
}) {
  return (
    <PressCard
      shadow="0 4px 0 0 #becbb1"
      shadowHover="0 2px 0 0 #becbb1"
      className="border-[#becbb1] bg-[var(--quest-surface)] p-6 dark:border-[#3b4630] dark:bg-[var(--quest-surface)]"
    >
      <div className="mb-6 flex items-center gap-2">
        <PieChartIcon className="h-5 w-5 text-[#006590]" />
        <h2 className="font-quest-heading text-[1.35rem] font-black text-[var(--quest-foreground)]">
          แผนที่พอร์ตการลงทุน
        </h2>
      </div>

      <div className="flex flex-col items-center gap-8 md:flex-row">
        <div className="relative h-52 w-52 shrink-0">
          <ResponsiveContainer width="100%" height="100%">
            <RechartsPieChart>
              <Pie data={allocationData} dataKey="value" innerRadius={58} outerRadius={84} paddingAngle={3}>
                {allocationData.map((item) => (
                  <Cell key={item.name} fill={item.color} />
                ))}
              </Pie>
              <Tooltip
                formatter={(value) => [
                  `฿${Number(value ?? 0).toLocaleString('th-TH', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`,
                  '',
                ]}
                contentStyle={{
                  borderRadius: 16,
                  border: '2px solid #becbb1',
                  boxShadow: '0 4px 0 0 #becbb1',
                  color: '#1a1c1c',
                }}
              />
            </RechartsPieChart>
          </ResponsiveContainer>
          <div className="pointer-events-none absolute inset-0 flex flex-col items-center justify-center">
            <span className="font-quest-body text-xs font-bold uppercase tracking-[0.18em] text-[var(--quest-muted)]">
              Asset
            </span>
            <span className="font-quest-heading text-2xl font-black text-[#2b6c00] dark:text-[#87fe45]">
              Mix
            </span>
          </div>
        </div>

        <div className="w-full space-y-2">
          {allocationData.map((item) => (
            <div
              key={item.name}
              className="flex items-center gap-3 rounded-xl bg-[var(--quest-surface-soft)] px-3 py-2 dark:bg-[var(--quest-surface-soft)]"
            >
              <span className="h-3 w-3 rounded-full" style={{ backgroundColor: item.color }} />
              <span className="flex-1 font-quest-body text-sm font-bold text-[var(--quest-foreground)]">
                {item.name}
              </span>
              <span className="font-quest-body text-xs font-bold text-[var(--quest-muted)]">
                {allocationData.length ? Math.round((item.value / allocationData.reduce((sum, datum) => sum + datum.value, 0)) * 100) : 0}%
              </span>
            </div>
          ))}
          <p className="pt-2 text-right font-quest-body text-xs font-bold uppercase tracking-[0.16em] text-[var(--quest-muted)]">
            มูลค่ารวม {totalValueLabel}
          </p>
        </div>
      </div>
    </PressCard>
  )
}

export function MissionSection({ section }: { section: MissionSectionItem }) {
  const meta = ASSET_CLASS_META[section.assetClass]

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-3">
        <div
          className="flex h-10 w-10 items-center justify-center rounded-full border-2 text-lg shadow-[0_2px_0_0_rgba(0,0,0,0.16)]"
          style={{
            backgroundColor: `${meta.color}22`,
            borderColor: meta.color,
            color: meta.color,
          }}
        >
          <span aria-hidden="true">{meta.emoji}</span>
        </div>
        <div className="min-w-0">
          <h2 className="truncate font-quest-heading text-[1.3rem] font-black text-[var(--quest-foreground)]">
            Mission: {meta.label} (ด่านที่ {section.stage})
          </h2>
          <p className="font-quest-body text-xs font-bold uppercase tracking-[0.16em] text-[var(--quest-muted)]">
            มูลค่ารวม {section.totalValueLabel}
          </p>
        </div>
      </div>

      <div className="space-y-4">
        {section.holdings.map((holding) => (
          <MissionHoldingCard key={holding.id} holding={holding} assetClass={section.assetClass} />
        ))}
      </div>
    </div>
  )
}

export function MissionHoldingCard({
  assetClass,
  holding,
}: {
  assetClass: AssetClass
  holding: MissionHoldingItem
}) {
  const meta = ASSET_CLASS_META[assetClass]
  const tickerLabel = holding.ticker || holding.name.replace(/\s+/g, '').slice(0, 4).toUpperCase()

  return (
    <PressCard
      shadow="0 4px 0 0 #becbb1"
      shadowHover="0 2px 0 0 #becbb1"
      className="border-[#becbb1] bg-[var(--quest-surface)] p-5 dark:border-[#3b4630] dark:bg-[var(--quest-surface)]"
    >
      <div className="flex items-start justify-between gap-4">
        <div className="min-w-0 flex-1">
          <div className="flex items-start gap-4">
            <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl border-2 border-[#becbb1] bg-[var(--quest-surface-soft)] font-quest-heading text-sm font-black text-[#2b6c00] dark:border-[#3b4630] dark:bg-[var(--quest-surface-soft)] dark:text-[#87fe45]">
              {tickerLabel}
            </div>
            <div className="min-w-0">
              <h3 className="truncate font-quest-heading text-xl font-black text-[var(--quest-foreground)]">
                {holding.name}
              </h3>
              <p className="mt-1 font-quest-body text-sm font-bold text-[var(--quest-muted)]">
                {holding.unitsLabel} @ {holding.priceLabel}
              </p>
              <div className="mt-3 flex flex-wrap items-center gap-2">
                {holding.ticker && (
                  <span className="rounded-full bg-[var(--quest-surface-soft)] px-2.5 py-1 font-quest-body text-[11px] font-bold uppercase tracking-[0.16em] text-[var(--quest-muted)]">
                    {holding.ticker}
                  </span>
                )}
                <button
                  type="button"
                  onClick={holding.onManualUpdate}
                  className="rounded-full border border-[#becbb1] bg-[var(--quest-background)] px-2.5 py-1 font-quest-body text-[11px] font-bold text-[var(--quest-muted)] transition-colors hover:bg-[var(--quest-surface-low)] dark:border-[#3b4630] dark:bg-[var(--quest-background)]"
                >
                  แก้ราคาเอง
                </button>
                <span className="font-quest-body text-[11px] font-bold text-[var(--quest-muted)]">
                  อัปเดต {holding.lastUpdatedLabel}
                </span>
              </div>
            </div>
          </div>
        </div>

        <div className="flex shrink-0 items-center gap-1">
          <button
            type="button"
            onClick={holding.onSync}
            aria-label={holding.canSync ? `ดึงราคาของ ${holding.name}` : `อัปเดตราคาของ ${holding.name}`}
            title={holding.canSync ? 'ดึงราคาจาก Yahoo Finance' : 'อัปเดตราคา'}
            className="rounded-lg p-2 text-[var(--quest-muted)] transition-colors hover:bg-[var(--quest-surface-low)] hover:text-[#2b6c00] dark:hover:bg-[var(--quest-surface-low)] dark:hover:text-[#87fe45]"
          >
            <RefreshCw className={cn('h-4 w-4', holding.isSyncing && 'animate-spin')} />
          </button>
          <button
            type="button"
            onClick={holding.onEdit}
            aria-label={`แก้ไข ${holding.name}`}
            title="แก้ไขหลักทรัพย์"
            className="rounded-lg p-2 text-[var(--quest-muted)] transition-colors hover:bg-[var(--quest-surface-low)] hover:text-[#2b6c00] dark:hover:bg-[var(--quest-surface-low)] dark:hover:text-[#87fe45]"
          >
            <Pencil className="h-4 w-4" />
          </button>
          <button
            type="button"
            onClick={holding.onDelete}
            aria-label={`ลบ ${holding.name}`}
            title="ลบหลักทรัพย์"
            className="rounded-lg p-2 text-rose-500 transition-colors hover:bg-rose-50 dark:hover:bg-rose-500/10"
          >
            <Trash2 className="h-4 w-4" />
          </button>
        </div>
      </div>

      <div className="mt-4 flex items-end justify-between gap-4 border-t-2 border-dashed border-[#becbb1] pt-4 dark:border-[#3b4630]">
        <div className="min-w-0">
          <p className="font-quest-body text-xs font-bold uppercase tracking-[0.16em] text-[var(--quest-muted)]">
            มูลค่าปัจจุบัน
          </p>
          <p className="truncate font-quest-heading text-xl font-black text-[var(--quest-foreground)]">
            {holding.currentValueLabel}
          </p>
          {holding.currentValueNativeLabel && (
            <p className="font-quest-body text-xs font-bold text-[var(--quest-muted)]">
              {holding.currentValueNativeLabel}
            </p>
          )}
        </div>

        <div className="shrink-0 text-right">
          <p
            className={cn(
              'flex items-center justify-end gap-1 font-quest-body text-sm font-bold',
              holding.isPositive ? 'text-[#2b6c00] dark:text-[#87fe45]' : 'text-rose-500'
            )}
          >
            {holding.isPositive ? <TrendingUp className="h-4 w-4" /> : <TrendingDown className="h-4 w-4" />}
            <span>
              {holding.gainLossLabel} ({holding.returnLabel})
            </span>
          </p>
        </div>
      </div>
    </PressCard>
  )
}
