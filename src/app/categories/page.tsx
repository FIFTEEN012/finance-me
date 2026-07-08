'use client'

import { useMemo, useState } from 'react'
import { toast } from 'sonner'
import { CategoryVaultBoard, CategoryVaultItem } from '@/components/categories/CategoryVaultBoard'
import { CategoryForm } from '@/components/categories/CategoryForm'
import { ConfirmDialog } from '@/components/shared/ConfirmDialog'
import { useBudgetStore } from '@/store/useBudgetStore'
import { useCategoryStore } from '@/store/useCategoryStore'
import { useTransactionStore } from '@/store/useTransactionStore'
import { Category } from '@/types'

export default function CategoriesPage() {
  const { categories, deleteCategory } = useCategoryStore()
  const { transactions } = useTransactionStore()
  const { budgets } = useBudgetStore()

  const [formOpen, setFormOpen] = useState(false)
  const [editingCategory, setEditingCategory] = useState<Category | null>(null)
  const [deleteTarget, setDeleteTarget] = useState<Category | null>(null)

  const items = useMemo<CategoryVaultItem[]>(() => (
    categories.map((category) => {
      const txCount = transactions.filter((transaction) => transaction.categoryId === category.id).length
      const budgetCount = budgets.filter((budget) => budget.categoryId === category.id).length

      return {
        category,
        txCount,
        budgetCount,
        inUse: txCount > 0 || budgetCount > 0,
      }
    })
  ), [budgets, categories, transactions])

  const incomeCount = items.filter((item) => item.category.type === 'INCOME').length
  const expenseCount = items.filter((item) => item.category.type === 'EXPENSE').length

  function handleDeleteClick(category: Category) {
    const match = items.find((item) => item.category.id === category.id)
    if (!match) return

    if (match.inUse) {
      const parts = []
      if (match.txCount > 0) parts.push(`${match.txCount} รายการธุรกรรม`)
      if (match.budgetCount > 0) parts.push(`${match.budgetCount} งบประมาณ`)
      toast.error(`ไม่สามารถลบได้ "${category.name}" ถูกใช้งานใน ${parts.join(' และ ')}`)
      return
    }

    setDeleteTarget(category)
  }

  function handleConfirmDelete() {
    if (!deleteTarget) return
    deleteCategory(deleteTarget.id)
    toast.success(`ลบหมวดหมู่ "${deleteTarget.name}" แล้ว`)
    setDeleteTarget(null)
  }

  function handleEdit(category: Category) {
    setEditingCategory(category)
    setFormOpen(true)
  }

  function handleFormOpen(open: boolean) {
    setFormOpen(open)
    if (!open) setEditingCategory(null)
  }

  return (
    <>
      <CategoryVaultBoard
        items={items}
        incomeCount={incomeCount}
        expenseCount={expenseCount}
        totalCount={items.length}
        onAddCategory={() => setFormOpen(true)}
        onEditCategory={handleEdit}
        onDeleteCategory={handleDeleteClick}
      />

      <CategoryForm
        open={formOpen}
        onOpenChange={handleFormOpen}
        editingCategory={editingCategory}
      />

      <ConfirmDialog
        open={!!deleteTarget}
        onOpenChange={(open) => !open && setDeleteTarget(null)}
        title="ลบหมวดหมู่"
        description={`ต้องการลบ "${deleteTarget?.name}" ใช่หรือไม่? การดำเนินการนี้ไม่สามารถย้อนกลับได้`}
        onConfirm={handleConfirmDelete}
      />
    </>
  )
}
