import { generateOpenApiDocument } from "trpc-swagger";

import { appRouter } from "./root";

// Generate OpenAPI schema document
export const openApiDocument = generateOpenApiDocument(appRouter, {
  title: "Soonlist API",
  description: "API for Soonlist",
  version: "1.0.0",
  baseUrl: "https://soonlist.com/api",
});
