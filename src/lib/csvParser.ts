/** Parse a raw CSV string into rows of string arrays */
export function parseCsv(raw: string): string[][] {
  const lines = raw.replace(/\r\n/g, '\n').replace(/\r/g, '\n').split('\n')
  const rows: string[][] = []

  // Detect separator: semicolon or comma
  const sample = lines.slice(0, 3).join('\n')
  const sep = (sample.match(/;/g) ?? []).length > (sample.match(/,/g) ?? []).length ? ';' : ','

  for (const line of lines) {
    if (!line.trim()) continue
    const cells: string[] = []
    let current = ''
    let inQuote = false

    for (let i = 0; i < line.length; i++) {
      const ch = line[i]
      if (ch === '"') {
        if (inQuote && line[i + 1] === '"') { current += '"'; i++ }
        else inQuote = !inQuote
      } else if (ch === sep && !inQuote) {
        cells.push(current.trim())
        current = ''
      } else {
        current += ch
      }
    }
    cells.push(current.trim())
    rows.push(cells)
  }
  return rows
}

/** Try to parse a date string in common Thai/international formats.
 *  Returns ISO date string (YYYY-MM-DD) or null if unrecognized. */
export function parseDate(raw: string): string | null {
  const s = raw.trim()
  if (!s) return null

  // YYYY-MM-DD or YYYY/MM/DD
  let m = s.match(/^(\d{4})[\/\-](\d{1,2})[\/\-](\d{1,2})$/)
  if (m) {
    const [, y, mo, d] = m
    const year = parseInt(y) > 2400 ? parseInt(y) - 543 : parseInt(y)
    return `${year}-${mo.padStart(2, '0')}-${d.padStart(2, '0')}`
  }

  // DD/MM/YYYY or DD-MM-YYYY
  m = s.match(/^(\d{1,2})[\/\-](\d{1,2})[\/\-](\d{4})$/)
  if (m) {
    const [, d, mo, y] = m
    const year = parseInt(y) > 2400 ? parseInt(y) - 543 : parseInt(y)
    return `${year}-${mo.padStart(2, '0')}-${d.padStart(2, '0')}`
  }

  // DD/MM/YY
  m = s.match(/^(\d{1,2})[\/\-](\d{1,2})[\/\-](\d{2})$/)
  if (m) {
    const [, d, mo, y] = m
    const fullYear = parseInt(y) + 2000
    return `${fullYear}-${mo.padStart(2, '0')}-${d.padStart(2, '0')}`
  }

  return null
}

/** Parse an amount string, removing commas and currency symbols */
export function parseAmount(raw: string): number | null {
  const cleaned = raw.trim().replace(/[฿$,\s]/g, '')
  const n = parseFloat(cleaned)
  return isNaN(n) ? null : n
}

/* ───────────────────────────────────────────────────
   Bank Statement Import — Extended Types & Logic
   ─────────────────────────────────────────────────── */

export type BankFormat = 'kbank' | 'scb' | 'bbl' | 'ktb' | 'generic'

export interface ParsedRow {
  /** ISO YYYY-MM-DD */
  date: string
  description: string
  /** Always positive */
  amount: number
  /** true = debit/expense, false = credit/income */
  isDebit: boolean
  rawLine: string
  balance?: number
}

export interface BankParseResult {
  rows: ParsedRow[]
  errors: string[]
  detectedFormat: BankFormat
  headers: string[]
}

/* ── Format detection ──────────────────────────────── */

export function detectBankFormat(headers: string[]): BankFormat {
  const joined = headers.map((x) => x.trim().toLowerCase()).join('|')
  if (joined.includes('transaction date') && joined.includes('debit')) return 'scb'
  if (joined.includes('particulars'))                                   return 'bbl'
  if (joined.includes('วันที่') && joined.includes('ถอน'))             return 'kbank'
  if (joined.includes('รายการ') && joined.includes('เดบิต'))           return 'ktb'
  return 'generic'
}

export const BANK_FORMAT_LABELS: Record<BankFormat, string> = {
  kbank:   'ธนาคารกสิกรไทย (KBank)',
  scb:     'ธนาคารไทยพาณิชย์ (SCB)',
  bbl:     'ธนาคารกรุงเทพ (BBL)',
  ktb:     'ธนาคารกรุงไทย (KTB)',
  generic: 'รูปแบบทั่วไป',
}

/* ── Internal CSV line parser ────────────────────── */

function splitLine(line: string): string[] {
  const result: string[] = []
  let cur = ''
  let inQ = false
  for (let i = 0; i < line.length; i++) {
    const ch = line[i]
    if (ch === '"') {
      if (inQ && line[i + 1] === '"') { cur += '"'; i++ }
      else inQ = !inQ
    } else if ((ch === ',' || ch === '\t') && !inQ) {
      result.push(cur.trim())
      cur = ''
    } else {
      cur += ch
    }
  }
  result.push(cur.trim())
  return result
}

