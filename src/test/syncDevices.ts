import { createStore, type StoreApi } from "zustand/vanilla";
import { createJSONStorage, persist } from "zustand/middleware";
import {
  createSyncEngine,
  type SyncEngine,
  type SyncKindAdapter,
  type SyncStorage,
} from "@/lib/sync/engine";
import { arrayKind } from "@/lib/sync/kinds";
import type { RecordKind } from "@/lib/sync/contract";
import { createDeviceAccount, type SignOutResult } from "@/lib/sync/deviceAccount";

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
  /** Handles `/api/sync/changes` (and any path not in `routes`). */
  route: SyncRoute;
  /** Other route handlers by path, e.g. `{ "/api/sync/reset": resetRoute }`. */
  routes?: Record<string, Partial<SyncRoute>>;
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
  /** The adapter binding `store` to the engine. */
  adapter: SyncKindAdapter;
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
  /** Who the server sees on this browser's requests (null = signed out: 401). */
  userId: string | null;
  /** Signs in as `userId` the way the app does, then syncs. */
  signIn(userId: string): Promise<void>;
  /** Signs out the way the app does (sync, end the session, clear User Data). */
  signOut(opts?: { discardUnsynced?: boolean }): Promise<SignOutResult>;
};

export function createDevice(
  network: DeviceNetwork,
  userId: string | null,
  opts: {
    startAt?: number;
    storage?: ReturnType<typeof memoryStorage>;
    items?: Item[];
    /** Record kind this device's items are synced as (default "supply"). */
    kind?: RecordKind;
    /**
     * Persist the items in this device's storage under this key, like the
     * app's persisted stores (`store.persist.rehydrate()` re-reads them).
     */
    persistKey?: string;
    /** Records per pull page this device asks for (default: the server's). */
    pullLimit?: number;
  } = {},
): Device {
  let clock = opts.startAt ?? Date.parse("2026-11-26T00:00:00Z");
  const storage = opts.storage ?? memoryStorage();
  const initial = () => ({ items: opts.items ?? [] });
  const store = opts.persistKey
    ? createStore<{ items: Item[] }>()(
        persist(initial, { name: opts.persistKey, storage: createJSONStorage(() => storage) }),
      )
    : createStore<{ items: Item[] }>(initial);
  const requests: string[] = [];

  const device: Device = {
    engine: undefined as unknown as SyncEngine,
    adapter: arrayKind({ kind: opts.kind ?? "supply", store, field: "items" }),
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
    userId,
    signIn: async (id) => {
      device.userId = id;
      account.signedIn(id);
      await device.engine.sync();
    },
    signOut: (signOutOpts) =>
      account.signOut(async () => {
        device.userId = null;
      }, signOutOpts),
  };

  device.engine = createSyncEngine({
    fetch: deviceFetch(network, () => device.userId, device),
    storage,
    now: () => clock,
    pullLimit: opts.pullLimit,
  });
  device.engine.register(device.adapter);
  const account = createDeviceAccount({
    storage,
    engine: device.engine,
    clearUserData: () => store.setState({ items: [] }),
  });
  return device;
}

/** A fetch that runs the real route handler in-process, signed in as `userId`. */
function deviceFetch(
  network: DeviceNetwork,
  userId: string | (() => string | null),
  device: { offline: boolean; requests: string[] },
): typeof fetch {
  return async (input, init) => {
    if (device.offline) throw new TypeError("Failed to fetch");
    const req = new Request(new URL(String(input), "http://localhost"), init);
    device.requests.push(req.method);
    const user = typeof userId === "function" ? userId() : userId;
    if (user === null) return Response.json({ error: "unauthorized" }, { status: 401 });
    network.signInAs(user);
    const route = network.routes?.[new URL(req.url).pathname] ?? network.route;
    const handler = req.method === "GET" ? route.GET : route.POST;
    if (!handler) return new Response(null, { status: 405 });
    return handler(req);
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
  const fetchAsDevice = deviceFetch(network, userId, device);
  const engine = createSyncEngine({
    fetch: fetchAsDevice,
    storage: device.storage,
    now: () => clock,
  });
  const stops = adapters.map((adapter) => engine.register(adapter));
  return Object.assign(device, {
    engine,
    /** This device's network: offline when `offline` is set, signed in as its user. */
    fetch: fetchAsDevice,
    tick: (ms: number) => {
      clock += ms;
    },
    unregister: () => stops.forEach((stop) => stop()),
  });
}

type AnyStore = {
  getState: () => unknown;
  getInitialState: () => unknown;
  setState: (state: never, replace: true) => void;
};

/**
 * Several app devices over the app's real stores, which are singletons: only
 * the device in use is bound to them. `use(device)` puts the current device's
 * store contents aside and brings back the chosen device's (a new device
 * starts from the stores' initial state), so each device keeps its own local
 * copy, like separate browsers. Call `close()` when done.
 */
export function appDevicePool(network: DeviceNetwork, stores: unknown[], adapters: SyncKindAdapter[]) {
  const all = stores as AnyStore[];
  type PoolDevice = ReturnType<typeof createAppDevice> & { saved: unknown[] };
  let current: PoolDevice | null = null;

  function use(device: PoolDevice) {
    if (current === device) return device;
    if (current) {
      current.unregister();
      current.saved = all.map((s) => s.getState());
    }
    all.forEach((s, i) => s.setState(device.saved[i] as never, true));
    const stops = adapters.map((adapter) => device.engine.register(adapter));
    device.unregister = () => stops.forEach((stop) => stop());
    current = device;
    return device;
  }

  return {
    /** A new device of `userId`; not bound to the stores until `use(device)`. */
    create(userId: string, opts: { startAt?: number } = {}): PoolDevice {
      const device = createAppDevice(network, userId, [], opts) as PoolDevice;
      device.saved = all.map((s) => s.getInitialState());
      return device;
    },
    use,
    close() {
      current?.unregister();
      current = null;
      all.forEach((s) => s.setState(s.getInitialState() as never, true));
    },
  };
}
