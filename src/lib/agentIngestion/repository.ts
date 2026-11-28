import "server-only";

import { randomUUID } from "node:crypto";

import { and, count, desc, eq } from "drizzle-orm";

import {
  agentIngestionEvents,
  financeTransactions,
  mealLogs,
  runningLogs,
  userRecords,
  workoutLogs,
} from "../../db/schema";
import { foodEntryFromMeal, weightFromHealthProfile, workoutSessionFrom } from "./botRecords";
import type { AgentIngestionRequest } from "./schema";
import type { SharedTableKind } from "@/lib/sync/contract";

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

/**
 * Where an audit event's record lives, by its `record_type`. Transactions
 * (and meals, workouts and runs recorded before #31) are rows of their own
 * tables, found by uuid id. Meals, workouts and runs recorded since are
 * `user_records` rows of the record type's kind (ADR-0003), so they sync to
 * devices as Food Entries and Workout Sessions.
 */
const domainTables = {
  transaction: financeTransactions,
  meal: mealLogs,
  workout: workoutLogs,
  run: runningLogs,
} as const;

/** The `user_records` kinds a bot message becomes (contract.ts SHARED_TABLE_KINDS). */
const SHARED_RECORD_TYPES = ["food-entry", "workout-session"] as const satisfies readonly SharedTableKind[];
type SharedRecordType = (typeof SHARED_RECORD_TYPES)[number];

function isUniqueViolation(error: unknown) {
  return (
    typeof error === "object" &&
    error !== null &&
    "code" in error &&
    (error as { code?: unknown }).code === "23505"
  );
}

function isSharedRecordType(recordType: unknown): recordType is SharedRecordType {
  return SHARED_RECORD_TYPES.includes(recordType as SharedRecordType);
}

/** Reads the record an audit event points at, or undefined if it is gone. */
async function readRecord(tx: IngestionTransaction, ownerId: string, auditEvent: Record<string, any>) {
  const { recordType, recordId } = auditEvent;
  if (isSharedRecordType(recordType)) {
    const rows = await tx
      .select()
      .from(userRecords)
      .where(
        and(
          eq(userRecords.ownerId, ownerId),
          eq(userRecords.kind, recordType),
          eq(userRecords.id, String(recordId)),
        ),
      )
      .limit(1);
    return rows[0] as Record<string, any> | undefined;
  }
  if (typeof recordType !== "string" || !Object.hasOwn(domainTables, recordType)) {
    throw new Error(`Unknown ingestion record type: ${String(recordType)}`);
  }
  const table = domainTables[recordType as keyof typeof domainTables];
  const rows = await tx
    .select()
    .from(table)
    .where(and(eq(table.id, recordId), eq(table.ownerId, ownerId)))
    .limit(1);
  return rows[0] as Record<string, any> | undefined;
}

/** The message kind the bot sent (meal/workout/run/transaction) for an audit event. */
function messageKind(auditEvent: Record<string, any>): AgentIngestionRequest["kind"] {
  return isSharedRecordType(auditEvent.recordType) ? auditEvent.payload?.kind : auditEvent.recordType;
}

async function resolveEvent(tx: IngestionTransaction, ownerId: string, auditEvent: Record<string, any>) {
  const record = await readRecord(tx, ownerId, auditEvent);
  if (!record) {
    throw new Error(`Ingestion audit event ${auditEvent.id} references a missing record`);
  }
  return { kind: messageKind(auditEvent), record, auditEvent };
}

async function profileWeight(tx: IngestionTransaction, ownerId: string) {
  const rows = await tx
    .select()
    .from(userRecords)
    .where(
      and(
        eq(userRecords.ownerId, ownerId),
        eq(userRecords.kind, "health-profile"),
        eq(userRecords.id, "health-profile"),
      ),
    )
    .limit(1);
  return weightFromHealthProfile(rows[0]?.data);
}

/** Inserts the record a message becomes; returns its record type and row. */
async function insertRecord(tx: IngestionTransaction, ownerId: string, request: AgentIngestionRequest) {
  if (request.kind === "transaction") {
    const rows = await tx
      .insert(financeTransactions)
      .values({
        ownerId,
        source: request.source,
        sourceMessageId: request.sourceMessageId,
        ...request.data,
        occurredAt: new Date(request.data.occurredAt),
      })
      .returning();
    return { recordType: "transaction", record: rows[0] };
  }

  const now = new Date();
  const meta = { id: randomUUID(), createdAt: now.toISOString() };
  const [kind, data] =
    request.kind === "meal"
      ? (["food-entry", foodEntryFromMeal(request.data, meta)] as const)
      : ([
          "workout-session",
          workoutSessionFrom(request, { ...meta, weightKg: await profileWeight(tx, ownerId) }),
        ] as const);
  const rows = await tx
    .insert(userRecords)
    .values({ ownerId, kind, id: meta.id, data, editedAt: now })
    .returning();
  return { recordType: kind, record: rows[0] };
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
  return resolveEvent(tx, ownerId, auditEvent);
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

        const { recordType, record } = await insertRecord(tx, ownerId, request);
        if (!record) throw new Error("Domain insert returned no row");

        const insertedEvents = await tx
          .insert(agentIngestionEvents)
          .values({
            ownerId,
            source: request.source,
            sourceMessageId: request.sourceMessageId,
            idempotencyKey: request.idempotencyKey,
            recordType,
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
      const records = await Promise.all(
        events.map((auditEvent: Record<string, any>) => resolveEvent(tx, ownerId, auditEvent)),
      );
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
