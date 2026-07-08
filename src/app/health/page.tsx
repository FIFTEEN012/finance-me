'use client'

import { useMemo, useRef } from 'react'
import {
  Activity,
  CheckCircle2,
  Circle,
  Dumbbell,
  Flame,
  HeartPulse,
  Leaf,
  Play,
  RotateCcw,
  Sparkles,
  Trophy,
  Zap,
} from 'lucide-react'

import { HealthSessionPlayer } from '@/components/health/HealthSessionPlayer'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { PressCard } from '@/components/ui/PressCard'
import { cn } from '@/lib/utils'
import { useHealthQuestStore } from '@/store/useHealthQuestStore'
import type { HealthMode, HealthQuest, HealthSession } from '@/types/health'

type Mood = NonNullable<HealthSession['mood']>

type ModeCard = {
  mode: HealthMode
  label: string
  emoji: string
  description: string
  duration: string
  preferredQuestId?: string
  customQuest?: HealthQuest
  icon: React.ElementType
  accent: string
  border: string
  shadow: string
  bg: string
}

const STRONG_QUICK_QUEST: HealthQuest = {
  id: 'quick-strong-8',
  title: 'แข็งแรงแบบสั้น ๆ 8 นาที',
  description: 'ขยับมั่นคงขึ้นอีกนิด ทำเท่าที่ไหวและพักได้เมื่อจำเป็น',
  mode: 'strong',
  durationMin: 8,
  xpReward: 45,
  exercises: [
    {
      id: 'strong-chair-stand',
      name: 'ลุกนั่งมั่นคง',
      emoji: '🪑',
      instruction: 'ลุกจากเก้าอี้แล้วนั่งลงช้า ๆ ใช้มือช่วยได้เสมอ',
      targetText: '8 ครั้ง',
      reps: 8,
    },
    {
      id: 'strong-wall-push',
      name: 'ดันกำแพง',
      emoji: '🧱',
      instruction: 'วางมือบนกำแพง ดันตัวกลับอย่างนุ่มนวล',
      targetText: '10 ครั้ง',
      reps: 10,
    },
    {
      id: 'strong-step-back',
      name: 'ก้าวถอยแตะพื้น',
      emoji: '👟',
      instruction: 'ก้าวเท้าถอยเบา ๆ แล้วกลับมายืนกลาง จับพนักเก้าอี้ได้',
      targetText: 'ข้างละ 6 ครั้ง',
      reps: 12,
    },
    {
      id: 'strong-cool-breath',
      name: 'หายใจปิดท้าย',
      emoji: '🍃',
      instruction: 'หายใจยาว ๆ ให้ร่างกายค่อย ๆ กลับมาสบาย',
      targetText: '45 วินาที',
      durationSec: 45,
    },
  ],
}

const modeCards: ModeCard[] = [
  {
    mode: 'easy',
    label: 'เบา ๆ',
    emoji: '🌱',
    description: 'เริ่มสั้น ๆ ก็ถือว่าสำเร็จ',
    duration: '5 นาที',
    preferredQuestId: 'easy-move-5',
    icon: Leaf,
    accent: '#10b981',
    border: '#047857',
    shadow: '#065f46',
    bg: 'bg-emerald-50 dark:bg-emerald-500/10',
  },
  {
    mode: 'normal',
    label: 'ปกติ',
    emoji: '💜',
    description: 'ภารกิจพอดี ๆ สำหรับวันที่พร้อม',
    duration: '8-10 นาที',
    preferredQuestId: 'full-body-10',
    icon: Activity,
    accent: '#8b5cf6',
    border: '#6d28d9',
    shadow: '#4c1d95',
    bg: 'bg-violet-50 dark:bg-violet-500/10',
  },
  {
    mode: 'strong',
    label: 'แข็งแรง',
    emoji: '⚡',
    description: 'เพิ่มจังหวะอย่างนุ่มนวล ไม่ต้องรีบ',
    duration: '8 นาที',
    customQuest: STRONG_QUICK_QUEST,
    icon: Dumbbell,
    accent: '#f59e0b',
    border: '#b45309',
    shadow: '#92400e',
    bg: 'bg-amber-50 dark:bg-amber-500/10',
  },
  {
    mode: 'recovery',
    label: 'ฟื้นฟู',
    emoji: '🌿',
    description: 'พักได้เมื่อจำเป็น ค่อย ๆ คลายตัว',
    duration: '5 นาที',
    preferredQuestId: 'recovery-stretch-5',
    icon: HeartPulse,
    accent: '#06b6d4',
    border: '#0e7490',
    shadow: '#155e75',
    bg: 'bg-cyan-50 dark:bg-cyan-500/10',
  },
]

