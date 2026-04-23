import { isClerkRuntimeError } from "@clerk/clerk-expo";
import * as Sentry from "@sentry/react-native";

function safeStringify(obj: unknown): string {
  try {
    const seen = new WeakSet();
    return JSON.stringify(obj, (key: string, value: unknown): unknown => {
      if (typeof value === "object" && value !== null) {
        if (seen.has(value)) {
          return "[Circular Reference]";
        }
        seen.add(value);
      }
      return value;
    });
  } catch (err) {
    return `[Error during serialization: ${err instanceof Error ? err.message : String(err)}]`;
  }
}

export function logError(
  message: string,
  error: unknown,
  additionalData?: Record<string, unknown>,
): void {
  if (__DEV__) {
    console.error(`${message}:`, error, additionalData);
  }

  let errorData: Error;
  if (error instanceof Error) {
    errorData = new Error(
      error.message !== message
        ? `${message}: ${error.message}`
        : error.message,
    );
    errorData.stack = error.stack;
    Object.assign(errorData, error);
  } else if (typeof error === "string") {
    errorData = new Error(`${message}: ${error}`);
  } else {
    errorData = new Error(message);
    additionalData = {
      ...additionalData,
      originalError: safeStringify(error),
    };
  }

  Sentry.withScope((scope) => {
    scope.setTag("errorContext", message);

    if (additionalData) {
      Object.entries(additionalData).forEach(([key, value]) => {
        scope.setExtra(key, value);
      });
    }

    Sentry.captureException(errorData);
  });
}

export function logErrorGroup(
  message: string,
  errors: unknown[],
  additionalData?: Record<string, unknown>,
): void {
  if (__DEV__) {
    console.error(`${message}:`, errors, additionalData);
  }

  const groupError = new Error(`Group Error: ${message}`);

  Sentry.withScope((scope) => {
    scope.setTag("errorContext", message);
    scope.setTag("errorType", "group");

    if (additionalData) {
      Object.entries(additionalData).forEach(([key, value]) => {
        scope.setExtra(key, value);
      });
    }

    scope.setExtra("errors", safeStringify(errors));

    Sentry.captureException(groupError);
  });
}

export function logMessage(
  message: string,
  data?: Record<string, unknown>,
  tags?: Record<string, string>,
): void {
  if (__DEV__) {
    console.log(`${message}:`, data);
  }

  if (!__DEV__) {
    const errorWithStack = new Error(message);
    errorWithStack.name = "Info";

    Sentry.withScope((scope) => {
      scope.setLevel("info");

      if (tags) {
        Object.entries(tags).forEach(([key, value]) => {
          scope.setTag(key, value);
        });
      }

      if (data) {
        Object.entries(data).forEach(([key, value]) => {
          scope.setExtra(key, value);
        });
      }

      Sentry.captureException(errorWithStack);
    });
  }
}

export function logDebug(message: string, data?: unknown): void {
  if (__DEV__) {
    console.log(`[DEBUG] ${message}:`, data);
  }
}

export function handleClerkError(
  message: string,
  error: unknown,
  additionalData?: Record<string, unknown>,
): boolean {
  if (isClerkRuntimeError(error)) {
    const isNetworkError = error.code === "network_error";

    if (isNetworkError) {
      logDebug(`Network error during ${message}`, {
        code: error.code,
        message: error.message,
        ...additionalData,
      });
      return true;
    }

    logError(message, error, {
      clerkErrorCode: error.code,
      ...additionalData,
    });
    return false;
  }

  logError(message, error, additionalData);
  return false;
}
