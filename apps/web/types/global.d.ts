export {};

declare global {
  interface CustomJwtSessionClaims {
    roles?: string[];
    externalId?: string; // only in dev
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
}
