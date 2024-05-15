import type { NextRequest } from "next/server";
import * as Sentry from "@sentry/node";
import { fetchRequestHandler } from "@trpc/server/adapters/fetch";

import { appRouter } from "@soonlist/api/root";
import { createTRPCContext } from "@soonlist/api/trpc";

export const runtime = "edge";
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
    onError: ({ path, error }) => {
      try {
        throw new Error(
          `❌ tRPC failed on ${path ?? "<no-path>"}: ${error.message}`,
        );
      } catch (err) {
        Sentry.captureException(err);
        // Optional: You can log the error or perform any other necessary actions
        console.error(err);
      }
    },
  });

export { handler as GET, handler as POST };
