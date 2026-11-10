/**
 * Document model for syncing zustand persist stores that have no typed
 * server table. Pure functions only — shared by the client sync engine, the
 * /api/sync/docs route and tests.
 *
 * A store's persisted `state` object is split into documents:
 *   - `<prop>#<id>`   one per item of an array whose items all have a string id
 *   - `<prop>@order`  the id order of such an array
 *   - `<prop>`        any other top-level value, as a whole
 * Each document syncs on its own with last-write-wins, so two devices editing
 * different supplies (or different settings) never overwrite each other.
 */

/** Stores synced through /api/sync/docs. The other SYNC_STORE_KEYS
 * (transactions, budgets, categories, goals, debts) use the typed tables. */
export const DOC_STORE_KEYS = [
  'finance-investments',
  'finance-settings',
  'finance-monthly-expense-logs',
  'finance-dashboard-layout',
  'finance-onboarding',
  'finance-bill-splits',
  'finance-recurring-rules',
  'finance-supplies',
] as const

export type DocStoreKey = (typeof DOC_STORE_KEYS)[number]

export function isDocStoreKey(key: unknown): key is DocStoreKey {
  return typeof key === 'string' && (DOC_STORE_KEYS as readonly string[]).includes(key)
}

/** Typed-table entities whose deletions are recorded as tombstones. */
export const TYPED_ENTITIES = ['transactions', 'categories', 'budgets', 'goals', 'debts'] as const
export type TypedEntity = (typeof TYPED_ENTITIES)[number]
export const tombstoneStoreKey = (entity: TypedEntity) => `deleted:${entity}`

export type StoreDoc = {
  storeKey: string
  docId: string
  data: unknown
  deleted: boolean
  /** ISO time of the edit on the client (last-write-wins clock). */
  updatedAt: string
}

/** docId -> JSON-serialisable value */
export type DocMap = Record<string, unknown>

const ORDER_SUFFIX = '@order'

function isIdArray(value: unknown): value is Array<{ id: string }> {
  return (
    Array.isArray(value) &&
    value.length > 0 &&
    value.every(
      (item) =>
        item !== null &&
        typeof item === 'object' &&
        !Array.isArray(item) &&
        typeof (item as { id?: unknown }).id === 'string' &&
        (item as { id: string }).id.length > 0,
    ) &&
    new Set(value.map((item) => item.id)).size === value.length
  )
}

/** Splits a persisted store state into documents. Functions and undefined are dropped. */
export function explodeState(state: Record<string, unknown> | null | undefined): DocMap {
  const docs: DocMap = {}
  if (!state || typeof state !== 'object') return docs
  for (const [prop, value] of Object.entries(state)) {
    if (value === undefined || typeof value === 'function') continue
    if (prop.includes('#') || prop.includes('@')) continue
    if (isIdArray(value)) {
      for (const item of value) docs[`${prop}#${item.id}`] = item
      docs[`${prop}${ORDER_SUFFIX}`] = value.map((item) => item.id)
    } else {
      docs[prop] = value
    }
  }
  return docs
}

/**
 * Rebuilds `state` from documents. Props of `base` that no document mentions
 * are kept as they are (so in-memory-only fields survive); an id-array prop
 * whose items are all gone becomes an empty array.
 */
export function implodeState(docs: DocMap, base: Record<string, unknown> = {}): Record<string, unknown> {
  const state: Record<string, unknown> = { ...base }
  const arrays = new Map<string, Map<string, unknown>>()
  const orders = new Map<string, string[]>()

  for (const [docId, value] of Object.entries(docs)) {
    const hash = docId.indexOf('#')
    if (hash > 0) {
      const prop = docId.slice(0, hash)
      const id = docId.slice(hash + 1)
      if (!arrays.has(prop)) arrays.set(prop, new Map())
      arrays.get(prop)!.set(id, value)
    } else if (docId.endsWith(ORDER_SUFFIX)) {
      const prop = docId.slice(0, -ORDER_SUFFIX.length)
      orders.set(prop, Array.isArray(value) ? value.filter((v): v is string => typeof v === 'string') : [])
    } else {
      state[docId] = value
    }
  }

  // Props that were id arrays in `base` but have no item documents left.
  for (const [prop, value] of Object.entries(base)) {
    if (isIdArray(value) && !arrays.has(prop)) state[prop] = []
  }
  for (const prop of orders.keys()) {
    if (!arrays.has(prop)) state[prop] = []
  }

  for (const [prop, items] of arrays) {
    const order = orders.get(prop) ?? []
    const out: unknown[] = []
    const seen = new Set<string>()
    for (const id of order) {
      if (items.has(id) && !seen.has(id)) {
        out.push(items.get(id))
        seen.add(id)
      }
    }
    for (const [id, item] of items) {
      if (!seen.has(id)) out.push(item)
    }
    state[prop] = out
  }
  return state
}