/* ── Amount helper ───────────────────────────────── */

function amt(s: string): number {
  if (!s || s.trim() === '' || s.trim() === '-') return 0
  // Support accounting negative format: (1,000) → -1000
  const stripped = s.replace(/[฿$,\s]/g, '')
  const isParenNeg = /^\([\d.]+\)$/.test(stripped)
  const raw = isParenNeg ? stripped.slice(1, -1) : stripped
  const n = parseFloat(raw)
  return isNaN(n) ? 0 : Math.abs(n)
}

/* ── Bank-specific parsers ───────────────────────── */

// KBank: วันที่, รายการ, ถอน, ฝาก, คงเหลือ
function parseKBank(lines: string[]): ParsedRow[] {
  return lines.flatMap((line) => {
    const c = splitLine(line)
    if (c.length < 4) return []
    const date = parseDate(c[0])
    if (!date) return []
    const debit = amt(c[2]), credit = amt(c[3])
    if (debit === 0 && credit === 0) return []
    return [{ date, description: c[1]?.trim() || 'รายการธุรกรรม', amount: debit || credit, isDebit: debit > 0, rawLine: line, balance: c[4] ? amt(c[4]) : undefined }]
  })
}

// SCB: Transaction Date, Transaction Code, Channel, Debit, Credit, Balance
function parseSCB(lines: string[]): ParsedRow[] {
  return lines.flatMap((line) => {
    const c = splitLine(line)
    if (c.length < 5) return []
    const date = parseDate(c[0])
    if (!date) return []
    const desc = [c[1], c[2]].filter(Boolean).join(' · ').trim() || 'รายการธุรกรรม'
    const debit = amt(c[3]), credit = amt(c[4])
    if (debit === 0 && credit === 0) return []
    return [{ date, description: desc, amount: debit || credit, isDebit: debit > 0, rawLine: line, balance: c[5] ? amt(c[5]) : undefined }]
  })
}

// BBL: Date, Particulars, Debit, Credit, Balance
function parseBBL(lines: string[]): ParsedRow[] {
  return lines.flatMap((line) => {
    const c = splitLine(line)
    if (c.length < 4) return []
    const date = parseDate(c[0])
    if (!date) return []
    const debit = amt(c[2]), credit = amt(c[3])
    if (debit === 0 && credit === 0) return []
    return [{ date, description: c[1]?.trim() || 'รายการธุรกรรม', amount: debit || credit, isDebit: debit > 0, rawLine: line, balance: c[4] ? amt(c[4]) : undefined }]
  })
}

// Generic: auto-detect columns
function parseGeneric(lines: string[], headers: string[]): ParsedRow[] {
  const h = headers.map((x) => x.toLowerCase())
  const fi = (...keys: string[]) => h.findIndex((x) => keys.some((k) => x.includes(k)))

  const dateCol  = fi('date', 'วันที่', 'datetime', 'เวลา')
  const descCol  = fi('description', 'particulars', 'รายการ', 'detail', 'memo', 'หมายเหตุ', 'narration')
  const debitCol = fi('debit', 'ถอน', 'จ่าย', 'withdraw', 'dr', 'expense')
  const creditCol= fi('credit', 'ฝาก', 'รับ', 'deposit', 'cr', 'income')
  const amtCol   = fi('amount', 'จำนวน')

  if (dateCol === -1) return []

  return lines.flatMap((line) => {
    const c = splitLine(line)
    const date = parseDate(c[dateCol] ?? '')
    if (!date) return []
    const description = (descCol >= 0 ? c[descCol] : '')?.trim() || 'รายการธุรกรรม'

    let amount = 0, isDebit = false
    if (amtCol >= 0 && c[amtCol]) {
      const raw = c[amtCol].replace(/[฿$,\s]/g, '')
      // Support both leading minus (-1000) and accounting parens ((1000))
      const isParenNeg = /^\([\d.]+\)$/.test(raw)
      const isMinusNeg = raw.startsWith('-')
      amount = Math.abs(parseFloat(isParenNeg ? raw.slice(1, -1) : raw) || 0)
      isDebit = isMinusNeg || isParenNeg
    } else if (debitCol >= 0 || creditCol >= 0) {
      const d = debitCol >= 0 ? amt(c[debitCol] ?? '') : 0
      const cr = creditCol >= 0 ? amt(c[creditCol] ?? '') : 0
      amount = d || cr
      isDebit = d > 0
    }

    if (amount === 0) return []
    return [{ date, description, amount, isDebit, rawLine: line }]
  })
}

/* ── Main parse entry ────────────────────────────── */

