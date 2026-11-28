import { EXERCISES, FALLBACK_WEIGHT_KG, estimateBurn, exerciseLabel } from "../fitness";
import type { ExerciseEntry, FoodEntry } from "../../types";
import type { MealRecord, RunRecord, WorkoutRecord } from "./schema";

/**
 * How the bot's meal, workout and run messages become the app's own records
 * (ADR-0003 `user_records`): a meal is a `food-entry`, a workout or a run is a
 * `workout-session`. Migration 0008 does the same mapping in SQL for rows the
 * bot wrote to meal_logs / workout_logs / running_logs before; keep them alike.
 */

/** Users are in Thailand (UTC+7, no daylight saving); app dates are local. */
const BANGKOK_OFFSET_MS = 7 * 60 * 60 * 1000;

/** The Bangkok calendar date (`YYYY-MM-DD`) of an instant. */
export function bangkokDate(instant: string | Date): string {
  return new Date(new Date(instant).getTime() + BANGKOK_OFFSET_MS).toISOString().slice(0, 10);
}

/**
 * The Session Type the bot's free-text exercise names: an EXERCISES key or
 * its Thai label, ignoring case and surrounding space; anything else is
 * 'other'.
 */
export function activityForExercise(exercise: string): string {
  const text = exercise.trim().toLowerCase();
  const match = EXERCISES.find((e) => e.value === text || e.label.toLowerCase() === text);
  return match?.value ?? "other";
}

type RecordMeta = { id: string; createdAt: string };

export function foodEntryFromMeal(meal: MealRecord, meta: RecordMeta): FoodEntry {
  return {
    id: meta.id,
    date: bangkokDate(meal.loggedAt),
    meal: meal.mealType,
    name: meal.food,
    kcal: meal.calories ?? 0,
    ...(meal.proteinGrams !== undefined && { proteinG: meal.proteinGrams }),
    ...(meal.carbsGrams !== undefined && { carbsG: meal.carbsGrams }),
    ...(meal.fatGrams !== undefined && { fatG: meal.fatGrams }),
    createdAt: meta.createdAt,
  };
}

/**
 * A Workout Session from a workout or run message. Minutes are the message's
 * duration (0 for a sets/reps-only workout); burn is estimated from the
 * Session Type like the app does (0 for 'other'), with the user's profile
 * weight or the app's fallback weight.
 */
export function workoutSessionFrom(
  message: { kind: "workout"; data: WorkoutRecord } | { kind: "run"; data: RunRecord },
  meta: RecordMeta & { weightKg?: number },
): ExerciseEntry {
  const activity = message.kind === "run" ? "run" : activityForExercise(message.data.exercise);
  const minutes = message.data.durationMinutes ?? 0;
  const name =
    activity === "other" && message.kind === "workout" ? message.data.exercise : exerciseLabel(activity);
  return {
    id: meta.id,
    date: bangkokDate(message.data.loggedAt),
    activity,
    name,
    minutes,
    kcal: estimateBurn(activity, minutes, meta.weightKg ?? FALLBACK_WEIGHT_KG),
    createdAt: meta.createdAt,
  };
}

/** The profile weight in a `health-profile` record's data, if it has one. */
export function weightFromHealthProfile(data: unknown): number | undefined {
  const weight = (data as { profile?: { weightKg?: unknown } } | null)?.profile?.weightKg;
  return typeof weight === "number" && weight > 0 ? weight : undefined;
}
