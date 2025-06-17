import { httpRouter } from "convex/server";

import { httpAction } from "./_generated/server";
import { getLastSyncTime, syncAll } from "./planetscaleSync";

const http = httpRouter();

// Manual sync endpoint - useful for testing
http.route({
  path: "/sync/planetscale",
  method: "POST",
  handler: httpAction(async (ctx, request) => {
    try {
      // Check for a simple auth token in headers (optional)
      const authHeader = request.headers.get("Authorization");
      const expectedToken = process.env.SYNC_AUTH_TOKEN;

      if (expectedToken && authHeader !== `Bearer ${expectedToken}`) {
        return new Response("Unauthorized", { status: 401 });
      }

      // Run the sync
      const results = await ctx.runAction(syncAll);

      return new Response(
        JSON.stringify({
          success: true,
          results,
          timestamp: new Date().toISOString(),
        }),
        {
          status: 200,
          headers: { "Content-Type": "application/json" },
        },
      );
    } catch (error) {
      console.error("Manual sync error:", error);

      return new Response(
        JSON.stringify({
          success: false,
          error: String(error),
          timestamp: new Date().toISOString(),
        }),
        {
          status: 500,
          headers: { "Content-Type": "application/json" },
        },
      );
    }
  }),
});

// Health check endpoint
http.route({
  path: "/sync/health",
  method: "GET",
  handler: httpAction(async (ctx) => {
    try {
      // Get sync states
      const eventsSyncState = await ctx.runMutation(getLastSyncTime, {
        key: "events",
      });

      const eventFollowsSyncState = await ctx.runMutation(getLastSyncTime, {
        key: "eventFollows",
      });

      return new Response(
        JSON.stringify({
          status: "healthy",
          syncStates: {
            events: eventsSyncState,
            eventFollows: eventFollowsSyncState,
          },
          timestamp: new Date().toISOString(),
        }),
        {
          status: 200,
          headers: { "Content-Type": "application/json" },
        },
      );
    } catch (error) {
      return new Response(
        JSON.stringify({
          status: "error",
          error: String(error),
          timestamp: new Date().toISOString(),
        }),
        {
          status: 500,
          headers: { "Content-Type": "application/json" },
        },
      );
    }
  }),
});

export default http;
