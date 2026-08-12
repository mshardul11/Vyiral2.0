import { useEffect, useState } from "react";

/**
 * Trails `value` by `delay` milliseconds.
 *
 * Used to feed the PDF preview: react-pdf re-renders the whole document on every
 * change, so passing keystrokes straight through makes typing feel heavy.
 */
export function useDebounced<T>(value: T, delay: number): T {
  const [debounced, setDebounced] = useState(value);

  useEffect(() => {
    const timer = setTimeout(() => setDebounced(value), delay);
    return () => clearTimeout(timer);
  }, [value, delay]);

  return debounced;
}
