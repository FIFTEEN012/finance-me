import { useEffect, useState } from 'react'

/**
 * Returns true only after the component has mounted on the client.
 * Use this to avoid SSR/hydration mismatches when reading from
 * Zustand persisted stores (which are empty on the server).
 */
export function useHydrated() {
  const [hydrated, setHydrated] = useState(false)
  useEffect(() => setHydrated(true), [])
  return hydrated
}
