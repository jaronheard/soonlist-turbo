import type { DependencyList } from "react";
import { useEffect, useRef } from "react";

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
