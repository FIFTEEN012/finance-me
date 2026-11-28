import { SYNC_RESET_PATH } from './contract'
import type { SyncEngine } from './engine'

/**
 * Reset (GLOSSARY) from this device. The server wipes the user's User Data
 * first; only once it confirms does this device drop its local copy and its
 * sync queue, then pull the fresh state (default categories). On failure
 * (offline, server error) nothing local is touched and it returns false.
 *
 * Signed out (`signedIn: false`), the User Data is Guest Data that lives only
 * on this device: it is cleared locally, with no server call, and the sync
 * queue is dropped.
 *
 * `clearLocal` empties the local User Data stores and must keep Device
 * Preferences (dashboard layout, onboarding).
 */
export async function resetUserData(deps: {
  fetch: typeof fetch
  engine: SyncEngine
  clearLocal: () => void
  /** Whether a user is signed in; omitted means signed in. */
  signedIn?: boolean
}): Promise<boolean> {
  if (deps.signedIn === false) {
    deps.clearLocal()
    deps.engine.reset()
    return true
  }
  try {
    const res = await deps.fetch(SYNC_RESET_PATH, { method: 'POST' })
    if (!res.ok) return false
  } catch {
    return false
  }
  // Emptying the stores queues deletes; resetting the engine afterwards drops
  // them along with everything queued before the Reset.
  deps.clearLocal()
  deps.engine.reset()
  await deps.engine.sync()
  return true
}
