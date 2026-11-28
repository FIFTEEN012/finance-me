import type { SyncEngine, SyncStorage } from './engine'

/**
 * Which account the User Data cached on this browser belongs to, and what
 * happens to it when someone signs in or out (spec #23, ADR-0003).
 *
 * - Signed out, the local data is Guest Data.
 * - The first sign-in on a browser turns its Guest Data into that user's
 *   User Data: the engine starts over and uploads every local record once,
 *   at the oldest edit time, so anything already on the server (an edit, a
 *   delete) wins and nothing local is dropped.
 * - Signing in again as the same user changes nothing: no re-upload.
 * - A different account found on the browser (its session ended without a
 *   sign-out) is cleared first, so two accounts never mix.
 * - Signing out sends what is still queued, then clears the User Data and the
 *   engine's state; Device Preferences stay.
 */

/** localStorage key holding the id of the account the local User Data belongs to. */
export const OWNER_MARKER_KEY = 'finance-owner-id'

export type SignOutResult = { ok: true } | { ok: false; unsynced: number }

export type DeviceAccountOptions = {
  storage: SyncStorage
  engine: SyncEngine
  /** Empties every store holding User Data (Device Preferences stay). */
  clearUserData: () => void
}

export type DeviceAccount = {
  /**
   * Call when `userId` is signed in, before syncing. Returns what it found:
   * `same` (already theirs), `guest` (Guest Data becomes theirs) or
   * `switched` (another account's data was cleared).
   */
  signedIn(userId: string): 'same' | 'guest' | 'switched'
  /**
   * Syncs, ends the session with `endSession`, then clears the User Data.
   * If changes could not be sent (offline), nothing is ended or cleared and
   * the count is returned, unless `discardUnsynced`.
   */
  signOut(endSession: () => Promise<unknown>, opts?: { discardUnsynced?: boolean }): Promise<SignOutResult>
}

export function createDeviceAccount({ storage, engine, clearUserData }: DeviceAccountOptions): DeviceAccount {
  function read(): string | null {
    try {
      return storage.getItem(OWNER_MARKER_KEY)
    } catch {
      return null
    }
  }
  function write(userId: string | null) {
    try {
      if (userId === null) storage.removeItem(OWNER_MARKER_KEY)
      else storage.setItem(OWNER_MARKER_KEY, userId)
    } catch {
      // storage blocked: nothing to record
    }
  }
  /** Clearing the stores reports every record as deleted: reset drops those after. */
  function forgetUserData() {
    clearUserData()
    engine.reset()
  }

  return {
    signedIn(userId) {
      const owner = read()
      if (owner === userId) return 'same'
      if (owner === null) {
        // Guest Data: changes queued while signed out are dropped; the first
        // sync uploads every local record once, at the oldest edit time.
        engine.reset()
        write(userId)
        return 'guest'
      }
      forgetUserData()
      write(userId)
      return 'switched'
    },

    async signOut(endSession, { discardUnsynced = false } = {}) {
      await engine.sync()
      const unsynced = engine.getStatus().pending
      if (unsynced > 0 && !discardUnsynced) return { ok: false, unsynced }
      await endSession()
      forgetUserData()
      write(null)
      return { ok: true }
    },
  }
}
