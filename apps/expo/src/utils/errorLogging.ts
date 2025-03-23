import * as Sentry from "@sentry/react-native";

/**
 * Safely stringifies an object, handling circular references
 * @param obj The object to stringify
 * @returns A string representation of the object or an error message
 */
function safeStringify(obj: unknown): string {
  try {
    // Use a replacer function to handle circular references
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

/**
 * Logs an error to Sentry and optionally to the console in development.
 *
 * @param message A descriptive message about the error context
 * @param error The error object or string
 * @param additionalData Optional additional data to include with the error
 */
export function logError(
  message: string,
  error: unknown,
  additionalData?: Record<string, unknown>,
): void {
  // In development, we still want to see errors in the console
  if (__DEV__) {
    console.error(`${message}:`, error, additionalData);
  }

  // Format error data
  let errorData: Error;
  if (error instanceof Error) {
    // Create a new error object with the appropriate message
    errorData = new Error(
      error.message !== message
        ? `${message}: ${error.message}`
        : error.message,
    );
    // Preserve the original stack trace
    errorData.stack = error.stack;
    // Copy over any additional properties from the original error
    Object.assign(errorData, error);
  } else if (typeof error === "string") {
    errorData = new Error(`${message}: ${error}`);
  } else {
    errorData = new Error(message);
    // Add the original error as additional context
    additionalData = {
      ...additionalData,
      originalError: safeStringify(error),
    };
  }

  // Add the message as a tag for better categorization
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

/**
 * Logs multiple errors to Sentry as a single group
 *
 * @param message A descriptive message about the error context
 * @param errors Array of errors
 * @param additionalData Optional additional data to include with the errors
 */
export function logErrorGroup(
  message: string,
  errors: unknown[],
  additionalData?: Record<string, unknown>,
): void {
  if (__DEV__) {
    console.error(`${message}:`, errors, additionalData);
  }

  // Create an error to preserve stack trace
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

    // Use captureException instead of captureMessage to preserve the stack trace
    Sentry.captureException(groupError);
  });
}

/**
 * Logs a message to Sentry as info level and to console in development.
 * For non-error logging that should still be tracked in production.
 *
 * @param message The message to log
 * @param data Additional data to include with the message
 * @param tags Optional tags for categorizing the message
 */
export function logMessage(
  message: string,
  data?: Record<string, unknown>,
  tags?: Record<string, string>,
): void {
  // In development, log to console
  if (__DEV__) {
    console.log(`${message}:`, data);
  }

  // Only send to Sentry in production to avoid noise
  if (!__DEV__) {
    // Create an error to capture the original stack trace
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

      // Use captureException instead of captureMessage to preserve the stack trace
      Sentry.captureException(errorWithStack);
    });
  }
}

/**
 * Logs a debug message to console in development only.
 * This is for development-only logging that should never go to Sentry.
 *
 * @param message The message to log
 * @param data Additional data to include with the message
 */
export function logDebug(message: string, data?: unknown): void {
  if (__DEV__) {
    console.log(`[DEBUG] ${message}:`, data);
  }
}
