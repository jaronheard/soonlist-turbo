import { userRouter } from "./routers/user";
import { listRouter } from "./routers/list";
import { eventRouter } from "./routers/event";
import { waitlistRouter } from "./routers/waitlist";
import { aiRouter } from "./routers/ai";
import { createTRPCRouter } from "@/server/api/trpc";

/**
 * This is the primary router for your server.
 *
 * All routers added in /api/routers should be manually added here.
 */
export const appRouter = createTRPCRouter({
  ai: aiRouter,
  event: eventRouter,
  user: userRouter,
  list: listRouter,
  waitlist: waitlistRouter,
});

// export type definition of API
export type AppRouter = typeof appRouter;
