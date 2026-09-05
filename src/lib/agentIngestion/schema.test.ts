import { describe, expect, it } from "vitest";

import { agentIngestionRequestSchema } from "./schema";

const envelope = {
  idempotencyKey: "message-123",
  sourceMessageId: "123",
};

const timestamp = "2026-09-01T10:30:00+07:00";

describe("agent ingestion request schema", () => {
  it("parses a transaction and applies envelope and currency defaults", () => {
    const result = agentIngestionRequestSchema.parse({
      ...envelope,
      kind: "transaction",
      data: {
        transactionType: "EXPENSE",
        amount: "125.50",
        description: "Lunch",
        occurredAt: timestamp,
      },
    });

    expect(result).toEqual({
      ...envelope,
      kind: "transaction",
      source: "hermes-discord",
      data: {
        transactionType: "EXPENSE",
        amount: "125.50",
        currency: "THB",
        description: "Lunch",
        occurredAt: timestamp,
      },
    });
  });

  it("parses a meal with optional nutrition and cost fields", () => {
    const input = {
      ...envelope,
      kind: "meal",
      data: {
        mealType: "lunch",
        food: "Chicken rice",
        calories: 650,
        proteinGrams: 35.5,
        carbsGrams: 80,
        fatGrams: 18,
        cost: "75.00",
        loggedAt: timestamp,
      },
    };

    expect(agentIngestionRequestSchema.parse(input)).toEqual({
      ...input,
      source: "hermes-discord",
    });
  });

  it("parses a workout containing one or more effort measurements", () => {
    const input = {
      ...envelope,
      kind: "workout",
      data: {
        exercise: "Push-ups",
        sets: 3,
        reps: 12,
        durationMinutes: 15,
        intensity: "hard",
        loggedAt: timestamp,
      },
    };

    expect(agentIngestionRequestSchema.parse(input)).toEqual({
      ...input,
      source: "hermes-discord",
    });
  });

  it("parses a run", () => {
    const input = {
      ...envelope,
      kind: "run",
      data: {
        distanceKm: 10.25,
        durationMinutes: 61,
        runType: "long",
        intensity: "normal",
        loggedAt: timestamp,
      },
    };

    expect(agentIngestionRequestSchema.parse(input)).toEqual({
      ...input,
      source: "hermes-discord",
    });
  });

  it("trims envelope and record text fields", () => {
    const result = agentIngestionRequestSchema.parse({
      kind: "transaction",
      idempotencyKey: "  message-123  ",
      source: "  discord-bot  ",
      sourceMessageId: "  123  ",
      data: {
        transactionType: "INCOME",
        amount: "100.00",
        currency: "USD",
        description: "  Salary  ",
        occurredAt: timestamp,
      },
    });

    expect(result).toMatchObject({
      idempotencyKey: "message-123",
      source: "discord-bot",
      sourceMessageId: "123",
      data: { description: "Salary" },
    });
  });

  it.each([
    ["idempotencyKey", "short"],
    ["idempotencyKey", "x".repeat(201)],
    ["source", "   "],
    ["source", "x".repeat(101)],
    ["sourceMessageId", "   "],
    ["sourceMessageId", "x".repeat(201)],
  ])("rejects an out-of-range envelope %s", (field, value) => {
    const result = agentIngestionRequestSchema.safeParse({
      ...envelope,
      [field]: value,
      kind: "transaction",
      data: {
        transactionType: "EXPENSE",
        amount: "1.00",
        description: "Valid",
        occurredAt: timestamp,
      },
    });

    expect(result.success).toBe(false);
  });

  it("accepts envelope string length boundaries after trimming", () => {
    const result = agentIngestionRequestSchema.safeParse({
      kind: "transaction",
      idempotencyKey: ` ${"i".repeat(8)} `,
      source: ` ${"s".repeat(100)} `,
      sourceMessageId: ` ${"m".repeat(200)} `,
      data: {
        transactionType: "TRANSFER",
        amount: "1.00",
        description: "Valid",
        occurredAt: timestamp,
      },
    });

    expect(result.success).toBe(true);
  });

  it.each(["0", "-1", "0.001", "1.999", "10000000000000000.00", 1])(
    "rejects invalid transaction amount %s",
    (amount) => {
      const result = agentIngestionRequestSchema.safeParse({
        ...envelope,
        kind: "transaction",
        data: {
          transactionType: "EXPENSE",
          amount,
          description: "Valid",
          occurredAt: timestamp,
        },
      });

      expect(result.success).toBe(false);
    },
  );

  it("accepts the maximum transaction amount", () => {
    const result = agentIngestionRequestSchema.safeParse({
      ...envelope,
      kind: "transaction",
      data: {
        transactionType: "INCOME",
        amount: "9999999999999999.99",
        description: "Valid",
        occurredAt: timestamp,
      },
    });

    expect(result.success).toBe(true);
  });

  it("preserves canonical monetary strings without floating-point conversion", () => {
    const result = agentIngestionRequestSchema.parse({
      ...envelope,
      kind: "transaction",
      data: {
        transactionType: "INCOME",
        amount: "0.01",
        description: "Exact cents",
        occurredAt: timestamp,
      },
    });

    expect(result.data).toMatchObject({ amount: "0.01" });
  });

  it.each(["thb", "US", "USDX"])("rejects invalid currency %s", (currency) => {
    const result = agentIngestionRequestSchema.safeParse({
      ...envelope,
      kind: "transaction",
      data: {
        transactionType: "EXPENSE",
        amount: "1.00",
        currency,
        description: "Valid",
        occurredAt: timestamp,
      },
    });

    expect(result.success).toBe(false);
  });

  it.each(["   ", "x".repeat(501)])(
    "rejects an out-of-range transaction description",
    (description) => {
      const result = agentIngestionRequestSchema.safeParse({
        ...envelope,
        kind: "transaction",
        data: {
          transactionType: "EXPENSE",
          amount: "1.00",
          description,
          occurredAt: timestamp,
        },
      });

      expect(result.success).toBe(false);
    },
  );

  it("rejects transaction datetimes without an offset", () => {
    const result = agentIngestionRequestSchema.safeParse({
      ...envelope,
      kind: "transaction",
      data: {
        transactionType: "EXPENSE",
        amount: "1.00",
        description: "Valid",
        occurredAt: "2026-09-01T10:30:00",
      },
    });

    expect(result.success).toBe(false);
  });

  it("trims meal food", () => {
    const result = agentIngestionRequestSchema.parse({
      ...envelope,
      kind: "meal",
      data: {
        mealType: "snack",
        food: "  Banana  ",
        loggedAt: timestamp,
      },
    });

    expect(result.data).toMatchObject({ food: "Banana" });
  });

  it.each(["   ", "x".repeat(501)])("rejects an out-of-range meal food", (food) => {
    const result = agentIngestionRequestSchema.safeParse({
      ...envelope,
      kind: "meal",
      data: { mealType: "dinner", food, loggedAt: timestamp },
    });

    expect(result.success).toBe(false);
  });

  it.each([-1, 1.5, 100_001])("rejects invalid meal calories %s", (calories) => {
    const result = agentIngestionRequestSchema.safeParse({
      ...envelope,
      kind: "meal",
      data: { mealType: "breakfast", food: "Eggs", calories, loggedAt: timestamp },
    });

    expect(result.success).toBe(false);
  });

  it.each(["proteinGrams", "carbsGrams", "fatGrams"])(
    "rejects invalid meal %s",
    (field) => {
      const base = {
        ...envelope,
        kind: "meal",
        data: {
          mealType: "lunch",
          food: "Rice",
          loggedAt: timestamp,
        },
      };

      expect(
        agentIngestionRequestSchema.safeParse({
          ...base,
          data: { ...base.data, [field]: -1 },
        }).success,
      ).toBe(false);
      expect(
        agentIngestionRequestSchema.safeParse({
          ...base,
          data: { ...base.data, [field]: 100_000.01 },
        }).success,
      ).toBe(false);
    },
  );

  it.each(["-1", "0.001", "1.999", "10000000000000000.00", 75])(
    "rejects invalid meal cost %s",
    (cost) => {
      const result = agentIngestionRequestSchema.safeParse({
        ...envelope,
        kind: "meal",
        data: { mealType: "lunch", food: "Rice", cost, loggedAt: timestamp },
      });

      expect(result.success).toBe(false);
    },
  );

  it("accepts zero and upper meal measurement boundaries", () => {
    const result = agentIngestionRequestSchema.safeParse({
      ...envelope,
      kind: "meal",
      data: {
        mealType: "lunch",
        food: "Rice",
        calories: 100_000,
        proteinGrams: 0,
        carbsGrams: 100_000,
        fatGrams: 0,
        cost: "9999999999999999.99",
        loggedAt: "2026-09-01T03:30:00Z",
      },
    });

    expect(result.success).toBe(true);
  });

  it("trims and bounds workout exercise names", () => {
    const valid = agentIngestionRequestSchema.parse({
      ...envelope,
      kind: "workout",
      data: { exercise: "  Bench press  ", sets: 1, loggedAt: timestamp },
    });

    expect(valid.data).toMatchObject({ exercise: "Bench press" });

    for (const exercise of ["   ", "x".repeat(501)]) {
      expect(
        agentIngestionRequestSchema.safeParse({
          ...envelope,
          kind: "workout",
          data: { exercise, sets: 1, loggedAt: timestamp },
        }).success,
      ).toBe(false);
    }
  });

  it.each([
    ["sets", 0],
    ["sets", 1.5],
    ["sets", 1_001],
    ["reps", 0],
    ["reps", 1.5],
    ["reps", 100_001],
    ["durationMinutes", 0],
    ["durationMinutes", 1.5],
    ["durationMinutes", 100_001],
  ])("rejects invalid workout %s %s", (field, value) => {
    expect(
      agentIngestionRequestSchema.safeParse({
        ...envelope,
        kind: "workout",
        data: { exercise: "Bench press", [field]: value, loggedAt: timestamp },
      }).success,
    ).toBe(false);
  });

  it("requires at least one workout effort measurement", () => {
    expect(
      agentIngestionRequestSchema.safeParse({
        ...envelope,
        kind: "workout",
        data: { exercise: "Stretching", loggedAt: timestamp },
      }).success,
    ).toBe(false);
  });

  it.each([0, -1, Number.NaN, Number.POSITIVE_INFINITY, 1_000.001])(
    "rejects invalid run distance %s",
    (distanceKm) => {
      expect(
        agentIngestionRequestSchema.safeParse({
          ...envelope,
          kind: "run",
          data: {
            distanceKm,
            durationMinutes: 30,
            runType: "easy",
            loggedAt: timestamp,
          },
        }).success,
      ).toBe(false);
    },
  );

  it.each([0, -1, 1.5, 100_001])("rejects invalid run duration %s", (durationMinutes) => {
    expect(
      agentIngestionRequestSchema.safeParse({
        ...envelope,
        kind: "run",
        data: {
          distanceKm: 5,
          durationMinutes,
          runType: "easy",
          loggedAt: timestamp,
        },
      }).success,
    ).toBe(false);
  });

  it("rejects unknown envelope and record fields", () => {
    expect(
      agentIngestionRequestSchema.safeParse({
        ...envelope,
        kind: "transaction",
        unexpected: true,
        data: {
          transactionType: "EXPENSE",
          amount: "1.00",
          description: "Valid",
          occurredAt: timestamp,
        },
      }).success,
    ).toBe(false);

    expect(
      agentIngestionRequestSchema.safeParse({
        ...envelope,
        kind: "run",
        data: {
          distanceKm: 5,
          durationMinutes: 30,
          runType: "easy",
          loggedAt: timestamp,
          unexpected: true,
        },
      }).success,
    ).toBe(false);
  });
});
