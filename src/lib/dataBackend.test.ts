import { afterEach, describe, expect, it, vi } from "vitest";

vi.mock("server-only", () => ({}));

import { getDataBackend } from "./dataBackend";

describe("getDataBackend", () => {
  const originalBackend = process.env.DATA_BACKEND;

  afterEach(() => {
    if (originalBackend === undefined) delete process.env.DATA_BACKEND;
    else process.env.DATA_BACKEND = originalBackend;
  });

  it("uses the legacy backend when DATA_BACKEND is missing", () => {
    delete process.env.DATA_BACKEND;

    expect(getDataBackend()).toBe("legacy");
  });

  it.each(["", "   "])('uses the legacy backend for a blank DATA_BACKEND value (%j)', (value) => {
    process.env.DATA_BACKEND = value;

    expect(getDataBackend()).toBe("legacy");
  });

  it("uses the legacy backend for unknown values", () => {
    process.env.DATA_BACKEND = "supabase";

    expect(getDataBackend()).toBe("legacy");
  });

  it("uses PostgreSQL only when DATA_BACKEND is postgres", () => {
    process.env.DATA_BACKEND = "postgres";

    expect(getDataBackend()).toBe("postgres");
  });
});
