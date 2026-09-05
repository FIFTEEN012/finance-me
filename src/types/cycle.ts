export type CyclePhase = 'menstrual' | 'follicular' | 'ovulation' | 'luteal'

export interface CycleSettings {
  cycleLength: number   // ความยาวรอบเดือนเฉลี่ย เช่น 28 วัน (21-45)
  periodLength: number  // จำนวนวันมีประจำเดือน เช่น 5 วัน (3-10)
  lastPeriodDate: string // YYYY-MM-DD วันแรกของประจำเดือนรอบล่าสุด
}

export interface CyclePeriodLog {
  id: string
  startDate: string // YYYY-MM-DD
  endDate?: string   // YYYY-MM-DD
  note?: string
  createdAt: string
}

export interface CurrentCycleInfo {
  dayInCycle: number           // วันที่เท่าไหร่ของรอบ (เช่น วันที่ 12)
  totalDays: number            // ความยาวรอบเดือนทั้งหมด (เช่น 28 วัน)
  phase: CyclePhase            // ระยะปัจจุบัน
  phaseNameTh: string          // ชื่อระยะภาษาไทย
  phaseDescription: string     // คำอธิบายระยะสั้นๆ
  daysUntilNextPeriod: number  // อีกกี่วันประจำเดือนจะมา
  nextPeriodDate: string       // YYYY-MM-DD วันที่คาดว่ารอบถัดไปจะมา
  ovulationDay: number         // วันที่ไข่ตกในรอบ (เช่น วันที่ 14)
  fertilityLevel: 'low' | 'medium' | 'high' // โอกาสตั้งครรภ์
  fertilityLabelTh: string     // ข้อความแสดงโอกาสตั้งครรภ์
  phaseProgressPercent: number // เปอร์เซ็นต์ความคืบหน้าของรอบเดือน 0-100
}
