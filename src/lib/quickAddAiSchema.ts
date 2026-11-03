import { z } from 'zod'

const validDate = (value: string) => {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(value)) return false
  const date = new Date(`${value}T12:00:00Z`)
  return !Number.isNaN(date.getTime()) && date.toISOString().slice(0, 10) === value
}

const transactionType = z.enum(['EXPENSE', 'INCOME', 'TRANSFER'])

export const quickAddAiRequestSchema = z.object({
  text: z.string().trim().min(1).max(1000),
  today: z.string().refine(validDate),
  maxEntries: z.number().int().min(1).max(10),
  categories: z.array(z.object({
    id: z.string().min(1).max(100),
    name: z.string().trim().min(1).max(100),
    type: transactionType,
  })).max(150),
  existingTags: z.array(z.string().trim().min(1).max(40)).max(150),
})

export const quickAddAiResultSchema = z.object({
  transactions: z.array(z.object({
    type: transactionType,
    categoryId: z.string(),
    amount: z.number().finite().positive().max(10 ** 15),
    description: z.string().trim().min(1).max(200),
    date: z.string().refine(validDate),
    suggestedTags: z.array(z.string()).max(5),
  })).max(10),
})

export type QuickAddAiResult = z.infer<typeof quickAddAiResultSchema>
