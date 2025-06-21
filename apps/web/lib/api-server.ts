import "server-only";

import { headers } from "next/headers";

import {
  createCaller as createTRPCCaller,
  createTRPCContext,
} from "@soonlist/api";

export async function createCaller() {
  const headerList = await headers();
  const context = await createTRPCContext({
    headers: headerList,
  });

  return createTRPCCaller(context);
}
