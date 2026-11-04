import { afterAll, beforeAll, describe, expect, it, vi } from "vitest";
import { eq } from "drizzle-orm";
import { hashPassword } from "better-auth/crypto";

const holder = vi.hoisted(() => ({ db: undefined as unknown }));

vi.mock("@/db/client", () => ({
  getDatabase: () => holder.db,
}));

import { account, user } from "@/db/schema";
import { auth } from "@/lib/auth";
import { createTestDb, insertUser, integrationDbUrl, type TestDb } from "@/test/pgTestDb";

const EXISTING_ID = "user-existing";
const EXISTING_EMAIL = `${EXISTING_ID}@example.test`;
const PASSWORD = "password123";

describe.skipIf(!integrationDbUrl())("auth with sign-up disabled", () => {
  let testDb: TestDb;

  beforeAll(async () => {
    vi.stubEnv("DATABASE_URL", integrationDbUrl()!);
    testDb = await createTestDb();
    holder.db = testDb.db;
    await insertUser(testDb.db, EXISTING_ID);
    await testDb.db.insert(account).values({
      id: "account-existing",
      accountId: EXISTING_ID,
      providerId: "credential",
      userId: EXISTING_ID,
      password: await hashPassword(PASSWORD),
      createdAt: new Date(),
      updatedAt: new Date(),
    });
  });

  afterAll(async () => {
    vi.unstubAllEnvs();
    await testDb?.close();
  });

  it("does not create a user for a sign-up request", async () => {
    const email = "new@example.test";

    await expect(
      auth.api.signUpEmail({ body: { email, password: PASSWORD, name: "New" } }),
    ).rejects.toMatchObject({
      body: { code: "EMAIL_PASSWORD_SIGN_UP_DISABLED" },
    });

    expect(await testDb.db.select().from(user).where(eq(user.email, email))).toEqual([]);
  });

  it("still lets an existing user sign in", async () => {
    const result = await auth.api.signInEmail({
      body: { email: EXISTING_EMAIL, password: PASSWORD },
    });

    expect(result.user.id).toBe(EXISTING_ID);
  });
});
