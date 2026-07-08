'use client'

import { useState } from 'react'
import { ArrowUpDown, ArrowLeftRight } from 'lucide-react'
import { EXCHANGE_RATES, CURRENCY_SYMBOLS, CURRENCY_NAMES } from '@/lib/exchangeRates'
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetTrigger } from '@/components/ui/sheet'
import { cn } from '@/lib/utils'

const CURRENCIES = ['THB', 'USD', 'EUR', 'JPY', 'SGD', 'GBP'] as const

interface CurrencyConverterWidgetProps {
  triggerClassName?: string
  sheetContentClassName?: string
}

export function CurrencyConverterWidget({ triggerClassName, sheetContentClassName }: CurrencyConverterWidgetProps) {
  const [fromCur, setFromCur] = useState('USD')
  const [toCur, setToCur] = useState('THB')
  const [amount, setAmount] = useState('')

  const fromRate = EXCHANGE_RATES[fromCur] ?? 1
  const toRate = EXCHANGE_RATES[toCur] ?? 1
  const parsedAmount = parseFloat(amount)
  const converted = !Number.isNaN(parsedAmount) && parsedAmount > 0 ? (parsedAmount * fromRate) / toRate : null
  const rateDisplay = (fromRate / toRate).toFixed(fromCur === 'JPY' || toCur === 'JPY' ? 4 : 4)

  function swap() {
    setFromCur(toCur)
    setToCur(fromCur)
    setAmount(converted !== null ? converted.toFixed(2) : '')
  }

  return (
    <Sheet>
      <SheetTrigger
        className={cn(
          'p-2 rounded-lg text-gray-400 transition-colors hover:bg-gray-100 hover:text-gray-600 dark:hover:bg-white/[0.06] dark:hover:text-white/60',
          triggerClassName
        )}
        title="แปลงสกุลเงิน"
      >
        <ArrowLeftRight className="w-4 h-4" />
      </SheetTrigger>

      <SheetContent
        side="bottom"
        className={cn(
          'rounded-t-2xl pb-8',
          'dark:bg-[rgba(8,14,30,0.96)] dark:border-white/[0.08]',
          sheetContentClassName
        )}
      >
        <SheetHeader className="mb-4">
          <SheetTitle className="text-base">แปลงสกุลเงิน</SheetTitle>
          <p className="text-xs text-gray-400 dark:text-white/30">อัตราโดยประมาณ ณ เม.ย. 2569</p>
        </SheetHeader>

        <div className="max-w-sm mx-auto space-y-4">
          <div className="space-y-2">
            <p className="text-xs font-medium tracking-wide text-gray-500 uppercase dark:text-white/35">จาก</p>

            <div className="flex flex-wrap gap-1.5">
              {CURRENCIES.map((cur) => (
                <button
                  key={cur}
                  type="button"
                  onClick={() => setFromCur(cur)}
                  className={cn(
                    'flex items-center gap-1 rounded-lg border px-2.5 py-1.5 text-xs font-medium transition-all',
                    fromCur === cur
                      ? 'bg-primary text-white border-primary shadow-sm'
                      : 'border-gray-200 bg-white text-gray-600 hover:border-gray-300 dark:border-white/10 dark:bg-white/[0.03] dark:text-white/50 dark:hover:border-white/20'
                  )}
                >
                  <span className="font-bold">{CURRENCY_SYMBOLS[cur]}</span>
                  {cur}
                </button>
              ))}
            </div>

            <div className="relative">
              <span className="absolute left-3 top-1/2 -translate-y-1/2 text-lg font-bold text-gray-400 pointer-events-none select-none dark:text-white/30">
                {CURRENCY_SYMBOLS[fromCur]}
              </span>
              <input
                type="number"
                step="any"
                min="0"
                value={amount}
                onChange={(event) => setAmount(event.target.value)}
                placeholder="0.00"
                className={cn(
                  'w-full rounded-xl border border-gray-200 bg-gray-50 pl-9 pr-4 py-3 text-2xl font-bold text-gray-800 outline-none transition-all placeholder-gray-300',
                  'focus:ring-2 focus:ring-primary/30 dark:border-white/[0.08] dark:bg-white/[0.04] dark:text-white/80 dark:placeholder-white/20'
                )}
              />
            </div>
            <p className="pl-1 text-xs text-gray-400 dark:text-white/25">{CURRENCY_NAMES[fromCur]}</p>
          </div>

          <div className="flex items-center gap-3">
            <div className="flex-1 h-px bg-gray-100 dark:bg-white/[0.06]" />
            <button
              type="button"
              onClick={swap}
              className={cn(
                'flex h-9 w-9 items-center justify-center rounded-full border border-gray-200 bg-gray-100 text-gray-500 transition-all hover:bg-primary/10 hover:text-primary active:scale-95',
                'dark:border-white/[0.08] dark:bg-white/[0.06] dark:text-white/40 dark:hover:bg-primary/20'
              )}
              title="สลับสกุลเงิน"
            >
              <ArrowUpDown className="w-4 h-4" />
            </button>
            <div className="flex-1 h-px bg-gray-100 dark:bg-white/[0.06]" />
          </div>

          <div className="space-y-2">
            <p className="text-xs font-medium tracking-wide text-gray-500 uppercase dark:text-white/35">เป็น</p>

            <div className="flex flex-wrap gap-1.5">
              {CURRENCIES.map((cur) => (
                <button
                  key={cur}
                  type="button"
                  onClick={() => setToCur(cur)}
                  className={cn(
                    'flex items-center gap-1 rounded-lg border px-2.5 py-1.5 text-xs font-medium transition-all',
                    toCur === cur
                      ? 'bg-primary text-white border-primary shadow-sm'
                      : 'border-gray-200 bg-white text-gray-600 hover:border-gray-300 dark:border-white/10 dark:bg-white/[0.03] dark:text-white/50 dark:hover:border-white/20'
                  )}
                >
                  <span className="font-bold">{CURRENCY_SYMBOLS[cur]}</span>
                  {cur}
                </button>
              ))}
            </div>

            <div className="flex items-center rounded-xl border border-gray-200 bg-gray-50 px-4 py-3 dark:border-white/[0.08] dark:bg-white/[0.04]">
              <span className="mr-1 text-lg font-bold text-gray-400 dark:text-white/30">{CURRENCY_SYMBOLS[toCur]}</span>
              <span className={cn('text-2xl font-bold', converted !== null ? 'text-gray-800 dark:text-white/80' : 'text-gray-300 dark:text-white/20')}>
                {converted !== null
                  ? converted.toLocaleString('th-TH', { minimumFractionDigits: 2, maximumFractionDigits: 2 })
                  : '0.00'}
              </span>
            </div>
            <p className="pl-1 text-xs text-gray-400 dark:text-white/25">{CURRENCY_NAMES[toCur]}</p>
          </div>

          <div className="flex items-center justify-center gap-2 rounded-xl border border-primary/10 bg-primary/5 px-4 py-2 dark:bg-primary/10">
            <span className="text-xs text-gray-500 dark:text-white/40">
              1 <span className="font-semibold text-gray-700 dark:text-white/60">{fromCur}</span>
              {' = '}
              <span className="font-semibold text-primary">
                {CURRENCY_SYMBOLS[toCur]}
                {rateDisplay}
              </span>
              {' '}
              {toCur}
            </span>
          </div>
        </div>
      </SheetContent>
    </Sheet>
  )
}
