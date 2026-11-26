import { useSupplyStore } from '@/store/useSupplyStore'
import { arrayKind } from './kinds'
import { useInvestmentStore } from '@/store/useInvestmentStore'
import { useMonthlyExpenseStore } from '@/store/useMonthlyExpenseStore'
import { investmentKinds, monthlyExpenseKinds } from './investmentKinds'
import type { SyncKindAdapter } from './engine'

/**
 * The record kinds this app syncs through the engine, each bound to the store
 * that holds it. Adding a kind = list it in `RECORD_KINDS` (contract.ts) and
 * add its adapter here; the store's actions need no sync code.
 */
export const APP_SYNC_KINDS: SyncKindAdapter[] = [
  arrayKind({ kind: 'supply', store: useSupplyStore, field: 'items' }),
  ...investmentKinds(useInvestmentStore),
  ...monthlyExpenseKinds(useMonthlyExpenseStore),
]
