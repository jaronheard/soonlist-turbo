import { aiRouter } from "./routers/ai";
import { eventRouter } from "./routers/event";
import { listRouter } from "./routers/list";
import { notificationRouter } from "./routers/notification";
import { stripeRouter } from "./routers/stripe";
import { userRouter } from "./routers/user";
import { waitlistRouter } from "./routers/waitlist";
import { createTRPCRouter } from "./trpc";

/**
 * This is the primary router for your server.
 *
 * All routers added in /api/routers should be manually added here.
 */
export const appRouter = createTRPCRouter({
  ai: aiRouter,
  event: eventRouter,
  list: listRouter,
  notification: notificationRouter,
  stripe: stripeRouter,
  user: userRouter,
  waitlist: waitlistRouter,
});

// export type definition of API
export type AppRouter = typeof appRouter;
