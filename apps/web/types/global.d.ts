export {};

declare global {
  interface CustomJwtSessionClaims {
    roles?: string[];
    publicMetadata?: {
      stripe?: {
        customerId?: string;
      };
      plan?: {
        name?: string;
        productId?: string;
        status?: string;
        id?: string;
      };
    };
  }

  /**
   * Global authentication error handler for the Expo app.
   *
   * This function is set by the AuthErrorBoundary component in apps/expo/src/components/AuthErrorBoundary.tsx
   * and is used by the Convex error handler in apps/expo/src/hooks/useConvexErrorHandler.ts to handle
   * authentication errors consistently across the application.
   *
   * When called, it:
   * - Clears stored authentication data
   * - Signs out the user from Clerk
   * - Shows a user-friendly error message
   * - Redirects to the sign-in page
   *
   * @example
   * ```typescript
   * // Used in useConvexErrorHandler.ts
   * if (global.__handleAuthError) {
   *   void global.__handleAuthError();
   * }
   * ```
   */
  // eslint-disable-next-line no-var
  var __handleAuthError: (() => Promise<void>) | undefined;
}
