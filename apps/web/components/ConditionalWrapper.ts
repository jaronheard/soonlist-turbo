import type { ReactNode } from "react";

export interface ConditionalWrapperProps {
  condition?: boolean;
  wrapper: (children: ReactNode) => ReactNode;
  children: ReactNode;
}

export function ConditionalWrapper({
  condition,
  wrapper,
  children,
}: ConditionalWrapperProps) {
  return condition ? wrapper(children) : children;
}
