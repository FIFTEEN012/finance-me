'use client'

import { useState, useRef, useEffect, useCallback, useMemo } from 'react'
import {
  Send, Sparkles, Trash2, Bot, User, Loader2,
  TrendingUp, TrendingDown, PiggyBank, Target,
  ChevronDown, AlertCircle, Lightbulb,
} from 'lucide-react'
import { toast } from 'sonner'
import { cn } from '@/lib/utils'
import { PressCard } from '@/components/ui/PressCard'
import { useCoachStore }       from '@/store/useCoachStore'
import { useTransactionStore } from '@/store/useTransactionStore'
import { useCategoryStore }    from '@/store/useCategoryStore'
import { useBudgetStore }      from '@/store/useBudgetStore'
import { useSettingsStore }    from '@/store/useSettingsStore'

/* ─── Financial context builder ─────────────────── */

function useFinancialContext() {
  const { transactions }           = useTransactionStore()
  const { categories }             = useCategoryStore()
  const { budgets }                = useBudgetStore()
  const { currency, displayName }  = useSettingsStore()

  return useMemo(() => {
    const now      = new Date()
    const curMonth = now.getMonth() + 1
    const curYear  = now.getFullYear()

    const txMonth = (m: number, y: number) =>
      transactions.filter((t) => {
        const d = new Date(t.date)
        return d.getMonth() + 1 === m && d.getFullYear() === y
      })

    const sumType = (txs: typeof transactions, type: 'INCOME' | 'EXPENSE') =>
      txs.filter((t) => t.type === type).reduce((s, t) => s + t.amount, 0)

    // Current month
    const curTxs    = txMonth(curMonth, curYear)
    const curIncome = sumType(curTxs, 'INCOME')
    const curExp    = sumType(curTxs, 'EXPENSE')
    const savings   = curIncome - curExp
    const savingsRate = curIncome > 0 ? (savings / curIncome) * 100 : 0

    // Top expense categories this month
    const expByCat: Record<string, number> = {}
    curTxs.filter((t) => t.type === 'EXPENSE').forEach((t) => {
      expByCat[t.categoryId] = (expByCat[t.categoryId] ?? 0) + t.amount
    })
    const topExpenseCategories = Object.entries(expByCat)
      .sort(([, a], [, b]) => b - a)
      .slice(0, 6)
      .map(([catId, amount]) => {
        const cat    = categories.find((c) => c.id === catId)
        const budget = budgets.find((b) => b.categoryId === catId && b.month === curMonth && b.year === curYear)
        return {
          name:   cat?.name ?? 'อื่นๆ',
          amount,
          budget: budget?.amount,
        }
      })

    // Budget status (all categories with budgets this month)
    const budgetStatus = budgets
      .filter((b) => b.month === curMonth && b.year === curYear)
      .map((b) => {
        const cat    = categories.find((c) => c.id === b.categoryId)
        const spent  = expByCat[b.categoryId] ?? 0
        return { name: cat?.name ?? 'อื่นๆ', amount: spent, budget: b.amount }
      })

    // Last 3 months
    const last3Months = Array.from({ length: 3 }, (_, i) => {
      const d = new Date(curYear, curMonth - 2 - i, 1)
      const m = d.getMonth() + 1
      const y = d.getFullYear()
      const txs = txMonth(m, y)
      const monthNames = ['ม.ค.','ก.พ.','มี.ค.','เม.ย.','พ.ค.','มิ.ย.','ก.ค.','ส.ค.','ก.ย.','ต.ค.','พ.ย.','ธ.ค.']
      return {
        label:   `${monthNames[m - 1]} ${y}`,
        income:  sumType(txs, 'INCOME'),
        expense: sumType(txs, 'EXPENSE'),
      }
    }).reverse()

    return {
      totalTransactions:    transactions.length,
      currentMonthIncome:   curIncome,
      currentMonthExpense:  curExp,
      currentMonthSavings:  savings,
      savingsRate,
      topExpenseCategories,
      last3Months,
      budgetStatus,
      currency,
      displayName: displayName || undefined,
    }
  }, [transactions, categories, budgets, currency, displayName])
}

