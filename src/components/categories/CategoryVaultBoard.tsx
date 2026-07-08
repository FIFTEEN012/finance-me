import { ArrowDown, ArrowUp, Lock, Plus, ReceiptText, ShieldAlert, Tags, Trash2 } from 'lucide-react'
import { Category } from '@/types'
import { CategoryIcon } from '@/components/shared/CategoryIcon'
import { PressCard } from '@/components/ui/PressCard'
import { cn } from '@/lib/utils'

export interface CategoryVaultItem {
  category: Category
  txCount: number
  budgetCount: number
  inUse: boolean
}

interface CategoryVaultBoardProps {
  items: CategoryVaultItem[]
  incomeCount: number
  expenseCount: number
  totalCount: number
  onAddCategory: () => void
  onEditCategory: (category: Category) => void
  onDeleteCategory: (category: Category) => void
}

export function CategoryVaultBoard({
  items,
  incomeCount,
  expenseCount,
  totalCount,
  onAddCategory,
  onEditCategory,
  onDeleteCategory,
}: CategoryVaultBoardProps) {
  const hasCategories = items.length > 0

  return (
    <div className="mx-auto max-w-5xl px-5 py-8 pb-28 font-quest-body md:px-8 md:py-10 lg:pb-10">
      <div className="mx-auto max-w-4xl space-y-6">
        <CategoryVaultHero
          incomeCount={incomeCount}
          expenseCount={expenseCount}
          onAddCategory={onAddCategory}
        />

        <div className="grid grid-cols-1 gap-3 md:grid-cols-3 md:gap-4">
          <CategoryStatCard
            label="หมวดหมู่ทั้งหมด"
            value={`${totalCount}`}
            suffix="รายการ"
            Icon={Tags}
            iconWrapClass="bg-[#ffdcbf] text-[#8c5000]"
            valueClass="text-[var(--quest-foreground)]"
          />
          <CategoryStatCard
            label="รายรับ (Income)"
            value={`${incomeCount}`}
            suffix="หมวดหมู่"
            Icon={ArrowDown}
            iconWrapClass="bg-[#dff7d0] text-[#2b6c00]"
            valueClass="text-[#2b6c00] dark:text-[#87fe45]"
          />
          <CategoryStatCard
            label="รายจ่าย (Expense)"
            value={`${expenseCount}`}
            suffix="หมวดหมู่"
            Icon={ArrowUp}
            iconWrapClass="bg-[#ffe0de] text-[#ba1a1a]"
            valueClass="text-[#ba1a1a] dark:text-[#ff8f86]"
          />
        </div>

        <div className="hidden md:flex md:justify-end">
          <button type="button" onClick={onAddCategory} className="quest-action-button inline-flex items-center gap-2 px-6">
            <Plus className="h-5 w-5" />
            เพิ่มหมวดหมู่
          </button>
        </div>

        {hasCategories ? (
          <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
            {items.map((item) => (
              <CategoryVaultCard
                key={item.category.id}
                item={item}
                onEdit={() => onEditCategory(item.category)}
                onDelete={() => onDeleteCategory(item.category)}
              />
            ))}
          </div>
        ) : (
          <CategoryVaultEmptyState onAddCategory={onAddCategory} />
        )}

        <button
          type="button"
          onClick={onAddCategory}
          className="fixed bottom-24 right-5 z-30 flex h-16 w-16 items-center justify-center rounded-full border-2 border-[#1f5100] bg-[#58cc02] text-[#1e5000] shadow-[0_6px_0_0_#1e5000] transition-all hover:-translate-y-0.5 active:translate-y-1 active:shadow-[0_2px_0_0_#1e5000] md:hidden"
          aria-label="เพิ่มหมวดหมู่"
        >
          <Plus className="h-8 w-8 stroke-[2.8px]" />
        </button>
      </div>
    </div>
  )
}

