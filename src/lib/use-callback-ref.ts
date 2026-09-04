import { useCallback, useEffect, useRef } from "react";

/**
 * Returns a stable function identity that always calls the latest version of
 * `callback`. Useful for debounced handlers that must not re-create their timer
 * every render.
 */
export function useCallbackRef<Args extends unknown[], Return>(
  callback: (...args: Args) => Return,
): (...args: Args) => Return {
  const ref = useRef(callback);

  useEffect(() => {
    ref.current = callback;
  });

  return useCallback((...args: Args) => ref.current(...args), []);
}