/* ─── Quick prompt chips ─────────────────────────── */

const QUICK_PROMPTS = [
  { icon: TrendingDown, label: 'วิเคราะห์รายจ่ายเดือนนี้',    color: '#ef4444', prompt: 'ช่วยวิเคราะห์รายจ่ายของฉันเดือนนี้ให้หน่อย มีอะไรที่น่ากังวลไหม?' },
  { icon: PiggyBank,    label: 'แนะนำวิธีประหยัด',             color: '#22c55e', prompt: 'แนะนำวิธีที่ฉันสามารถลดรายจ่ายและออมเงินเพิ่มได้' },
  { icon: Target,       label: 'ตรวจสอบงบประมาณ',             color: '#7c3aed', prompt: 'สถานะงบประมาณของฉันเดือนนี้เป็นยังไงบ้าง? มีหมวดไหนเกินงบไหม?' },
  { icon: TrendingUp,   label: 'สรุปภาพรวมการเงิน',            color: '#f59e0b', prompt: 'สรุปภาพรวมการเงินของฉัน 3 เดือนที่ผ่านมาให้หน่อย' },
  { icon: Lightbulb,    label: 'เป้าหมายการออม',               color: '#06b6d4', prompt: 'ฉันควรตั้งเป้าหมายการออมเงินยังไงดี? อัตราการออมที่ดีควรเป็นเท่าไหร่?' },
]

/* ─── Message bubble ─────────────────────────────── */

function MessageBubble({ msg, isStreaming }: { msg: { role: string; content: string }; isStreaming?: boolean }) {
  const isUser = msg.role === 'user'

  // Render simple markdown: **bold**, bullet lists
  function renderContent(text: string) {
    const lines = text.split('\n')
    return lines.map((line, i) => {
      // Bold
      const parts = line.split(/(\*\*[^*]+\*\*)/)
      const rendered = parts.map((p, j) =>
        p.startsWith('**') && p.endsWith('**')
          ? <strong key={j} className="font-bold">{p.slice(2, -2)}</strong>
          : <span key={j}>{p}</span>
      )
      return (
        <span key={i}>
          {rendered}
          {i < lines.length - 1 && <br />}
        </span>
      )
    })
  }

  return (
    <div className={cn('flex gap-2.5', isUser ? 'flex-row-reverse' : 'flex-row')}>
      {/* Avatar */}
      <div className={cn(
        'w-8 h-8 rounded-xl flex items-center justify-center flex-shrink-0 mt-0.5',
        isUser
          ? 'bg-violet-100 dark:bg-violet-900/40 border-2 border-violet-200 dark:border-violet-700'
          : 'bg-violet-600 border-2 border-violet-500 shadow-[0_3px_0_0_#4c1d95]',
      )}>
        {isUser
          ? <User className="w-4 h-4 text-violet-600 dark:text-violet-400" />
          : <Sparkles className="w-4 h-4 text-white" />
        }
      </div>

      {/* Bubble */}
      <div className={cn(
        'max-w-[78%] rounded-2xl px-4 py-3 text-sm leading-relaxed',
        isUser
          ? 'bg-violet-600 text-white rounded-tr-sm shadow-[0_3px_0_0_#4c1d95]'
          : 'bg-white dark:bg-gray-800 text-gray-800 dark:text-gray-100 border-2 border-gray-100 dark:border-gray-700 rounded-tl-sm shadow-[0_3px_0_0_#e5e7eb] dark:shadow-[0_3px_0_0_#374151]',
      )}>
        {msg.content
          ? renderContent(msg.content)
          : isStreaming && (
            <span className="flex items-center gap-1.5 text-gray-400">
              <Loader2 className="w-3.5 h-3.5 animate-spin" />
              <span className="text-xs">กำลังคิด…</span>
            </span>
          )
        }
        {isStreaming && msg.content && (
          <span className="inline-block w-0.5 h-3.5 bg-violet-400 animate-pulse ml-0.5 align-text-bottom" />
        )}
      </div>
    </div>
  )
}

/* ─── Stat pill ──────────────────────────────────── */

