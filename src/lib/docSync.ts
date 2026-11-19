'use client'

import {
  DOC_STORE_KEYS,
  applyPull,
  computePush,
  explodeState,
  implodeState,
  shadowAfterPush,
  type DocStoreKey,
  type Shadow,
  type StoreDoc,
} from '@/lib/storeDocs'

export const DOC_SHADOW_SUFFIX = '__doc_shadow'

export type DocSyncResult = { ok: true; pulledChanges: number } | { ok: false; error: string }

type PersistedStore = {
  getState: () => object
  setState: (partial: Record<string, unknown>) => void
  subscribe: (listener: () => void) => () => void
  persist: {
    getOptions: () => { partialize?: (state: never) => unknown }
  }
}

export async function loadDocStores(): Promise<Record<DocStoreKey, PersistedStore>> {
  const [
    { useInvestmentStore },
    { useSettingsStore },
    { useMonthlyExpenseStore },
    { useDashboardStore },
    { useOnboardingStore },
    { useBillSplitStore },
    { useRecurringStore },
    { useSupplyStore },
  ] = await Promise.all([
    import('@/store/useInvestmentStore'),
    import('@/store/useSettingsStore'),
    import('@/store/useMonthlyExpenseStore'),
    import('@/store/useDashboardStore'),
    import('@/store/useOnboardingStore'),
    import('@/store/useBillSplitStore'),
    import('@/store/useRecurringStore'),
    import('@/store/useSupplyStore'),
  ])
  const stores = {
    'finance-investments': useInvestmentStore,
    'finance-settings': useSettingsStore,
    'finance-monthly-expense-logs': useMonthlyExpenseStore,
    'finance-dashboard-layout': useDashboardStore,
    'finance-onboarding': useOnboardingStore,
    'finance-bill-splits': useBillSplitStore,
    'finance-recurring-rules': useRecurringStore,
    'finance-supplies': useSupplyStore,
  }
  return stores as unknown as Record<DocStoreKey, PersistedStore>
}

/** The part of a store's state that persist writes to localStorage. */
function persistedState(store: PersistedStore): Record<string, unknown> {
  const state = store.getState() as Record<string, unknown>
  const partialize = store.persist.getOptions().partialize as
    | ((s: Record<string, unknown>) => unknown)
    | undefined
  const picked = partialize ? partialize(state) : state
  return JSON.parse(JSON.stringify(picked ?? {})) as Record<string, unknown>
}

function readShadow(key: string): Shadow | null {
  try {
    const raw = localStorage.getItem(`${key}${DOC_SHADOW_SUFFIX}`)
    if (!raw) return null
    const parsed = JSON.parse(raw)
    return parsed && typeof parsed === 'object' ? (parsed as Shadow) : null
  } catch {
    return null
  }
}

function writeShadow(key: string, shadow: Shadow) {
  try {
    localStorage.setItem(`${key}${DOC_SHADOW_SUFFIX}`, JSON.stringify(shadow))
  } catch {
    // storage full or blocked — next sync re-pushes, which is harmless
  }
}

/** True while server data is being written into the stores. */
let applyingRemote = false
export const isApplyingRemoteDocs = () => applyingRemote

let running: Promise<DocSyncResult> | null = null
let rerunRequested = false

/**
 * Two-way sync of the document stores: push local edits, then pull and merge
 * everything from the server. Calls made while a sync runs are coalesced
 * into one follow-up run.
 */
export function syncDocStores(): Promise<DocSyncResult> {
  if (running) {
    rerunRequested = true
    return running
  }
  running = (async () => {
    let result: DocSyncResult
    do {
      rerunRequested = false
      result = await syncOnce()
    } while (rerunRequested && result.ok)
    return result
  })().finally(() => {
    running = null
  })
  return running
}

async function syncOnce(): Promise<DocSyncResult> {
  try {
    const stores = await loadDocStores()

    // 1. Push
    const changes: StoreDoc[] = []
    const pushedByKey = new Map<DocStoreKey, StoreDoc[]>()
    const now = new Date().toISOString()
    for (const key of DOC_STORE_KEYS) {
      const local = explodeState(persistedState(stores[key]))
      const pushed = computePush(key, local, readShadow(key), now)
      if (pushed.length > 0) {
        pushedByKey.set(key, pushed)
        changes.push(...pushed)
      }
    }
    if (changes.length > 0) {
      const res = await fetch('/api/sync/docs', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ changes }),
      })
      if (!res.ok) {
        const err = await res.json().catch(() => ({}))
        return { ok: false, error: err.error || `Push failed (${res.status})` }
      }
      for (const [key, pushed] of pushedByKey) {
        writeShadow(key, shadowAfterPush(readShadow(key), pushed))
      }
    }

    // 2. Pull
    const res = await fetch('/api/sync/docs', { method: 'GET' })
    if (!res.ok) {
      const err = await res.json().catch(() => ({}))
      return { ok: false, error: err.error || `Pull failed (${res.status})` }
    }
    const body = (await res.json()) as { docs?: StoreDoc[] }
    const byKey = new Map<string, StoreDoc[]>()
    for (const doc of body.docs ?? []) {
      if (!byKey.has(doc.storeKey)) byKey.set(doc.storeKey, [])
      byKey.get(doc.storeKey)!.push(doc)
    }

    let pulledChanges = 0
    for (const key of DOC_STORE_KEYS) {
      const store = stores[key]
      const base = persistedState(store)
      const local = explodeState(base)
      const merged = applyPull(local, readShadow(key) ?? {}, byKey.get(key) ?? [])
      if (merged.changed) {
        pulledChanges++
        applyingRemote = true
        try {
          store.setState(implodeState(merged.docs, base))
        } finally {
          applyingRemote = false
        }
      }
      writeShadow(key, merged.shadow)
    }
    return { ok: true, pulledChanges }
  } catch (error) {
    return { ok: false, error: error instanceof Error ? error.message : 'Sync failed' }
  }
}

/**
 * Calls `onChange` whenever a document store changes locally (not when the
 * change came from the server). Returns an unsubscribe function.
 */
export async function subscribeToDocStores(onChange: () => void): Promise<() => void> {
  const stores = await loadDocStores()
  const unsubs = DOC_STORE_KEYS.map((key) =>
    stores[key].subscribe(() => {
      if (!applyingRemote) onChange()
    }),
  )
  return () => unsubs.forEach((u) => u())
}
