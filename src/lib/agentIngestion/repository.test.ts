import { describe, expect, it, vi } from "vitest";

vi.mock("server-only", () => ({}));

import {
  agentIngestionEvents,
  financeTransactions,
  mealLogs,
  runningLogs,
  workoutLogs,
} from "../../db/schema";
import { AgentIngestionRepository } from "./repository";

const request = {
  kind: "transaction" as const,
  idempotencyKey: "message-123",
  source: "hermes-discord",
  sourceMessageId: "123",
  data: {
    transactionType: "EXPENSE" as const,
    amount: "125.50",
    currency: "THB",
    description: "Lunch",
    occurredAt: "2026-09-01T10:30:00+07:00",
  },
};

describe("agent ingestion repository", () => {
  it("returns the stored result without duplicating a repeated request", async () => {
    const database = createFakeDatabase();
    const repository = new AgentIngestionRepository(database);

    const first = await repository.ingest("owner-1", request);
    const second = await repository.ingest("owner-1", request);

    expect(first.record).toMatchObject({ ownerId: "owner-1", amount: "125.50", description: "Lunch" });
    expect(first.auditEvent).toMatchObject({
      ownerId: "owner-1",
      idempotencyKey: "message-123",
      recordType: "transaction",
      recordId: first.record.id,
    });
    expect(second).toEqual(first);
    expect(second.record.id).toBe(first.record.id);
    expect(database.counts()).toEqual({ domain: 1, audit: 1 });
  });

  it("scopes the idempotency key to the owner", async () => {
    const database = createFakeDatabase();
    const repository = new AgentIngestionRepository(database);

    const first = await repository.ingest("owner-1", request);
    const second = await repository.ingest("owner-2", request);

    expect(second.record.id).not.toBe(first.record.id);
    expect(second.auditEvent.idempotencyKey).toBe(first.auditEvent.idempotencyKey);
    expect(second.auditEvent.ownerId).toBe("owner-2");
    expect(database.counts()).toEqual({ domain: 2, audit: 2 });
  });

  it.each([
    ["meal", { mealType: "lunch", food: "Rice", cost: "0.01", loggedAt: request.data.occurredAt }],
    ["workout", { exercise: "Squats", sets: 3, loggedAt: request.data.occurredAt }],
    ["run", { distanceKm: 5.25, durationMinutes: 30, runType: "easy", loggedAt: request.data.occurredAt }],
  ] as const)("ingests a %s with its matching audit event", async (kind, data) => {
    const repository = new AgentIngestionRepository(createFakeDatabase());
    const result = await repository.ingest("owner-1", {
      ...request,
      kind,
      idempotencyKey: `${kind}-12345678`,
      data,
    } as never);

    expect(result.kind).toBe(kind);
    expect(result.auditEvent).toMatchObject({ recordType: kind, recordId: result.record.id });
  });

  it("rolls back the domain row when the domain insert fails", async () => {
    const database = createFakeDatabase({ failDomainInsert: true });
    const repository = new AgentIngestionRepository(database);

    await expect(repository.ingest("owner-1", request)).rejects.toThrow("domain insert failed");
    expect(database.counts()).toEqual({ domain: 0, audit: 0 });
  });

  it("rolls back the domain row when the audit insert fails", async () => {
    const database = createFakeDatabase({ failAuditInsert: true });
    const repository = new AgentIngestionRepository(database);

    await expect(repository.ingest("owner-1", request)).rejects.toThrow("audit insert failed");
    expect(database.counts()).toEqual({ domain: 0, audit: 0 });
  });

  it("rolls back both rows when the committed read-back fails", async () => {
    const database = createFakeDatabase({ failReadBack: true });
    const repository = new AgentIngestionRepository(database);

    await expect(repository.ingest("owner-1", request)).rejects.toThrow(
      "Inserted ingestion event could not be read back",
    );
    expect(database.counts()).toEqual({ domain: 0, audit: 0 });
  });

  it("recovers the committed winner after a concurrent audit unique conflict", async () => {
    const database = createFakeDatabase({ simulateConcurrentWinner: true });
    const repository = new AgentIngestionRepository(database);

    const result = await repository.ingest("owner-1", request);

    expect(result.record).toMatchObject({ id: "winner-record", ownerId: "owner-1", amount: "125.50" });
    expect(result.auditEvent).toMatchObject({
      id: "winner-audit",
      ownerId: "owner-1",
      idempotencyKey: request.idempotencyKey,
      recordId: "winner-record",
    });
    expect(database.counts()).toEqual({ domain: 1, audit: 1 });
  });

  it("does not resolve a linked domain row owned by another owner", async () => {
    const database = createFakeDatabase();
    database.seed(financeTransactions, { id: "other-record", ownerId: "owner-2", description: "Private" });
    database.seed(agentIngestionEvents, {
      id: "owner-1-audit",
      ownerId: "owner-1",
      idempotencyKey: "linked-event",
      recordType: "transaction",
      recordId: "other-record",
    });

    const repository = new AgentIngestionRepository(database);
    await expect(repository.ingest("owner-1", { ...request, idempotencyKey: "linked-event" })).rejects.toThrow(
      "references a missing record",
    );
    await expect(repository.list("owner-1", { limit: 10, offset: 0 })).rejects.toThrow(
      "references a missing record",
    );
  });

  it("rejects malformed audit record types before domain table lookup", async () => {
    const database = createFakeDatabase();
    database.seed(agentIngestionEvents, {
      id: "malformed-audit",
      ownerId: "owner-1",
      idempotencyKey: "malformed-event",
      recordType: "not-a-domain-table",
      recordId: "record-1",
    });

    const repository = new AgentIngestionRepository(database);
    await expect(repository.ingest("owner-1", { ...request, idempotencyKey: "malformed-event" })).rejects.toThrow(
      "Unknown ingestion record type",
    );
  });

  it("uses a count query for the owner total", async () => {
    const database = createFakeDatabase({ countResult: 37 });
    const repository = new AgentIngestionRepository(database);

    await expect(repository.list("owner-1", { limit: 10, offset: 0 })).resolves.toMatchObject({ total: 37 });
    expect(database.countQueries()).toBe(1);
    expect(database.fullAuditReads()).toBe(0);
  });
});

