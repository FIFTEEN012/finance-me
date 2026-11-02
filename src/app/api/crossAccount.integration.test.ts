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
import * as categoriesRoute from "@/app/api/categories/route";
import * as categoryRoute from "@/app/api/categories/[id]/route";
import * as budgetsRoute from "@/app/api/budgets/route";
import * as budgetRoute from "@/app/api/budgets/[id]/route";
import * as goalsRoute from "@/app/api/goals/route";
import * as goalRoute from "@/app/api/goals/[id]/route";
import * as debtsRoute from "@/app/api/debts/route";
import * as debtRoute from "@/app/api/debts/[id]/route";
import * as transactionsRoute from "@/app/api/transactions/route";
import * as transactionRoute from "@/app/api/transactions/[id]/route";
import { GET as syncGET, POST as syncPOST } from "@/app/api/sync/route";
import { createTestDb, insertUser, integrationDbUrl, type TestDb } from "@/test/pgTestDb";

const A = "user-a";
const B = "user-b";

type Ctx = { params: Promise<{ id: string }> };
type Row = Record<string, unknown>;

type Resource = {
  name: string;
  /** Key of the list in the collection GET body, e.g. `categories`. */
  listKey: string;
  /** Key of the single row in POST/PUT bodies, e.g. `category`. */
  itemKey: string;
  notFound: string;
  /** Primary id shared by A and B in the "same id" cases. */
  sharedId: string;
  /** An id nobody owns. */
  missingId: string;
  /** B's own, distinct id for the list case. */
  otherId: string;
  createBody: (id: string, tag: string) => Record<string, unknown>;
  updateBody: Record<string, unknown>;
  collection: { GET: () => Promise<Response>; POST: (req: Request) => Promise<Response> };
  item: {
    PUT: (req: Request, ctx: Ctx) => Promise<Response>;
    DELETE: (req: Request, ctx: Ctx) => Promise<Response>;
  };
  /** Field in the stored row that `createBody` derives from `tag`. */
  tagField: string;
  /** Extra fields for a /api/sync re-upload, and what the stored row must then contain. */
  syncPatch: Record<string, unknown>;
  syncExpect: Record<string, unknown>;
  fetchRow: (owner: string, id: string) => Promise<Row | undefined>;
};

let t: TestDb;

