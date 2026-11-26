import type { SyncEngine } from './engine'

export type AutoSyncOptions = {
  /** Receives `online` (the window in the app). */
  events: Pick<EventTarget, 'addEventListener' | 'removeEventListener'>
  /** Receives `visibilitychange` (the document in the app); sync runs when it turns visible. */
  visibility?: Pick<EventTarget, 'addEventListener' | 'removeEventListener'> & { visibilityState?: string }
  /** Wait after a local save before syncing, so a burst of edits goes in one push. */
  debounceMs?: number
  /** Periodic sync, which is how edits from other devices arrive. */
  intervalMs?: number
}

/**
 * Runs `engine.sync()` now, after local saves, when the network comes back,
 * when the tab becomes visible again and periodically. Returns a stop function.
 */
export function startAutoSync(
  engine: SyncEngine,
  { events, visibility, debounceMs = 1_500, intervalMs = 60_000 }: AutoSyncOptions,
): () => void {
  let debounce: ReturnType<typeof setTimeout> | undefined
  const run = () => {
    void engine.sync()
  }
  const onVisibility = () => {
    if (visibility?.visibilityState !== 'hidden') run()
  }

  let lastPending = engine.getStatus().pending
  const unsubscribe = engine.subscribe((status) => {
    const grew = status.pending > lastPending
    lastPending = status.pending
    if (!grew) return
    clearTimeout(debounce)
    debounce = setTimeout(run, debounceMs)
  })

  events.addEventListener('online', run)
  visibility?.addEventListener('visibilitychange', onVisibility)
  const interval = setInterval(run, intervalMs)
  run()

  return () => {
    unsubscribe()
    clearTimeout(debounce)
    clearInterval(interval)
    events.removeEventListener('online', run)
    visibility?.removeEventListener('visibilitychange', onVisibility)
  }
}
