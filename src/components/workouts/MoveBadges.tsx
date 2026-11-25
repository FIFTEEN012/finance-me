import { equipmentLabel, groupLabel, levelLabel, type Move } from '@/lib/moves'

const chip = 'rounded-full px-2 py-0.5 text-[11px] font-bold'

export function MoveBadges({ move }: { move: Move }) {
  return (
    <div className="flex flex-wrap gap-1.5">
      <span className={`${chip} bg-violet-100 text-violet-700 dark:bg-violet-500/15 dark:text-violet-300`}>
        {groupLabel(move.group)}
      </span>
      <span className={`${chip} bg-sky-100 text-sky-700 dark:bg-sky-500/15 dark:text-sky-300`}>
        {equipmentLabel(move.equipment)}
      </span>
      <span
        className={
          move.level === 'beginner'
            ? `${chip} bg-emerald-100 text-emerald-700 dark:bg-emerald-500/15 dark:text-emerald-300`
            : `${chip} bg-orange-100 text-orange-700 dark:bg-orange-500/15 dark:text-orange-300`
        }
      >
        {levelLabel(move.level)}
      </span>
      {move.warmUp && (
        <span className={`${chip} bg-slate-100 text-slate-600 dark:bg-slate-800 dark:text-slate-300`}>วอร์มอัพ</span>
      )}
      {move.coolDown && (
        <span className={`${chip} bg-slate-100 text-slate-600 dark:bg-slate-800 dark:text-slate-300`}>คูลดาวน์</span>
      )}
    </div>
  )
}
