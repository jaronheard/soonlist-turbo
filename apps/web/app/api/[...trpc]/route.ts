import { createOpenApiFetchHandler } from "trpc-swagger";

import { appRouter } from "@soonlist/api";

import { createContext } from "~/trpc/server";

// Application Component || Define Handler
// =================================================================================================
// =================================================================================================
const handler = (req: Request) => {
  // Handle incoming swagger/openapi requests
  return createOpenApiFetchHandler({
    req,
    endpoint: "/api",
    router: appRouter,
    createContext: createContext,
  });
};
// Application Component || Define Exports
// =================================================================================================
// =================================================================================================
export { handler as GET, handler as POST };
