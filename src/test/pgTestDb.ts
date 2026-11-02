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

/** Hosts postgres.js can reach that are this machine. `[::1]` is not here:
 * postgres.js splits the host on ":" and cannot connect to it. */
const LOOPBACK_HOST = /^(127\.0\.0\.1|localhost)(:\d{1,5})?$/i;

/**
 * Throws unless `url` is safe to wipe: a postgres(ql):// URL naming exactly
 * one loopback host, with no query string (postgres.js reads connection
 * options such as `host` from it), whose database name ends with `_test`.
 *
 * The host is derived the way postgres.js derives it (parseUrl in
 * node_modules/postgres/cjs/src/index.js): the authority is everything after
 * "://" up to the first "/" or "?", the host is everything after the FIRST
 * "@" in it, and a "," there means several hosts. WHATWG `URL` instead splits
 * at the LAST "@", so `u:p@evil,x@127.0.0.1` looks local to `URL` but makes
 * postgres.js connect to `evil`. Hence any second "@", any ",", "%" or
 * whitespace in the authority is refused, and both parsers must agree on a
 * loopback host. The database name is checked raw (postgres.js does not
 * percent-decode it), and "%" in it is refused.
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
  if (/[\s\x00-\x1f\x7f]/.test(url)) {
    throw new Error("Refusing to reset database: TEST_DATABASE_URL must not contain whitespace or control characters");
  }
  const schemeEnd = url.indexOf("://");
  if (schemeEnd === -1) {
    throw new Error("Refusing to reset database: TEST_DATABASE_URL must start with postgres(ql)://");
  }

  // Same split as postgres.js parseUrl.
  const authority = url.slice(schemeEnd + 3).split(/[?/]/)[0];
  const at = authority.indexOf("@");
  const userinfo = at === -1 ? "" : authority.slice(0, at);
  const host = authority.slice(at + 1);
  if (host.includes("@") || userinfo.includes(",")) {
    throw new Error(
      'Refusing to reset database: userinfo must not contain "@" or "," (postgres.js and URL would disagree on the host)',
    );
  }
  if (!LOOPBACK_HOST.test(host) || !LOOPBACK_HOST.test(parsed.host)) {
    throw new Error(`Refusing to reset database on host "${host}": host must be loopback`);
  }

  if (parsed.search !== "" || url.includes("?")) {
    throw new Error("Refusing to reset database: TEST_DATABASE_URL must not have query parameters");
  }
  const rawPath = parsed.pathname;
  if (rawPath.includes("%")) {
    throw new Error('Refusing to reset database: database name must not contain "%"');
  }
  const dbName = rawPath.replace(/^\//, "");
  if (!dbName.endsWith("_test")) {
    throw new Error(`Refusing to reset database "${dbName}": name must end with "_test"`);
  }
}

/**
 * Key of the session-level advisory lock that serializes every createTestDb
 * user against the same database. Vitest runs test files in parallel worker
 * processes and each createTestDb drops the public schema, so without it one
 * file could wipe another's tables mid-test. Advisory locks live on the
 * server, so they serialize across processes; DROP SCHEMA does not release
 * them (only the database itself would, and it is never dropped).
 */
const TEST_DB_LOCK_KEY = 815_042_001;

/**
 * Connects to TEST_DATABASE_URL, waits for the test-database advisory lock,
 * wipes the database, and applies the SQL migrations in drizzle/ (journal
 * order, up to `upToIdx` inclusive). The lock is held on a dedicated
 * connection until `close()`. Refuses to run unless
 * `assertSafeTestDatabaseUrl` accepts the URL.
 */
export async function createTestDb(opts: { upToIdx?: number } = {}): Promise<TestDb> {
  const url = integrationDbUrl();
  if (!url) throw new Error("TEST_DATABASE_URL is not set");
  assertSafeTestDatabaseUrl(url);

  const lockSql = postgres(url, { max: 1, idle_timeout: 0, max_lifetime: 0, onnotice: () => {} });
  let lock: postgres.ReservedSql;
  try {
    lock = await lockSql.reserve();
    await lock`SELECT pg_advisory_lock(${TEST_DB_LOCK_KEY})`;
  } catch (err) {
    await lockSql.end({ timeout: 1 });
    throw err;
  }
  const releaseLock = async () => {
    try {
      await lock`SELECT pg_advisory_unlock(${TEST_DB_LOCK_KEY})`;
    } finally {
      lock.release();
      // Ending the session would release the lock even if unlock failed.
      await lockSql.end({ timeout: 5 });
    }
  };

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
    await releaseLock();
    throw err;
  }

  const db = drizzle(sql, { schema });
  let closing: Promise<void> | undefined;
  return {
    db,
    sql,
    // Idempotent. The data connections end before the lock is released, so
    // the next holder never drops the schema under a live query.
    close: () =>
      (closing ??= (async () => {
        try {
          await sql.end({ timeout: 5 });
        } finally {
          await releaseLock();
        }
      })()),
  };
}

export async function insertUser(db: PostgresJsDatabase<typeof schema>, id: string): Promise<void> {
  await db.insert(schema.user).values({
    id,
    name: `User ${id}`,
    email: `${id}@example.test`,
  });
}
