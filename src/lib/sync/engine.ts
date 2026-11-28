import {
  MAX_PUSH_CHANGES,
  SYNC_CHANGES_PATH,
  type PullResponse,
  type PushResponse,
  type SyncChange,
  type SyncRecord,
} from './contract'

/**
 * Client sync engine (ADR-0003): the one place on a device that queues local
 * changes to User Data records, pushes them, pulls everyone else's, applies
 * pulled records to the stores and reports sync status.
 *
 * Everything it touches is injected (fetch, storage, clock, store adapters),
 * so several engines — several "devices" — can run in one process.
 */

export type SyncStorage = Pick<Storage, 'getItem' | 'setItem' | 'removeItem'>

export type RecordData = Record<string, unknown>

/** What the engine needs from a store holding one record kind. */
export interface SyncKindAdapter {
  kind: string
  /** Every record held locally; uploaded once per device by the first sync. */
  snapshot(): { id: string; data: RecordData }[]
  /** Writes pulled records into the store (`data: null` = remove). */
  apply(records: { id: string; data: RecordData | null }[]): void
  /**
   * Starts reporting local edits as they happen; returns an unsubscribe.
   * Edits made inside `apply` are ignored by the engine, so applying a pull
   * never queues a push. `editedAt` overrides the edit time (default: now),
   * e.g. the oldest possible time for a record any real edit should beat.
   */
  watch?(onChange: (id: string, data: RecordData | null, editedAt?: string) => void): () => void
}

/**
 * - `synced`: nothing waiting to upload.
 * - `pending`: local changes not on the server yet (offline, or not synced yet).
 * - `error`: the server refused the last sync, or refused records (`refused`)
 *   that stay on this device but are not on the server.
 */
export type SyncState = 'synced' | 'pending' | 'error'

export type SyncStatus = {
  state: SyncState
  pending: number
  /**
   * Local records the server refused to store (e.g. missing required fields).
   * They stay on this device and are not retried; an accepted later edit or
   * delete of the record clears it.
   */
  refused: number
  syncing: boolean
  lastSyncedAt: string | null
}

export type SyncEngine = {
  /** Binds a record kind to its store; returns a function that unbinds it. */
  register(adapter: SyncKindAdapter): () => void
  /**
   * Queues a local change made at the engine's clock time, or at `editedAt`
   * when given (`data: null` = delete).
   */
  record(kind: string, id: string, data: RecordData | null, editedAt?: string): void
  /** Push the queue, then pull. Never rejects; the outcome is in `getStatus()`. */
  sync(): Promise<void>
  getStatus(): SyncStatus
  subscribe(listener: (status: SyncStatus) => void): () => void
  /**
   * Forgets the queue, cursor, first-upload marks and Reset generation (e.g.
   * another account signed in). After this device ran a Reset, pass the new
   * `generation` instead: the device then holds only what the Reset left, so
   * nothing local is uploaded again.
   */
  reset(afterReset?: { generation: number }): void
}

export type SyncEngineOptions = {
  fetch: typeof fetch
  storage: SyncStorage
  now?: () => number
}

/** localStorage keys owned by the engine. */
export const SYNC_ENGINE_KEYS = {
  queue: 'finance-sync-queue',
  cursor: 'finance-sync-cursor',
  uploadedKinds: 'finance-sync-uploaded-kinds',
  /** The last Reset generation the server reported (absent = none heard yet). */
  generation: 'finance-sync-generation',
  /** Records (kind + id) the server refused to store. */
  refused: 'finance-sync-refused',
} as const

/** Edit time any real edit beats, e.g. for records uploaded from pre-sync local data. */
export const OLDEST_EDITED_AT = new Date(0).toISOString()
const PRE_SYNC_EDITED_AT = OLDEST_EDITED_AT

class ServerRefused extends Error {}

/**
 * A queued change, stamped with the Reset generation this device knew when it
 * was queued (absent = none heard yet). The server refuses changes queued
 * under an older generation than its own: they predate a Reset.
 */
type QueuedChange = SyncChange & { generation?: number }

