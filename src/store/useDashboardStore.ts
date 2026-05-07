'use client'

import { create } from 'zustand'
import { persist } from 'zustand/middleware'

export type WidgetId =
  | 'summary-cards'
  | 'income-expense-chart'
  | 'category-pie'
  | 'budget-progress'
  | 'health-score'
  | 'recent-transactions'
  | 'cash-flow-forecast'
  | 'spending-insights'
  | 'spending-heatmap'

export interface WidgetState {
  id: WidgetId
  visible: boolean
}

export type WidgetSize = 'full' | 'third'

export interface WidgetMeta {
  id: WidgetId
  label: string
  description: string
  size: WidgetSize
}

export const WIDGET_META: Record<WidgetId, WidgetMeta> = {
  'summary-cards':        { id: 'summary-cards',        label: 'ยอดสรุปเดือนนี้',        description: 'รายรับ รายจ่าย และยอดคงเหลือเดือนปัจจุบัน', size: 'full'  },
  'income-expense-chart': { id: 'income-expense-chart', label: 'รายรับ-รายจ่าย 6 เดือน',  description: 'กราฟ Bar Chart รายรับและรายจ่ายย้อนหลัง 6 เดือน',  size: 'full'  },
  'category-pie':         { id: 'category-pie',         label: 'รายจ่ายตามหมวดหมู่',      description: 'Pie Chart สัดส่วนรายจ่ายแต่ละหมวดหมู่เดือนนี้',   size: 'third' },
  'budget-progress':      { id: 'budget-progress',      label: 'งบประมาณเดือนนี้',        description: 'ความคืบหน้าการใช้งบประมาณแต่ละหมวดหมู่',          size: 'third' },
  'health-score':         { id: 'health-score',         label: 'Financial Health Score',  description: 'คะแนนสุขภาพการเงินโดยรวม',                       size: 'third' },
  'recent-transactions':  { id: 'recent-transactions',  label: 'รายการล่าสุด',            description: '5 รายการธุรกรรมล่าสุด',                          size: 'full'  },
  'cash-flow-forecast':   { id: 'cash-flow-forecast',   label: 'Cash Flow Forecast',      description: 'คาดการณ์รายรับ-รายจ่าย 30/60/90 วันข้างหน้า',      size: 'full'  },
  'spending-insights':    { id: 'spending-insights',    label: 'Smart Spending Insights', description: 'วิเคราะห์แพทเทิร์นการใช้เงินอัตโนมัติ',             size: 'full'  },
  'spending-heatmap':     { id: 'spending-heatmap',     label: 'Spending Heatmap',        description: 'ปฏิทิน GitHub-style แสดงความเข้มข้นการใช้จ่ายรายปี', size: 'full'  },
}

const DEFAULT_WIDGETS: WidgetState[] = [
  { id: 'summary-cards',        visible: true },
  { id: 'income-expense-chart', visible: true },
  { id: 'category-pie',         visible: true },
  { id: 'budget-progress',      visible: true },
  { id: 'health-score',         visible: true },
  { id: 'recent-transactions',  visible: true },
  { id: 'cash-flow-forecast',   visible: true },
  { id: 'spending-insights',    visible: true },
  { id: 'spending-heatmap',     visible: true },
]

interface DashboardStore {
  widgets: WidgetState[]
  setVisible: (id: WidgetId, visible: boolean) => void
  moveUp: (id: WidgetId) => void
  moveDown: (id: WidgetId) => void
  reorder: (fromId: WidgetId, toId: WidgetId) => void
  reset: () => void
}

export const useDashboardStore = create<DashboardStore>()(
  persist(
    (set) => ({
      widgets: DEFAULT_WIDGETS,

      setVisible: (id, visible) =>
        set((s) => ({
          widgets: s.widgets.map((w) => (w.id === id ? { ...w, visible } : w)),
        })),

      moveUp: (id) =>
        set((s) => {
          const idx = s.widgets.findIndex((w) => w.id === id)
          if (idx <= 0) return s
          const next = [...s.widgets]
          ;[next[idx - 1], next[idx]] = [next[idx], next[idx - 1]]
          return { widgets: next }
        }),

      moveDown: (id) =>
        set((s) => {
          const idx = s.widgets.findIndex((w) => w.id === id)
          if (idx < 0 || idx >= s.widgets.length - 1) return s
          const next = [...s.widgets]
          ;[next[idx], next[idx + 1]] = [next[idx + 1], next[idx]]
          return { widgets: next }
        }),

      reorder: (fromId, toId) =>
        set((s) => {
          const from = s.widgets.findIndex((w) => w.id === fromId)
          const to   = s.widgets.findIndex((w) => w.id === toId)
          if (from < 0 || to < 0 || from === to) return s
          const next = [...s.widgets]
          const [item] = next.splice(from, 1)
          next.splice(to, 0, item)
          return { widgets: next }
        }),

      reset: () => set({ widgets: DEFAULT_WIDGETS }),
    }),
    { name: 'finance-dashboard-layout' }
  )
)
