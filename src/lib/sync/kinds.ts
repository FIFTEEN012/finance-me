import type { StoreApi } from 'zustand'
import type { RecordData, SyncKindAdapter } from './engine'

type WithId = { id: string }

/** Zustand persist exposes `hasHydrated`; a store without persist counts as hydrated. */
function isHydrating(store: unknown): boolean {
  const persist = (store as { persist?: { hasHydrated?: () => boolean } }).persist
  return persist?.hasHydrated?.() === false
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
