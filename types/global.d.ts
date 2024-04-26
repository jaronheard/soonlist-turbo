export {};

declare global {
  interface CustomJwtSessionClaims {
    roles?: string[];
    externalId?: string; // only in dev
  }
}
