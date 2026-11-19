import { NextResponse } from "next/server";
import { z } from "zod";
import { and, eq, inArray, lt, sql } from "drizzle-orm";
import { getCurrentUser } from "@/lib/server-auth";
import { getDatabase } from "@/db/client";
import { financeStoreDocs } from "@/db/schema";
import { DOC_STORE_KEYS, type StoreDoc } from "@/lib/storeDocs";

export const dynamic = "force-dynamic";

/** Request body cap. Personal finance stores are small; this blocks abuse. */
const MAX_BODY_BYTES = 4 * 1024 * 1024;
const MAX_DOC_BYTES = 256 * 1024;
const MAX_CHANGES = 2000;
/** Client clocks may run ahead; a far-future edit time would win forever. */
const MAX_CLOCK_SKEW_MS = 5 * 60 * 1000;

const changeSchema = z.object({
  storeKey: z.enum(DOC_STORE_KEYS),
  docId: z.string().min(1).max(300),
  data: z.unknown(),
  deleted: z.boolean(),
  updatedAt: z.iso.datetime({ offset: true }),
});

const pushSchema = z.object({
  changes: z.array(changeSchema).max(MAX_CHANGES),
});

function unavailable() {
  return NextResponse.json({ error: "Database not configured" }, { status: 503 });
}

/**
 * GET /api/sync/docs
 * Every synced store document of the signed-in user, tombstones included.
 */
export async function GET() {
  if (!process.env.DATABASE_URL?.trim()) return unavailable();
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  try {
    const db = getDatabase();
    const rows = await db
      .select()
      .from(financeStoreDocs)
      .where(
        and(
          eq(financeStoreDocs.ownerId, user.id),
          inArray(financeStoreDocs.storeKey, [...DOC_STORE_KEYS]),
        ),
      );

    const docs: StoreDoc[] = rows.map((row) => ({
      storeKey: row.storeKey,
      docId: row.docId,
      data: row.deleted ? null : row.data,
      deleted: row.deleted,
      updatedAt: row.updatedAt.toISOString(),
    }));
    return NextResponse.json({ docs, serverTime: new Date().toISOString() });
  } catch (error) {
    console.error("[sync/docs] GET failed", error);
    return NextResponse.json({ error: "Failed to fetch documents" }, { status: 500 });
  }
}

/**
 * POST /api/sync/docs  { changes: StoreDoc[] }
 * Upserts documents with last-write-wins on `updatedAt`: a change older than
 * (or as old as) the stored copy is ignored. Returns how many were applied.
 */
export async function POST(request: Request) {
  if (!process.env.DATABASE_URL?.trim()) return unavailable();
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const text = await request.text();
  if (text.length > MAX_BODY_BYTES) {
    return NextResponse.json({ error: "Payload too large" }, { status: 413 });
  }
  let body: unknown;
  try {
    body = JSON.parse(text);
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }
  const parsed = pushSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: "Invalid sync payload" }, { status: 400 });
  }

  const now = Date.now();
  const rows = [];
  for (const change of parsed.data.changes) {
    const data = change.deleted ? null : (change.data ?? null);
    if (!change.deleted && JSON.stringify(data).length > MAX_DOC_BYTES) {
      return NextResponse.json({ error: `Document too large: ${change.docId}` }, { status: 413 });
    }
    const clientTime = Date.parse(change.updatedAt);
    rows.push({
      ownerId: user.id,
      storeKey: change.storeKey,
      docId: change.docId,
      data,
      deleted: change.deleted,
      updatedAt: new Date(Math.min(clientTime, now + MAX_CLOCK_SKEW_MS)),
    });
  }

  // Same (storeKey, docId) twice in one request: keep the newest.
  const byKey = new Map<string, (typeof rows)[number]>();
  for (const row of rows) {
    const key = `${row.storeKey}\u0000${row.docId}`;
    const prev = byKey.get(key);
    if (!prev || prev.updatedAt <= row.updatedAt) byKey.set(key, row);
  }
  const unique = [...byKey.values()];
  if (unique.length === 0) {
    return NextResponse.json({ applied: 0, serverTime: new Date(now).toISOString() });
  }

  try {
    const db = getDatabase();
    let applied = 0;
    // Chunk to stay well under Postgres' bind-parameter limit.
    for (let i = 0; i < unique.length; i += 500) {
      const chunk = unique.slice(i, i + 500);
      const result = await db
        .insert(financeStoreDocs)
        .values(chunk)
        .onConflictDoUpdate({
          target: [financeStoreDocs.ownerId, financeStoreDocs.storeKey, financeStoreDocs.docId],
          set: {
            data: sql`excluded.data`,
            deleted: sql`excluded.deleted`,
            updatedAt: sql`excluded.updated_at`,
            serverUpdatedAt: sql`now()`,
          },
          // Last write wins; the row's owner is already fixed by the target.
          setWhere: lt(financeStoreDocs.updatedAt, sql`excluded.updated_at`),
        })
        .returning({ docId: financeStoreDocs.docId });
      applied += result.length;
    }
    return NextResponse.json({ applied, serverTime: new Date().toISOString() });
  } catch (error) {
    console.error("[sync/docs] POST failed", error);
    return NextResponse.json({ error: "Sync failed" }, { status: 500 });
  }
}