const modeLabel: Record<HealthMode, string> = {
  easy: 'เบา ๆ',
  normal: 'ปกติ',
  strong: 'แข็งแรง',
  recovery: 'ฟื้นฟู',
}

const modeBadgeClass: Record<HealthMode, string> = {
  easy: 'bg-emerald-100 text-emerald-700 dark:bg-emerald-500/15 dark:text-emerald-200',
  normal: 'bg-violet-100 text-violet-700 dark:bg-violet-500/15 dark:text-violet-200',
  strong: 'bg-amber-100 text-amber-700 dark:bg-amber-500/15 dark:text-amber-200',
  recovery: 'bg-cyan-100 text-cyan-700 dark:bg-cyan-500/15 dark:text-cyan-200',
}

const moodLabel: Record<Mood, string> = {
  great: 'รู้สึกดี',
  ok: 'โอเค',
  tired: 'เหนื่อย',
}

function getLocalDateKey(date = new Date()) {
  const year = date.getFullYear()
  const month = String(date.getMonth() + 1).padStart(2, '0')
  const day = String(date.getDate()).padStart(2, '0')
  return `${year}-${month}-${day}`
}

function getDailyQuest(quests: HealthQuest[]) {
  if (quests.length === 0) return undefined

  const dateKey = getLocalDateKey()
  const seed = dateKey.split('').reduce((sum, char) => sum + char.charCodeAt(0), 0)
  return quests[seed % quests.length]
}

function getQuestForMode(quests: HealthQuest[], card: ModeCard) {
  if (card.customQuest) return card.customQuest

  return (
    quests.find((quest) => quest.id === card.preferredQuestId) ??
    quests.find((quest) => quest.mode === card.mode)
  )
}

function getLatestFinishedSessions(sessions: HealthSession[]) {
  return sessions.filter((session) => Boolean(session.endedAt)).slice(0, 3)
}

function formatSessionDate(dateKey: string) {
  const [year, month, day] = dateKey.split('-').map(Number)
  if (!year || !month || !day) return dateKey

  return new Intl.DateTimeFormat('th-TH', {
    day: 'numeric',
    month: 'short',
  }).format(new Date(year, month - 1, day))
}

function sectionTitle(icon: React.ElementType, title: string, subtitle: string) {
  const Icon = icon

  return (
    <div>
      <h2 className="flex items-center gap-2 text-xl font-black text-slate-900 dark:text-white">
        <Icon className="h-5 w-5 text-[#58cc02]" />
        {title}
      </h2>
      <p className="mt-1 text-sm font-medium leading-6 text-slate-600 dark:text-slate-400">
        {subtitle}
      </p>
    </div>
  )
}

