'use client'

import { authClient } from '@/lib/auth-client'
import { signOutAndClearLocalData } from '@/lib/localOwner'
import { useAuthStore } from '@/store/useAuthStore'

/**
 * Signs out of this browser: sends what is still waiting to sync, ends the
 * session, then clears the User Data kept here so the next person sees none
 * of it (Device Preferences stay). If some changes could not be sent, asks
 * before throwing them away. Returns false when the user kept them (still
 * signed in); throws when signing out failed.
 */
export async function signOutOfThisDevice(): Promise<boolean> {
  const endSession = async () => {
    const res = await authClient.signOut()
    if (res?.error) throw new Error(res.error.message || 'sign-out failed')
  }

  let result = await signOutAndClearLocalData(endSession)
  if (!result.ok) {
    const discard = window.confirm(
      `ยังมี ${result.unsynced} รายการที่ยังไม่ได้ซิงก์ขึ้นเซิร์ฟเวอร์ ถ้าออกจากระบบตอนนี้รายการเหล่านี้จะหายไป ต้องการออกจากระบบหรือไม่?`,
    )
    if (!discard) return false
    result = await signOutAndClearLocalData(endSession, { discardUnsynced: true })
  }
  useAuthStore.getState().setUser(null)
  return result.ok
}
