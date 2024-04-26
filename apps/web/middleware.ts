import { clerkMiddleware, createRouteMatcher } from "@clerk/nextjs/server";

const isPublicRoute = createRouteMatcher([
  "/",
  "/terms",
  "/contact",
  "/privacy",
  "/early-access",
  "/explore",
  "/onboarding",
  "/events",
  "/users",
  "/api",
  "/api/bug",
  "/api/chat",
  "/api/og",
  "/api/test",
  "/api/leaderboard",
  "/api/webhooks/clerk",
  "/api/image-proxy",
  "/api/trpc(.*)",
  "/(.*)/events",
  "/(.*)/events/(.*)",
  "/(.*)/following/(.*)",
  "/event/(.*)",
  "/list/(.*)",
  "/ingest",
  "/ingest/(.*)",
  "/monitoring(.*)",
  "/sign-in",
  "/sign-up",
]);

const isIgnoredRoute = createRouteMatcher([
  "/_vercel/speed-insights/vitals",
  "/.well-known/acme-challenge/(.*)",
  "/.well-known/vercel-user-meta",
  "/__nextjs_original-stack-frame",
]);

export default clerkMiddleware((auth, req) => {
  if (isPublicRoute(req) || isIgnoredRoute(req)) return; // if it's a public route, do nothing
  auth().protect(); // for any other route, require auth
});

export const config = {
  matcher: ["/((?!.*\\..*|_next).*)", "/", "/(api|trpc)(.*)"],
};
