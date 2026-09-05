import "server-only";

import { and, count, desc, eq } from "drizzle-orm";

import {
  agentIngestionEvents,
  financeTransactions,
  mealLogs,
  runningLogs,
  workoutLogs,
} from "../../db/schema";
import type { AgentIngestionRequest } from "./schema";

/** The small part of the Drizzle database boundary used by this repository. */
export type IngestionDatabase = {
  transaction<T>(callback: (tx: IngestionTransaction) => Promise<T>): Promise<T>;
};

type IngestionTransaction = {
  select(...args: any[]): any;
  insert(table: any): any;
};

type StoredResult = {
  kind: AgentIngestionRequest["kind"];
  record: Record<string, any>;
  auditEvent: Record<string, any>;
};

type IngestionResult = StoredResult & { status: "created" | "deduplicated" };

const domainTables = {
  transaction: financeTransactions,
  meal: mealLogs,
  workout: workoutLogs,
  run: runningLogs,
} as const;

function isUniqueViolation(error: unknown) {
  return (
    typeof error === "object" &&
    error !== null &&
    "code" in error &&
    (error as { code?: unknown }).code === "23505"
  );
}

function domainTableForRecordType(recordType: unknown) {
  if (typeof recordType !== "string" || !Object.hasOwn(domainTables, recordType)) {
    throw new Error(`Unknown ingestion record type: ${String(recordType)}`);
  }
  return domainTables[recordType as AgentIngestionRequest["kind"]];
}

function recordValues(ownerId: string, request: AgentIngestionRequest) {
  const common = {
    ownerId,
    source: request.source,
    sourceMessageId: request.sourceMessageId,
  };

  switch (request.kind) {
    case "transaction":
      return {
        ...common,
        ...request.data,
        occurredAt: new Date(request.data.occurredAt),
      };
    case "meal":
      return { ...common, ...request.data, loggedAt: new Date(request.data.loggedAt) };
    case "workout":
      return { ...common, ...request.data, loggedAt: new Date(request.data.loggedAt) };
    case "run":
      return { ...common, ...request.data, loggedAt: new Date(request.data.loggedAt) };
  }
}

async function findExisting(
  tx: IngestionTransaction,
  ownerId: string,
  idempotencyKey: string,
): Promise<StoredResult | undefined> {
  const events = await tx
    .select()
    .from(agentIngestionEvents)
    .where(
      and(
        eq(agentIngestionEvents.ownerId, ownerId),
        eq(agentIngestionEvents.idempotencyKey, idempotencyKey),
      ),
    )
    .limit(1);
  const auditEvent = events[0];
  if (!auditEvent) return undefined;

  const table = domainTableForRecordType(auditEvent.recordType);
  const records = await tx
    .select()
    .from(table)
    .where(and(eq(table.id, auditEvent.recordId), eq(table.ownerId, ownerId)))
    .limit(1);
  const record = records[0];
  if (!record) {
    throw new Error(`Ingestion audit event ${auditEvent.id} references a missing record`);
  }
  return { kind: auditEvent.recordType, record, auditEvent };
}

export class AgentIngestionRepository {
  constructor(private readonly database: IngestionDatabase) {}

  async ingest(ownerId: string, request: AgentIngestionRequest): Promise<StoredResult> {
    const { status: _status, ...result } = await this.ingestWithStatus(ownerId, request);
    return result;
  }

  async ingestWithStatus(ownerId: string, request: AgentIngestionRequest): Promise<IngestionResult> {
    try {
      return await this.database.transaction(async (tx) => {
        const existing = await findExisting(tx, ownerId, request.idempotencyKey);
        if (existing) return { ...existing, status: "deduplicated" };

        const table = domainTables[request.kind];
        const insertedRecords = await tx.insert(table).values(recordValues(ownerId, request)).returning();
        const record = insertedRecords[0];
        if (!record) throw new Error("Domain insert returned no row");

        const insertedEvents = await tx
          .insert(agentIngestionEvents)
          .values({
            ownerId,
            source: request.source,
            sourceMessageId: request.sourceMessageId,
            idempotencyKey: request.idempotencyKey,
            recordType: request.kind,
            recordId: record.id,
            payload: request,
          })
          .returning();
        const auditEvent = insertedEvents[0];
        if (!auditEvent) throw new Error("Audit insert returned no row");

        // Read both rows back so callers receive the committed database representation.
        const stored = await findExisting(tx, ownerId, request.idempotencyKey);
        if (!stored) throw new Error("Inserted ingestion event could not be read back");
        return { ...stored, status: "created" };
      });
    } catch (error) {
      // A concurrent request may have won the unique (owner, key) race. Its
      // transaction is now committed; retrying the read returns its exact rows.
      if (!isUniqueViolation(error)) throw error;
      return this.database.transaction(async (tx) => {
        const existing = await findExisting(tx, ownerId, request.idempotencyKey);
        if (!existing) throw error;
        return { ...existing, status: "deduplicated" };
      });
    }
  }

  async list(ownerId: string, options: { limit: number; offset: number }) {
    return this.database.transaction(async (tx) => {
      const events = await tx
        .select()
        .from(agentIngestionEvents)
        .where(eq(agentIngestionEvents.ownerId, ownerId))
        .orderBy(desc(agentIngestionEvents.createdAt))
        .limit(options.limit)
        .offset(options.offset);
      const totalRows = await tx
        .select({ count: count() })
        .from(agentIngestionEvents)
        .where(eq(agentIngestionEvents.ownerId, ownerId));
      const records = await Promise.all(events.map(async (auditEvent: Record<string, any>) => {
        const table = domainTableForRecordType(auditEvent.recordType);
        const rows = await tx
          .select()
          .from(table)
          .where(and(eq(table.id, auditEvent.recordId), eq(table.ownerId, ownerId)))
          .limit(1);
        const record = rows[0];
        if (!record) throw new Error(`Ingestion audit event ${auditEvent.id} references a missing record`);
        return { kind: auditEvent.recordType, record, auditEvent };
      }));
      return { records, total: Number(totalRows[0]?.count ?? 0) };
    });
  }
}

export async function ingestAgentRequest(
  database: IngestionDatabase,
  ownerId: string,
  request: AgentIngestionRequest,
) {
  return new AgentIngestionRepository(database).ingest(ownerId, request);
}
