import { z } from 'zod'

const validDate = (value: string) => {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(value)) return false
  const date = new Date(`${value}T12:00:00Z`)
  return !Number.isNaN(date.getTime()) && date.toISOString().slice(0, 10) === value
}

export const bulkTransactionSchema = z.object({
  transactions: z.array(z.object({
    type: z.enum(['INCOME', 'EXPENSE', 'TRANSFER']),
    categoryId: z.string().trim().min(1, 'กรุณาเลือกหมวดหมู่'),
    amount: z.number().finite().positive('จำนวนเงินต้องมากกว่า 0')
      .refine((value) => Number(value.toFixed(2)) === value, 'จำนวนเงินต้องมีทศนิยมไม่เกิน 2 ตำแหน่ง')
      .refine((value) => value < 10 ** 16, 'จำนวนเงินสูงเกินไป'),
    description: z.string().trim().min(1, 'กรุณาระบุรายละเอียด'),
    date: z.string().refine(validDate, 'กรุณาระบุวันที่ที่ถูกต้อง'),
    note: z.string().optional(),
    tags: z.array(z.string().trim().min(1)).optional(),
  })).min(1, 'กรุณาเพิ่มอย่างน้อย 1 รายการ').max(50, 'เพิ่มได้สูงสุด 50 รายการต่อครั้ง'),
})

export type BulkTransactionInput = z.infer<typeof bulkTransactionSchema>
