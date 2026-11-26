import type { StoreApi } from 'zustand'
import type { RecordData, SyncKindAdapter } from './engine'

type WithId = { id: string }

/** Zustand persist exposes `hasHydrated`; a store without persist counts as hydrated. */
function isHydrating(store: unknown): boolean {
  const persist = (store as { persist?: { hasHydrated?: () => boolean } }).persist
  return persist?.hasHydrated?.() === false
}

/**
 * Adapter for a kind with one record per user, kept as some fields of a
 * zustand store, e.g. `singletonKind({ kind: 'settings', store: useSettingsStore,
 * fields: ['paydayDate', …] })`. The record (fixed id `SINGLETON_ID`) holds
 * those fields; a change to any of them is an edit of the whole record, so
 * the latest edit on any device wins. A deleted record (or a missing field)
 * puts the store's initial value back.
 */
export const SINGLETON_ID = 'current'

export function singletonKind<S>(opts: {
  kind: string
  store: StoreApi<S>
  fields: readonly (keyof S & string)[]
}): SyncKindAdapter {
  const { kind, store, fields } = opts
  const pick = (state: S) => Object.fromEntries(fields.map((f) => [f, state[f]])) as RecordData

  return {
    kind,
    snapshot: () => [{ id: SINGLETON_ID, data: pick(store.getState()) }],
    apply(records) {
      const initial = store.getInitialState()
      for (const { id, data } of records) {
        if (id !== SINGLETON_ID) continue
        const next = Object.fromEntries(
          fields.map((f) => [f, data && f in data ? data[f] : initial[f]]),
        ) as Partial<S>
        store.setState(next)
      }
    },
    watch(onChange) {
      return store.subscribe((state, prev) => {
        if (isHydrating(store)) return
        if (fields.every((f) => Object.is(state[f], prev[f]))) return
        onChange(SINGLETON_ID, pick(state))
      })
    },
  }
}

/**
 * Adapter for a record kind kept as an array of `{ id, … }` in one field of a
 * zustand store, e.g. `arrayKind({ kind: 'supply', store: useSupplyStore, field: 'items' })`.
 *
 * Local edits are found by diffing the array on every store change (a new
 * object for an id = edited, a missing id = deleted), so the store's actions
 * need no sync code. Rehydration from localStorage is not an edit.
 */
export function arrayKind<S, F extends keyof S>(opts: {
  kind: string
  store: StoreApi<S>
  field: F & (S[F] extends WithId[] ? F : never)
}): SyncKindAdapter {
  const { kind, store, field } = opts
  const itemsOf = (state: S) => (state[field] as unknown as WithId[]) ?? []

  return {
    kind,
    snapshot: () => itemsOf(store.getState()).map((item) => ({ id: item.id, data: item as unknown as RecordData })),
    apply(records) {
      store.setState((state) => {
        const items = [...itemsOf(state)]
        for (const { id, data } of records) {
          const at = items.findIndex((item) => item.id === id)
          if (data === null) {
            if (at !== -1) items.splice(at, 1)
          } else if (at === -1) {
            items.push(data as unknown as WithId)
          } else {
            items[at] = data as unknown as WithId
          }
        }
        return { [field]: items } as Partial<S>
      })
    },
    watch(onChange) {
      return store.subscribe((state, prev) => {
        const next = itemsOf(state)
        const before = itemsOf(prev)
        if (next === before || isHydrating(store)) return
        const prevById = new Map(before.map((item) => [item.id, item]))
        const nextIds = new Set<string>()
        for (const item of next) {
          nextIds.add(item.id)
          if (prevById.get(item.id) !== item) onChange(item.id, item as unknown as RecordData)
        }
        for (const item of before) if (!nextIds.has(item.id)) onChange(item.id, null)
      })
    },
  }
}
