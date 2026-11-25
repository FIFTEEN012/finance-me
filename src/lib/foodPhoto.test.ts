import { describe, expect, it } from 'vitest'
import { foodInputsFromDraft, photoDraftRows, type FoodPhotoItem } from './foodPhoto'

const items: FoodPhotoItem[] = [
  { name: 'ข้าวมันไก่', portion: '1 จาน', kcal: 596.4, proteinG: 30, carbsG: 75, fatG: 21, confidence: 'high' },
  { name: 'น้ำซุป', portion: '1 ถ้วย', kcal: 40, proteinG: null, carbsG: null, fatG: null, confidence: 'low' },
  { name: 'ชาเย็น', portion: '1 แก้ว', kcal: 250, proteinG: 2, carbsG: 40, fatG: 8, confidence: 'medium' },
]

let n = 0
const key = () => `k${++n}`

describe('Photo Draft', () => {
  it('starts with every suggestion ticked, in the guessed meal', () => {
    const rows = photoDraftRows(items, 'lunch', key)
    expect(rows.map((r) => [r.name, r.included, r.meal, r.kcal])).toEqual([
      ['ข้าวมันไก่', true, 'lunch', 596],
      ['น้ำซุป', true, 'lunch', 40],
      ['ชาเย็น', true, 'lunch', 250],
    ])
  })

  it('saves only the ticked rows, with their edits and macros', () => {
    const rows = photoDraftRows(items, 'lunch', key)
    rows[0] = { ...rows[0], name: '  ข้าวมันไก่ทอด ', kcal: 700, meal: 'dinner' }
    rows[2] = { ...rows[2], included: false }

    expect(foodInputsFromDraft(rows, '2026-11-25')).toEqual([
      { date: '2026-11-25', meal: 'dinner', name: 'ข้าวมันไก่ทอด', kcal: 700, proteinG: 30, carbsG: 75, fatG: 21 },
      { date: '2026-11-25', meal: 'lunch', name: 'น้ำซุป', kcal: 40, proteinG: undefined, carbsG: undefined, fatG: undefined },
    ])
  })

  it('skips ticked rows left without a name or calories', () => {
    const rows = photoDraftRows(items.slice(0, 2), 'snack', key)
    rows[0] = { ...rows[0], name: ' ' }
    rows[1] = { ...rows[1], kcal: null }
    expect(foodInputsFromDraft(rows, '2026-11-25')).toEqual([])
  })
})
