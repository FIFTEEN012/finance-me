'use client'

import { create } from 'zustand'
import { persist } from 'zustand/middleware'
import type { CurrentCycleInfo, CyclePeriodLog, CycleSettings } from '@/types/cycle'

export function getTodayDateString(): string {
  const now = new Date()
  const year = now.getFullYear()
  const month = `${now.getMonth() + 1}`.padStart(2, '0')
  const day = `${now.getDate()}`.padStart(2, '0')
  return `${year}-${month}-${day}`
}

export function parseDateOnly(dateStr: string): Date {
  const [y, m, d] = dateStr.split('-').map(Number)
  return new Date(y, m - 1, d)
}

export function addDaysToDate(dateStr: string, days: number): string {
  const date = parseDateOnly(dateStr)
  date.setDate(date.getDate() + days)
  const year = date.getFullYear()
  const month = `${date.getMonth() + 1}`.padStart(2, '0')
  const day = `${date.getDate()}`.padStart(2, '0')
  return `${year}-${month}-${day}`
}

interface CycleStore extends CycleSettings {
  logs: CyclePeriodLog[]
  logPeriodStart: (date?: string, note?: string) => void
  updateSettings: (settings: Partial<CycleSettings>) => void
  deleteLog: (id: string) => void
  getCurrentCycleInfo: () => CurrentCycleInfo
}

const DEFAULT_SETTINGS: CycleSettings = {
  cycleLength: 28,
  periodLength: 5,
  lastPeriodDate: getTodayDateString(),
}

export const useCycleStore = create<CycleStore>()(
  persist(
    (set, get) => ({
      ...DEFAULT_SETTINGS,
      logs: [],

      logPeriodStart: (date, note) => {
        const targetDate = date || getTodayDateString()
        const newLog: CyclePeriodLog = {
          id: crypto.randomUUID(),
          startDate: targetDate,
          note,
          createdAt: new Date().toISOString(),
        }

        set((state) => ({
          lastPeriodDate: targetDate,
          logs: [newLog, ...state.logs.filter((l) => l.startDate !== targetDate)],
        }))
      },

      updateSettings: (settings) => {
        set((state) => ({
          ...state,
          ...settings,
        }))
      },

      deleteLog: (id) => {
        set((state) => {
          const filtered = state.logs.filter((l) => l.id !== id)
          // If the deleted log was the latest, update lastPeriodDate to the next recent log
          const newLast = filtered[0]?.startDate || state.lastPeriodDate
          return {
            logs: filtered,
            lastPeriodDate: newLast,
          }
        })
      },

      getCurrentCycleInfo: () => {
        const { cycleLength, periodLength, lastPeriodDate } = get()
        const todayStr = getTodayDateString()
        const todayDate = parseDateOnly(todayStr)
        const lastDate = parseDateOnly(lastPeriodDate)

        const diffTime = todayDate.getTime() - lastDate.getTime()
        const diffDays = Math.floor(diffTime / (1000 * 60 * 60 * 24))

        // Normalise cycle day (1-indexed, loop if passed cycleLength)
        let dayInCycle = 1
        if (diffDays >= 0) {
          dayInCycle = (diffDays % cycleLength) + 1
        }

        const ovulationDay = Math.max(1, cycleLength - 14)
        const daysUntilNextPeriod = cycleLength - dayInCycle + 1
        const nextPeriodDate = addDaysToDate(todayStr, daysUntilNextPeriod)
        const phaseProgressPercent = Math.min(100, Math.max(1, Math.round((dayInCycle / cycleLength) * 100)))

        let phase: CurrentCycleInfo['phase'] = 'menstrual'
        let phaseNameTh = 'ช่วงมีประจำเดือน (Menstrual Phase)'
        let phaseDescription = 'ร่างกายต้องการการพักผ่อน ดื่มน้ำอุ่น และพักผ่อนให้เพียงพอ'
        let fertilityLevel: CurrentCycleInfo['fertilityLevel'] = 'low'
        let fertilityLabelTh = 'โอกาสตั้งครรภ์ต่ำ'

        if (dayInCycle <= periodLength) {
          phase = 'menstrual'
          phaseNameTh = 'ช่วงมีประจำเดือน'
          phaseDescription = 'ร่างกายต้องการการพักผ่อน ผ่อนคลาย และดื่มน้ำอุ่น'
          fertilityLevel = 'low'
          fertilityLabelTh = 'โอกาสตั้งครรภ์ต่ำ'
        } else if (dayInCycle < ovulationDay - 2) {
          phase = 'follicular'
          phaseNameTh = 'ช่วงก่อนไข่ตก'
          phaseDescription = 'ฮอร์โมนเอสโตรเจนเพิ่มขึ้น พลังงานสดชื่นและมีสมาธิ'
          fertilityLevel = 'low'
          fertilityLabelTh = 'โอกาสตั้งครรภ์ต่ำ'
        } else if (dayInCycle >= ovulationDay - 2 && dayInCycle <= ovulationDay + 1) {
          phase = 'ovulation'
          phaseNameTh = 'ช่วงไข่ตก'
          phaseDescription = 'ฮอร์โมนแตะจุดสูงสุด รู้สึกมั่นใจ มีชีวิตชีวา'
          fertilityLevel = 'high'
          fertilityLabelTh = 'โอกาสตั้งครรภ์สูง (ช่วงไข่ตก)'
        } else {
          phase = 'luteal'
          phaseNameTh = 'ช่วงก่อนรอบถัดไป (PMS)'
          phaseDescription = 'ฮอร์โมนโปรเจสเตอโรนเด่น อาจเหนื่อยง่ายหรืออยากของหวาน'
          fertilityLevel = dayInCycle > ovulationDay + 2 ? 'low' : 'medium'
          fertilityLabelTh = dayInCycle > ovulationDay + 2 ? 'โอกาสตั้งครรภ์ต่ำ' : 'โอกาสตั้งครรภ์ปานกลาง'
        }

        return {
          dayInCycle,
          totalDays: cycleLength,
          phase,
          phaseNameTh,
          phaseDescription,
          daysUntilNextPeriod,
          nextPeriodDate,
          ovulationDay,
          fertilityLevel,
          fertilityLabelTh,
          phaseProgressPercent,
        }
      },
    }),
    {
      name: 'finance-cycle',
    }
  )
)
