import { z } from "zod";

const timestampSchema = z.iso.datetime({ offset: true });

const monetaryStringSchema = (allowZero: boolean) =>
  z
    .string()
    .regex(
      /^(?:0|[1-9]\d{0,15})(?:\.\d{1,2})?$/,
      "Must be a decimal string with at most 16 integer digits and 2 fractional digits",
    )
    .refine(
      (value) => allowZero || !/^0(?:\.0{1,2})?$/.test(value),
      "Must be greater than zero",
    );

const envelopeShape = {
  idempotencyKey: z.string().trim().min(8).max(200),
  source: z.string().trim().min(1).max(100).default("hermes-discord"),
  sourceMessageId: z.string().trim().min(1).max(200),
};

export const transactionRecordSchema = z.strictObject({
  transactionType: z.enum(["INCOME", "EXPENSE", "TRANSFER"]),
  amount: monetaryStringSchema(false),
  currency: z.string().regex(/^[A-Z]{3}$/).default("THB"),
  description: z.string().trim().min(1).max(500),
  occurredAt: timestampSchema,
});

const nonnegativeMealMeasurementSchema = z.number().min(0).max(100_000);

export const mealRecordSchema = z.strictObject({
  mealType: z.enum(["breakfast", "lunch", "dinner", "snack"]),
  food: z.string().trim().min(1).max(500),
  calories: z.number().int().min(0).max(100_000).optional(),
  proteinGrams: nonnegativeMealMeasurementSchema.optional(),
  carbsGrams: nonnegativeMealMeasurementSchema.optional(),
  fatGrams: nonnegativeMealMeasurementSchema.optional(),
  cost: monetaryStringSchema(true).optional(),
  loggedAt: timestampSchema,
});

export const workoutRecordSchema = z
  .strictObject({
    exercise: z.string().trim().min(1).max(500),
    sets: z.number().int().positive().max(1_000).optional(),
    reps: z.number().int().positive().max(100_000).optional(),
    durationMinutes: z.number().int().positive().max(100_000).optional(),
    intensity: z.enum(["easy", "normal", "hard"]).optional(),
    loggedAt: timestampSchema,
  })
  .refine(
    ({ sets, reps, durationMinutes }) =>
      sets !== undefined || reps !== undefined || durationMinutes !== undefined,
    { message: "At least one workout effort measurement is required" },
  );

export const runRecordSchema = z.strictObject({
  distanceKm: z.number().positive().max(1_000),
  durationMinutes: z.number().int().positive().max(100_000),
  runType: z.enum([
    "easy",
    "long",
    "tempo",
    "interval",
    "treadmill",
    "recovery",
  ]),
  intensity: z.enum(["easy", "normal", "hard"]).optional(),
  loggedAt: timestampSchema,
});

export const agentIngestionRequestSchema = z.discriminatedUnion("kind", [
  z.strictObject({
    ...envelopeShape,
    kind: z.literal("transaction"),
    data: transactionRecordSchema,
  }),
  z.strictObject({
    ...envelopeShape,
    kind: z.literal("meal"),
    data: mealRecordSchema,
  }),
  z.strictObject({
    ...envelopeShape,
    kind: z.literal("workout"),
    data: workoutRecordSchema,
  }),
  z.strictObject({
    ...envelopeShape,
    kind: z.literal("run"),
    data: runRecordSchema,
  }),
]);

export type TransactionRecord = z.infer<typeof transactionRecordSchema>;
export type MealRecord = z.infer<typeof mealRecordSchema>;
export type WorkoutRecord = z.infer<typeof workoutRecordSchema>;
export type RunRecord = z.infer<typeof runRecordSchema>;
export type AgentIngestionRecord =
  | TransactionRecord
  | MealRecord
  | WorkoutRecord
  | RunRecord;
export type AgentIngestionRequest = z.infer<typeof agentIngestionRequestSchema>;
