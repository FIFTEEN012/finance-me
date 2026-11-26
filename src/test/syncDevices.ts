import { createStore, type StoreApi } from "zustand/vanilla";
import {
  createSyncEngine,
  type SyncEngine,
  type SyncKindAdapter,
  type SyncStorage,
} from "@/lib/sync/engine";
import { arrayKind } from "@/lib/sync/kinds";

/**
 * Harness for the multi-device sync tests: each Device is one browser, with
 * its own local copy (a plain zustand store bound through the same
 * `arrayKind` adapter the app uses), its own localStorage, its own clock and
 * a fetch that calls the real route handlers in-process as its user.
 */

export type SyncRoute = {
  GET: (req: Request) => Promise<Response>;
  POST: (req: Request) => Promise<Response>;
};

export type DeviceNetwork = {
  route: SyncRoute;
  /** Makes the mocked session return this user for the next handler call. */
  signInAs: (userId: string) => void;
};

export function memoryStorage(): SyncStorage & { dump(): Record<string, string> } {
  const data = new Map<string, string>();
  return {
    getItem: (k) => data.get(k) ?? null,
    setItem: (k, v) => void data.set(k, v),
    removeItem: (k) => void data.delete(k),
    dump: () => Object.fromEntries(data),
  };
}

export type Item = { id: string; name: string; [key: string]: unknown };

export type Device = {
  engine: SyncEngine;
  store: StoreApi<{ items: Item[] }>;
  storage: ReturnType<typeof memoryStorage>;
  /** Requests this device sent, as "METHOD", in order. */
  requests: string[];
  items(): Item[];
  add(item: Item): void;
  edit(id: string, patch: Partial<Item>): void;
  remove(id: string): void;
  offline: boolean;
  /** Advances this device's clock by `ms`. */
  tick(ms: number): void;
};

export function createDevice(
  network: DeviceNetwork,
  userId: string,
  opts: {
    startAt?: number;
    storage?: ReturnType<typeof memoryStorage>;
    items?: Item[];
    /** Record kind this device's items are synced as (default "supply"). */
    kind?: string;
  } = {},
): Device {
  let clock = opts.startAt ?? Date.parse("2026-11-26T00:00:00Z");
  const storage = opts.storage ?? memoryStorage();
  const store = createStore<{ items: Item[] }>(() => ({ items: opts.items ?? [] }));
  const requests: string[] = [];

  const device: Device = {
    engine: undefined as unknown as SyncEngine,
    store,
    storage,
    requests,
    offline: false,
    items: () => store.getState().items,
    add: (item) => store.setState((s) => ({ items: [...s.items, item] })),
    edit: (id, patch) =>
      store.setState((s) => ({ items: s.items.map((i) => (i.id === id ? { ...i, ...patch } : i)) })),
    remove: (id) => store.setState((s) => ({ items: s.items.filter((i) => i.id !== id) })),
    tick: (ms) => {
      clock += ms;
    },
  };

  device.engine = createSyncEngine({ fetch: deviceFetch(network, userId, device), storage, now: () => clock });
  device.engine.register(arrayKind({ kind: opts.kind ?? "supply", store, field: "items" }));
  return device;
}

/** A fetch that runs the real route handler in-process, signed in as `userId`. */
function deviceFetch(
  network: DeviceNetwork,
  userId: string,
  device: { offline: boolean; requests: string[] },
): typeof fetch {
  return async (input, init) => {
    if (device.offline) throw new TypeError("Failed to fetch");
    const req = new Request(new URL(String(input), "http://localhost"), init);
    device.requests.push(req.method);
    network.signInAs(userId);
    return req.method === "GET" ? network.route.GET(req) : network.route.POST(req);
  };
}

/**
 * A device whose engine is bound to the given adapters, e.g. the app's own
 * kinds over the real zustand stores. Call `unregister()` when done.
 */
export function createAppDevice(
  network: DeviceNetwork,
  userId: string,
  adapters: SyncKindAdapter[],
  opts: { startAt?: number } = {},
) {
  let clock = opts.startAt ?? Date.parse("2026-11-26T00:00:00Z");
  const device = { offline: false, requests: [] as string[], storage: memoryStorage() };
  const engine = createSyncEngine({
    fetch: deviceFetch(network, userId, device),
    storage: device.storage,
    now: () => clock,
  });
  const stops = adapters.map((adapter) => engine.register(adapter));
  return Object.assign(device, {
    engine,
    tick: (ms: number) => {
      clock += ms;
    },
    unregister: () => stops.forEach((stop) => stop()),
  });
}