export function createSyncEngine({ fetch: fetchImpl, storage, now = Date.now }: SyncEngineOptions): SyncEngine {
  const adapters = new Map<string, SyncKindAdapter>()
  const listeners = new Set<(status: SyncStatus) => void>()
  let applying = false
  let running: Promise<void> | null = null
  let rerun = false
  let status: SyncStatus = { state: 'synced', pending: 0, refused: 0, syncing: false, lastSyncedAt: null }

  const keyOf = (kind: string, id: string) => `${kind}\u0000${id}`

  function readJson<T>(key: string, fallback: T): T {
    try {
      const raw = storage.getItem(key)
      return raw ? (JSON.parse(raw) as T) : fallback
    } catch {
      return fallback
    }
  }
  function writeJson(key: string, value: unknown) {
    try {
      storage.setItem(key, JSON.stringify(value))
    } catch {
      // Storage full or blocked: the change still syncs if the tab stays open.
    }
  }

  const readQueue = () => readJson<QueuedChange[]>(SYNC_ENGINE_KEYS.queue, [])
  const writeQueue = (queue: QueuedChange[]) => {
    writeJson(SYNC_ENGINE_KEYS.queue, queue)
    setStatus({ pending: queue.length, ...(queue.length && status.state === 'synced' ? { state: 'pending' } : {}) })
  }

  function setStatus(patch: Partial<SyncStatus>) {
    status = { ...status, ...patch }
    for (const listener of listeners) listener(status)
  }

  const readRefused = () => readJson<string[]>(SYNC_ENGINE_KEYS.refused, [])
  /**
   * Notes which sent records the server refused to store. A refused delete is
   * not kept: the record is gone from this device anyway.
   */
  function noteRefusals(sent: QueuedChange[], results: PushResponse['results']) {
    const refused = new Set(readRefused())
    const deletes = new Set(sent.filter((c) => c.data === null).map((c) => keyOf(c.kind, c.id)))
    for (const r of results) {
      const key = keyOf(r.kind, r.id)
      if (r.status === 'rejected' && !r.current && !deletes.has(key)) refused.add(key)
      else refused.delete(key)
    }
    writeJson(SYNC_ENGINE_KEYS.refused, [...refused])
    setStatus({ refused: refused.size })
  }

  const knownGeneration = () => readJson<number | null>(SYNC_ENGINE_KEYS.generation, null) ?? undefined
  function heardGeneration(generation: number) {
    if (typeof generation === 'number') writeJson(SYNC_ENGINE_KEYS.generation, generation)
  }

  /** Adds or replaces the queued change for that record. */
  function enqueue(change: QueuedChange) {
    const queue = readQueue().filter((c) => keyOf(c.kind, c.id) !== keyOf(change.kind, change.id))
    queue.push(change)
    writeQueue(queue)
  }

  /** Drops queued changes that are exactly `sent` (a newer edit made meanwhile stays). */
  function dequeue(sent: Pick<SyncChange, 'kind' | 'id' | 'editedAt'>[]) {
    const done = new Set(sent.map((c) => `${keyOf(c.kind, c.id)}\u0000${c.editedAt}`))
    const queue = readQueue()
    const left = queue.filter((c) => !done.has(`${keyOf(c.kind, c.id)}\u0000${c.editedAt}`))
    if (left.length !== queue.length) writeQueue(left)
  }

  function record(kind: string, id: string, data: RecordData | null, editedAt?: string) {
    if (applying) return
    // Store the record as JSON would send it (drops undefined fields).
    const plain = data === null ? null : (JSON.parse(JSON.stringify(data)) as RecordData)
    enqueue({
      kind,
      id,
      editedAt: editedAt ?? new Date(now()).toISOString(),
      data: plain,
      generation: knownGeneration(),
    } as QueuedChange)
  }

  function applyRecords(records: SyncRecord[]) {
    const queued = new Map(readQueue().map((c) => [keyOf(c.kind, c.id), c]))
    const byKind = new Map<string, { id: string; data: RecordData | null }[]>()
    const superseded: QueuedChange[] = []
    for (const r of records) {
      const adapter = adapters.get(r.kind)
      if (!adapter) continue
      const local = queued.get(keyOf(r.kind, r.id))
      // A local edit newer than the server's still wins: it is pushed next.
      if (local && Date.parse(local.editedAt) > Date.parse(r.editedAt)) continue
      if (local) superseded.push(local)
      const list = byKind.get(r.kind) ?? []
      list.push({ id: r.id, data: r.deletedAt ? null : (r.data as RecordData) })
      byKind.set(r.kind, list)
    }
    applying = true
    try {
      for (const [kind, list] of byKind) adapters.get(kind)!.apply(list)
    } finally {
      applying = false
    }
    dequeue(superseded)
  }

  async function request(input: string, init?: RequestInit): Promise<unknown> {
    // A thrown fetch means no network: the caller keeps the queue as pending.
    const res = await fetchImpl(input, init)
    if (!res.ok) throw new ServerRefused(`HTTP ${res.status}`)
    return res.json()
  }

  function uploadPreSyncData() {
    const uploaded = new Set(readJson<string[]>(SYNC_ENGINE_KEYS.uploadedKinds, []))
    const pending = [...adapters.values()].filter((a) => !uploaded.has(a.kind))
    if (pending.length === 0) return
    const queue = readQueue()
    const queuedKeys = new Set(queue.map((c) => keyOf(c.kind, c.id)))
    const generation = knownGeneration()
    for (const adapter of pending) {
      for (const { id, data } of adapter.snapshot()) {
        if (queuedKeys.has(keyOf(adapter.kind, id))) continue
        queue.push({ kind: adapter.kind, id, editedAt: PRE_SYNC_EDITED_AT, data, generation } as QueuedChange)
      }
      uploaded.add(adapter.kind)
    }
    writeQueue(queue)
    writeJson(SYNC_ENGINE_KEYS.uploadedKinds, [...uploaded])
  }

  async function push() {
    // Bounded, so a queue that cannot be shortened (storage blocked) cannot loop forever.
    const batches = Math.ceil(readQueue().length / MAX_PUSH_CHANGES)
    // A batch never mixes changes queued under different Reset generations.
    const queued = readQueue()
    const runs = queued.filter((c, i) => i === 0 || c.generation !== queued[i - 1].generation).length
    for (let i = 0; i < batches + runs; i++) {
      const queue = readQueue()
      if (queue.length === 0) return
      const generation = queue[0].generation
      const end = queue.findIndex((c) => c.generation !== generation)
      const batch = queue.slice(0, end === -1 ? MAX_PUSH_CHANGES : Math.min(end, MAX_PUSH_CHANGES))
      const response = (await request(SYNC_CHANGES_PATH, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          changes: batch.map(({ generation: _queuedUnder, ...change }) => change),
          ...(generation === undefined ? {} : { generation }),
        }),
      })) as PushResponse
      const winners = response.results.flatMap((r) => (r.status === 'rejected' && r.current ? [r.current] : []))
      dequeue(batch)
      noteRefusals(batch, response.results)
      if (winners.length) applyRecords(winners)
      heardGeneration(response.generation)
    }
  }

  async function pull() {
    const cursor = readJson<string | null>(SYNC_ENGINE_KEYS.cursor, null)
    const url = cursor ? `${SYNC_CHANGES_PATH}?since=${encodeURIComponent(cursor)}` : SYNC_CHANGES_PATH
    const body = (await request(url)) as PullResponse
    applyRecords(body.records)
    writeJson(SYNC_ENGINE_KEYS.cursor, body.cursor)
    heardGeneration(body.generation)
  }

  async function runOnce() {
    setStatus({ syncing: true })
    try {
      uploadPreSyncData()
      await push()
      await pull()
      const pending = readQueue().length
      setStatus({
        state: status.refused ? 'error' : pending ? 'pending' : 'synced',
        pending,
        lastSyncedAt: new Date(now()).toISOString(),
      })
    } catch (error) {
      const pending = readQueue().length
      setStatus({ state: error instanceof ServerRefused ? 'error' : pending ? 'pending' : status.state, pending })
    } finally {
      setStatus({ syncing: false })
    }
  }

  function sync(): Promise<void> {
    if (running) {
      rerun = true
      return running
    }
    running = (async () => {
      try {
        do {
          rerun = false
          await runOnce()
        } while (rerun)
      } finally {
        running = null
      }
    })()
    return running
  }

  const initialPending = readQueue().length
  const initialRefused = readRefused().length
  status = {
    ...status,
    pending: initialPending,
    refused: initialRefused,
    state: initialRefused ? 'error' : initialPending ? 'pending' : 'synced',
  }

  return {
    register(adapter) {
      adapters.set(adapter.kind, adapter)
      const stop = adapter.watch?.((id, data, editedAt) => record(adapter.kind, id, data, editedAt))
      return () => {
        stop?.()
        if (adapters.get(adapter.kind) === adapter) adapters.delete(adapter.kind)
      }
    },
    record,
    sync,
    getStatus: () => status,
    subscribe(listener) {
      listeners.add(listener)
      return () => listeners.delete(listener)
    },
    reset(afterReset) {
      for (const key of Object.values(SYNC_ENGINE_KEYS)) {
        try {
          storage.removeItem(key)
        } catch {
          // ignore
        }
      }
      if (afterReset) {
        heardGeneration(afterReset.generation)
        writeJson(SYNC_ENGINE_KEYS.uploadedKinds, [...adapters.keys()])
      }
      setStatus({ state: 'synced', pending: 0, refused: 0, lastSyncedAt: null })
    },
  }
}
