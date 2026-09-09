import { beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("server-only", () => ({}));

const mockDb = {
  update: vi.fn(),
  delete: vi.fn(),
};

vi.mock("@/db/client", () => ({
  getDatabase: vi.fn(() => mockDb),
}));

const mockUser = {
  id: "user-123",
  email: "test@example.com",
  name: "Test User",
  emailVerified: false,
  createdAt: new Date(),
  updatedAt: new Date(),
};
vi.mock("@/lib/server-auth", () => ({
  getCurrentUser: vi.fn(async () => mockUser),
}));

import { PUT, DELETE } from "./route";
import { getCurrentUser } from "@/lib/server-auth";

describe("/api/transactions/[id] route", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    process.env.DATABASE_URL = "postgresql://test:test@localhost:5432/test";
    vi.mocked(getCurrentUser).mockResolvedValue(mockUser);
  });

  it("returns 401 on PUT when unauthenticated", async () => {
    vi.mocked(getCurrentUser).mockResolvedValueOnce(null);
    const req = new Request("http://localhost/api/transactions/tx-1", {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ amount: 200 }),
    });

    const res = await PUT(req, { params: Promise.resolve({ id: "tx-1" }) });
    expect(res.status).toBe(401);
  });

  it("updates transaction when found", async () => {
    const fakeUpdated = { id: "tx-1", ownerId: "user-123", amount: "250.00" };
    mockDb.update.mockReturnValueOnce({
      set: vi.fn().mockReturnValueOnce({
        where: vi.fn().mockReturnValueOnce({
          returning: vi.fn().mockResolvedValueOnce([fakeUpdated]),
        }),
      }),
    });

    const req = new Request("http://localhost/api/transactions/tx-1", {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ amount: 250 }),
    });

    const res = await PUT(req, { params: Promise.resolve({ id: "tx-1" }) });
    expect(res.status).toBe(200);
    const data = await res.json();
    expect(data.transaction).toEqual(fakeUpdated);
  });

  it("deletes transaction when found", async () => {
    mockDb.delete.mockReturnValueOnce({
      where: vi.fn().mockReturnValueOnce({
        returning: vi.fn().mockResolvedValueOnce([{ id: "tx-1" }]),
      }),
    });

    const req = new Request("http://localhost/api/transactions/tx-1", {
      method: "DELETE",
    });

    const res = await DELETE(req, { params: Promise.resolve({ id: "tx-1" }) });
    expect(res.status).toBe(200);
    const data = await res.json();
    expect(data.success).toBe(true);
  });
});