/** Deterministic JSON (object keys sorted) so equal values hash equally. */
export function stableStringify(value: unknown): string {
  if (value === null || typeof value !== 'object') {
    return JSON.stringify(value) ?? 'null'
  }
  if (Array.isArray(value)) {
    return `[${value.map((v) => (v === undefined ? 'null' : stableStringify(v))).join(',')}]`
  }
  const entries = Object.entries(value as Record<string, unknown>)
    .filter(([, v]) => v !== undefined && typeof v !== 'function')
    .sort(([a], [b]) => (a < b ? -1 : a > b ? 1 : 0))
  return `{${entries.map(([k, v]) => `${JSON.stringify(k)}:${stableStringify(v)}`).join(',')}}`
}

/** cyrb53 — small, fast, non-cryptographic string hash. */
export function hashValue(value: unknown): string {
  const str = stableStringify(value)
  let h1 = 0xdeadbeef
  let h2 = 0x41c6ce57
  for (let i = 0; i < str.length; i++) {
    const ch = str.charCodeAt(i)
    h1 = Math.imul(h1 ^ ch, 2654435761)
    h2 = Math.imul(h2 ^ ch, 1597334677)
  }
  h1 = Math.imul(h1 ^ (h1 >>> 16), 2246822507) ^ Math.imul(h2 ^ (h2 >>> 13), 3266489909)
  h2 = Math.imul(h2 ^ (h2 >>> 16), 2246822507) ^ Math.imul(h1 ^ (h1 >>> 13), 3266489909)
  return (4294967296 * (2097151 & h2) + (h1 >>> 0)).toString(36)
}

/**
 * docId -> hash of the value this device last agreed with the server on.
 * `null` means this device has never synced the store.
 */
export type Shadow = Record<string, string>

/** Clock used for documents pushed before this device ever synced: any
 * server copy wins over them, but they are still stored when the server has
 * none (first upload of data that existed before sync). */
export const FIRST_SYNC_TIME = new Date(0).toISOString()

/**
 * Documents to push: every document whose value differs from the shadow, and
 * a tombstone for every shadowed document that no longer exists locally.
 */
export function computePush(
  storeKey: string,
  local: DocMap,
  shadow: Shadow | null,
  now: string,
): StoreDoc[] {
  const changes: StoreDoc[] = []
  const clock = shadow === null ? FIRST_SYNC_TIME : now
  const known = shadow ?? {}
  for (const [docId, value] of Object.entries(local)) {
    if (known[docId] !== hashValue(value)) {
      changes.push({ storeKey, docId, data: value, deleted: false, updatedAt: clock })
    }
  }
  if (shadow) {
    for (const docId of Object.keys(shadow)) {
      if (!(docId in local)) {
        changes.push({ storeKey, docId, data: null, deleted: true, updatedAt: now })
      }
    }
  }
  return changes
}

/** Shadow after a push: the pushed values count as agreed with the server.
 * If the server kept a newer copy instead, the following pull replaces the
 * local value with it (local == shadow means "no unsynced edit"). */
export function shadowAfterPush(shadow: Shadow | null, pushed: StoreDoc[]): Shadow {
  const next: Shadow = { ...(shadow ?? {}) }
  for (const doc of pushed) {
    if (doc.deleted) delete next[doc.docId]
    else next[doc.docId] = hashValue(doc.data)
  }
  return next
}

/**
 * Merges the server's documents into the local ones. Runs right after a push,
 * so the server already holds the last-write-wins result.
 * - A document edited or deleted here since the shadow (a change made while
 *   the push was in flight) is left alone; it is pushed next round.
 * - Otherwise the server copy wins: replaced, or removed for a tombstone.
 * - Local documents the server has never seen and the shadow does not know
 *   are kept (new, not yet pushed).
 */
export function applyPull(
  local: DocMap,
  shadow: Shadow,
  serverDocs: StoreDoc[],
): { docs: DocMap; shadow: Shadow; changed: boolean } {
  const docs: DocMap = { ...local }
  const nextShadow: Shadow = { ...shadow }
  let changed = false

  for (const doc of serverDocs) {
    const hasLocal = doc.docId in local
    const known = shadow[doc.docId]
    const localHash = hasLocal ? hashValue(local[doc.docId]) : undefined
    // Edited or deleted here after the last agreement with the server: an
    // unsynced local change, which the next push sends.
    if (known !== undefined && localHash !== known) continue

    if (doc.deleted) {
      if (hasLocal) {
        delete docs[doc.docId]
        changed = true
      }
      delete nextShadow[doc.docId]
    } else {
      const serverHash = hashValue(doc.data)
      if (localHash !== serverHash) {
        docs[doc.docId] = doc.data
        changed = true
      }
      nextShadow[doc.docId] = serverHash
    }
  }

  // Shadowed documents the server no longer has at all: forget the shadow so
  // the local copy is pushed again.
  const onServer = new Set(serverDocs.map((d) => d.docId))
  for (const docId of Object.keys(nextShadow)) {
    if (!onServer.has(docId)) delete nextShadow[docId]
  }

  return { docs, shadow: nextShadow, changed }
}
