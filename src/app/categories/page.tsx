'use client'

import { useState } from 'react'
import { Plus, Pencil, Trash2, Lock, Tags } from 'lucide-react'
import { toast } from 'sonner'

import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { CategoryIcon } from '@/components/shared/CategoryIcon'
import { EmptyState } from '@/components/shared/EmptyState'
import { ConfirmDialog } from '@/components/shared/ConfirmDialog'
import { useCategoryStore } from '@/store/useCategoryStore'
import { useTransactionStore } from '@/store/useTransactionStore'
import { useBudgetStore } from '@/store/useBudgetStore'
import { Category } from '@/types'
import { CategoryForm } from '@/components/categories/CategoryForm'
import { PressCard } from '@/components/ui/PressCard'

export default function CategoriesPage() {
  const { categories, deleteCategory } = useCategoryStore()
  const { transactions } = useTransactionStore()
  const { budgets } = useBudgetStore()

  const [formOpen, setFormOpen] = useState(false)
  const [editingCategory, setEditingCategory] = useState<Category | null>(null)
  const [deleteTarget, setDeleteTarget] = useState<Category | null>(null)

  const incomeCategories = categories.filter((c) => c.type === 'INCOME')
  const expenseCategories = categories.filter((c) => c.type === 'EXPENSE')

  function getDependencyCount(categoryId: string) {
    const txCount = transactions.filter((t) => t.categoryId === categoryId).length
    const budgetCount = budgets.filter((b) => b.categoryId === categoryId).length
    return { txCount, budgetCount }
  }

  function handleDeleteClick(category: Category) {
    const { txCount, budgetCount } = getDependencyCount(category.id)
    if (txCount > 0 || budgetCount > 0) {
      const parts = []
      if (txCount > 0) parts.push(`${txCount} รายการธุรกรรม`)
      if (budgetCount > 0) parts.push(`${budgetCount} งบประมาณ`)
      toast.error(`ไม่สามารถลบได้ — "${category.name}" ถูกใช้งานใน ${parts.join(' และ ')}`)
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

  function handleFormClose(open: boolean) {
    setFormOpen(open)
    if (!open) setEditingCategory(null)
  }

  return (
    <div className="p-6 max-w-3xl mx-auto space-y-8">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-semibold text-gray-900 dark:text-gray-100">หมวดหมู่</h1>
          <p className="text-sm text-gray-500 dark:text-gray-400 mt-0.5">จัดการหมวดหมู่รายรับและรายจ่าย</p>
        </div>
        <Button
          onClick={() => setFormOpen(true)}
          className="bg-violet-600 hover:bg-violet-700 gap-2"
        >
          <Plus className="w-4 h-4" />
          เพิ่มหมวดหมู่
        </Button>
      </div>

      <CategorySection
        title="รายรับ"
        type="INCOME"
        categories={incomeCategories}
        getDependencyCount={getDependencyCount}
        onEdit={handleEdit}
        onDelete={handleDeleteClick}
      />

      <CategorySection
        title="รายจ่าย"
        type="EXPENSE"
        categories={expenseCategories}
        getDependencyCount={getDependencyCount}
        onEdit={handleEdit}
        onDelete={handleDeleteClick}
      />

      {categories.length === 0 && (
        <EmptyState
          icon={Tags}
          title="ยังไม่มีหมวดหมู่"
          description="เพิ่มหมวดหมู่แรกของคุณเพื่อเริ่มต้น"
          action={
            <Button onClick={() => setFormOpen(true)} className="bg-violet-600 hover:bg-violet-700 gap-2">
              <Plus className="w-4 h-4" />
              เพิ่มหมวดหมู่
            </Button>
          }
        />
      )}

      <CategoryForm
        open={formOpen}
        onOpenChange={handleFormClose}
        editingCategory={editingCategory}
      />

      <ConfirmDialog
        open={!!deleteTarget}
        onOpenChange={(open) => !open && setDeleteTarget(null)}
        title="ลบหมวดหมู่"
        description={`ต้องการลบ "${deleteTarget?.name}" ใช่หรือไม่? การดำเนินการนี้ไม่สามารถยกเลิกได้`}
        onConfirm={handleConfirmDelete}
      />
    </div>
  )
}

interface CategorySectionProps {
  title: string
  type: 'INCOME' | 'EXPENSE'
  categories: Category[]
  getDependencyCount: (id: string) => { txCount: number; budgetCount: number }
  onEdit: (c: Category) => void
  onDelete: (c: Category) => void
}

function CategorySection({ title, type, categories, getDependencyCount, onEdit, onDelete }: CategorySectionProps) {
  return (
    <section>
      <div className="flex items-center gap-2 mb-3">
        <h2 className="text-sm font-semibold text-gray-700 dark:text-gray-300">{title}</h2>
        <Badge variant="secondary" className="text-xs">{categories.length}</Badge>
      </div>

      {categories.length === 0 ? (
        <p className="text-sm text-gray-400 dark:text-gray-500 py-4 text-center border border-dashed border-gray-200 dark:border-gray-700 rounded-lg">
          ยังไม่มีหมวดหมู่{title}
        </p>
      ) : (
        <PressCard shadow="0 4px 0 0 #d1d5db" shadowHover="0 2px 0 0 #d1d5db" className="border-gray-200 overflow-hidden p-0">
      <div className="divide-y divide-gray-100 dark:divide-gray-800">
          {categories.map((cat) => {
            const { txCount, budgetCount } = getDependencyCount(cat.id)
            const inUse = txCount > 0 || budgetCount > 0
            const isDefault = cat.isDefault

            return (
              <div key={cat.id} className="flex items-center gap-4 px-4 py-3 bg-white dark:bg-gray-900 hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors">
                {/* Icon */}
                <div
                  className="flex items-center justify-center w-9 h-9 rounded-lg flex-shrink-0"
                  style={{ backgroundColor: cat.color + '20' }}
                >
                  <CategoryIcon name={cat.icon} className="w-4 h-4" style={{ color: cat.color }} />
                </div>

                {/* Name + badges */}
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="text-sm font-medium text-gray-900 dark:text-gray-100">{cat.name}</span>
                    {isDefault && (
                      <Badge variant="secondary" className="text-xs py-0">ค่าเริ่มต้น</Badge>
                    )}
                  </div>
                  {inUse && (
                    <p className="text-xs text-gray-400 dark:text-gray-500 mt-0.5">
                      {[
                        txCount > 0 && `${txCount} ธุรกรรม`,
                        budgetCount > 0 && `${budgetCount} งบประมาณ`,
                      ].filter(Boolean).join(' · ')}
                    </p>
                  )}
                </div>

                {/* Color dot */}
                <div className="w-3 h-3 rounded-full flex-shrink-0" style={{ backgroundColor: cat.color }} />

                {/* Actions */}
                <div className="flex items-center gap-1 flex-shrink-0">
                  {isDefault ? (
                    <div className="flex items-center gap-1 px-2 py-1 rounded text-xs text-gray-300 dark:text-gray-600">
                      <Lock className="w-3 h-3" />
                    </div>
                  ) : (
                    <>
                      <button
                        onClick={() => onEdit(cat)}
                        className="p-1.5 rounded-md text-gray-400 dark:text-gray-500 hover:text-gray-600 dark:hover:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors"
                        title="แก้ไข"
                      >
                        <Pencil className="w-3.5 h-3.5" />
                      </button>
                      <button
                        onClick={() => onDelete(cat)}
                        className={`p-1.5 rounded-md transition-colors ${
                          inUse
                            ? 'text-gray-200 dark:text-gray-700 cursor-not-allowed'
                            : 'text-gray-400 dark:text-gray-500 hover:text-red-500 hover:bg-red-50 dark:hover:bg-red-900/20'
                        }`}
                        title={inUse ? 'ไม่สามารถลบได้ — มีข้อมูลอ้างอิง' : 'ลบ'}
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </>
                  )}
                </div>
              </div>
            )
          })}
        </div>
      </PressCard>
      )}
    </section>
  )
}
