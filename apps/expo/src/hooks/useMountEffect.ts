import type { DependencyList } from "react";
import { useEffect, useRef } from "react";

/**
 * A hook that runs an effect function only when the component mounts,
 * or when the specified dependencies change.
 *
 * @param effect Function to run on mount or when dependencies change
 * @param deps Optional dependency array
 */
export function useMountEffect(
  effect: () => void | (() => void),
  deps: DependencyList = [],
) {
  const isFirstRender = useRef(true);

  useEffect(() => {
    if (deps.length === 0 && !isFirstRender.current) {
      return;
    }

    isFirstRender.current = false;
    return effect();
  }, deps);
}
