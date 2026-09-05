import { afterEach, describe, expect, it, vi } from "vitest";

vi.mock("server-only", () => ({}));

import { createDatabaseClient } from "./client";

afterEach(() => {
  vi.unstubAllEnvs();
});

describe("local PostgreSQL client", () => {
  it("fails closed when DATABASE_URL is absent", () => {
    vi.stubEnv("DATABASE_URL", "");

    expect(() => createDatabaseClient()).toThrowError(
      "DATABASE_URL is required for the PostgreSQL backend",
    );
  });
});
