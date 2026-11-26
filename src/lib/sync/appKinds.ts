import { useSupplyStore } from '@/store/useSupplyStore'
import { useRecurringStore } from '@/store/useRecurringStore'
import { useBillSplitStore } from '@/store/useBillSplitStore'
import { useSettingsStore } from '@/store/useSettingsStore'
import { useWorkoutPlanStore } from '@/store/useWorkoutPlanStore'
import { arrayKind, singletonKind } from './kinds'
import type { SyncKindAdapter } from './engine'

/** The user's own settings (User Data). Theme light/dark is not here: it lives outside the store. */
const SETTINGS_FIELDS = [
  'displayName',
  'avatarEmoji',
  'currency',
  'firstDayOfWeek',
  'dateFormat',
  'numberFormat',
  'compactNumbers',
  'accentColor',
  'paydayDate',
  'reportCoverImage',
] as const

/**
 * The record kinds this app syncs through the engine, each bound to the store
 * that holds it. Adding a kind = list it in `RECORD_KINDS` (contract.ts) and
 * add its adapter here; the store's actions need no sync code.
 */
export const APP_SYNC_KINDS: SyncKindAdapter[] = [
  arrayKind({ kind: 'supply', store: useSupplyStore, field: 'items' }),
  arrayKind({ kind: 'recurring-rule', store: useRecurringStore, field: 'recurrings' }),
  arrayKind({ kind: 'bill-split', store: useBillSplitStore, field: 'splits' }),
  singletonKind({ kind: 'settings', store: useSettingsStore, fields: SETTINGS_FIELDS }),
  singletonKind({ kind: 'workout-plan', store: useWorkoutPlanStore, fields: ['active', 'draft'] }),
]
