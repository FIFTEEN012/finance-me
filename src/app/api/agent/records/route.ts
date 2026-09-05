import { NextResponse } from "next/server";

import { getDatabase } from "../../../../db/client";
import { isAuthorizedBearerToken } from "../../../../lib/agentIngestion/auth";
import { AgentIngestionRepository } from "../../../../lib/agentIngestion/repository";
import { getDataBackend } from "../../../../lib/dataBackend";
import { agentIngestionRequestSchema } from "../../../../lib/agentIngestion/schema";

const MAX_PAGE_SIZE = 100;
/** Keep database pagination bounded to avoid arbitrarily expensive offsets. */
const MAX_PAGE_OFFSET = 10_000;
const DEFAULT_PAGE_SIZE = 50;

function unavailable() {
  return NextResponse.json({ error: "Local PostgreSQL agent ingestion is disabled" }, { status: 503 });
}

function unauthorized() {
  return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
}

function localConfig() {
  if (getDataBackend() !== "postgres") return undefined;
  const ownerId = process.env.LOCAL_OWNER_ID?.trim();
  if (!ownerId) return undefined;
  return { ownerId, token: process.env.AGENT_INGEST_TOKEN };
}

function paginationValue(value: string | null, fallback: number, minimum: number, maximum?: number) {
  if (value === null || value.trim() === "") return fallback;
  const parsed = Number(value);
  if (!Number.isSafeInteger(parsed)) return fallback;
  const bounded = Math.max(minimum, parsed);
  return maximum === undefined ? bounded : Math.min(maximum, bounded);
}

export async function POST(request: Request) {
  const config = localConfig();
  if (!config) return unavailable();
  if (!isAuthorizedBearerToken(request.headers.get("authorization"), config.token)) return unauthorized();

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }

  const parsed = agentIngestionRequestSchema.safeParse(body);
  if (!parsed.success) return NextResponse.json({ error: "Invalid ingestion payload" }, { status: 400 });

  try {
    const result = await new AgentIngestionRepository(getDatabase()).ingestWithStatus(
      config.ownerId,
      parsed.data,
    );
    return NextResponse.json(
      { status: result.status, kind: result.kind, record: result.record, auditEvent: result.auditEvent },
      { status: result.status === "created" ? 201 : 200 },
    );
  } catch {
    return NextResponse.json({ error: "Unable to store ingestion record" }, { status: 500 });
  }
}

export async function GET(request: Request) {
  const config = localConfig();
  if (!config) return unavailable();
  if (!isAuthorizedBearerToken(request.headers.get("authorization"), config.token)) return unauthorized();

  const url = new URL(request.url);
  const limit = paginationValue(url.searchParams.get("limit"), DEFAULT_PAGE_SIZE, 1, MAX_PAGE_SIZE);
  const offset = paginationValue(url.searchParams.get("offset"), 0, 0, MAX_PAGE_OFFSET);

  try {
    const result = await new AgentIngestionRepository(getDatabase()).list(config.ownerId, { limit, offset });
    return NextResponse.json({ ...result, limit, offset });
  } catch {
    return NextResponse.json({ error: "Unable to read ingestion records" }, { status: 500 });
  }
}