const resources: Resource[] = [
  {
    name: "categories",
    listKey: "categories",
    itemKey: "category",
    notFound: "Category not found",
    sharedId: "cat-expense-1",
    missingId: "cat-does-not-exist",
    otherId: "cat-b-only",
    createBody: (id, tag) => ({ id, name: tag, type: "EXPENSE" }),
    updateBody: { name: "changed by B" },
    syncPatch: {},
    syncExpect: { name: "synced by A" },
    collection: categoriesRoute,
    item: categoryRoute,
    tagField: "name",
    fetchRow: async (owner, id) =>
      (
        await t.db
          .select()
          .from(financeCategories)
          .where(and(eq(financeCategories.ownerId, owner), eq(financeCategories.id, id)))
      )[0],
  },
  {
    name: "budgets",
    listKey: "budgets",
    itemKey: "budget",
    notFound: "Budget not found",
    sharedId: "budget-shared-1",
    missingId: "budget-does-not-exist",
    otherId: "budget-b-only",
    createBody: (id, tag) => ({ id, categoryId: tag, amount: 100, month: 1, year: 2026 }),
    updateBody: { amount: 999 },
    syncPatch: { amount: 250 },
    syncExpect: { amount: "250.00" },
    collection: budgetsRoute,
    item: budgetRoute,
    tagField: "categoryId",
    fetchRow: async (owner, id) =>
      (
        await t.db
          .select()
          .from(financeBudgets)
          .where(and(eq(financeBudgets.ownerId, owner), eq(financeBudgets.id, id)))
      )[0],
  },
  {
    name: "goals",
    listKey: "goals",
    itemKey: "goal",
    notFound: "Goal not found",
    sharedId: "goal-shared-1",
    missingId: "goal-does-not-exist",
    otherId: "goal-b-only",
    createBody: (id, tag) => ({ id, name: tag, targetAmount: 100 }),
    updateBody: { name: "changed by B" },
    syncPatch: {},
    syncExpect: { name: "synced by A" },
    collection: goalsRoute,
    item: goalRoute,
    tagField: "name",
    fetchRow: async (owner, id) =>
      (
        await t.db
          .select()
          .from(financeGoals)
          .where(and(eq(financeGoals.ownerId, owner), eq(financeGoals.id, id)))
      )[0],
  },
  {
    name: "debts",
    listKey: "debts",
    itemKey: "debt",
    notFound: "Debt not found",
    sharedId: "debt-shared-1",
    missingId: "debt-does-not-exist",
    otherId: "debt-b-only",
    createBody: (id, tag) => ({ id, person: tag, originalAmount: 100 }),
    updateBody: { person: "changed by B" },
    syncPatch: {},
    syncExpect: { person: "synced by A" },
    collection: debtsRoute,
    item: debtRoute,
    tagField: "person",
    fetchRow: async (owner, id) =>
      (
        await t.db
          .select()
          .from(financeDebts)
          .where(and(eq(financeDebts.ownerId, owner), eq(financeDebts.id, id)))
      )[0],
  },
  {
    name: "transactions",
    listKey: "transactions",
    itemKey: "transaction",
    notFound: "Transaction not found",
    sharedId: "11111111-1111-4111-8111-111111111111",
    missingId: "99999999-9999-4999-8999-999999999999",
    otherId: "33333333-3333-4333-8333-333333333333",
    createBody: (id, tag) => ({
      id,
      type: "EXPENSE",
      amount: 10,
      description: tag,
      categoryId: "cat-expense-1",
      date: "2026-01-15",
    }),
    updateBody: { description: "changed by B" },
    syncPatch: {},
    syncExpect: { description: "synced by A" },
    collection: transactionsRoute,
    item: transactionRoute,
    tagField: "description",
    fetchRow: async (owner, id) =>
      (
        await t.db
          .select()
          .from(financeTransactions)
          .where(and(eq(financeTransactions.ownerId, owner), eq(financeTransactions.id, id)))
      )[0],
  },
];

function jsonRequest(method: string, body?: unknown): Request {
  return new Request("http://localhost/api", {
    method,
    headers: { "content-type": "application/json" },
    body: body === undefined ? undefined : JSON.stringify(body),
  });
}

function ctx(id: string): Ctx {
  return { params: Promise.resolve({ id }) };
}

async function createAs(owner: string, r: Resource, id: string, tag: string): Promise<Response> {
  holder.currentUserId = owner;
  return r.collection.POST(jsonRequest("POST", r.createBody(id, tag)));
}

