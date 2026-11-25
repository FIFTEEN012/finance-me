import { beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("server-only", () => ({}));

const mockDb = {
  update: vi.fn(),
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

import { PUT } from "./route";
import { getCurrentUser } from "@/lib/server-auth";

function putCategory(id: string, body: unknown) {
  return PUT(
    new Request(`http://localhost/api/categories/${id}`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    }),
    { params: Promise.resolve({ id }) },
  );
}

describe("/api/categories/[id] PUT", () => {
  const setMock = vi.fn();

  beforeEach(() => {
    vi.clearAllMocks();
    process.env.DATABASE_URL = "postgresql://test:test@localhost:5432/test";
    vi.mocked(getCurrentUser).mockResolvedValue(mockUser);
    setMock.mockReturnValue({
      where: vi.fn().mockReturnValue({
        returning: vi.fn().mockResolvedValue([{ id: "cat-expense-1" }]),
      }),
    });
    mockDb.update.mockReturnValue({ set: setMock });
  });

  it("saves switching the food flag on or off", async () => {
    const res = await putCategory("cat-expense-1", { isFood: false });

    expect(res.status).toBe(200);
    expect(setMock.mock.calls[0][0].isFood).toBe(false);
  });

  it("does not touch the food flag when it is not in the update", async () => {
    await putCategory("cat-expense-1", { name: "อาหาร" });

    expect(setMock.mock.calls[0][0]).not.toHaveProperty("isFood");
  });

  it("ignores a food flag that is not a boolean", async () => {
    await putCategory("cat-expense-1", { isFood: "yes" });

    expect(setMock.mock.calls[0][0]).not.toHaveProperty("isFood");
  });
});
