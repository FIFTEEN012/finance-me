import type { StoreApi } from 'zustand'
import type {
  DividendRecord,
  InvestmentHolding,
  InvestmentOrder,
  MonthlyExpenseLog,
  PortfolioSnapshot,
} from '@/types'
import { arrayKind } from './kinds'
import type { RecordData, SyncKindAdapter } from './engine'

type PortfolioState = {
  holdings: InvestmentHolding[]
  orders: InvestmentOrder[]
  dividends: DividendRecord[]
  portfolioSnapshots: PortfolioSnapshot[]
}

type MonthlyExpenseState = {
  logs: MonthlyExpenseLog[]
  trackedCategoryIds: string[]
}

/**
 * The portfolio's record kinds, bound to a store shaped like `useInvestmentStore`.
 * A Portfolio Snapshot has no id; there is one per day, so its date is its id.
 * Linked orders keep their `transactionId`/`feeTransactionId` as data, so the
 * link to the transaction survives the trip.
 */
export function investmentKinds(store: StoreApi<PortfolioState>): SyncKindAdapter[] {
  return [
    arrayKind({ kind: 'investment-holding', store, field: 'holdings' }),
    arrayKind({ kind: 'investment-order', store, field: 'orders' }),
    arrayKind({ kind: 'dividend', store, field: 'dividends' }),
    keyedListKind<PortfolioState, PortfolioSnapshot>({
      kind: 'portfolio-snapshot',
      store,
      read: (s) => s.portfolioSnapshots,
      write: (portfolioSnapshots) => ({
        portfolioSnapshots: [...portfolioSnapshots].sort((a, b) => a.date.localeCompare(b.date)),
      }),
      idOf: (snapshot) => snapshot.date,
      toData: (snapshot) => snapshot as unknown as RecordData,
      fromData: (data) => data as unknown as PortfolioSnapshot,
    }),
  ]
}

/**
 * The monthly expense log kinds, bound to a store shaped like `useMonthlyExpenseStore`.
 * Each tracked category is its own record (id = category id, data
 * `{ categoryId }`), so tracking on one device and untracking another
 * category on a second device both survive.
 */
export function monthlyExpenseKinds(store: StoreApi<MonthlyExpenseState>): SyncKindAdapter[] {
  return [
    arrayKind({ kind: 'monthly-expense-log', store, field: 'logs' }),
    keyedListKind<MonthlyExpenseState, string>({
      kind: 'monthly-tracked-category',
      store,
      read: (s) => s.trackedCategoryIds,
      write: (trackedCategoryIds) => ({ trackedCategoryIds }),
      idOf: (categoryId) => categoryId,
      toData: (categoryId) => ({ categoryId }),
      fromData: (data) => String(data.categoryId),
    }),
  ]
}

/** Zustand persist exposes `hasHydrated`; a store without persist counts as hydrated. */
function isHydrating(store: unknown): boolean {
  const persist = (store as { persist?: { hasHydrated?: () => boolean } }).persist
  return persist?.hasHydrated?.() === false
}

/**
 * Like `arrayKind`, for a list whose items carry no `id` field: `idOf` names
 * each item and `toData`/`fromData` convert it to and from a record. Local
 * edits are found by diffing the list on every store change.
 */
function keyedListKind<S, T>(opts: {
  kind: string
  store: StoreApi<S>
  read: (state: S) => T[]
  write: (items: T[]) => Partial<S>
  idOf: (item: T) => string
  toData: (item: T) => RecordData
  fromData: (data: RecordData) => T
}): SyncKindAdapter {
  const { kind, store, idOf, toData, fromData } = opts
  const read = (state: S) => opts.read(state) ?? []

  return {
    kind,
    snapshot: () => read(store.getState()).map((item) => ({ id: idOf(item), data: toData(item) })),
    apply(records) {
      store.setState((state) => {
        const items = [...read(state)]
        for (const { id, data } of records) {
          const at = items.findIndex((item) => idOf(item) === id)
          if (data === null) {
            if (at !== -1) items.splice(at, 1)
          } else if (at === -1) {
            items.push(fromData(data))
          } else {
            items[at] = fromData(data)
          }
        }
        return opts.write(items)
      })
    },
    watch(onChange) {
      return store.subscribe((state, prev) => {
        const next = read(state)
        const before = read(prev)
        if (next === before || isHydrating(store)) return
        const prevById = new Map(before.map((item) => [idOf(item), item]))
        const nextIds = new Set<string>()
        for (const item of next) {
          const id = idOf(item)
          nextIds.add(id)
          if (prevById.get(id) !== item) onChange(id, toData(item))
        }
        for (const item of before) if (!nextIds.has(idOf(item))) onChange(idOf(item), null)
      })
    },
  }
}
