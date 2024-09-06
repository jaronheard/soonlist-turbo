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
}
