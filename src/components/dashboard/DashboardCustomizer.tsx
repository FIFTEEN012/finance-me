'use client'

import { useRef, useState } from 'react'
import { ChevronUp, ChevronDown, RotateCcw, Eye, EyeOff, LayoutDashboard, GripVertical } from 'lucide-react'
import { Sheet, SheetContent, SheetHeader, SheetTitle } from '@/components/ui/sheet'
import { Button } from '@/components/ui/button'
import { Separator } from '@/components/ui/separator'
import { useDashboardStore, WIDGET_META, WidgetId } from '@/store/useDashboardStore'
import { cn } from '@/lib/utils'

interface DashboardCustomizerProps {
  open: boolean
  onOpenChange: (open: boolean) => void
}

const SIZE_LABEL: Record<string, string> = {
  full:  'เต็มความกว้าง',
  third: '1/3 ความกว้าง',
}

export function DashboardCustomizer({ open, onOpenChange }: DashboardCustomizerProps) {
  const { widgets, setVisible, moveUp, moveDown, reorder, reset } = useDashboardStore()

  const [draggedId, setDraggedId] = useState<WidgetId | null>(null)
  const [overId, setOverId]       = useState<WidgetId | null>(null)
  const dragCounter               = useRef(0)   // track nested dragenter/dragleave

  const visibleCount = widgets.filter((w) => w.visible).length

  /* ── Drag handlers ──────────────────────────────────────── */

  function onDragStart(id: WidgetId) {
    setDraggedId(id)
    setOverId(null)
  }

  function onDragEnter(id: WidgetId) {
    dragCounter.current++
    if (id !== draggedId) setOverId(id)
  }

  function onDragLeave() {
    dragCounter.current--
    if (dragCounter.current === 0) setOverId(null)
  }

  function onDragOver(e: React.DragEvent) {
    e.preventDefault()  // required to allow drop
    e.dataTransfer.dropEffect = 'move'
  }

  function onDrop(toId: WidgetId) {
    if (draggedId && draggedId !== toId) reorder(draggedId, toId)
    setDraggedId(null)
    setOverId(null)
    dragCounter.current = 0
  }

  function onDragEnd() {
    setDraggedId(null)
    setOverId(null)
    dragCounter.current = 0
  }

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent side="right" className="w-80 sm:w-96 flex flex-col gap-0 p-0">
        <SheetHeader className="px-5 py-4 border-b border-gray-100 dark:border-gray-800">
          <SheetTitle className="flex items-center gap-2 text-base">
            <LayoutDashboard className="w-4 h-4 text-violet-500" />
            ปรับแต่ง Dashboard
          </SheetTitle>
          <p className="text-xs text-gray-500 dark:text-gray-400 mt-0.5">
            ลากเพื่อจัดลำดับ · กด 👁 เพื่อซ่อน/แสดง Widget
          </p>
        </SheetHeader>

        {/* Widget list */}
        <div className="flex-1 overflow-y-auto px-4 py-3 space-y-2">
          {widgets.map((w, idx) => {
            const meta    = WIDGET_META[w.id as WidgetId]
            const isFirst = idx === 0
            const isLast  = idx === widgets.length - 1
            const isDragging = draggedId === w.id
            const isOver     = overId === w.id && draggedId !== w.id

            return (
              <div
                key={w.id}
                draggable
                onDragStart={() => onDragStart(w.id as WidgetId)}
                onDragEnter={() => onDragEnter(w.id as WidgetId)}
                onDragLeave={onDragLeave}
                onDragOver={onDragOver}
                onDrop={() => onDrop(w.id as WidgetId)}
                onDragEnd={onDragEnd}
                className={cn(
                  'flex items-center gap-2 rounded-xl border p-3 transition-all select-none',
                  isDragging && 'opacity-40 scale-[0.98]',
                  isOver
                    ? 'border-violet-400 dark:border-violet-500 bg-violet-50 dark:bg-violet-900/20 shadow-sm'
                    : w.visible
                    ? 'bg-white dark:bg-gray-900 border-gray-200 dark:border-gray-700'
                    : 'bg-gray-50 dark:bg-gray-800/40 border-gray-100 dark:border-gray-800 opacity-60'
                )}
              >
                {/* Drag handle */}
                <GripVertical className="w-4 h-4 text-gray-300 dark:text-gray-600 flex-shrink-0 cursor-grab active:cursor-grabbing" />

                {/* Widget info */}
                <div className="flex-1 min-w-0">
                  <p className={cn(
                    'text-sm font-medium leading-tight',
                    w.visible ? 'text-gray-800 dark:text-gray-200' : 'text-gray-400 dark:text-gray-500'
                  )}>
                    {meta.label}
                  </p>
                  <p className="text-[10px] text-gray-400 dark:text-gray-500 mt-0.5 truncate">
                    {meta.description}
                  </p>
                  <span className={cn(
                    'inline-block mt-1 text-[9px] font-medium px-1.5 py-0.5 rounded-full',
                    meta.size === 'full'
                      ? 'bg-blue-50 dark:bg-blue-900/30 text-blue-600 dark:text-blue-400'
                      : 'bg-purple-50 dark:bg-purple-900/30 text-purple-600 dark:text-purple-400'
                  )}>
                    {SIZE_LABEL[meta.size]}
                  </span>
                </div>

                {/* Controls */}
                <div className="flex items-center gap-1 flex-shrink-0">
                  {/* Move up/down (keyboard alternative) */}
                  <div className="flex flex-col">
                    <button
                      onClick={() => moveUp(w.id as WidgetId)}
                      disabled={isFirst}
                      title="เลื่อนขึ้น"
                      className="p-0.5 rounded text-gray-400 hover:text-gray-700 dark:hover:text-gray-200 disabled:opacity-20 disabled:cursor-not-allowed transition-colors"
                    >
                      <ChevronUp className="w-4 h-4" />
                    </button>
                    <button
                      onClick={() => moveDown(w.id as WidgetId)}
                      disabled={isLast}
                      title="เลื่อนลง"
                      className="p-0.5 rounded text-gray-400 hover:text-gray-700 dark:hover:text-gray-200 disabled:opacity-20 disabled:cursor-not-allowed transition-colors"
                    >
                      <ChevronDown className="w-4 h-4" />
                    </button>
                  </div>

                  {/* Visibility toggle */}
                  <button
                    onClick={() => setVisible(w.id as WidgetId, !w.visible)}
                    title={w.visible ? 'ซ่อน' : 'แสดง'}
                    className={cn(
                      'p-1.5 rounded-lg transition-colors',
                      w.visible
                        ? 'text-violet-600 dark:text-violet-400 hover:bg-violet-50 dark:hover:bg-violet-900/30'
                        : 'text-gray-300 dark:text-gray-600 hover:bg-gray-100 dark:hover:bg-gray-800'
                    )}
                  >
                    {w.visible ? <Eye className="w-4 h-4" /> : <EyeOff className="w-4 h-4" />}
                  </button>
                </div>
              </div>
            )
          })}
        </div>

        {/* Footer */}
        <div className="px-5 py-4 border-t border-gray-100 dark:border-gray-800 space-y-3">
          <p className="text-xs text-gray-400 dark:text-gray-500 text-center">
            แสดง {visibleCount} จาก {widgets.length} Widget
          </p>
          <Separator />
          <Button
            variant="outline"
            size="sm"
            className="w-full gap-2 text-gray-600 dark:text-gray-400"
            onClick={reset}
          >
            <RotateCcw className="w-3.5 h-3.5" />
            รีเซ็ตเป็นค่าเริ่มต้น
          </Button>
        </div>
      </SheetContent>
    </Sheet>
  )
}
