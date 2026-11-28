import { NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/server-auth";
import { getDatabase } from "@/db/client";
import { InvalidPageToken, pullRecords, pushChanges } from "@/lib/sync/serverRecords";
import {
  MAX_CHANGE_DATA_BYTES,
  MAX_PUSH_BODY_BYTES,
  jsonBytes,
  pullQuerySchema,
  pushRequestSchema,
} from "@/lib/sync/contract";

export const dynamic = "force-dynamic";

// Generic on purpose: no database or validation details reach the client.
const INVALID = { error: "คำขอซิงก์ไม่ถูกต้อง" };
const FAILED = { error: "ซิงก์ข้อมูลไม่สำเร็จ ลองใหม่อีกครั้ง" };
const TOO_LARGE = { error: "ข้อมูลที่ซิงก์ใหญ่เกินไป" };

/** The body as text, or null once it passes `max` bytes (the rest is not read). */
async function readBodyUpTo(request: Request, max: number): Promise<string | null> {
  const declared = Number(request.headers.get("content-length"));
  if (Number.isFinite(declared) && declared > max) return null;
  if (!request.body) return "";
  const reader = request.body.getReader();
  const chunks: Uint8Array[] = [];
  let size = 0;
  for (;;) {
    const { done, value } = await reader.read();
    if (done) break;
    size += value.byteLength;
    if (size > max) {
      await reader.cancel();
      return null;
    }
    chunks.push(value);
  }
  return Buffer.concat(chunks).toString("utf8");
}

/**
 * GET /api/sync/changes?since=<cursor>[&limit=<n>] (then ?page=<next>)
 * The caller's User Data records changed after the cursor (all without one),
 * tombstones included, a page at a time, plus the next cursor. See
 * `src/lib/sync/contract.ts`.
 */
export async function GET(request: Request) {
  if (!process.env.DATABASE_URL?.trim()) {
    return NextResponse.json({ error: "Database not configured" }, { status: 503 });
  }
  const user = await getCurrentUser();
  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const params = new URL(request.url).searchParams;
  const query = pullQuerySchema.safeParse({
    since: params.get("since") ?? undefined,
    page: params.get("page") ?? undefined,
    limit: params.get("limit") ?? undefined,
  });
  if (!query.success) {
    return NextResponse.json(INVALID, { status: 400 });
  }

  try {
    return NextResponse.json(await pullRecords(getDatabase(), user.id, query.data));
  } catch (error) {
    if (error instanceof InvalidPageToken) {
      return NextResponse.json(INVALID, { status: 400 });
    }
    console.error("Sync pull failed:", error);
    return NextResponse.json(FAILED, { status: 500 });
  }
}

/**
 * POST /api/sync/changes  { changes: [{ kind, id, editedAt, data | null }] }
 * Last edit wins per record; answers accepted/rejected per change. Too
 * large a body or record: 413.
 */
export async function POST(request: Request) {
  if (!process.env.DATABASE_URL?.trim()) {
    return NextResponse.json({ error: "Database not configured" }, { status: 503 });
  }
  const user = await getCurrentUser();
  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  let body: unknown;
  try {
    const text = await readBodyUpTo(request, MAX_PUSH_BODY_BYTES);
    if (text === null) {
      return NextResponse.json(TOO_LARGE, { status: 413 });
    }
    body = JSON.parse(text);
  } catch {
    return NextResponse.json(INVALID, { status: 400 });
  }
  const parsed = pushRequestSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(INVALID, { status: 400 });
  }
  if (parsed.data.changes.some((c) => c.data !== null && jsonBytes(c.data) > MAX_CHANGE_DATA_BYTES)) {
    return NextResponse.json(TOO_LARGE, { status: 413 });
  }

  try {
    return NextResponse.json(
      await pushChanges(getDatabase(), user.id, parsed.data.changes, parsed.data.generation),
    );
  } catch (error) {
    console.error("Sync push failed:", error);
    return NextResponse.json(FAILED, { status: 500 });
  }
}
