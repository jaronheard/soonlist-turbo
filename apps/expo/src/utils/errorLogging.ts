import * as Sentry from "@sentry/react-native";

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
    errorData = error;
  } else if (typeof error === "string") {
    errorData = new Error(error);
  } else {
    errorData = new Error(message);
    // Add the original error as additional context
    additionalData = {
      ...additionalData,
      originalError: JSON.stringify(error),
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

  Sentry.withScope((scope) => {
    scope.setTag("errorContext", message);
    scope.setTag("errorType", "group");

    if (additionalData) {
      Object.entries(additionalData).forEach(([key, value]) => {
        scope.setExtra(key, value);
      });
    }

    scope.setExtra("errors", JSON.stringify(errors));

    Sentry.captureMessage(message, "error");
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

      Sentry.captureMessage(message);
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
