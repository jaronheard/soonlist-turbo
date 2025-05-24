import { ConvexReactClient } from "convex/react";
import { env } from "~/env";

export const convex = new ConvexReactClient(env.NEXT_PUBLIC_CONVEX_URL);
