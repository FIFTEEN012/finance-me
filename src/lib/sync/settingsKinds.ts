import type { StoreApi } from 'zustand'
import { useSettingsStore } from '@/store/useSettingsStore'
import { useWorkoutPlanStore } from '@/store/useWorkoutPlanStore'
import type { RecordData, SyncKindAdapter } from './engine'
import { singletonKind } from './kinds'

/**
 * A one-per-user record made of some fields of a store. The record is always
 * sent, defaults included: putting a setting back to its default, or ending
 * a Workout Plan, is an edit other devices must see. A new device's defaults
 * still never overwrite a saved record, since pre-sync data uploads as the
 * oldest possible edit. A deleted record or missing field = the store's default.
 */
function fieldsKind<S>(kind: string, store: StoreApi<S>, fields: (keyof S & string)[]): SyncKindAdapter {
  return singletonKind({
    kind,
    id: kind,
    store,
    fields,
    read: (state) => Object.fromEntries(fields.map((f) => [f, state[f]])) as RecordData,
    write: (data) => {
      const initial = store.getInitialState()
      return Object.fromEntries(fields.map((f) => [f, data && f in data ? data[f] : initial[f]])) as Partial<S>
    },
  })
}

/** The user's own settings. The light/dark theme is not here: it is kept outside this store. */
export const settingsKind = fieldsKind('settings', useSettingsStore, [
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
])

/** The in-progress Workout Plan with its ticked sets, and the plan being edited. */
export const workoutPlanKind = fieldsKind('workout-plan', useWorkoutPlanStore, ['active', 'draft'])