export default function HealthPage() {
  const quests = useHealthQuestStore((state) => state.quests)
  const sessions = useHealthQuestStore((state) => state.sessions)
  const activeSession = useHealthQuestStore((state) => state.activeSession)
  const xp = useHealthQuestStore((state) => state.xp)
  const streak = useHealthQuestStore((state) => state.streak)
  const achievements = useHealthQuestStore((state) => state.achievements)
  const startQuest = useHealthQuestStore((state) => state.startQuest)
  const startCustomQuest = useHealthQuestStore((state) => state.startCustomQuest)
  const todayCompleted = useHealthQuestStore((state) => state.getTodayCompleted())

  const sessionRef = useRef<HTMLDivElement>(null)

  const dailyQuest = useMemo(() => getDailyQuest(quests), [quests])
  const latestSessions = useMemo(() => getLatestFinishedSessions(sessions), [sessions])
  const previewAchievements = useMemo(() => achievements.slice(0, 6), [achievements])

  function scrollToSession() {
    sessionRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' })
  }

  function startModeQuest(card: ModeCard) {
    const quest = getQuestForMode(quests, card)
    if (!quest) return

    if (card.customQuest) {
      startCustomQuest(quest)
    } else {
      startQuest(quest.id)
    }

    window.requestAnimationFrame(scrollToSession)
  }

  function startDailyQuest() {
    if (!dailyQuest) return

    startQuest(dailyQuest.id)
    window.requestAnimationFrame(scrollToSession)
  }

  return (
    <div className="space-y-6 pb-24">
      <PressCard
        shadow="0 10px 0 0 #2b6c00"
        shadowHover="0 7px 0 0 #2b6c00"
        className="overflow-hidden rounded-3xl border-[3px] border-[#2b6c00] bg-[#58cc02] p-5 text-white dark:border-emerald-950 dark:bg-emerald-500/90"
      >
        <div className="flex flex-col gap-5 lg:flex-row lg:items-end lg:justify-between">
          <div className="max-w-2xl">
            <Badge className="border border-white/25 bg-white/20 text-white">
              <HeartPulse className="h-3.5 w-3.5" />
              Health Quest
            </Badge>
            <h1 className="mt-4 text-3xl font-black tracking-normal sm:text-4xl">
              ภารกิจสุขภาพวันนี้
            </h1>
            <p className="mt-3 text-base font-bold leading-7 text-white/90">
              ขยับร่างกายสั้น ๆ ทำเท่าที่ไหว แล้วเก็บ XP สุขภาพ
            </p>
            <p className="mt-2 text-sm font-semibold leading-6 text-white/80">
              พักได้เมื่อจำเป็น และเริ่มสั้น ๆ ก็ถือว่าสำเร็จ
            </p>
          </div>

          <div className="grid grid-cols-3 gap-2 sm:min-w-[360px]">
            <div className="rounded-2xl border-2 border-white/25 bg-white/15 p-3 text-center">
              <Zap className="mx-auto h-5 w-5 text-amber-200" />
              <p className="mt-1 text-[10px] font-black uppercase text-white/75">XP รวม</p>
              <p className="num mt-1 text-2xl font-black">{xp}</p>
            </div>
            <div className="rounded-2xl border-2 border-white/25 bg-white/15 p-3 text-center">
              <Flame className="mx-auto h-5 w-5 text-orange-200" />
              <p className="mt-1 text-[10px] font-black uppercase text-white/75">Streak</p>
              <p className="num mt-1 text-2xl font-black">{streak}</p>
            </div>
            <div className="rounded-2xl border-2 border-white/25 bg-white/15 p-3 text-center">
              <CheckCircle2 className="mx-auto h-5 w-5 text-white" />
              <p className="mt-1 text-[10px] font-black uppercase text-white/75">วันนี้</p>
              <p className="mt-1 text-sm font-black">
                {todayCompleted ? 'ทำแล้ว' : 'พร้อมเริ่ม'}
              </p>
            </div>
          </div>
        </div>

        <div className="mt-5 rounded-2xl border-2 border-white/25 bg-white/15 px-4 py-3 text-sm font-black">
          {todayCompleted ? 'วันนี้ทำภารกิจแล้ว' : 'พร้อมเริ่มภารกิจวันนี้'}
        </div>
      </PressCard>

      <section className="space-y-3">
        {sectionTitle(Sparkles, 'Quick Start', 'เลือกโหมดที่เข้ากับวันนี้ แล้วเริ่มได้ทันที')}
        <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
          {modeCards.map((card) => {
            const Icon = card.icon
            const quest = getQuestForMode(quests, card)

            return (
              <PressCard
                key={card.mode}
                shadow={`0 6px 0 0 ${card.shadow}`}
                shadowHover={`0 3px 0 0 ${card.shadow}`}
                className={cn('rounded-3xl border-[3px] p-4 dark:border-slate-700', card.bg)}
                style={{ borderColor: card.border }}
              >
                <div className="flex items-start justify-between gap-3">
                  <div className="flex h-12 w-12 items-center justify-center rounded-2xl border-2 bg-white text-2xl dark:bg-slate-950/60">
                    {card.emoji}
                  </div>
                  <Icon className="h-5 w-5" style={{ color: card.accent }} />
                </div>
                <h3 className="mt-4 text-lg font-black text-slate-900 dark:text-white">
                  {card.label}
                </h3>
                <p className="mt-1 min-h-[44px] text-sm font-medium leading-6 text-slate-600 dark:text-slate-300">
                  {card.description}
                </p>
                <div className="mt-4 flex items-center justify-between gap-3">
                  <Badge className={modeBadgeClass[card.mode]}>{card.duration}</Badge>
                  <Button
                    disabled={!quest}
                    onClick={() => startModeQuest(card)}
                    className="h-10 rounded-2xl bg-[#58cc02] px-4 font-black text-white shadow-[0_3px_0_0_#2b6c00] hover:bg-[#46a302] active:translate-y-1"
                  >
                    <Play className="h-4 w-4" />
                    เริ่ม
                  </Button>
                </div>
              </PressCard>
            )
          })}
        </div>
      </section>

      <section className="space-y-3">
        {sectionTitle(HeartPulse, 'Daily Quest', 'ภารกิจแนะนำวันนี้ เลือกแล้วทำเท่าที่ไหว')}
        {dailyQuest ? (
          <PressCard
            shadow="0 7px 0 0 #7c3aed"
            shadowHover="0 4px 0 0 #7c3aed"
            className="rounded-3xl border-[3px] border-violet-600 bg-white p-5 dark:bg-slate-900"
          >
            <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
              <div>
                <div className="flex flex-wrap items-center gap-2">
                  <Badge className={modeBadgeClass[dailyQuest.mode]}>{modeLabel[dailyQuest.mode]}</Badge>
                  <Badge className="bg-amber-100 text-amber-700 dark:bg-amber-500/15 dark:text-amber-200">
                    +{dailyQuest.xpReward} XP
                  </Badge>
                </div>
                <h3 className="mt-3 text-2xl font-black text-slate-900 dark:text-white">
                  {dailyQuest.title}
                </h3>
                <p className="mt-2 max-w-2xl text-sm font-medium leading-6 text-slate-600 dark:text-slate-400">
                  {dailyQuest.description}
                </p>
                <div className="mt-3 flex flex-wrap gap-2 text-xs font-black text-slate-500 dark:text-slate-400">
                  <span className="rounded-full bg-slate-100 px-3 py-1 dark:bg-slate-800">
                    {dailyQuest.durationMin} นาที
                  </span>
                  <span className="rounded-full bg-slate-100 px-3 py-1 dark:bg-slate-800">
                    {dailyQuest.exercises.length} ท่า
                  </span>
                </div>
              </div>
              <div className="flex flex-col gap-2 sm:flex-row lg:flex-col">
                <Button
                  onClick={startDailyQuest}
                  className="h-11 rounded-2xl bg-[#58cc02] px-5 font-black text-white shadow-[0_4px_0_0_#2b6c00] hover:bg-[#46a302] active:translate-y-1"
                >
                  <Play className="h-4 w-4" />
                  เริ่มภารกิจ
                </Button>
                {activeSession && (
                  <Button
                    variant="outline"
                    onClick={scrollToSession}
                    className="h-11 rounded-2xl border-2 font-black"
                  >
                    ทำต่อ
                  </Button>
                )}
              </div>
            </div>
          </PressCard>
        ) : (
          <EmptyCard title="ยังไม่มี quest" description="เพิ่ม quest ใน store แล้วกลับมาเริ่มได้เลย" />
        )}
      </section>

      <section ref={sessionRef} className="space-y-3 scroll-mt-20">
        {sectionTitle(Activity, 'Today Progress', 'ดูความคืบหน้าและเล่น session ได้จากหน้านี้')}
        <HealthSessionPlayer />
      </section>

      <section className="space-y-3">
        {sectionTitle(Dumbbell, 'My Plans / Quest Templates', 'เลือก quest ที่มีอยู่ใน store แล้วเริ่มได้ทันที')}
        <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-3">
          {quests.map((quest) => (
            <PressCard
              key={quest.id}
              shadow="0 5px 0 0 #cbd5e1"
              shadowHover="0 3px 0 0 #cbd5e1"
              className="flex h-full flex-col rounded-3xl border-[3px] border-slate-200 bg-white p-4 dark:border-slate-800 dark:bg-slate-900"
            >
              <div className="flex flex-wrap items-center gap-2">
                <Badge className={modeBadgeClass[quest.mode]}>{modeLabel[quest.mode]}</Badge>
                <Badge className="bg-amber-100 text-amber-700 dark:bg-amber-500/15 dark:text-amber-200">
                  +{quest.xpReward} XP
                </Badge>
              </div>
              <h3 className="mt-3 text-lg font-black text-slate-900 dark:text-white">
                {quest.title}
              </h3>
              <p className="mt-2 flex-1 text-sm leading-6 text-slate-600 dark:text-slate-400">
                {quest.description}
              </p>
              <div className="mt-4 flex items-center justify-between gap-2 text-xs font-black text-slate-500 dark:text-slate-400">
                <span>{quest.durationMin} นาที</span>
                <span>{quest.exercises.length} ท่า</span>
              </div>
              <Button
                onClick={() => {
                  startQuest(quest.id)
                  window.requestAnimationFrame(scrollToSession)
                }}
                className="mt-4 h-10 rounded-2xl bg-[#58cc02] font-black text-white shadow-[0_3px_0_0_#2b6c00] hover:bg-[#46a302] active:translate-y-1"
              >
                <Play className="h-4 w-4" />
                เริ่ม
              </Button>
            </PressCard>
          ))}
        </div>
      </section>

      <div className="grid gap-4 lg:grid-cols-[1fr_1.1fr]">
        <section className="space-y-3">
          {sectionTitle(RotateCcw, 'History Preview', 'ดูภารกิจล่าสุด 3 รายการ')}
          <PressCard
            shadow="0 5px 0 0 #cbd5e1"
            shadowHover="0 3px 0 0 #cbd5e1"
            className="rounded-3xl border-[3px] border-slate-200 bg-white p-4 dark:border-slate-800 dark:bg-slate-900"
          >
            {latestSessions.length > 0 ? (
              <div className="space-y-3">
                {latestSessions.map((session) => (
                  <div
                    key={session.id}
                    className="rounded-2xl border-2 border-slate-200 p-3 dark:border-slate-800"
                  >
                    <div className="flex items-start justify-between gap-3">
                      <div>
                        <p className="text-xs font-black text-slate-400">
                          {formatSessionDate(session.date)}
                        </p>
                        <h3 className="mt-1 font-black text-slate-900 dark:text-white">
                          {session.title}
                        </h3>
                        <p className="mt-1 text-xs font-medium text-slate-500 dark:text-slate-400">
                          {session.mood ? moodLabel[session.mood] : 'บันทึกแล้ว'}
                        </p>
                      </div>
                      <Badge className="bg-amber-100 text-amber-700 dark:bg-amber-500/15 dark:text-amber-200">
                        +{session.xpEarned} XP
                      </Badge>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <EmptyCard
                title="ยังไม่มี history"
                description="เริ่มภารกิจแรก แล้วประวัติล่าสุดจะแสดงที่นี่"
              />
            )}
          </PressCard>
        </section>

        <section className="space-y-3">
          {sectionTitle(Trophy, 'Achievement Preview', 'badge ที่ปลดล็อกแล้วและเป้าหมายถัดไป')}
          <PressCard
            shadow="0 5px 0 0 #cbd5e1"
            shadowHover="0 3px 0 0 #cbd5e1"
            className="rounded-3xl border-[3px] border-slate-200 bg-white p-4 dark:border-slate-800 dark:bg-slate-900"
          >
            <div className="grid gap-3 sm:grid-cols-2">
              {previewAchievements.map((achievement) => (
                <div
                  key={achievement.id}
                  className={cn(
                    'rounded-2xl border-2 p-3 transition-colors',
                    achievement.unlocked
                      ? 'border-emerald-300 bg-emerald-50 dark:border-emerald-800 dark:bg-emerald-500/10'
                      : 'border-slate-200 bg-slate-50 opacity-75 dark:border-slate-800 dark:bg-slate-950/40'
                  )}
                >
                  <div className="flex items-center gap-3">
                    <div className="flex h-10 w-10 items-center justify-center rounded-2xl border-2 border-white bg-white text-xl shadow-sm dark:border-slate-800 dark:bg-slate-900">
                      {achievement.emoji}
                    </div>
                    <div className="min-w-0">
                      <p className="truncate font-black text-slate-900 dark:text-white">
                        {achievement.title}
                      </p>
                      <p className="text-xs font-black uppercase text-slate-400">
                        {achievement.unlocked ? 'Unlocked' : 'Locked'}
                      </p>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </PressCard>
        </section>
      </div>
    </div>
  )
}

function EmptyCard({ title, description }: { title: string; description: string }) {
  return (
    <div className="rounded-3xl border-2 border-dashed border-slate-200 p-6 text-center dark:border-slate-700">
      <Circle className="mx-auto h-9 w-9 text-slate-300 dark:text-slate-600" />
      <h3 className="mt-3 font-black text-slate-900 dark:text-white">{title}</h3>
      <p className="mt-1 text-sm leading-6 text-slate-600 dark:text-slate-400">
        {description}
      </p>
    </div>
  )
}
