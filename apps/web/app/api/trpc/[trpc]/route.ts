import type { NextRequest } from "next/server";
import * as Sentry from "@sentry/nextjs";
import { TRPCError } from "@trpc/server";
import { fetchRequestHandler } from "@trpc/server/adapters/fetch";
import { getHTTPStatusCodeFromError } from "@trpc/server/http";

import { appRouter } from "@soonlist/api/root";
import { createTRPCContext } from "@soonlist/api/trpc";

export const preferredRegion = "pdx1";

/**
 * This wraps the `createTRPCContext` helper and provides the required context for the tRPC API when
 * handling a HTTP request (e.g. when you make requests from Client Components).
 */
const createContext = async (req: NextRequest) => {
  return createTRPCContext({
    headers: req.headers,
  });
};

const handler = (req: NextRequest) =>
  fetchRequestHandler({
    endpoint: "/api/trpc",
    req,
    router: appRouter,
    createContext: () => createContext(req),
    onError: ({ path, error, ctx, input, req, type }) => {
      const statusCode = getHTTPStatusCodeFromError(error);
      if (statusCode >= 500) {
        try {
          console.error(error, error.stack);
          const mainError =
            error instanceof TRPCError ? error.cause || error : error;
          throw mainError;
        } catch (err) {
          Sentry.captureException(err, {
            extra: {
              statusCode,
              error,
              type,
              path,
              input,
              ctx,
              req,
            },
          });
        }
      }
    },
  });

export { handler as GET, handler as POST };
