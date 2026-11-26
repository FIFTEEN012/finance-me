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

    const devicePreferences = ['finance-dashboard-layout', 'finance-onboarding']
    for (const key of SYNC_STORE_KEYS) {
      if (devicePreferences.includes(key)) {
        expect(data.has(key), key).toBe(true)
        continue
      }
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

  it("empties the previous owner's health records so they are not synced into the new account", async () => {
    data.set('finance-owner-id', 'user-a')
    const { ensureLocalDataBelongsTo } = await load()
    const { useNutritionStore } = await import('@/store/useNutritionStore')
    useNutritionStore.setState({
      food: [{ id: 'f-a' } as never],
      water: [{ id: 'w-a' } as never],
      exercise: [{ id: 'e-a' } as never],
      profile: { weightKg: 70 } as never,
      calorieGoal: 1500,
    })

    expect(ensureLocalDataBelongsTo('user-b')).toBe(true)

    const initial = useNutritionStore.getInitialState()
    expect(useNutritionStore.getState()).toMatchObject({
      food: [],
      water: [],
      exercise: [],
      profile: null,
      calorieGoal: initial.calorieGoal,
    })
    expect(data.get('finance-nutrition') ?? '').not.toContain('f-a')
  })

  it("empties the previous owner's portfolio and monthly expense logs", async () => {
    data.set('finance-owner-id', 'user-a')
    const { ensureLocalDataBelongsTo } = await load()
    const { useInvestmentStore } = await import('@/store/useInvestmentStore')
    const { useMonthlyExpenseStore } = await import('@/store/useMonthlyExpenseStore')
    useInvestmentStore.setState({
      holdings: [{ id: 'h-a' } as never],
      orders: [{ id: 'o-a' } as never],
      dividends: [{ id: 'd-a' } as never],
      portfolioSnapshots: [{ date: '2026-11-01', totalValueTHB: 1, totalCostTHB: 1 }],
    })
    useMonthlyExpenseStore.setState({ logs: [{ id: 'l-a' } as never], trackedCategoryIds: ['cat-a'] })

    expect(ensureLocalDataBelongsTo('user-b')).toBe(true)

    expect(useInvestmentStore.getState()).toMatchObject({
      holdings: [],
      orders: [],
      dividends: [],
      portfolioSnapshots: [],
    })
    expect(useMonthlyExpenseStore.getState()).toMatchObject({ logs: [], trackedCategoryIds: [] })
  })

  it("empties the previous owner's recurring rules, bill splits, settings and Workout Plan but keeps Device Preferences", async () => {
    data.set('finance-owner-id', 'user-a')
    const { ensureLocalDataBelongsTo } = await load()
    const { useRecurringStore } = await import('@/store/useRecurringStore')
    const { useBillSplitStore } = await import('@/store/useBillSplitStore')
    const { useSettingsStore } = await import('@/store/useSettingsStore')
    const { useWorkoutPlanStore } = await import('@/store/useWorkoutPlanStore')
    const { useDashboardStore } = await import('@/store/useDashboardStore')
    const { useOnboardingStore } = await import('@/store/useOnboardingStore')

    useRecurringStore.setState({ recurrings: [{ id: 'r-a' } as never] })
    useBillSplitStore.setState({ splits: [{ id: 's-a' } as never] })
    useSettingsStore.getState().setPaydayDate(5)
    useWorkoutPlanStore.getState().setDraft({ activity: 'run', moves: [] })
    useDashboardStore.getState().setVisible('spending-heatmap', false)
    useOnboardingStore.getState().complete()

    expect(ensureLocalDataBelongsTo('user-b')).toBe(true)

    expect(useRecurringStore.getState().recurrings).toEqual([])
    expect(data.get('finance-recurring-rules') ?? '').not.toContain('r-a')
    expect(useBillSplitStore.getState().splits).toEqual([])
    expect(useSettingsStore.getState().paydayDate).toBe(25)
    expect(useWorkoutPlanStore.getState().draft).toBeNull()

    const heatmap = useDashboardStore.getState().widgets.find((w) => w.id === 'spending-heatmap')
    expect(heatmap?.visible).toBe(false)
    expect(useOnboardingStore.getState().completed).toBe(true)
    await useDashboardStore.persist.rehydrate()
    await useOnboardingStore.persist.rehydrate()
    expect(useDashboardStore.getState().widgets.find((w) => w.id === 'spending-heatmap')?.visible).toBe(false)
    expect(useOnboardingStore.getState().completed).toBe(true)
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
