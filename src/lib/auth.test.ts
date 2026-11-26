import { describe, expect, it, vi } from "vitest";

const getDatabase = vi.hoisted(() => vi.fn());

vi.mock("@/db/client", () => ({ getDatabase }));

import { auth } from "@/lib/auth";

describe("public sign-up", () => {
  it("is disabled in the auth config", () => {
    expect(auth.options.emailAndPassword.disableSignUp).toBe(true);
  });

  it("rejects a sign-up request", async () => {
    await expect(
      auth.api.signUpEmail({
        body: { email: "new@example.test", password: "password123", name: "New" },
      }),
    ).rejects.toMatchObject({
      body: { code: "EMAIL_PASSWORD_SIGN_UP_DISABLED" },
    });
  });
});
