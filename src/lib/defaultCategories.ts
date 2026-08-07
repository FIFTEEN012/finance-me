import { Category } from '@/types'

export const defaultCategories: Category[] = [
  // รายรับ
  { id: 'cat-income-1', name: 'เงินเดือน', type: 'INCOME', icon: 'Briefcase', color: '#22c55e', isDefault: true },
  { id: 'cat-income-2', name: 'ธุรกิจ', type: 'INCOME', icon: 'Store', color: '#16a34a', isDefault: true },
  { id: 'cat-income-3', name: 'การลงทุน', type: 'INCOME', icon: 'TrendingUp', color: '#15803d', isDefault: true },
  { id: 'cat-income-4', name: 'รายรับอื่นๆ', type: 'INCOME', icon: 'PlusCircle', color: '#86efac', isDefault: true },
  // รายจ่าย
  { id: 'cat-expense-1', name: 'อาหาร', type: 'EXPENSE', icon: 'Utensils', color: '#ef4444', isDefault: true },
  { id: 'cat-expense-2', name: 'เดินทาง', type: 'EXPENSE', icon: 'Car', color: '#f97316', isDefault: true },
  { id: 'cat-expense-3', name: 'ที่พัก', type: 'EXPENSE', icon: 'Home', color: '#eab308', isDefault: true },
  { id: 'cat-expense-4', name: 'สุขภาพ', type: 'EXPENSE', icon: 'HeartPulse', color: '#ec4899', isDefault: true },
  { id: 'cat-expense-5', name: 'ช้อปปิ้ง', type: 'EXPENSE', icon: 'ShoppingBag', color: '#8b5cf6', isDefault: true },
  { id: 'cat-expense-6', name: 'บันเทิง', type: 'EXPENSE', icon: 'Tv', color: '#06b6d4', isDefault: true },
  { id: 'cat-expense-7', name: 'การศึกษา', type: 'EXPENSE', icon: 'BookOpen', color: '#3b82f6', isDefault: true },
  { id: 'cat-expense-8', name: 'สาธารณูปโภค', type: 'EXPENSE', icon: 'Zap', color: '#f59e0b', isDefault: true },
  { id: 'cat-expense-9', name: 'รายจ่ายอื่นๆ', type: 'EXPENSE', icon: 'MoreHorizontal', color: '#94a3b8', isDefault: true },
  { id: 'cat-transfer-1', name: 'ย้ายเงินไปลงทุน', type: 'TRANSFER', icon: 'ArrowLeftRight', color: '#0ea5e9', isDefault: true },
]
