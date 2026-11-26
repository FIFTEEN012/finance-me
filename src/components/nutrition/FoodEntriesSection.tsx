'use client'

import type { ReactNode } from 'react'
import { Flame, Plus, X } from 'lucide-react'

import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { FoodDraft, MEALS, lastKcalFor, newFoodDraft, recentFoodNames } from '@/lib/nutrition'
import { FoodEntry } from '@/types'

interface FoodEntriesSectionProps {
  /** The rows being typed. Controlled: the parent owns them and saves them. */
  value: FoodDraft[]
  onChange: (drafts: FoodDraft[]) => void
  /** Past Food Entries, for name suggestions and filling in known kcal. */
  history?: FoodEntry[]
  /** Extra buttons beside "เพิ่มอาหาร" (e.g. a photo button that appends drafts). */
  actions?: ReactNode
}

/**
 * The "แคลอรี่" section: type several Food Entries (meal guessed from the time).
 * Used inside the expense form for a Food Category.
 */
export function FoodEntriesSection({ value, onChange, history = [], actions }: FoodEntriesSectionProps) {
  const names = recentFoodNames(history)
  const total = value.reduce((sum, d) => sum + (Number(d.kcal) || 0), 0)

  const update = (key: string, patch: Partial<FoodDraft>) =>
    onChange(value.map((d) => (d.key === key ? { ...d, ...patch } : d)))

  // Picking a food logged before fills in its calories, unless already typed.
  const fillKnownKcal = (d: FoodDraft) => {
    if (d.kcal !== '') return
    const known = lastKcalFor(history, d.name)
    if (known !== undefined) update(d.key, { kcal: String(known) })
  }

  return (
    <section aria-labelledby="food-entries-title" className="rounded-xl border border-orange-200 dark:border-orange-500/20 bg-orange-50/50 dark:bg-orange-500/[0.04] p-3 space-y-2">
      <div className="flex items-center justify-between gap-2">
        <h3 id="food-entries-title" className="text-sm font-medium flex items-center gap-1.5 text-orange-700 dark:text-orange-300">
          <Flame className="w-4 h-4" />
          แคลอรี่
          {total > 0 && <span className="text-xs font-normal text-orange-600/80">รวม {total.toLocaleString('th-TH')} kcal</span>}
        </h3>
        <div className="flex items-center gap-1">
          {actions}
          <Button type="button" variant="ghost" size="sm" className="gap-1 h-7 text-xs" onClick={() => onChange([...value, newFoodDraft()])}>
            <Plus className="w-3.5 h-3.5" />
            เพิ่มอาหาร
          </Button>
        </div>
      </div>

      {value.length === 0 ? (
        <p className="text-xs text-slate-500 dark:text-slate-400">ไม่ใส่ก็ได้ ใส่แล้วจะบันทึกลงหน้าอาหารให้ด้วย</p>
      ) : (
        <ul className="space-y-2">
          {value.map((d, i) => (
            <li key={d.key} className="flex items-center gap-2">
              <Input
                aria-label={`อาหารรายการที่ ${i + 1}`}
                value={d.name}
                onChange={(e) => update(d.key, { name: e.target.value })}
                onBlur={() => fillKnownKcal(d)}
                list="food-entry-names"
                placeholder="เช่น ข้าวมันไก่"
                autoComplete="off"
                className="flex-1 min-w-0 h-8 text-sm"
              />
              <Input
                aria-label={`แคลอรี่รายการที่ ${i + 1}`}
                value={d.kcal}
                onChange={(e) => update(d.key, { kcal: e.target.value })}
                type="number"
                inputMode="numeric"
                min="0"
                step="1"
                placeholder="kcal"
                className="w-20 h-8 text-sm"
              />
              <select
                aria-label={`มื้อรายการที่ ${i + 1}`}
                value={d.meal}
                onChange={(e) => update(d.key, { meal: e.target.value as FoodDraft['meal'] })}
                className="h-8 rounded-md border border-input bg-transparent px-2 text-xs dark:bg-slate-900"
              >
                {MEALS.map((m) => <option key={m.value} value={m.value}>{m.label}</option>)}
              </select>
              <button
                type="button"
                aria-label={`ลบรายการที่ ${i + 1}`}
                onClick={() => onChange(value.filter((x) => x.key !== d.key))}
                className="p-1 text-slate-400 hover:text-red-500"
              >
                <X className="w-4 h-4" />
              </button>
            </li>
          ))}
        </ul>
      )}
      <datalist id="food-entry-names">
        {names.map((name) => <option key={name} value={name} />)}
      </datalist>
    </section>
  )
}
