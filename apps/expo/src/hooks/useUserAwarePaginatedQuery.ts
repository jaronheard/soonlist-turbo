import { useCallback, useEffect, useRef, useState } from "react";
import type { FunctionReference, PaginatedQueryArgs } from "convex/server";
import { usePaginatedQuery } from "convex/react";
import { ConvexError } from "convex/values";

interface RetryState {
  attempt: number;
  isRetrying: boolean;
  lastError: Error | null;
}

interface UserAwarePaginatedQueryResult<T> {
  results: T[] | undefined;
  status: "LoadingFirstPage" | "LoadingMore" | "CanLoadMore" | "Exhausted";
  loadMore: (numItems: number) => void;
  isUserSyncing: boolean;
  syncError: Error | null;
}

/**
 * Enhanced paginated query hook that handles "User not found" errors
 * with exponential backoff retry logic. This addresses the race condition
 * between Clerk authentication and Convex user synchronization.
 */
export function useUserAwarePaginatedQuery<
  Query extends FunctionReference<"query", "public", PaginatedQueryArgs, any>,
>(
  query: Query,
  args: Query["_args"] | "skip",
  options?: { initialNumItems?: number; maxRetries?: number }
): UserAwarePaginatedQueryResult<Query["_returnType"]["page"][number]> {
  const { maxRetries = 5, initialNumItems = 10 } = options ?? {};
  
  const [retryState, setRetryState] = useState<RetryState>({
    attempt: 0,
    isRetrying: false,
    lastError: null,
  });

  const [queryError, setQueryError] = useState<Error | null>(null);
  const retryTimeoutRef = useRef<NodeJS.Timeout>();
  const mountedRef = useRef(true);
  const stableResultRef = useRef<any>(undefined);

  // Clear timeout on unmount
  useEffect(() => {
    mountedRef.current = true;
    return () => {
      mountedRef.current = false;
      if (retryTimeoutRef.current) {
        clearTimeout(retryTimeoutRef.current);
      }
    };
  }, []);

  // Reset retry state when args change
  useEffect(() => {
    setRetryState({
      attempt: 0,
      isRetrying: false,
      lastError: null,
    });
    setQueryError(null);
  }, [JSON.stringify(args)]);

  const shouldSkipQuery = args === "skip" || retryState.isRetrying;
  const queryArgs = shouldSkipQuery ? "skip" : args;

  // Use a try-catch wrapper to capture ConvexErrors
  let queryResult;
  try {
    queryResult = usePaginatedQuery(query, queryArgs, {
      initialNumItems,
    });
    
    // Clear any previous error if query succeeds
    if (queryResult && queryError) {
      setQueryError(null);
    }
    
    // Store successful results for stable returns
    if (queryResult && queryResult.status !== "LoadingMore" && queryResult.status !== "LoadingFirstPage") {
      stableResultRef.current = queryResult;
    }
  } catch (error) {
    // Capture the error for retry logic
    if (error instanceof Error) {
      setQueryError(error);
    }
    
    // Return stable results while handling error
    queryResult = stableResultRef.current;
  }

  const scheduleRetry = useCallback((error: Error, attempt: number) => {
    if (attempt >= maxRetries || !mountedRef.current) {
      setRetryState(prev => ({
        ...prev,
        isRetrying: false,
        lastError: error,
      }));
      return;
    }

    // Exponential backoff: 1s, 2s, 4s, 8s, 16s
    const delay = Math.min(1000 * Math.pow(2, attempt), 16000);
    
    setRetryState(prev => ({
      ...prev,
      isRetrying: true,
      lastError: error,
    }));

    retryTimeoutRef.current = setTimeout(() => {
      if (mountedRef.current) {
        setRetryState(prev => ({
          attempt: attempt + 1,
          isRetrying: false,
          lastError: null,
        }));
      }
    }, delay);
  }, [maxRetries]);

  // Check for "User not found" errors and handle retries
  useEffect(() => {
    if (!queryError || retryState.isRetrying) return;

    const isUserNotFoundError = 
      queryError instanceof ConvexError &&
      (queryError.data?.message === "User not found" ||
       (typeof queryError.data === "object" && 
        queryError.data !== null && 
        "message" in queryError.data && 
        queryError.data.message === "User not found")) ||
      queryError.message?.includes("User not found");

    if (isUserNotFoundError && retryState.attempt < maxRetries) {
      scheduleRetry(queryError, retryState.attempt);
    } else if (!isUserNotFoundError) {
      // For non-user-not-found errors, don't retry
      setRetryState(prev => ({
        ...prev,
        lastError: queryError,
      }));
    }
  }, [queryError, retryState.isRetrying, retryState.attempt, scheduleRetry, maxRetries]);

  // Determine if we're in a user syncing state
  const isUserSyncing = retryState.isRetrying || 
    (retryState.attempt > 0 && retryState.attempt < maxRetries && !retryState.lastError);

  // If we've exhausted retries and have a user not found error, treat it as sync error
  const syncError = retryState.attempt >= maxRetries ? retryState.lastError : null;

  return {
    results: queryResult?.results,
    status: queryResult?.status ?? "LoadingFirstPage",
    loadMore: queryResult?.loadMore ?? (() => {}),
    isUserSyncing,
    syncError,
  };
}