function CategoryVaultHero({
  incomeCount,
  expenseCount,
  onAddCategory,
}: {
  incomeCount: number
  expenseCount: number
  onAddCategory: () => void
}) {
  return (
    <section className="quest-hero-card">
      <div className="relative z-10 flex flex-col gap-6 md:flex-row md:items-center md:justify-between">
        <div className="space-y-3">
          <div className="flex items-center gap-3">
            <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-white text-[#58cc02] shadow-sm">
              <Tags className="h-6 w-6" />
            </div>
            <h1 className="font-quest-heading text-[2rem] font-black tracking-tight md:text-[2.35rem]">
              คลังหมวดหมู่การเงิน
            </h1>
          </div>
          <p className="max-w-2xl text-base font-medium text-current/85 md:text-lg">
            จัดการคลังประเภทธุรกรรมของคุณ เพื่อเก็บข้อมูลให้แม่นยำและทำให้ทุกภารกิจการเงินของคุณเป็นระเบียบมากขึ้น
          </p>
          <div className="flex flex-wrap gap-3">
            <span className="rounded-full bg-white/20 px-3 py-1 text-sm font-bold text-current">
              รายรับ: {incomeCount}
            </span>
            <span className="rounded-full bg-white/20 px-3 py-1 text-sm font-bold text-current">
              รายจ่าย: {expenseCount}
            </span>
          </div>
        </div>

        <button
          type="button"
          onClick={onAddCategory}
          className="quest-action-button flex w-full items-center justify-center gap-2 px-6 md:w-auto"
        >
          <Plus className="h-5 w-5" />
          เพิ่มหมวดหมู่
        </button>
      </div>
    </section>
  )
}

function CategoryStatCard({
  label,
  value,
  suffix,
  Icon,
  iconWrapClass,
  valueClass,
}: {
  label: string
  value: string
  suffix: string
  Icon: typeof Tags
  iconWrapClass: string
  valueClass: string
}) {
  return (
    <div className="rounded-2xl border-2 border-[#becbb1] border-b-4 bg-[var(--quest-surface)] p-5 shadow-[0_4px_0_0_rgba(0,0,0,0.05)] dark:border-[#3b4630] dark:bg-[var(--quest-surface)]">
      <div className="flex items-center gap-4">
        <div className={cn('flex h-14 w-14 items-center justify-center rounded-2xl', iconWrapClass)}>
          <Icon className="h-7 w-7" />
        </div>
        <div>
          <p className="text-[11px] font-black uppercase tracking-[0.16em] text-[var(--quest-outline)]">
            {label}
          </p>
          <p className={cn('mt-1 font-quest-heading text-[1.5rem] font-black tracking-tight', valueClass)}>
            {value} <span className="text-base">{suffix}</span>
          </p>
        </div>
      </div>
    </div>
  )
}

function CategoryVaultCard({
  item,
  onEdit,
  onDelete,
}: {
  item: CategoryVaultItem
  onEdit: () => void
  onDelete: () => void
}) {
  const { category, txCount, budgetCount, inUse } = item
  const isIncome = category.type === 'INCOME'
  const typeBadgeClass = isIncome
    ? 'bg-[#dff7d0] text-[#2b6c00] border-[#2b6c00]/15'
    : 'bg-[#ffe0de] text-[#ba1a1a] border-[#ba1a1a]/15'

  return (
    <PressCard
      shadow="0 8px 0 0 #becbb1"
      shadowHover="0 5px 0 0 #becbb1"
      className="overflow-hidden rounded-[1.75rem] border-[#becbb1] bg-[var(--quest-surface)] p-6 dark:border-[#3b4630] dark:bg-[var(--quest-surface)] dark:shadow-[0_8px_0_0_#0f130c]"
    >
      <div className="flex h-full flex-col justify-between gap-5">
        <div className="flex items-start justify-between gap-4">
          <div
            className="flex h-16 w-16 items-center justify-center rounded-2xl shadow-[0_4px_0_0_rgba(255,255,255,0.5)]"
            style={{ backgroundColor: `${category.color}20`, color: category.color }}
          >
            <CategoryIcon name={category.icon} className="h-8 w-8" />
          </div>

          <div className="flex flex-col items-end gap-2">
            <span className={cn('rounded-full border px-3 py-1 text-[11px] font-bold uppercase tracking-[0.14em]', typeBadgeClass)}>
              {isIncome ? 'รายรับ' : 'รายจ่าย'}
            </span>

            {category.isDefault ? (
              <span className="inline-flex items-center gap-1 rounded-full bg-[var(--quest-surface-soft)] px-2.5 py-1 text-[10px] font-bold text-[var(--quest-outline)]">
                <Lock className="h-3.5 w-3.5" />
                ค่าเริ่มต้น
              </span>
            ) : inUse ? (
              <span className="inline-flex items-center gap-1 rounded-full bg-[var(--quest-surface-soft)] px-2.5 py-1 text-[10px] font-bold text-[var(--quest-outline)]">
                <ShieldAlert className="h-3.5 w-3.5" />
                กำลังใช้งาน
              </span>
            ) : null}
          </div>
        </div>

        <div className="space-y-3">
          <div>
            <h3 className="font-quest-heading text-[1.45rem] font-black tracking-tight text-[var(--quest-foreground)]">
              {category.name}
            </h3>
          </div>

          <div className="space-y-1.5 text-sm font-medium text-[var(--quest-outline)]">
            <div className="flex items-center gap-2">
              <ReceiptText className="h-4 w-4" />
              <span>ใช้ใน {txCount} ธุรกรรม</span>
            </div>
            <div className="flex items-center gap-2">
              <Tags className="h-4 w-4" />
              <span>ผูกกับ {budgetCount} งบประมาณ</span>
            </div>
          </div>
        </div>

        <div className="flex gap-2 pt-1">
          {category.isDefault ? (
            <div className="flex h-12 flex-1 items-center justify-center rounded-xl border-2 border-[#becbb1] border-b-4 bg-[var(--quest-surface)] font-bold text-[var(--quest-outline)] dark:border-[#3b4630] dark:bg-[var(--quest-surface)]">
              หมวดมาตรฐาน
            </div>
          ) : (
            <>
              <button
                type="button"
                onClick={onEdit}
                className="quest-secondary-button flex flex-1 items-center justify-center gap-2"
              >
                แก้ไข
              </button>
              <button
                type="button"
                onClick={onDelete}
                disabled={inUse}
                className={cn(
                  'flex h-12 w-12 items-center justify-center rounded-xl border-2 border-b-4 transition-colors',
                  inUse
                    ? 'cursor-not-allowed border-[#becbb1] bg-[var(--quest-surface)] text-[#becbb1] dark:border-[#3b4630] dark:bg-[var(--quest-surface)] dark:text-[#4b5540]'
                    : 'border-rose-300 bg-[var(--quest-surface)] text-rose-600 hover:bg-rose-50 dark:border-rose-900 dark:bg-[var(--quest-surface)] dark:text-rose-300 dark:hover:bg-rose-950/20'
                )}
                title={inUse ? 'หมวดหมู่นี้ถูกใช้งานอยู่ ไม่สามารถลบได้' : 'ลบหมวดหมู่'}
              >
                <Trash2 className="h-4 w-4" />
              </button>
            </>
          )}
        </div>
      </div>
    </PressCard>
  )
}

function CategoryVaultEmptyState({ onAddCategory }: { onAddCategory: () => void }) {
  return (
    <PressCard
      shadow="0 8px 0 0 #becbb1"
      shadowHover="0 5px 0 0 #becbb1"
      className="border-[#becbb1] bg-[var(--quest-surface)] px-6 py-14 text-center dark:border-[#3b4630] dark:bg-[var(--quest-surface)] dark:shadow-[0_8px_0_0_#0f130c]"
    >
      <div className="mx-auto flex h-24 w-24 items-center justify-center rounded-full border-4 border-dashed border-[#becbb1] bg-[var(--quest-surface-low)] text-[#58cc02] dark:border-[#3b4630] dark:bg-[var(--quest-surface-low)]">
        <Tags className="h-11 w-11" />
      </div>
      <h2 className="mt-6 font-quest-heading text-[1.8rem] font-black text-[var(--quest-foreground)]">
        คลังยังว่างเปล่า
      </h2>
      <p className="mx-auto mt-2 max-w-lg text-base text-[var(--quest-muted)]">
        เริ่มสร้างหมวดหมู่แรกของคุณเพื่อเริ่มจัดการธุรกรรมและงบประมาณได้อย่างเป็นระบบ
      </p>
      <button type="button" onClick={onAddCategory} className="quest-action-button mx-auto mt-6 inline-flex items-center gap-2 px-6">
        <Plus className="h-5 w-5" />
        สร้างหมวดหมู่แรก
      </button>
    </PressCard>
  )
}
