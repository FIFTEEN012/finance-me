import { afterAll, beforeAll, beforeEach, describe, expect, it, vi } from "vitest";
import { and, eq } from "drizzle-orm";

vi.mock("server-only", () => ({}));

const holder = vi.hoisted(() => ({
  db: undefined as unknown,
  currentUserId: "user-a" as string | null,
}));

vi.mock("@/db/client", () => ({
  getDatabase: () => holder.db,
}));

vi.mock("@/lib/server-auth", () => ({
  getCurrentUser: async () =>
    holder.currentUserId
      ? {
          id: holder.currentUserId,
          email: `${holder.currentUserId}@example.test`,
          name: holder.currentUserId,
          emailVerified: false,
          createdAt: new Date(),
          updatedAt: new Date(),
        }
      : null,
}));

import {
  financeBudgets,
  financeCategories,
  financeDebts,
  financeGoals,
  financeTransactions,
} from "@/db/schema";
import { defaultCategories } from "@/lib/defaultCategories";
import { GET as syncGET, POST as syncPOST } from "@/app/api/sync/route";
import { POST as importLocalPOST } from "@/app/api/migrate/import-local/route";
import { createTestDb, insertUser, integrationDbUrl, type TestDb } from "@/test/pgTestDb";

const A = "user-a";
const B = "user-b";
const SHARED_UUID = "11111111-1111-4111-8111-111111111111";

function jsonRequest(body: unknown): Request {
  return new Request("http://localhost/api", {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify(body),
  });
}

describe.skipIf(!integrationDbUrl())("multi-user isolation (real Postgres)", () => {
  let t: TestDb;

  beforeAll(() => {
    process.env.DATABASE_URL = integrationDbUrl();
  });

  beforeEach(async () => {
    if (t) await t.close();
    t = await createTestDb();
    holder.db = t.db;
    holder.currentUserId = A;
    await insertUser(t.db, A);
    await insertUser(t.db, B);
  });

  afterAll(async () => {
    if (t) await t.close();
  });

  const common = { icon: "Folder", color: "#000000" };
  const cases: Array<{
    name: string;
    insert: (owner: string, id: string) => Promise<unknown>;
    count: (owner: string, id: string) => Promise<number>;
    id: string;
  }> = [
    {
      name: "categories",
      id: "cat-shared-1",
      insert: (owner, id) =>
        t.db.insert(financeCategories).values({ id, ownerId: owner, name: `n-${owner}`, type: "EXPENSE", ...common }),
      count: async (owner, id) =>
        (await t.db.select().from(financeCategories).where(and(eq(financeCategories.id, id), eq(financeCategories.ownerId, owner)))).length,
    },
    {
      name: "budgets",
      id: "budget-shared-1",
      insert: (owner, id) =>
        t.db.insert(financeBudgets).values({ id, ownerId: owner, categoryId: "c", amount: "100", month: 1, year: 2026 }),
      count: async (owner, id) =>
        (await t.db.select().from(financeBudgets).where(and(eq(financeBudgets.id, id), eq(financeBudgets.ownerId, owner)))).length,
    },
    {
      name: "goals",
      id: "goal-shared-1",
      insert: (owner, id) =>
        t.db.insert(financeGoals).values({ id, ownerId: owner, name: `g-${owner}`, targetAmount: "100", targetDate: "2026-12-31", ...common }),
      count: async (owner, id) =>
        (await t.db.select().from(financeGoals).where(and(eq(financeGoals.id, id), eq(financeGoals.ownerId, owner)))).length,
    },
    {
      name: "debts",
      id: "debt-shared-1",
      insert: (owner, id) =>
        t.db.insert(financeDebts).values({ id, ownerId: owner, person: `p-${owner}`, type: "I_OWE", originalAmount: "100", remainingAmount: "100" }),
      count: async (owner, id) =>
        (await t.db.select().from(financeDebts).where(and(eq(financeDebts.id, id), eq(financeDebts.ownerId, owner)))).length,
    },
    {
      name: "transactions",
      id: SHARED_UUID,
      insert: (owner, id) =>
        t.db.insert(financeTransactions).values({
          id,
          ownerId: owner,
          source: "test",
          sourceMessageId: "m",
          transactionType: "EXPENSE",
          amount: "10",
          description: `d-${owner}`,
        }),
      count: async (owner, id) =>
        (await t.db.select().from(financeTransactions).where(and(eq(financeTransactions.id, id), eq(financeTransactions.ownerId, owner)))).length,
    },
  ];

  it.each(cases.map((c) => [c.name, c] as const))(
    "two owners can hold the same id in %s",
    async (_name, c) => {
      await c.insert(A, c.id);
      await c.insert(B, c.id);
      expect(await c.count(A, c.id)).toBe(1);
      expect(await c.count(B, c.id)).toBe(1);
    },
  );

  it("sync POST by B with A's default category ids leaves A's rows unchanged", async () => {
    await t.db.insert(financeCategories).values({
      id: "cat-expense-1", ownerId: A, name: "อาหาร", type: "EXPENSE", ...common,
    });

    holder.currentUserId = B;
    const post = await syncPOST(
      jsonRequest({ categories: [{ id: "cat-expense-1", name: "ของ B", type: "EXPENSE" }] }),
    );
    expect(post.status).toBe(200);

    const [aRow] = await t.db
      .select()
      .from(financeCategories)
      .where(and(eq(financeCategories.id, "cat-expense-1"), eq(financeCategories.ownerId, A)));
    expect(aRow?.name).toBe("อาหาร");

    const res = await syncGET();
    const data = await res.json();
    const bCat = (data.categories as { id: string; name: string }[]).find((c) => c.id === "cat-expense-1");
    expect(bCat?.name).toBe("ของ B");
  });

  it("import-local by B stores all 14 default categories", async () => {
    expect(defaultCategories).toHaveLength(14);
    for (const c of defaultCategories) {
      await t.db.insert(financeCategories).values({
        id: c.id, ownerId: A, name: c.name, type: c.type, icon: c.icon, color: c.color, isDefault: true,
      });
    }

    holder.currentUserId = B;
    const res = await importLocalPOST(jsonRequest({ categories: defaultCategories }));
    expect(res.status).toBe(200);

    const bRows = await t.db.select().from(financeCategories).where(eq(financeCategories.ownerId, B));
    expect(bRows).toHaveLength(14);
    const aRows = await t.db.select().from(financeCategories).where(eq(financeCategories.ownerId, A));
    expect(aRows).toHaveLength(14);
    expect(aRows.map((r) => r.name).sort()).toEqual(defaultCategories.map((c) => c.name).sort());
  });

  it("ignores an ownerId supplied in the body", async () => {
    holder.currentUserId = B;
    const res = await syncPOST(
      jsonRequest({ categories: [{ id: "cat-body-owner", name: "x", type: "EXPENSE", ownerId: A }] }),
    );
    expect(res.status).toBe(200);

    const rows = await t.db
      .select()
      .from(financeCategories)
      .where(eq(financeCategories.id, "cat-body-owner"));
    expect(rows).toHaveLength(1);
    expect(rows[0].ownerId).toBe(B);
  });
});
