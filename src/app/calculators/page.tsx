'use client'

import { useState } from 'react'
import { TrendingUp, CreditCard, Target, Shield, Calculator, Receipt } from 'lucide-react'
import { CompoundInterestCalc } from '@/components/calculators/CompoundInterestCalc'
import { LoanCalc } from '@/components/calculators/LoanCalc'
import { SavingsGoalCalc } from '@/components/calculators/SavingsGoalCalc'
import { EmergencyFundCalc } from '@/components/calculators/EmergencyFundCalc'
import { TaxCalc } from '@/components/calculators/TaxCalc'
import { PressCard } from '@/components/ui/PressCard'
import { cn } from '@/lib/utils'

const TABS = [
  {
    id:    'compound',
    label: 'ดอกเบี้ยทบต้น',
    icon:  TrendingUp,
    desc:  'คำนวณผลตอบแทนจากการลงทุนระยะยาว',
  },
  {
    id:    'loan',
    label: 'สินเชื่อ / ผ่อน',
    icon:  CreditCard,
    desc:  'คำนวณยอดผ่อนรายเดือนและดอกเบี้ยรวม',
  },
  {
    id:    'savings-goal',
    label: 'เป้าหมายออม',
    icon:  Target,
    desc:  'คำนวณว่าต้องออมเดือนละเท่าไหร่',
  },
  {
    id:    'emergency',
    label: 'กองทุนฉุกเฉิน',
    icon:  Shield,
    desc:  'คำนวณเงินสำรองฉุกเฉินที่เหมาะสม',
  },
  {
    id:    'tax',
    label: 'ภาษีเงินได้',
    icon:  Receipt,
    desc:  'คำนวณภาษีบุคคลธรรมดาไทย ปี 2567',
  },
]

export default function CalculatorsPage() {
  const [activeTab, setActiveTab] = useState('compound')
  const current = TABS.find(t => t.id === activeTab)!

  return (
    <div className="space-y-5 max-w-4xl mx-auto">
      {/* Header */}
      <div className="flex items-start gap-3">
        <div className="flex items-center justify-center w-9 h-9 rounded-xl bg-gradient-to-br from-violet-600 to-indigo-600 shadow-[0_2px_12px_rgba(124,58,237,0.35)] flex-shrink-0">
          <Calculator className="w-4 h-4 text-white" />
        </div>
        <div>
          <h2 className="text-lg font-bold text-gray-900 dark:text-white">เครื่องคิดเลขการเงิน</h2>
          <p className="text-sm text-gray-400 dark:text-white/40">วางแผนการเงินด้วยการคำนวณแบบ Real-time</p>
        </div>
      </div>

      {/* Tab selector */}
      <div className="grid grid-cols-2 sm:grid-cols-5 gap-2">
        {TABS.map(tab => {
          const isActive = tab.id === activeTab
          return (
            <PressCard
              key={tab.id}
              shadow={isActive ? '0 4px 0 0 #4c1d95' : '0 4px 0 0 #d1d5db'}
              shadowHover={isActive ? '0 2px 0 0 #4c1d95' : '0 2px 0 0 #d1d5db'}
              onClick={() => setActiveTab(tab.id)}
              className={cn(
                'flex flex-col items-start gap-1.5 p-3.5 text-left cursor-pointer',
                isActive
                  ? 'border-violet-400 bg-violet-500'
                  : 'border-gray-200 bg-white'
              )}
            >
              <tab.icon className={cn(
                'w-4 h-4',
                isActive ? 'text-white' : 'text-gray-400 dark:text-white/30',
              )} />
              <p className={cn(
                'text-xs font-bold leading-tight',
                isActive ? 'text-white' : 'text-gray-600 dark:text-white/50',
              )}>
                {tab.label}
              </p>
              <p className={cn(
                'text-[10px] leading-tight hidden sm:block',
                isActive ? 'text-white/70' : 'text-gray-400 dark:text-white/25',
              )}>
                {tab.desc}
              </p>
            </PressCard>
          )
        })}
      </div>

      {/* Calculator card */}
      <PressCard shadow="0 4px 0 0 #4c1d95" shadowHover="0 2px 0 0 #4c1d95" className="border-violet-300 overflow-hidden p-0">
        {/* Card header */}
        <div className="px-6 py-4 border-b border-gray-50 dark:border-white/[0.04] flex items-center gap-3 bg-violet-50 dark:bg-violet-500/10">
          <div className="flex items-center justify-center w-8 h-8 rounded-lg bg-violet-100 dark:bg-violet-500/20">
            <current.icon className="w-4 h-4 text-violet-600 dark:text-violet-400" />
          </div>
          <div>
            <h3 className="text-sm font-black text-gray-900 dark:text-white">{current.label}</h3>
            <p className="text-xs text-gray-400 dark:text-white/40">{current.desc}</p>
          </div>
        </div>

        {/* Calculator content */}
        <div className="p-6">
          {activeTab === 'compound'      && <CompoundInterestCalc />}
          {activeTab === 'loan'          && <LoanCalc />}
          {activeTab === 'savings-goal'  && <SavingsGoalCalc />}
          {activeTab === 'emergency'     && <EmergencyFundCalc />}
          {activeTab === 'tax'           && <TaxCalc />}
        </div>
      </PressCard>

      {/* Disclaimer */}
      <p className="text-[10px] text-center text-gray-300 dark:text-white/20">
        ผลลัพธ์เป็นการประมาณการเท่านั้น ไม่ใช่คำแนะนำการลงทุน อัตราดอกเบี้ยจริงอาจแตกต่างกัน
      </p>
    </div>
  )
}
