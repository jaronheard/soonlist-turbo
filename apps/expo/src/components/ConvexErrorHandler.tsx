import React from "react";

import { useConvexErrorHandler } from "~/hooks/useConvexErrorHandler";

interface ConvexErrorHandlerProps {
  children: React.ReactNode;
  error?: unknown;
}

/**
 * Component that handles Convex authentication errors
 * Use this to wrap components that make Convex queries/mutations
 */
export function ConvexErrorHandler({
  children,
  error,
}: ConvexErrorHandlerProps) {
  const { handleConvexError } = useConvexErrorHandler();

  React.useEffect(() => {
    if (error) {
      handleConvexError(error);
    }
  }, [error, handleConvexError]);

  return <>{children}</>;
}
