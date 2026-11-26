import { beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("server-only", () => ({}));

const mockDb = {
  select: vi.fn(),
  insert: vi.fn(),
};

vi.mock("@/db/client", () => ({
  getDatabase: vi.fn(() => mockDb),
}));

const mockUser = {
  id: "user-test-1",
  email: "user@example.com",
  name: "Test User",
  emailVerified: false,
  createdAt: new Date(),
  updatedAt: new Date(),
};
vi.mock("@/lib/server-auth", () => ({
  getCurrentUser: vi.fn(async () => mockUser),
}));

import { GET, POST } from "./route";
import { getCurrentUser } from "@/lib/server-auth";
import {
  financeBudgets,
  financeCategories,
  financeDebts,
  financeGoals,
  financeTransactions,
} from "@/db/schema";

describe("/api/sync route", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    process.env.DATABASE_URL = "postgresql://test:test@localhost:5432/test";
    vi.mocked(getCurrentUser).mockResolvedValue(mockUser);
  });

  it("returns 401 when user is not authenticated", async () => {
    vi.mocked(getCurrentUser).mockResolvedValueOnce(null);
    const res = await GET();
    expect(res.status).toBe(401);
  });

  it("pulls all user data on GET", async () => {
    mockDb.select.mockImplementation(() => ({
      from: vi.fn().mockReturnValue({
        where: vi.fn().mockImplementation(() => ({
          orderBy: vi.fn().mockResolvedValue([]),
          then: vi.fn((fn) => Promise.resolve(fn([]))),
        })),
      }),
    }));

    const res = await GET();
    expect(res.status).toBe(200);
    const data = await res.json();
    expect(data).toHaveProperty("transactions");
    expect(data).toHaveProperty("categories");
    expect(data).toHaveProperty("budgets");
    expect(data).toHaveProperty("goals");
    expect(data).toHaveProperty("debts");
    expect(data).toHaveProperty("syncedAt");
  });

  it("returns the Food Category flag on GET, leaving it absent when never set", async () => {
    const rowsByTable = new Map<unknown, unknown[]>([
      [
        financeCategories,
        [
          { id: "cat-expense-1", name: "อาหาร", type: "EXPENSE", icon: "Utensils", color: "#ef4444", isDefault: true, isFood: null },
          { id: "cat-coffee", name: "กาแฟ", type: "EXPENSE", icon: "Coffee", color: "#000", isDefault: false, isFood: true },
          { id: "cat-expense-2", name: "เดินทาง", type: "EXPENSE", icon: "Car", color: "#f97316", isDefault: true, isFood: false },
        ],
      ],
    ]);
    mockDb.select.mockImplementation(() => ({
      from: vi.fn().mockImplementation((table: unknown) => {
        const rows = rowsByTable.get(table) ?? [];
        return {
          where: vi.fn().mockImplementation(() => ({
            orderBy: vi.fn().mockResolvedValue(rows),
            then: (fn: (r: unknown[]) => unknown) => Promise.resolve(fn(rows)),
          })),
        };
      }),
    }));

    const res = await GET();
    const data = await res.json();
    const byId = Object.fromEntries(data.categories.map((c: { id: string }) => [c.id, c]));
    expect(byId["cat-expense-1"]).not.toHaveProperty("isFood");
    expect(byId["cat-coffee"].isFood).toBe(true);
    expect(byId["cat-expense-2"].isFood).toBe(false);
  });

  it("saves the Food Category flag on POST and stores null when absent", async () => {
    const valuesMock = vi.fn();
    const onConflictMock = vi.fn().mockResolvedValue({});
    valuesMock.mockReturnValue({ onConflictDoUpdate: onConflictMock });
    mockDb.insert.mockReturnValue({ values: valuesMock });

    const req = new Request("http://localhost/api/sync", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        categories: [
          { id: "cat-coffee", name: "กาแฟ", type: "EXPENSE", isFood: true },
          { id: "cat-expense-1", name: "อาหาร", type: "EXPENSE", isFood: false },
          { id: "cat-expense-2", name: "เดินทาง", type: "EXPENSE" },
        ],
      }),
    });

    const res = await POST(req);
    expect(res.status).toBe(200);
    expect(valuesMock.mock.calls.map((c) => c[0].isFood)).toEqual([true, false, null]);
    expect(onConflictMock.mock.calls.map((c) => c[0].set.isFood)).toEqual([true, false, null]);
  });

  it("upserts user data on POST", async () => {
    const onConflictMock = vi.fn().mockResolvedValue({});
    mockDb.insert.mockReturnValue({
      values: vi.fn().mockReturnValue({
        onConflictDoUpdate: onConflictMock,
      }),
    });

    const body = {
      transactions: [
        {
          id: "11111111-1111-4111-8111-111111111111",
          type: "EXPENSE",
          amount: 50,
          description: "Snack",
          date: "2026-09-09",
        },
      ],
      categories: [
        {
          id: "cat-1",
          name: "Food",
          type: "EXPENSE",
        },
      ],
    };

    const req = new Request("http://localhost/api/sync", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    });

    const res = await POST(req);
    expect(res.status).toBe(200);
    const data = await res.json();
    expect(data.success).toBe(true);
    expect(data).toHaveProperty("syncedAt");

    // Categories are upserted before transactions; both must conflict on (owner_id, id).
    expect(onConflictMock).toHaveBeenCalledTimes(2);
    const [catArgs, txArgs] = onConflictMock.mock.calls.map((call) => call[0]);
    expect(catArgs.target).toEqual([financeCategories.ownerId, financeCategories.id]);
    expect(txArgs.target).toEqual([financeTransactions.ownerId, financeTransactions.id]);
    expect(catArgs.set).not.toHaveProperty("ownerId");
    expect(txArgs.set).not.toHaveProperty("ownerId");
  });

  it("scopes every upsert to (owner_id, id) and never rewrites ownerId", async () => {
    const onConflictMock = vi.fn().mockResolvedValue({});
    const insertedTables: unknown[] = [];
    mockDb.insert.mockImplementation((table: unknown) => {
      insertedTables.push(table);
      return { values: vi.fn().mockReturnValue({ onConflictDoUpdate: onConflictMock }) };
    });

    const body = {
      categories: [{ id: "cat-1", name: "Food", type: "EXPENSE" }],
      transactions: [
        { id: "11111111-1111-4111-8111-111111111111", type: "EXPENSE", amount: 50, description: "Snack", date: "2026-09-09" },
      ],
      budgets: [{ id: "b-1", categoryId: "cat-1", amount: 100, month: 1, year: 2026 }],
      goals: [{ id: "g-1", name: "Trip", targetAmount: 1000 }],
      debts: [{ id: "d-1", person: "Somchai", originalAmount: 500 }],
    };

    const req = new Request("http://localhost/api/sync", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    });

    const res = await POST(req);
    expect(res.status).toBe(200);
    expect(insertedTables).toEqual([
      financeCategories,
      financeTransactions,
      financeBudgets,
      financeGoals,
      financeDebts,
    ]);
    const args = onConflictMock.mock.calls.map((call) => call[0]);
    expect(args.map((a) => a.target)).toEqual([
      [financeCategories.ownerId, financeCategories.id],
      [financeTransactions.ownerId, financeTransactions.id],
      [financeBudgets.ownerId, financeBudgets.id],
      [financeGoals.ownerId, financeGoals.id],
      [financeDebts.ownerId, financeDebts.id],
    ]);
    for (const a of args) expect(a.set).not.toHaveProperty("ownerId");
  });

  describe("database errors", () => {
    const rawMessage =
      'insert into "finance_categories" ("owner_id") values ($1) -- params: user-test-1: relation does not exist';

    it("GET returns a generic 500 without the raw error and logs it server-side", async () => {
      const consoleError = vi.spyOn(console, "error").mockImplementation(() => {});
      mockDb.select.mockImplementation(() => {
        throw new Error(rawMessage);
      });

      const res = await GET();
      expect(res.status).toBe(500);
      const text = await res.text();
      expect(text).not.toContain(rawMessage);
      expect(text).not.toContain("user-test-1");
      expect(JSON.parse(text).error).toEqual(expect.any(String));
      expect(consoleError).toHaveBeenCalled();
      expect(consoleError.mock.calls.flat()).toContainEqual(expect.objectContaining({ message: rawMessage }));
      consoleError.mockRestore();
    });

    it("POST returns a generic 500 without the raw error and logs it server-side", async () => {
      const consoleError = vi.spyOn(console, "error").mockImplementation(() => {});
      mockDb.insert.mockImplementation(() => {
        throw new Error(rawMessage);
      });

      const req = new Request("http://localhost/api/sync", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ categories: [{ id: "cat-1", name: "Food", type: "EXPENSE" }] }),
      });
      const res = await POST(req);
      expect(res.status).toBe(500);
      const text = await res.text();
      expect(text).not.toContain(rawMessage);
      expect(text).not.toContain("user-test-1");
      expect(JSON.parse(text).error).toEqual(expect.any(String));
      expect(consoleError.mock.calls.flat()).toContainEqual(expect.objectContaining({ message: rawMessage }));
      consoleError.mockRestore();
    });
  });
});