function createFakeDatabase(options: {
  failDomainInsert?: boolean;
  failAuditInsert?: boolean;
  failReadBack?: boolean;
  simulateConcurrentWinner?: boolean;
  countResult?: number;
} = {}) {
  const domainTables = [financeTransactions, mealLogs, workoutLogs, runningLogs];
  const rows = new Map<object, Record<string, unknown>[]>();
  let committedWinner: { table: object; row: Record<string, unknown> }[] = [];
  let failReadBackActive = false;
  let lastInsertedDomain: { table: object; row: Record<string, unknown> } | undefined;
  let nextId = 1;
  let countQueries = 0;
  let fullAuditReads = 0;

  return {
    transaction: async <T>(callback: (tx: any) => Promise<T>) => {
      const snapshot = new Map([...rows].map(([table, values]) => [table, [...values]]));
      const tx = {
        select: (selection?: Record<string, unknown>) => ({
          from: (table: object) => {
            let predicate: unknown;
            let limited = false;
            const query = {
              where: (value: unknown) => {
                predicate = value;
                return query;
              },
              orderBy: () => query,
              limit: () => {
                limited = true;
                return query;
              },
              offset: () => query,
              then: async (resolve: (value: unknown) => unknown) => {
                if (selection && table === agentIngestionEvents) {
                  countQueries++;
                  return resolve([{ count: options.countResult ?? (rows.get(table) ?? []).length }]);
                }
                if (table === agentIngestionEvents && !selection && !limited) fullAuditReads++;
                return resolve(
                  failReadBackActive
                    ? []
                    : (rows.get(table) ?? []).filter((row) => matchesPredicate(predicate, row)),
                );
              },
            };
            return query;
          },
        }),
        insert: (table: object) => ({
          values: (values: Record<string, unknown>) => ({
            returning: async () => {
              if (options.failDomainInsert && domainTables.includes(table as never)) {
                throw new Error("domain insert failed");
              }
              if (table === agentIngestionEvents) {
                if (options.failAuditInsert) throw new Error("audit insert failed");
                const auditValues = values;
                const duplicate = (rows.get(table) ?? []).some(
                  (row) =>
                    row.ownerId === auditValues.ownerId &&
                    row.idempotencyKey === auditValues.idempotencyKey,
                );
                if (duplicate || options.simulateConcurrentWinner) {
                  if (options.simulateConcurrentWinner && committedWinner.length === 0) {
                    if (!lastInsertedDomain) throw new Error("concurrent winner has no domain row");
                    committedWinner = [
                      {
                        table: lastInsertedDomain.table,
                        row: { ...lastInsertedDomain.row, id: "winner-record" },
                      },
                      {
                        table: agentIngestionEvents,
                        row: { ...auditValues, id: "winner-audit", recordId: "winner-record" },
                      },
                    ];
                  }
                  const error = new Error("audit unique violation");
                  Object.assign(error, { code: "23505" });
                  throw error;
                }
              }
              const row = { id: `row-${nextId++}`, ...values };
              rows.set(table, [...(rows.get(table) ?? []), row]);
              if (domainTables.includes(table as never)) lastInsertedDomain = { table, row };
              if (table === agentIngestionEvents && options.failReadBack) failReadBackActive = true;
              return [row];
            },
          }),
        }),
      };
      try {
        return await callback(tx);
      } catch (error) {
        rows.clear();
        for (const [table, values] of snapshot) rows.set(table, values);
        for (const { table, row } of committedWinner) {
          rows.set(table, [...(rows.get(table) ?? []), row]);
        }
        throw error;
      }
    },
    counts: () => ({
      domain: domainTables.reduce((count, table) => count + (rows.get(table)?.length ?? 0), 0),
      audit: rows.get(agentIngestionEvents)?.length ?? 0,
    }),
    seed: (table: object, row: Record<string, unknown>) => {
      rows.set(table, [...(rows.get(table) ?? []), row]);
    },
    countQueries: () => countQueries,
    fullAuditReads: () => fullAuditReads,
  };
}

function matchesPredicate(predicate: unknown, row: Record<string, unknown>): boolean {
  if (!predicate || typeof predicate !== "object") return true;
  const chunks = (predicate as { queryChunks?: unknown[] }).queryChunks;
  if (!chunks) return true;

  const column = chunks.find(
    (chunk): chunk is { table: Record<string, unknown>; name: string } =>
      Boolean(chunk && typeof chunk === "object" && "table" in chunk && "name" in chunk),
  );
  const param = chunks.find(
    (chunk): chunk is { value: unknown } =>
      Boolean(chunk && typeof chunk === "object" && "value" in chunk && "encoder" in chunk),
  );
  if (column && param) {
    const property = Object.entries(column.table).find(([, value]) => value === column)?.[0];
    return property !== undefined && row[property] === param.value;
  }

  const nested = chunks.filter((chunk) => Boolean(chunk && typeof chunk === "object" && "queryChunks" in chunk));
  return nested.every((chunk) => matchesPredicate(chunk, row));
}
