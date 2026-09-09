import { betterAuth } from "better-auth";
import { drizzleAdapter } from "better-auth/adapters/drizzle";
import { getDatabase } from "@/db/client";
import * as schema from "@/db/schema";
import postgres from "postgres";
import { drizzle } from "drizzle-orm/postgres-js";

function getAdapterDb() {
  if (process.env.DATABASE_URL?.trim()) {
    return getDatabase();
  }
  const stub = postgres("postgresql://stub:stub@localhost:5432/stub", { max: 1 });
  return drizzle(stub, { schema });
}

export const auth = betterAuth({
  database: drizzleAdapter(
    new Proxy({} as any, {
      get(_target, prop) {
        return (getAdapterDb() as any)[prop];
      },
    }),
    {
      provider: "pg",
      schema,
    }
  ),
  emailAndPassword: {
    enabled: true,
  },
  session: {
    expiresIn: 60 * 60 * 24 * 30, // 30 days
    updateAge: 60 * 60 * 24, // 1 day
  },
});