function StatPill({ icon: Icon, label, value, color }: { icon: React.ElementType; label: string; value: string; color: string }) {
  return (
    <div className="flex items-center gap-2 px-3 py-2 rounded-xl bg-white dark:bg-gray-800 border-2 border-gray-100 dark:border-gray-700">
      <div className="w-6 h-6 rounded-lg flex items-center justify-center flex-shrink-0" style={{ backgroundColor: color + '20' }}>
        <Icon className="w-3.5 h-3.5" style={{ color }} />
      </div>
      <div className="min-w-0">
        <p className="text-[10px] text-gray-400 font-semibold leading-none">{label}</p>
        <p className="text-xs font-black text-gray-800 dark:text-gray-100 num leading-tight">{value}</p>
      </div>
    </div>
  )
}

/* ─── Main page ──────────────────────────────────── */

export default function CoachPage() {
  const { messages, addMessage, updateLast, clearChat } = useCoachStore()
  const context   = useFinancialContext()
  const [input, setInput]           = useState('')
  const [streaming, setStreaming]   = useState(false)
  const [showContext, setShowContext] = useState(false)
  const bottomRef  = useRef<HTMLDivElement>(null)
  const inputRef   = useRef<HTMLTextAreaElement>(null)
  const abortRef   = useRef<AbortController | null>(null)

  // Auto-scroll to bottom on new messages
  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages, streaming])

  // Auto-resize textarea
  function autoResize(el: HTMLTextAreaElement) {
    el.style.height = 'auto'
    el.style.height = Math.min(el.scrollHeight, 140) + 'px'
  }

  const sendMessage = useCallback(async (text: string) => {
    const trimmed = text.trim()
    if (!trimmed || streaming) return

    setInput('')
    if (inputRef.current) {
      inputRef.current.style.height = 'auto'
    }

    // Add user message
    addMessage({ role: 'user', content: trimmed })

    // Add empty assistant placeholder
    addMessage({ role: 'assistant', content: '' })
    setStreaming(true)

    const history = [
      ...messages.map((m) => ({ role: m.role, content: m.content })),
      { role: 'user' as const, content: trimmed },
    ]

    try {
      const ctrl = new AbortController()
      abortRef.current = ctrl

      const res = await fetch('/api/coach', {
        method:  'POST',
        headers: { 'Content-Type': 'application/json' },
        body:    JSON.stringify({ messages: history, context }),
        signal:  ctrl.signal,
      })

      if (!res.ok) {
        const err = await res.json().catch(() => ({ error: 'เกิดข้อผิดพลาด' }))
        updateLast(err.error ?? 'เกิดข้อผิดพลาด กรุณาลองใหม่')
        setStreaming(false)
        return
      }

      // Stream response text
      const reader = res.body!.getReader()
      const decoder = new TextDecoder()
      let accumulated = ''

      while (true) {
        const { done, value } = await reader.read()
        if (done) break
        accumulated += decoder.decode(value, { stream: true })
        updateLast(accumulated)
      }

    } catch (err: unknown) {
      if ((err as Error).name !== 'AbortError') {
        updateLast('⚠️ เชื่อมต่อไม่ได้ กรุณาตรวจสอบการเชื่อมต่ออินเทอร์เน็ต')
        toast.error('เชื่อมต่อ AI ไม่สำเร็จ')
      }
    } finally {
      setStreaming(false)
      abortRef.current = null
    }
  }, [messages, context, streaming, addMessage, updateLast])

  function handleKeyDown(e: React.KeyboardEvent<HTMLTextAreaElement>) {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault()
      sendMessage(input)
    }
  }

  const fmt = (n: number) => n.toLocaleString('th-TH', { maximumFractionDigits: 0 })
  const savingsColor = context.savingsRate >= 20 ? '#22c55e' : context.savingsRate >= 10 ? '#f59e0b' : '#ef4444'

  return (
    <div className="flex flex-col h-[calc(100vh-4rem)] md:h-screen max-w-2xl mx-auto">

      {/* ── Header ── */}
      <div className="flex-shrink-0 px-4 pt-4 pb-3 space-y-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-violet-600 border-2 border-violet-500 flex items-center justify-center shadow-[0_4px_0_0_#4c1d95]">
              <Sparkles className="w-5 h-5 text-white" />
            </div>
            <div>
              <h1 className="text-base font-black text-gray-900 dark:text-white leading-none">FinanceMe Coach</h1>
              <p className="text-[11px] text-emerald-500 font-bold flex items-center gap-1 mt-0.5">
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 inline-block animate-pulse" />
                AI พร้อมช่วยเหลือ
              </p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={() => setShowContext((v) => !v)}
              className="p-2 rounded-xl text-gray-400 hover:text-violet-600 hover:bg-violet-50 dark:hover:bg-violet-900/20 transition-colors"
              title="ดูข้อมูลที่ AI รู้"
            >
              <ChevronDown className={cn('w-4 h-4 transition-transform', showContext && 'rotate-180')} />
            </button>
            {messages.length > 0 && (
              <button
                onClick={() => { clearChat(); toast.success('ล้างประวัติการสนทนาแล้ว') }}
                className="p-2 rounded-xl text-gray-400 hover:text-rose-500 hover:bg-rose-50 dark:hover:bg-rose-900/20 transition-colors"
                title="ล้างการสนทนา"
              >
                <Trash2 className="w-4 h-4" />
              </button>
            )}
          </div>
        </div>

        {/* Financial context pills */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
          <StatPill icon={TrendingUp}   label="รายรับเดือนนี้"  value={`${fmt(context.currentMonthIncome)} ฿`}  color="#22c55e" />
          <StatPill icon={TrendingDown} label="รายจ่ายเดือนนี้" value={`${fmt(context.currentMonthExpense)} ฿`} color="#ef4444" />
          <StatPill icon={PiggyBank}    label="ออมได้"           value={`${fmt(context.currentMonthSavings)} ฿`} color={savingsColor} />
          <StatPill icon={Target}       label="อัตราออม"         value={`${context.savingsRate.toFixed(1)}%`}    color="#7c3aed" />
        </div>

        {/* Expandable context info */}
        {showContext && (
          <PressCard shadow="0 3px 0 0 #bfdbfe" className="border-blue-200 dark:border-blue-800 bg-blue-50 dark:bg-blue-900/20 p-3">
            <div className="flex gap-2">
              <AlertCircle className="w-3.5 h-3.5 text-blue-500 flex-shrink-0 mt-0.5" />
              <div className="text-xs text-blue-700 dark:text-blue-300">
                <p className="font-bold mb-1">ข้อมูลที่ AI นำมาวิเคราะห์</p>
                <p>• ธุรกรรมทั้งหมด {context.totalTransactions} รายการ</p>
                <p>• รายรับ/จ่ายเดือนนี้และย้อนหลัง 3 เดือน</p>
                <p>• หมวดรายจ่ายสูงสุดและสถานะงบประมาณ</p>
                <p className="mt-1 text-blue-500">ข้อมูลไม่ถูกส่งออกจากอุปกรณ์ของคุณ ยกเว้นเพื่อประมวลผล AI</p>
              </div>
            </div>
          </PressCard>
        )}
      </div>

      {/* ── Chat area ── */}
      <div className="flex-1 overflow-y-auto px-4 py-2 space-y-4">

        {/* Empty state */}
        {messages.length === 0 && (
          <div className="flex flex-col items-center justify-center h-full gap-6 py-8">
            <div className="text-center space-y-2">
              <div className="w-16 h-16 rounded-3xl bg-violet-600 border-2 border-violet-500 flex items-center justify-center mx-auto shadow-[0_5px_0_0_#4c1d95]">
                <Bot className="w-8 h-8 text-white" />
              </div>
              <p className="text-base font-black text-gray-700 dark:text-gray-200 mt-3">สวัสดี! ฉันคือ FinanceMe Coach</p>
              <p className="text-sm text-gray-400 max-w-xs mx-auto leading-relaxed">
                ถามฉันได้เลยเกี่ยวกับการเงินของคุณ หรือเลือกหัวข้อด้านล่าง
              </p>
            </div>

            {/* Quick prompt grid */}
            <div className="w-full max-w-sm space-y-2">
              <p className="text-[11px] font-bold text-gray-400 uppercase tracking-wider text-center">หัวข้อแนะนำ</p>
              <div className="space-y-2">
                {QUICK_PROMPTS.map((qp) => (
                  <PressCard
                    key={qp.label}
                    shadow={`0 3px 0 0 ${qp.color}55`}
                    shadowHover={`0 2px 0 0 ${qp.color}33`}
                    className="bg-white dark:bg-gray-800 p-3 cursor-pointer"
                    style={{ borderColor: qp.color + '40' }}
                    onClick={() => sendMessage(qp.prompt)}
                  >
                    <div className="flex items-center gap-3">
                      <div className="w-8 h-8 rounded-xl flex items-center justify-center flex-shrink-0" style={{ backgroundColor: qp.color + '15' }}>
                        <qp.icon className="w-4 h-4" style={{ color: qp.color }} />
                      </div>
                      <span className="text-sm font-semibold text-gray-700 dark:text-gray-200">{qp.label}</span>
                    </div>
                  </PressCard>
                ))}
              </div>
            </div>
          </div>
        )}

        {/* Messages */}
        {messages.map((msg, i) => (
          <MessageBubble
            key={msg.id}
            msg={msg}
            isStreaming={streaming && i === messages.length - 1 && msg.role === 'assistant'}
          />
        ))}

        <div ref={bottomRef} />
      </div>

      {/* ── Quick prompts bar (when chat is active) ── */}
      {messages.length > 0 && (
        <div className="flex-shrink-0 px-4 pb-1">
          <div className="flex gap-2 overflow-x-auto pb-1 scrollbar-none">
            {QUICK_PROMPTS.slice(0, 3).map((qp) => (
              <button
                key={qp.label}
                onClick={() => sendMessage(qp.prompt)}
                disabled={streaming}
                className="flex-shrink-0 flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-semibold border-2 bg-white dark:bg-gray-800 text-gray-600 dark:text-gray-300 border-gray-200 dark:border-gray-700 hover:border-violet-400 hover:text-violet-600 disabled:opacity-50 transition-all whitespace-nowrap"
              >
                <qp.icon className="w-3 h-3" />
                {qp.label}
              </button>
            ))}
          </div>
        </div>
      )}

      {/* ── Input bar ── */}
      <div className="flex-shrink-0 px-4 pb-4 pt-2">
        <PressCard
          shadow="0 4px 0 0 #4c1d95"
          shadowHover="0 2px 0 0 #4c1d95"
          className="border-violet-400 bg-white dark:bg-gray-900 p-0 overflow-hidden"
        >
          <div className="flex items-end gap-2 p-3">
            <textarea
              ref={inputRef}
              value={input}
              rows={1}
              onChange={(e) => { setInput(e.target.value); autoResize(e.target) }}
              onKeyDown={handleKeyDown}
              placeholder="ถามเรื่องการเงินของคุณ… (Enter ส่ง, Shift+Enter ขึ้นบรรทัด)"
              disabled={streaming}
              className="flex-1 resize-none bg-transparent text-sm text-gray-800 dark:text-gray-100 placeholder-gray-400 focus:outline-none leading-relaxed disabled:opacity-50"
              style={{ minHeight: '24px', maxHeight: '140px' }}
            />
            <button
              onClick={() => sendMessage(input)}
              disabled={!input.trim() || streaming}
              className={cn(
                'w-9 h-9 rounded-xl flex items-center justify-center flex-shrink-0 transition-all',
                input.trim() && !streaming
                  ? 'bg-violet-600 text-white shadow-[0_3px_0_0_#4c1d95] hover:[transform:translateY(1px)] hover:shadow-[0_2px_0_0_#4c1d95]'
                  : 'bg-gray-100 dark:bg-gray-800 text-gray-400',
              )}
            >
              {streaming
                ? <Loader2 className="w-4 h-4 animate-spin" />
                : <Send className="w-4 h-4" />
              }
            </button>
          </div>
        </PressCard>
        <p className="text-[10px] text-gray-300 dark:text-gray-600 text-center mt-1.5">
          AI อาจผิดพลาดได้ ตรวจสอบข้อมูลสำคัญก่อนตัดสินใจทางการเงิน
        </p>
      </div>
    </div>
  )
}
