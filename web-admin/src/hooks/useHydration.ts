'use client';

import { useEffect, useState } from 'react';

/**
 * Returns true only after the component has mounted client-side.
 * Use this to gate any logic that reads from localStorage / zustand persist.
 */
export function useHydration() {
  const [hydrated, setHydrated] = useState(false);
  useEffect(() => { setHydrated(true); }, []);
  return hydrated;
}