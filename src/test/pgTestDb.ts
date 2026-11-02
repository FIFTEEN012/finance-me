import { readFileSync } from "node:fs";
import path from "node:path";
import postgres from "postgres";
import { drizzle, type PostgresJsDatabase } from "drizzle-orm/postgres-js";
import * as schema from "@/db/schema";

export function integrationDbUrl(): string | undefined {
  return process.env.TEST_DATABASE_URL || undefined;
}

export type TestDb = {
  db: PostgresJsDatabase<typeof schema>;
  sql: postgres.Sql;
  close(): Promise<void>;
};

const LOOPBACK_HOSTS = new Set(["127.0.0.1", "localhost", "[::1]"]);

/**
 * Throws unless `url` is safe to wipe: a postgres(ql):// URL on a loopback
 * host, with no query string (postgres.js reads connection options such as
 * `host` from it), whose database name ends with `_test`.
 */
export function assertSafeTestDatabaseUrl(url: string): void {
  let parsed: URL;
  try {
    parsed = new URL(url);
  } catch {
    throw new Error("Refusing to reset database: TEST_DATABASE_URL is not a valid URL");
  }
  if (parsed.protocol !== "postgres:" && parsed.protocol !== "postgresql:") {
    throw new Error(`Refusing to reset database: unsupported protocol "${parsed.protocol}"`);
  }
  if (!LOOPBACK_HOSTS.has(parsed.hostname.toLowerCase())) {
    throw new Error(`Refusing to reset database on host "${parsed.hostname}": host must be loopback`);
  }
  if (parsed.search !== "") {
    throw new Error("Refusing to reset database: TEST_DATABASE_URL must not have query parameters");
  }
  const dbName = decodeURIComponent(parsed.pathname.replace(/^\//, ""));
  if (!dbName.endsWith("_test")) {
    throw new Error(`Refusing to reset database "${dbName}": name must end with "_test"`);
  }
}

/**
 * Connects to TEST_DATABASE_URL, wipes it, and applies the SQL migrations in
 * drizzle/ (journal order, up to `upToIdx` inclusive). Refuses to run unless
 * `assertSafeTestDatabaseUrl` accepts the URL.
 */
export async function createTestDb(opts: { upToIdx?: number } = {}): Promise<TestDb> {
  const url = integrationDbUrl();
  if (!url) throw new Error("TEST_DATABASE_URL is not set");
  assertSafeTestDatabaseUrl(url);

  const sql = postgres(url, { max: 4, onnotice: () => {} });
  try {
    await sql.unsafe("DROP SCHEMA IF EXISTS public CASCADE");
    await sql.unsafe("DROP SCHEMA IF EXISTS drizzle CASCADE");
    await sql.unsafe("CREATE SCHEMA public");

    const drizzleDir = path.resolve(process.cwd(), "drizzle");
    const journal = JSON.parse(
      readFileSync(path.join(drizzleDir, "meta", "_journal.json"), "utf8"),
    ) as { entries: { idx: number; tag: string }[] };
    const last = opts.upToIdx ?? journal.entries.length - 1;

    for (const entry of journal.entries) {
      if (entry.idx > last) continue;
      const text = readFileSync(path.join(drizzleDir, `${entry.tag}.sql`), "utf8");
      for (const stmt of text.split("--> statement-breakpoint")) {
        const trimmed = stmt.trim();
        if (trimmed) await sql.unsafe(trimmed);
      }
    }
  } catch (err) {
    await sql.end({ timeout: 1 });
    throw err;
  }

  const db = drizzle(sql, { schema });
  return { db, sql, close: () => sql.end({ timeout: 5 }) };
}

export async function insertUser(db: PostgresJsDatabase<typeof schema>, id: string): Promise<void> {
  await db.insert(schema.user).values({
    id,
    name: `User ${id}`,
    email: `${id}@example.test`,
  });
}
