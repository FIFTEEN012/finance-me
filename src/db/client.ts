import "server-only";

import { drizzle } from "drizzle-orm/postgres-js";
import postgres from "postgres";

import * as schema from "./schema";

export function createDatabaseClient(databaseUrl = process.env.DATABASE_URL) {
  if (!databaseUrl?.trim()) {
    throw new Error("DATABASE_URL is required for the PostgreSQL backend");
  }

  const queryClient = postgres(databaseUrl);
  return drizzle(queryClient, { schema });
}

let database: ReturnType<typeof createDatabaseClient> | undefined;

export function getDatabase() {
  database ??= createDatabaseClient();
  return database;
}
