/**
 * YOU PROBABLY DON'T NEED TO EDIT THIS FILE, UNLESS:
 * 1. You want to modify request context (see Part 1)
 * 2. You want to create a new middleware or type of procedure (see Part 3)
 *
 * tl;dr - this is where all the tRPC server stuff is created and plugged in.
 * The pieces you will need to use are documented accordingly near the end
 */
import type {
  SignedInAuthObject,
  SignedOutAuthObject,
} from "@clerk/backend/internal";
import type { User } from "@clerk/nextjs/server";
import type { OpenApiMeta } from "trpc-openapi";
import { auth, currentUser } from "@clerk/nextjs/server";
import { initTRPC, TRPCError } from "@trpc/server";
import superjson from "superjson";
import { ZodError } from "zod";

import { db } from "@soonlist/db";

/**
 * 1. CONTEXT
 *
 * This section defines the "contexts" that are available in the backend API.
 *
 * These allow you to access things when processing a request, like the database, the session, etc.
 *
 * This helper generates the "internals" for a tRPC context. The API handler and RSC clients each
 * wrap this and provides the required context.
 *
 * @see https://trpc.io/docs/server/context
 */

interface AuthContextProps {
  auth: SignedInAuthObject | SignedOutAuthObject;
  user: User | null;
}

export const createContextInner = ({ auth, user }: AuthContextProps) => {
  // const session = getAuth(opts)

  const externalId = auth.sessionClaims?.externalId as string | undefined;
  const authToUse = externalId ? { ...auth, userId: externalId } : auth;
  const userToUse = user !== null ? { ...user } : null;
  if (externalId && userToUse) {
    userToUse.id = externalId;
  }
  // eslint-disable-next-line @typescript-eslint/consistent-type-assertions
  const currentUser = userToUse as User | null;

  return {
    db,
    auth: authToUse,
    currentUser: currentUser,
  };
};

export const createTRPCContext = async (opts: { headers: Headers }) => {
  const source = opts.headers.get("x-trpc-source") ?? "unknown";

  console.log(">>> tRPC Request from", source);
  const user = await currentUser();

  return createContextInner({
    auth: auth(),
    user: user,
  });
};

/**
 * 2. INITIALIZATION
 *
 * This is where the trpc api is initialized, connecting the context and
 * transformer
 */
const t = initTRPC
  .meta<OpenApiMeta>()
  .context<typeof createTRPCContext>()
  .create({
    transformer: superjson,
    errorFormatter: ({ shape, error }) => ({
      ...shape,
      data: {
        ...shape.data,
        zodError:
          error.cause instanceof ZodError ? error.cause.flatten() : null,
      },
    }),
  });

/**
 * Create a server-side caller
 * @see https://trpc.io/docs/server/server-side-calls
 */
export const createCallerFactory = t.createCallerFactory;

/**
 * 3. ROUTER & PROCEDURE (THE IMPORTANT BIT)
 *
 * These are the pieces you use to build your tRPC API. You should import these
 * a lot in the /src/server/api/routers folder
 */

/**
 * This is how you create new routers and subrouters in your tRPC API
 * @see https://trpc.io/docs/router
 */
export const createTRPCRouter = t.router;

/**
 * Public (unauthed) procedure
 *
 * This is the base piece you use to build new queries and mutations on your
 * tRPC API. It does not guarantee that a user querying is authorized, but you
 * can still access user session data if they are logged in
 */
export const publicProcedure = t.procedure;

/**
 * Protected (authenticated) procedure
 *
 * If you want a query or mutation to ONLY be accessible to logged in users, use this. It verifies
 * the session is valid and guarantees `ctx.session.user` is not null.
 *
 * @see https://trpc.io/docs/procedures
 */
export const protectedProcedure = t.procedure.use(async ({ next }) => {
  console.log("TRPC Protected: ");
  const session = auth();
  const user = await currentUser();
  if (!user) {
    throw new TRPCError({ code: "UNAUTHORIZED" });
  }

  const externalId = session.sessionClaims?.externalId as string | undefined;
  // const authToUse = externalId ? { ...session, userId: externalId } : session;
  const userToUse = { ...user };
  if (externalId) {
    userToUse.id = externalId;
  }

  return next({
    ctx: {
      user: user,
    },
  });
});
