import { afterAll, beforeAll, beforeEach, describe, expect, it, vi } from "vitest";

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

import { GET as docsGET, POST as docsPOST } from "@/app/api/sync/docs/route";
import { GET as syncGET, POST as syncPOST } from "@/app/api/sync/route";
import { DELETE as txDELETE } from "@/app/api/transactions/[id]/route";
import { createTestDb, insertUser, integrationDbUrl, type TestDb } from "@/test/pgTestDb";
import type { StoreDoc } from "@/lib/storeDocs";

const A = "user-a";
const B = "user-b";
const TX_ID = "22222222-2222-4222-8222-222222222222";

function post(body: unknown): Request {
  return new Request("http://localhost/api/sync/docs", {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify(body),
  });
}

function doc(partial: Partial<StoreDoc>): StoreDoc {
  return {
    storeKey: "finance-supplies",
    docId: "items#s1",
    data: { id: "s1", name: "สบู่" },
    deleted: false,
    updatedAt: "2026-11-10T10:00:00.000Z",
    ...partial,
  };
}

async function pullDocs(): Promise<StoreDoc[]> {
  const res = await docsGET();
  expect(res.status).toBe(200);
  return (await res.json()).docs;
}

describe.skipIf(!integrationDbUrl())("/api/sync/docs (real Postgres)", () => {
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

  it("stores and returns documents", async () => {
    const res = await docsPOST(post({ changes: [doc({})] }));
    expect(res.status).toBe(200);
    expect((await res.json()).applied).toBe(1);
    expect(await pullDocs()).toEqual([doc({})]);
  });

  it("last write wins: an older edit does not overwrite a newer one", async () => {
    await docsPOST(post({ changes: [doc({ data: { id: "s1", name: "new" }, updatedAt: "2026-11-10T10:05:00.000Z" })] }));
    const res = await docsPOST(post({ changes: [doc({ data: { id: "s1", name: "old" }, updatedAt: "2026-11-10T10:01:00.000Z" })] }));
    expect((await res.json()).applied).toBe(0);
    expect((await pullDocs())[0].data).toEqual({ id: "s1", name: "new" });

    await docsPOST(post({ changes: [doc({ data: { id: "s1", name: "newer" }, updatedAt: "2026-11-10T10:06:00.000Z" })] }));
    expect((await pullDocs())[0].data).toEqual({ id: "s1", name: "newer" });
  });

  it("keeps tombstones so a stale device cannot revive a deleted document", async () => {
    await docsPOST(post({ changes: [doc({})] }));
    await docsPOST(post({ changes: [doc({ deleted: true, data: null, updatedAt: "2026-11-10T11:00:00.000Z" })] }));
    // A device that last saw the item before the delete pushes its old copy.
    await docsPOST(post({ changes: [doc({ updatedAt: "2026-11-10T10:30:00.000Z" })] }));
    const [stored] = await pullDocs();
    expect(stored.deleted).toBe(true);
    expect(stored.data).toBeNull();
  });

  it("clamps far-future client clocks", async () => {
    await docsPOST(post({ changes: [doc({ updatedAt: "2099-01-01T00:00:00.000Z" })] }));
    const [stored] = await pullDocs();
    expect(Date.parse(stored.updatedAt)).toBeLessThan(Date.now() + 10 * 60 * 1000);
  });

  it("isolates users: B neither sees nor overwrites A's documents", async () => {
    await docsPOST(post({ changes: [doc({})] }));
    holder.currentUserId = B;
    expect(await pullDocs()).toEqual([]);
    await docsPOST(post({ changes: [doc({ data: { id: "s1", name: "B" }, updatedAt: "2026-11-10T12:00:00.000Z" })] }));
    holder.currentUserId = A;
    expect((await pullDocs())[0].data).toEqual({ id: "s1", name: "สบู่" });
  });

  it("rejects unknown stores, bad payloads and anonymous callers", async () => {
    expect((await docsPOST(post({ changes: [doc({ storeKey: "deleted:transactions" })] }))).status).toBe(400);
    expect((await docsPOST(post({ changes: [doc({ updatedAt: "yesterday" })] }))).status).toBe(400);
    expect((await docsPOST(new Request("http://localhost", { method: "POST", body: "{" }))).status).toBe(400);
    holder.currentUserId = null;
    expect((await docsGET()).status).toBe(401);
    expect((await docsPOST(post({ changes: [] }))).status).toBe(401);
  });

  it("deleted transactions are reported by GET /api/sync and not re-uploaded by POST", async () => {
    const tx = { id: TX_ID, type: "EXPENSE", amount: 50, description: "ข้าว", date: "2026-11-10", categoryId: "food" };
    await syncPOST(post({ transactions: [tx] }));
    const del = await txDELETE(new Request("http://localhost", { method: "DELETE" }), {
      params: Promise.resolve({ id: TX_ID }),
    });
    expect(del.status).toBe(200);

    // A second device still holding the row uploads it again.
    await syncPOST(post({ transactions: [tx] }));

    const body = await (await syncGET()).json();
    expect(body.transactions).toEqual([]);
    expect(body.deleted.transactions).toEqual([TX_ID]);
    // Typed tombstones are not part of the document stores.
    expect(await pullDocs()).toEqual([]);
  });
});
