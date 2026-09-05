import { describe, expect, it, vi } from "vitest";

vi.mock("server-only", () => ({}));

import { isAuthorizedBearerToken } from "./auth";

describe("agent ingestion bearer authentication", () => {
  it.each([undefined, "", "   "])("fails closed when expected token is %s", (expectedToken) => {
    expect(isAuthorizedBearerToken("Bearer local-secret", expectedToken)).toBe(false);
  });

  it.each([
    null,
    "",
    "Basic local-secret",
    "bearer local-secret",
    "Bearer",
    "Bearer ",
    "Bearer local-secret extra",
  ])("rejects missing or malformed authorization header %s", (authorizationHeader) => {
    expect(isAuthorizedBearerToken(authorizationHeader, "local-secret")).toBe(false);
  });

  it("rejects the wrong token", () => {
    expect(isAuthorizedBearerToken("Bearer wrong-secret", "local-secret")).toBe(false);
  });

  it("accepts an exact bearer token", () => {
    expect(isAuthorizedBearerToken("Bearer local-secret", "local-secret")).toBe(true);
  });

  it("supports different token lengths without throwing", () => {
    expect(isAuthorizedBearerToken("Bearer short", "a-much-longer-local-secret")).toBe(false);
  });
});
