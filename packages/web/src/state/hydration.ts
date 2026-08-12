import { useEffect, useState } from "react";
import { useResumeStore } from "./resume";

/**
 * True once the persisted resume has been read out of localStorage.
 *
 * localStorage is synchronous, so this is almost always true on the first render —
 * but gating on it means the editor never flashes an empty document on a slow load,
 * and it stays correct if the storage backend is ever swapped for an async one.
 */
export function useHydrated(): boolean {
  const [hydrated, setHydrated] = useState(() => useResumeStore.persist.hasHydrated());

  useEffect(() => {
    const unsubFinish = useResumeStore.persist.onFinishHydration(() => setHydrated(true));
    // Covers the case where hydration completed between the initial state read and
    // this effect running.
    if (useResumeStore.persist.hasHydrated()) setHydrated(true);
    return unsubFinish;
  }, []);

  return hydrated;
}
