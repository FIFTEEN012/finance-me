import { beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("server-only", () => ({}));

const mockDb = {
  select: vi.fn(),
  insert: vi.fn(),
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

import { GET, POST } from "./route";
import { getCurrentUser } from "@/lib/server-auth";

describe("/api/transactions route", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    process.env.DATABASE_URL = "postgresql://test:test@localhost:5432/test";
    vi.mocked(getCurrentUser).mockResolvedValue(mockUser);
  });

  it("returns 401 when user is not authenticated", async () => {
    vi.mocked(getCurrentUser).mockResolvedValueOnce(null);
    const res = await GET();
    expect(res.status).toBe(401);
  });

  it("returns list of transactions for authenticated user", async () => {
    const fakeRows = [
      { id: "tx-1", ownerId: "user-123", description: "Coffee", amount: "100.00" },
    ];
    mockDb.select.mockReturnValueOnce({
      from: vi.fn().mockReturnValueOnce({
        where: vi.fn().mockReturnValueOnce({
          orderBy: vi.fn().mockResolvedValueOnce(fakeRows),
        }),
      }),
    });

    const res = await GET();
    expect(res.status).toBe(200);
    const data = await res.json();
    expect(data.transactions).toEqual(fakeRows);
  });

  it("validates required fields on POST", async () => {
    const req = new Request("http://localhost/api/transactions", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ amount: 100 }),
    });

    const res = await POST(req);
    expect(res.status).toBe(400);
  });

  it("creates a transaction and returns 201", async () => {
    const fakeCreated = {
      id: "tx-new",
      ownerId: "user-123",
      amount: "150.00",
      description: "Lunch",
      transactionType: "EXPENSE",
    };

    mockDb.insert.mockReturnValueOnce({
      values: vi.fn().mockReturnValueOnce({
        returning: vi.fn().mockResolvedValueOnce([fakeCreated]),
      }),
    });

    const req = new Request("http://localhost/api/transactions", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        type: "EXPENSE",
        amount: 150,
        description: "Lunch",
        categoryId: "cat-food",
        date: "2026-09-09",
      }),
    });

    const res = await POST(req);
    expect(res.status).toBe(201);
    const data = await res.json();
    expect(data.transaction).toEqual(fakeCreated);
  });
});
