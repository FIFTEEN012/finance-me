'use client'

import { AlertTriangle, ExternalLink, ShieldAlert, XCircle } from 'lucide-react'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog'
import { equipmentLabel, formatRecommendation, groupLabel, levelLabel, type Move } from '@/lib/moves'
import { MoveBadges } from './MoveBadges'

export const MEDICAL_NOTICE = 'หากมีโรคประจำตัวหรือบาดเจ็บ ควรปรึกษาแพทย์ก่อน'

export function MedicalNotice({ className = '' }: { className?: string }) {
  return (
    <p
      className={`flex items-start gap-2 rounded-xl border border-amber-200 bg-amber-50 px-3 py-2 text-sm text-amber-800 dark:border-amber-500/30 dark:bg-amber-500/10 dark:text-amber-300 ${className}`}
    >
      <AlertTriangle className="mt-0.5 h-4 w-4 flex-shrink-0" aria-hidden />
      <span>{MEDICAL_NOTICE}</span>
    </p>
  )
}

/** How-to content of one Move. Reusable inside a plan checklist later. */
export function MoveDetail({ move }: { move: Move }) {
  return (
    <div className="space-y-4 text-sm text-slate-700 dark:text-slate-300">
      <MoveBadges move={move} />

      <div className="rounded-xl bg-emerald-50 px-3 py-2 dark:bg-emerald-500/10">
        <p className="text-xs font-bold text-emerald-700 dark:text-emerald-400">ค่าแนะนำ</p>
        <p className="num font-bold tabular-nums text-emerald-800 dark:text-emerald-300">{formatRecommendation(move)}</p>
        <p className="text-xs text-slate-500 dark:text-slate-400">ส่วนที่ได้ใช้: {move.targets}</p>
      </div>

      <section className="space-y-1.5">
        <h4 className="font-bold text-slate-800 dark:text-slate-100">วิธีทำ</h4>
        <ol className="list-decimal space-y-1 pl-5">
          {move.steps.map((s, i) => (
            <li key={i}>{s}</li>
          ))}
        </ol>
      </section>

      <section className="space-y-1.5">
        <h4 className="flex items-center gap-1.5 font-bold text-slate-800 dark:text-slate-100">
          <XCircle className="h-4 w-4 text-red-500 dark:text-red-400" aria-hidden /> ข้อผิดพลาดที่พบบ่อย
        </h4>
        <ul className="list-disc space-y-1 pl-5">
          {move.mistakes.map((s, i) => (
            <li key={i}>{s}</li>
          ))}
        </ul>
      </section>

      <section className="space-y-1.5">
        <h4 className="flex items-center gap-1.5 font-bold text-slate-800 dark:text-slate-100">
          <ShieldAlert className="h-4 w-4 text-amber-500 dark:text-amber-400" aria-hidden /> ข้อควรระวัง
        </h4>
        <ul className="list-disc space-y-1 pl-5">
          {move.cautions.map((s, i) => (
            <li key={i}>{s}</li>
          ))}
        </ul>
      </section>

      <MedicalNotice />

      <p className="text-xs text-slate-500 dark:text-slate-400">
        แหล่งอ้างอิง:{' '}
        {move.source.url ? (
          <a
            href={move.source.url}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-0.5 underline hover:text-emerald-700 dark:hover:text-emerald-400"
          >
            {move.source.title}
            <ExternalLink className="h-3 w-3" aria-hidden />
          </a>
        ) : (
          move.source.title
        )}
      </p>
    </div>
  )
}

export function MoveDetailDialog({ move, onOpenChange }: { move: Move | null; onOpenChange: (open: boolean) => void }) {
  return (
    <Dialog open={move !== null} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[85vh] overflow-y-auto">
        {move && (
          <>
            <DialogHeader>
              <DialogTitle className="text-lg font-black">{move.name}</DialogTitle>
              <DialogDescription>
                {move.nameEn} · {groupLabel(move.group)} · {equipmentLabel(move.equipment)} · {levelLabel(move.level)}
              </DialogDescription>
            </DialogHeader>
            <MoveDetail move={move} />
          </>
        )}
      </DialogContent>
    </Dialog>
  )
}
