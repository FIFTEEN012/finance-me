import { defineConfig } from "drizzle-kit";

const localDatabaseUrl =
  "postgresql://finance_local:finance_local_dev_only@127.0.0.1:55432/finance_local";

export default defineConfig({
  dialect: "postgresql",
  schema: "./src/db/schema.ts",
  out: "./drizzle",
  dbCredentials: {
    url: process.env.DATABASE_URL ?? localDatabaseUrl,
  },
  strict: true,
  verbose: true,
});
