import { beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("server-only", () => ({}));

const mockDb = {
  insert: vi.fn(),
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

import { POST } from "./route";
import { getCurrentUser } from "@/lib/server-auth";

function postCategory(body: unknown) {
  return POST(
    new Request("http://localhost/api/categories", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    }),
  );
}

describe("/api/categories POST", () => {
  const valuesMock = vi.fn();

  beforeEach(() => {
    vi.clearAllMocks();
    process.env.DATABASE_URL = "postgresql://test:test@localhost:5432/test";
    vi.mocked(getCurrentUser).mockResolvedValue(mockUser);
    valuesMock.mockReturnValue({ returning: vi.fn().mockResolvedValue([{ id: "cat-1" }]) });
    mockDb.insert.mockReturnValue({ values: valuesMock });
  });

  it("saves a new category marked as food", async () => {
    const res = await postCategory({ id: "cat-1", name: "กาแฟ", type: "EXPENSE", isFood: true });

    expect(res.status).toBe(201);
    expect(valuesMock.mock.calls[0][0].isFood).toBe(true);
  });

  it("leaves the food flag unset when the client does not send one", async () => {
    await postCategory({ id: "cat-1", name: "เดินทาง", type: "EXPENSE" });

    expect(valuesMock.mock.calls[0][0].isFood).toBeNull();
  });
});
