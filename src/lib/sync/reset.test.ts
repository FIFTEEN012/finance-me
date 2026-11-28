import { describe, expect, it, vi } from "vitest";
import { resetUserData } from "./reset";
import { createSyncEngine } from "./engine";
import { memoryStorage } from "@/test/syncDevices";

describe("resetUserData for a guest (signed out)", () => {
  it("clears only the local User Data: no server call, Device Preferences kept", async () => {
    const storage = memoryStorage();
    storage.setItem("finance-dashboard-layout", '{"layout":["a"]}');
    storage.setItem("finance-transactions", '{"rows":[1]}');
    const fetch = vi.fn<typeof globalThis.fetch>();
    const engine = createSyncEngine({ fetch, storage, now: () => 0 });
    const resetSpy = vi.spyOn(engine, "reset");
    const clearLocal = vi.fn(() => storage.removeItem("finance-transactions"));

    const ok = await resetUserData({ fetch, engine, clearLocal, signedIn: false });

    expect(ok).toBe(true);
    expect(fetch).not.toHaveBeenCalled();
    expect(clearLocal).toHaveBeenCalledOnce();
    expect(resetSpy).toHaveBeenCalledOnce();
    expect(storage.getItem("finance-transactions")).toBeNull();
    expect(storage.getItem("finance-dashboard-layout")).toBe('{"layout":["a"]}');
  });
});
