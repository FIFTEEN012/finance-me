import { beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("server-only", () => ({}));

const mocks = vi.hoisted(() => ({
  ingestWithStatus: vi.fn(),
  list: vi.fn(),
  getDatabase: vi.fn(() => ({})),
}));
const { ingestWithStatus, list, getDatabase } = mocks;

vi.mock("../../../../lib/agentIngestion/repository", () => ({
  AgentIngestionRepository: class {
    ingestWithStatus = mocks.ingestWithStatus;
    list = mocks.list;
  },
}));
vi.mock("../../../../db/client", () => ({ getDatabase: mocks.getDatabase }));

import { GET, POST } from "./route";

const token = "local-agent-secret";
const owner = "local-owner";
const transaction = {
  kind: "transaction",
  idempotencyKey: "message-12345678",
  source: "hermes-discord",
  sourceMessageId: "123",
  data: {
    transactionType: "EXPENSE",
    amount: "125.50",
    currency: "THB",
    description: "Lunch",
    occurredAt: "2026-09-01T10:30:00+07:00",
  },
};
const stored = {
  kind: "transaction",
  record: { id: "record-1", ownerId: owner, description: "Lunch" },
  auditEvent: { id: "audit-1", ownerId: owner, idempotencyKey: transaction.idempotencyKey },
};

function request(body?: unknown, authorization: string | null = `Bearer ${token}`) {
  const headers: HeadersInit = { "content-type": "application/json" };
  if (authorization !== null) headers.authorization = authorization;
  return new Request("http://localhost/api/agent/records", {
    method: "POST",
    headers,
    body: body === undefined ? undefined : JSON.stringify(body),
  });
}

beforeEach(() => {
  vi.clearAllMocks();
  process.env.DATA_BACKEND = "postgres";
  process.env.AGENT_INGEST_TOKEN = token;
  process.env.LOCAL_OWNER_ID = owner;
  ingestWithStatus.mockResolvedValue({ ...stored, status: "created" });
  list.mockResolvedValue({ records: [stored], total: 1 });
});

describe("POST /api/agent/records", () => {
  it("returns 503 and does not authenticate when PostgreSQL mode is disabled", async () => {
    process.env.DATA_BACKEND = "supabase";
    const response = await POST(request(transaction));
    expect(response.status).toBe(503);
    expect(ingestWithStatus).not.toHaveBeenCalled();
  });

  it.each([null, "Basic local-agent-secret", "Bearer wrong-secret"])(
    "returns 401 for missing, malformed, or wrong bearer token (%s)",
    async (authorization) => {
      const response = await POST(request(transaction, authorization));
      expect(response.status).toBe(401);
      expect(ingestWithStatus).not.toHaveBeenCalled();
    },
  );

  it("returns 400 for invalid JSON", async () => {
    const body = new Request("http://localhost/api/agent/records", {
      method: "POST",
      headers: { authorization: `Bearer ${token}` },
      body: "{not-json",
    });
    const response = await POST(body);
    expect(response.status).toBe(400);
    expect(ingestWithStatus).not.toHaveBeenCalled();
  });

  it("returns 400 when the record payload fails validation", async () => {
    const response = await POST(request({ ...transaction, data: { ...transaction.data, amount: "free" } }));
    expect(response.status).toBe(400);
    expect(ingestWithStatus).not.toHaveBeenCalled();
  });

  it("returns the exact stored row with created status", async () => {
    const response = await POST(request(transaction));
    expect(response.status).toBe(201);
    expect(await response.json()).toEqual({ status: "created", ...stored });
    expect(ingestWithStatus).toHaveBeenCalledWith(owner, transaction);
  });

  it("returns the exact stored row with deduplicated status", async () => {
    ingestWithStatus.mockResolvedValueOnce({ ...stored, status: "deduplicated" });
    const response = await POST(request(transaction));
    expect(response.status).toBe(200);
    expect(await response.json()).toEqual({ status: "deduplicated", ...stored });
  });
});

describe("GET /api/agent/records", () => {
  it("applies the same backend guard and authentication", async () => {
    process.env.DATA_BACKEND = "supabase";
    expect((await GET(new Request("http://localhost/api/agent/records"))).status).toBe(503);
    process.env.DATA_BACKEND = "postgres";
    expect((await GET(new Request("http://localhost/api/agent/records"))).status).toBe(401);
    expect(list).not.toHaveBeenCalled();
  });

  it("returns owner-scoped records with bounded pagination", async () => {
    const response = await GET(
      new Request("http://localhost/api/agent/records?limit=999&offset=-4", {
        headers: { authorization: `Bearer ${token}` },
      }),
    );
    expect(response.status).toBe(200);
    expect(await response.json()).toEqual({ records: [stored], total: 1, limit: 100, offset: 0 });
    expect(list).toHaveBeenCalledWith(owner, { limit: 100, offset: 0 });
  });

  it("supports valid pagination values", async () => {
    const response = await GET(
      new Request("http://localhost/api/agent/records?limit=10&offset=20", {
        headers: { authorization: `Bearer ${token}` },
      }),
    );
    expect(response.status).toBe(200);
    expect(list).toHaveBeenCalledWith(owner, { limit: 10, offset: 20 });
  });

  it("caps large offsets to the documented maximum", async () => {
    const response = await GET(
      new Request("http://localhost/api/agent/records?offset=999999999", {
        headers: { authorization: `Bearer ${token}` },
      }),
    );

    expect(response.status).toBe(200);
    expect(await response.json()).toMatchObject({ limit: 50, offset: 10_000 });
    expect(list).toHaveBeenCalledWith(owner, { limit: 50, offset: 10_000 });
  });
});