export function parseBankCSV(text: string, forcedFormat?: BankFormat): BankParseResult {
  const errors: string[] = []

  // Normalize: strip BOM, unify newlines
  const clean = text.replace(/^﻿/, '').replace(/\r\n/g, '\n').replace(/\r/g, '\n')
  const allLines = clean.split('\n').filter((l) => l.trim())

  if (allLines.length < 2) {
    return { rows: [], errors: ['ไฟล์ CSV ว่างเปล่าหรือมีข้อมูลไม่เพียงพอ'], detectedFormat: 'generic', headers: [] }
  }

  // Find header row (first line with ≥ 3 columns)
  let headerIdx = 0
  for (let i = 0; i < Math.min(10, allLines.length); i++) {
    if (splitLine(allLines[i]).length >= 3) { headerIdx = i; break }
  }

  const headers = splitLine(allLines[headerIdx])
  const dataLines = allLines.slice(headerIdx + 1)
  const detectedFormat = forcedFormat ?? detectBankFormat(headers)

  let rows: ParsedRow[] = []
  try {
    switch (detectedFormat) {
      case 'kbank': rows = parseKBank(dataLines);          break
      case 'scb':   rows = parseSCB(dataLines);            break
      case 'bbl':   rows = parseBBL(dataLines);            break
      default:      rows = parseGeneric(dataLines, headers); break
    }
  } catch (e) {
    errors.push(`ข้อผิดพลาดในการแยกวิเคราะห์: ${String(e)}`)
  }

  if (rows.length === 0 && errors.length === 0) {
    errors.push('ไม่พบรายการธุรกรรมในไฟล์ กรุณาตรวจสอบรูปแบบไฟล์หรือเลือกธนาคารให้ถูกต้อง')
  }

  return { rows, errors, detectedFormat, headers }
}

/* ── Auto-categorisation ─────────────────────────── */

interface CategoryRule { categoryId: string; pattern: RegExp }

const CATEGORY_RULES: CategoryRule[] = [
  // Income
  { categoryId: 'cat-income-1', pattern: /เงินเดือน|salary|payroll|โบนัส|bonus|เงินค่าจ้าง/i },
  { categoryId: 'cat-income-3', pattern: /dividend|ดอกเบี้ย|interest|กองทุน|กำไร|profit|ปันผล/i },
  { categoryId: 'cat-income-2', pattern: /ขาย|sale|รายได้|freelance|ค่าจ้าง/i },
  // Food
  { categoryId: 'cat-expense-1', pattern: /food|อาหาร|ร้านอาหาร|กาแฟ|coffee|ชา|grab.*food|foodpanda|line.*man|robinhood|restaurant|cafe|ข้าว|ก๋วยเตี๋ยว|ส้มตำ|pizza|sushi|mcdonald|kfc|burger|starbucks|true.*food/i },
  // Transport
  { categoryId: 'cat-expense-2', pattern: /grab(?!.*food)|uber|bolt|taxi|bts|mrt|น้ำมัน|เดินทาง|diesel|แท็กซี่|ปตท|ptt|เชลล์|shell|esso|บางจาก|airport|สนามบิน|toll|ทางด่วน/i },
  // Housing
  { categoryId: 'cat-expense-3', pattern: /ค่าเช่า|rent|condo|apartment|หอพัก|ที่พัก/i },
  // Health
  { categoryId: 'cat-expense-4', pattern: /hospital|โรงพยาบาล|pharmacy|ร้านยา|หมอ|doctor|clinic|คลินิก|dentist|ทันตแพทย์|สุขภาพ|health|medic/i },
  // Shopping
  { categoryId: 'cat-expense-5', pattern: /shopee|lazada|amazon|เซ็นทรัล|central|the mall|lotus|big c|makro|ikea|uniqlo|zara|fashion|ช้อปปิ้ง|robinson|homepro|supersports/i },
  // Entertainment
  { categoryId: 'cat-expense-6', pattern: /netflix|spotify|youtube|disney|hbo|prime video|game|steam|playstation|xbox|cinema|โรงหนัง|concert|บันเทิง|entertainment/i },
  // Education
  { categoryId: 'cat-expense-7', pattern: /tuition|ค่าเรียน|school|university|course|udemy|coursera|การศึกษา|หนังสือ|book|seminar/i },
  // Utilities
  { categoryId: 'cat-expense-8', pattern: /ค่าน้ำ|ค่าไฟ|internet|true.*move|ais|dtac|ntplc|pea\b|mea\b|electric|water|สาธารณูปโภค|utility|ค่าโทรศัพท์/i },
]

export function suggestCategoryId(description: string, isDebit: boolean): string {
  for (const rule of CATEGORY_RULES) {
    if (rule.pattern.test(description)) return rule.categoryId
  }
  return isDebit ? 'cat-expense-9' : 'cat-income-4'
}
