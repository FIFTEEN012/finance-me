import { useNutritionStore } from '@/store/useNutritionStore'
import { DEFAULT_CALORIE_GOAL, DEFAULT_WATER_GOAL } from '@/lib/nutrition'
import type { HealthProfile } from '@/types'
import { singletonKind } from './kinds'

/** The one `health-profile` record's id: there is a single profile per user. */
export const HEALTH_PROFILE_ID = 'health-profile'

/**
 * The health profile together with the calorie and water goals worked out
 * from it, as one record, so every device shows the same targets. Nothing is
 * uploaded until a profile has been entered.
 */
export const healthProfileKind = singletonKind({
  kind: 'health-profile',
  id: HEALTH_PROFILE_ID,
  store: useNutritionStore,
  fields: ['profile', 'calorieGoal', 'waterGoal'],
  read: ({ profile, calorieGoal, waterGoal }) =>
    profile === null ? null : { profile, calorieGoal, waterGoal },
  write: (data) =>
    data === null
      ? { profile: null, calorieGoal: DEFAULT_CALORIE_GOAL, waterGoal: DEFAULT_WATER_GOAL }
      : {
          profile: data.profile as HealthProfile,
          calorieGoal: Number(data.calorieGoal),
          waterGoal: Number(data.waterGoal),
        },
})
