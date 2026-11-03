import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'

type Store = Map<string, string>

function stubStorage(data: Store) {
  const storage = {
    getItem: (k: string) => data.get(k) ?? null,
    setItem: (k: string, v: string) => void data.set(k, String(v)),
    removeItem: (k: string) => void data.delete(k),
    clear: () => data.clear(),
    key: (i: number) => Array.from(data.keys())[i] ?? null,
    get length() {
      return data.size
    },
  }
  vi.stubGlobal('localStorage', storage)
  vi.stubGlobal('window', { localStorage: storage })
  return storage
}

async function load() {
  vi.resetModules()
  return import('./localOwner')
}

describe('localOwner - ensureLocalDataBelongsTo', () => {
  let data: Store

  beforeEach(() => {
    data = new Map()
    stubStorage(data)
  })

  afterEach(() => {
    vi.unstubAllGlobals()
  })

  it('keeps local data on a legacy browser (no marker) and records the owner', async () => {
    data.set('finance-transactions', '{"state":{"transactions":[{"id":"a"}]},"version":0}')
    data.set('finance-migrated-to-neon', 'true')
    const { ensureLocalDataBelongsTo, getStoredOwnerId, OWNER_MARKER_KEY } = await load()

    expect(ensureLocalDataBelongsTo('user-a')).toBe(false)

    expect(OWNER_MARKER_KEY).toBe('finance-owner-id')
    expect(getStoredOwnerId()).toBe('user-a')
    expect(data.get('finance-transactions')).toContain('"a"')
    expect(data.get('finance-migrated-to-neon')).toBe('true')
  })

  it('does not clear when the stored owner is the same user', async () => {
    data.set('finance-owner-id', 'user-a')
    data.set('finance-transactions', '{"state":{"transactions":[{"id":"a"}]},"version":0}')
    data.set('finance-transactions__synced_at', '1')
    const { ensureLocalDataBelongsTo, getStoredOwnerId } = await load()

    expect(ensureLocalDataBelongsTo('user-a')).toBe(false)

    expect(getStoredOwnerId()).toBe('user-a')
    expect(data.get('finance-transactions')).toContain('"a"')
    expect(data.get('finance-transactions__synced_at')).toBe('1')
  })

  it("clears the previous owner's persisted data when a different user signs in", async () => {
    const { SYNC_STORE_KEYS } = await import('./cloudSync')
    data.set('finance-owner-id', 'user-a')
    for (const key of SYNC_STORE_KEYS) {
      data.set(key, '{"state":{},"version":0}')
      data.set(`${key}__synced_at`, '1')
      data.set(`${key}__modified_at`, '2')
    }
    data.set('finance-migrated-to-neon', 'true')
    data.set('theme', 'dark')
    const { ensureLocalDataBelongsTo, getStoredOwnerId } = await load()

    expect(ensureLocalDataBelongsTo('user-b')).toBe(true)

    for (const key of SYNC_STORE_KEYS) {
      expect(data.has(key), key).toBe(false)
      expect(data.has(`${key}__synced_at`), key).toBe(false)
      expect(data.has(`${key}__modified_at`), key).toBe(false)
    }
    expect(data.has('finance-migrated-to-neon')).toBe(false)
    expect(data.get('theme')).toBe('dark')
    expect(getStoredOwnerId()).toBe('user-b')
  })

  it('resets in-memory store state so old data is not re-persisted', async () => {
    data.set('finance-owner-id', 'user-a')
    const { ensureLocalDataBelongsTo } = await load()
    const { useTransactionStore } = await import('@/store/useTransactionStore')
    const { useBudgetStore } = await import('@/store/useBudgetStore')

    useTransactionStore.setState({
      transactions: [{ id: 'tx-a' } as never],
    })
    useBudgetStore.setState({ budgets: [{ id: 'b-a' } as never] })
    expect(data.get('finance-transactions')).toContain('tx-a')

    expect(ensureLocalDataBelongsTo('user-b')).toBe(true)

    expect(useTransactionStore.getState().transactions).toEqual([])
    expect(useBudgetStore.getState().budgets).toEqual([])
    expect(data.get('finance-transactions') ?? '').not.toContain('tx-a')
    expect(data.get('finance-budgets') ?? '').not.toContain('b-a')

    // A later rehydrate from (now empty) storage must not bring the old rows back.
    await useTransactionStore.persist.rehydrate()
    expect(useTransactionStore.getState().transactions).toEqual([])
  })

  it('does not throw when localStorage throws', async () => {
    const throwing = () => {
      throw new Error('SecurityError')
    }
    vi.stubGlobal('localStorage', {
      getItem: throwing,
      setItem: throwing,
      removeItem: throwing,
    })
    const { ensureLocalDataBelongsTo, getStoredOwnerId, setStoredOwnerId } = await load()

    expect(() => setStoredOwnerId('user-a')).not.toThrow()
    expect(getStoredOwnerId()).toBeNull()
    expect(() => ensureLocalDataBelongsTo('user-b')).not.toThrow()
    expect(ensureLocalDataBelongsTo('user-b')).toBe(false)
  })
})
