'use client'

import { useState } from 'react'
import { ArrowUpDown, ArrowLeftRight } from 'lucide-react'
import { EXCHANGE_RATES, CURRENCY_SYMBOLS, CURRENCY_NAMES } from '@/lib/exchangeRates'
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetTrigger } from '@/components/ui/sheet'
import { cn } from '@/lib/utils'

const CURRENCIES = ['THB', 'USD', 'EUR', 'JPY', 'SGD', 'GBP'] as const

export function CurrencyConverterWidget() {
  const [fromCur, setFromCur] = useState('USD')
  const [toCur,   setToCur]   = useState('THB')
  const [amount,  setAmount]  = useState('')

  const fromRate      = EXCHANGE_RATES[fromCur] ?? 1
  const toRate        = EXCHANGE_RATES[toCur] ?? 1
  const parsedAmount  = parseFloat(amount)
  const converted     = !isNaN(parsedAmount) && parsedAmount > 0
    ? (parsedAmount * fromRate) / toRate
    : null
  const rateDisplay   = (fromRate / toRate).toFixed(fromCur === 'JPY' || toCur === 'JPY' ? 4 : 4)

  function swap() {
    setFromCur(toCur)
    setToCur(fromCur)
    setAmount(converted !== null ? converted.toFixed(2) : '')
  }

  return (
    <Sheet>
      <SheetTrigger
        className="p-2 rounded-lg text-gray-400 hover:text-gray-600 dark:hover:text-white/60 hover:bg-gray-100 dark:hover:bg-white/[0.06] transition-colors"
        title="แปลงสกุลเงิน"
      >
        <ArrowLeftRight className="w-4 h-4" />
      </SheetTrigger>

      <SheetContent
        side="bottom"
        className={cn(
          'rounded-t-2xl pb-8',
          'dark:bg-[rgba(8,14,30,0.96)] dark:border-white/[0.08]'
        )}
      >
        <SheetHeader className="mb-4">
          <SheetTitle className="text-base">แปลงสกุลเงิน</SheetTitle>
          <p className="text-xs text-gray-400 dark:text-white/30">อัตราโดยประมาณ ณ เม.ย. 2569</p>
        </SheetHeader>

        <div className="space-y-4 max-w-sm mx-auto">

          {/* ── FROM ── */}
          <div className="space-y-2">
            <p className="text-xs font-medium text-gray-500 dark:text-white/35 uppercase tracking-wide">จาก</p>

            {/* Currency chips */}
            <div className="flex gap-1.5 flex-wrap">
              {CURRENCIES.map((cur) => (
                <button
                  key={cur}
                  type="button"
                  onClick={() => setFromCur(cur)}
                  className={cn(
                    'flex items-center gap-1 px-2.5 py-1.5 rounded-lg text-xs font-medium border transition-all',
                    fromCur === cur
                      ? 'bg-primary text-white border-primary shadow-sm'
                      : 'border-gray-200 dark:border-white/10 text-gray-600 dark:text-white/50 hover:border-gray-300 dark:hover:border-white/20 bg-white dark:bg-white/[0.03]'
                  )}
                >
                  <span className="font-bold">{CURRENCY_SYMBOLS[cur]}</span>
                  {cur}
                </button>
              ))}
            </div>

            {/* Amount input */}
            <div className="relative">
              <span className="absolute left-3 top-1/2 -translate-y-1/2 text-lg font-bold text-gray-400 dark:text-white/30 pointer-events-none select-none">
                {CURRENCY_SYMBOLS[fromCur]}
              </span>
              <input
                type="number"
                step="any"
                min="0"
                value={amount}
                onChange={(e) => setAmount(e.target.value)}
                placeholder="0.00"
                className={cn(
                  'w-full pl-9 pr-4 py-3 text-2xl font-bold rounded-xl',
                  'bg-gray-50 dark:bg-white/[0.04]',
                  'border border-gray-200 dark:border-white/[0.08]',
                  'outline-none focus:ring-2 focus:ring-primary/30',
                  'text-gray-800 dark:text-white/80 placeholder-gray-300 dark:placeholder-white/20',
                  'transition-all'
                )}
              />
            </div>
            <p className="text-xs text-gray-400 dark:text-white/25 pl-1">{CURRENCY_NAMES[fromCur]}</p>
          </div>

          {/* ── SWAP button ── */}
          <div className="flex items-center gap-3">
            <div className="flex-1 h-px bg-gray-100 dark:bg-white/[0.06]" />
            <button
              type="button"
              onClick={swap}
              className={cn(
                'flex items-center justify-center w-9 h-9 rounded-full transition-all',
                'bg-gray-100 dark:bg-white/[0.06]',
                'hover:bg-primary/10 dark:hover:bg-primary/20',
                'hover:text-primary border border-gray-200 dark:border-white/[0.08]',
                'text-gray-500 dark:text-white/40',
                'active:scale-95'
              )}
              title="สลับสกุลเงิน"
            >
              <ArrowUpDown className="w-4 h-4" />
            </button>
            <div className="flex-1 h-px bg-gray-100 dark:bg-white/[0.06]" />
          </div>

          {/* ── TO ── */}
          <div className="space-y-2">
            <p className="text-xs font-medium text-gray-500 dark:text-white/35 uppercase tracking-wide">เป็น</p>

            {/* Currency chips */}
            <div className="flex gap-1.5 flex-wrap">
              {CURRENCIES.map((cur) => (
                <button
                  key={cur}
                  type="button"
                  onClick={() => setToCur(cur)}
                  className={cn(
                    'flex items-center gap-1 px-2.5 py-1.5 rounded-lg text-xs font-medium border transition-all',
                    toCur === cur
                      ? 'bg-primary text-white border-primary shadow-sm'
                      : 'border-gray-200 dark:border-white/10 text-gray-600 dark:text-white/50 hover:border-gray-300 dark:hover:border-white/20 bg-white dark:bg-white/[0.03]'
                  )}
                >
                  <span className="font-bold">{CURRENCY_SYMBOLS[cur]}</span>
                  {cur}
                </button>
              ))}
            </div>

            {/* Result */}
            <div className={cn(
              'flex items-center px-4 py-3 rounded-xl',
              'bg-gray-50 dark:bg-white/[0.04]',
              'border border-gray-200 dark:border-white/[0.08]',
            )}>
              <span className="text-lg font-bold text-gray-400 dark:text-white/30 mr-1">
                {CURRENCY_SYMBOLS[toCur]}
              </span>
              <span className={cn(
                'text-2xl font-bold',
                converted !== null
                  ? 'text-gray-800 dark:text-white/80'
                  : 'text-gray-300 dark:text-white/20'
              )}>
                {converted !== null
                  ? converted.toLocaleString('th-TH', { minimumFractionDigits: 2, maximumFractionDigits: 2 })
                  : '0.00'
                }
              </span>
            </div>
            <p className="text-xs text-gray-400 dark:text-white/25 pl-1">{CURRENCY_NAMES[toCur]}</p>
          </div>

          {/* ── Exchange rate info ── */}
          <div className="flex items-center justify-center gap-2 py-2 px-4 rounded-xl bg-primary/5 dark:bg-primary/10 border border-primary/10">
            <span className="text-xs text-gray-500 dark:text-white/40">
              1 <span className="font-semibold text-gray-700 dark:text-white/60">{fromCur}</span>
              {' = '}
              <span className="font-semibold text-primary">{CURRENCY_SYMBOLS[toCur]}{rateDisplay}</span>
              {' '}{toCur}
            </span>
          </div>

        </div>
      </SheetContent>
    </Sheet>
  )
}