describe.skipIf(!integrationDbUrl())("cross-account access through the API routes (real Postgres)", () => {
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

  const table = resources.map((r) => [r.name, r] as const);

  it.each(table)("%s: B cannot update A's row", async (_name, r) => {
    expect((await createAs(A, r, r.sharedId, "owned by A")).status).toBe(201);
    const before = await r.fetchRow(A, r.sharedId);
    expect(before).toBeDefined();

    holder.currentUserId = B;
    const res = await r.item.PUT(jsonRequest("PUT", r.updateBody), ctx(r.sharedId));
    expect(res.status).toBe(404);
    expect(await res.json()).toEqual({ error: r.notFound });

    expect(await r.fetchRow(A, r.sharedId)).toEqual(before);
    expect(await r.fetchRow(B, r.sharedId)).toBeUndefined();
  });

  it.each(table)("%s: B cannot delete A's row", async (_name, r) => {
    expect((await createAs(A, r, r.sharedId, "owned by A")).status).toBe(201);
    const before = await r.fetchRow(A, r.sharedId);

    holder.currentUserId = B;
    const res = await r.item.DELETE(jsonRequest("DELETE"), ctx(r.sharedId));
    const missing = await r.item.DELETE(jsonRequest("DELETE"), ctx(r.missingId));
    expect(res.status).toBe(404);
    expect(missing.status).toBe(404);
    const body = await res.json();
    expect(body).toEqual({ error: r.notFound });
    expect(body).toEqual(await missing.json());

    expect(await r.fetchRow(A, r.sharedId)).toEqual(before);
  });

  it.each(table)("%s: list returns only the caller's rows", async (_name, r) => {
    expect((await createAs(A, r, r.sharedId, "owned by A")).status).toBe(201);
    expect((await createAs(B, r, r.otherId, "owned by B")).status).toBe(201);

    holder.currentUserId = B;
    const res = await r.collection.GET();
    expect(res.status).toBe(200);
    const rows = (await res.json())[r.listKey] as Row[];
    expect(rows.map((row) => row.id)).toEqual([r.otherId]);
    expect(rows.every((row) => row.ownerId === B)).toBe(true);
  });

  it.each(table)("%s: B can create a row with A's id", async (_name, r) => {
    expect((await createAs(A, r, r.sharedId, "owned by A")).status).toBe(201);
    const before = await r.fetchRow(A, r.sharedId);

    const res = await createAs(B, r, r.sharedId, "owned by B");
    expect(res.status).toBe(201);
    const created = (await res.json())[r.itemKey] as Row;
    expect(created.id).toBe(r.sharedId);
    expect(created.ownerId).toBe(B);
    expect(created[r.tagField]).toBe("owned by B");

    expect(await r.fetchRow(A, r.sharedId)).toEqual(before);
    expect((await r.fetchRow(B, r.sharedId))?.[r.tagField]).toBe("owned by B");
  });

  it.each(table)("%s: sync POST by B with A's id leaves A's row unchanged", async (_name, r) => {
    expect((await createAs(A, r, r.sharedId, "owned by A")).status).toBe(201);
    const before = await r.fetchRow(A, r.sharedId);

    holder.currentUserId = B;
    const res = await syncPOST(jsonRequest("POST", { [r.listKey]: [r.createBody(r.sharedId, "owned by B")] }));
    expect(res.status).toBe(200);

    expect(await r.fetchRow(A, r.sharedId)).toEqual(before);
    expect((await r.fetchRow(B, r.sharedId))?.[r.tagField]).toBe("owned by B");
  });

  it.each(table)("%s: sync POST upserts the caller's own row in place", async (_name, r) => {
    expect((await createAs(A, r, r.sharedId, "owned by A")).status).toBe(201);
    expect((await createAs(B, r, r.sharedId, "owned by B")).status).toBe(201);
    const bBefore = await r.fetchRow(B, r.sharedId);

    holder.currentUserId = A;
    const item = { ...r.createBody(r.sharedId, "synced by A"), ...r.syncPatch };
    const res = await syncPOST(jsonRequest("POST", { [r.listKey]: [item] }));
    expect(res.status).toBe(200);

    expect(await r.fetchRow(A, r.sharedId)).toMatchObject({ ownerId: A, id: r.sharedId, ...r.syncExpect });
    expect(await r.fetchRow(B, r.sharedId)).toEqual(bBefore);
  });

  it("new user gets empty data from GET /api/sync", async () => {
    for (const r of resources) {
      expect((await createAs(A, r, r.sharedId, "owned by A")).status).toBe(201);
    }

    holder.currentUserId = B;
    const res = await syncGET();
    expect(res.status).toBe(200);
    const data = await res.json();
    expect(data).toMatchObject({
      transactions: [],
      categories: [],
      budgets: [],
      goals: [],
      debts: [],
    });
  });
});
