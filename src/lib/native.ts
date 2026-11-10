'use client'

import { Capacitor } from '@capacitor/core'

/** True inside the iOS / Android app (Capacitor), false in a browser. */
export function isNativeApp(): boolean {
  return Capacitor.isNativePlatform()
}

export function nativePlatform(): 'ios' | 'android' | 'web' {
  return Capacitor.getPlatform() as 'ios' | 'android' | 'web'
}

/** Short vibration on success (no-op on the web). */
export async function hapticSuccess(): Promise<void> {
  if (!isNativeApp()) return
  try {
    const { Haptics, NotificationType } = await import('@capacitor/haptics')
    await Haptics.notification({ type: NotificationType.Success })
  } catch {
    // haptics unavailable — ignore
  }
}

/** Light tap feedback for navigation and toggles (no-op on the web). */
export async function hapticTap(): Promise<void> {
  if (!isNativeApp()) return
  try {
    const { Haptics, ImpactStyle } = await import('@capacitor/haptics')
    await Haptics.impact({ style: ImpactStyle.Light })
  } catch {
    // ignore
  }
}
