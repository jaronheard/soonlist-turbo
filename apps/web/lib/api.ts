import { createTRPCReact } from "@trpc/react-query";

import type { AppRouter } from "@soonlist/api";

export const api = createTRPCReact<AppRouter>();
