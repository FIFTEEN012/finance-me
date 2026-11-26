import { useSupplyStore } from '@/store/useSupplyStore'
import { useCategoryStore } from '@/store/useCategoryStore'
import { useBudgetStore } from '@/store/useBudgetStore'
import { useGoalStore } from '@/store/useGoalStore'
import { useDebtStore } from '@/store/useDebtStore'
import { useNutritionStore } from '@/store/useNutritionStore'
import { arrayKind } from './kinds'
import { healthProfileKind } from './healthProfileKind'
import { useInvestmentStore } from '@/store/useInvestmentStore'
import { useMonthlyExpenseStore } from '@/store/useMonthlyExpenseStore'
import { investmentKinds, monthlyExpenseKinds } from './investmentKinds'
import { useRecurringStore } from '@/store/useRecurringStore'
import { useBillSplitStore } from '@/store/useBillSplitStore'
import { settingsKind, workoutPlanKind } from './settingsKinds'
import type { SyncKindAdapter } from './engine'

/**
 * The record kinds this app syncs through the engine, each bound to the store
 * that holds it. Adding a kind = list it in `contract.ts` (`SHARED_TABLE_KINDS`
 * or `OWN_TABLE_KINDS`) and add its adapter here; the store's actions need no
 * sync code.
 */
export const APP_SYNC_KINDS: SyncKindAdapter[] = [
  arrayKind({ kind: 'supply', store: useSupplyStore, field: 'items' }),
  arrayKind({ kind: 'category', store: useCategoryStore, field: 'categories' }),
  arrayKind({ kind: 'budget', store: useBudgetStore, field: 'budgets' }),
  arrayKind({ kind: 'goal', store: useGoalStore, field: 'goals' }),
  arrayKind({ kind: 'debt', store: useDebtStore, field: 'debts' }),
  arrayKind({ kind: 'food-entry', store: useNutritionStore, field: 'food' }),
  arrayKind({ kind: 'water-entry', store: useNutritionStore, field: 'water' }),
  arrayKind({ kind: 'workout-session', store: useNutritionStore, field: 'exercise' }),
  healthProfileKind,
  ...investmentKinds(useInvestmentStore),
  ...monthlyExpenseKinds(useMonthlyExpenseStore),
  arrayKind({ kind: 'recurring-rule', store: useRecurringStore, field: 'recurrings' }),
  arrayKind({ kind: 'bill-split', store: useBillSplitStore, field: 'splits' }),
  settingsKind,
  workoutPlanKind,
]
