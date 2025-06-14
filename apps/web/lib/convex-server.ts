import "server-only";

import { ConvexHttpClient } from "convex/browser";
import { auth } from "@clerk/nextjs/server";

import { env } from "~/env";

export async function getAuthenticatedConvex() {
  const convex = new ConvexHttpClient(env.NEXT_PUBLIC_CONVEX_URL);
  
  const { getToken } = await auth();
  const token = await getToken({ template: "convex" });
  
  if (token) {
    convex.setAuth(token);
  }
  
  return convex;
}

export async function getPublicConvex() {
  return new ConvexHttpClient(env.NEXT_PUBLIC_CONVEX_URL);
}