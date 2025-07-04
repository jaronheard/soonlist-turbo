import { v } from "convex/values";

import { query } from "./_generated/server";

export const getDemoVideoUrl = query({
  args: {},
  returns: v.union(v.string(), v.null()),
  handler: async (ctx) => {
    const config = await ctx.db
      .query("appConfig")
      .withIndex("by_key", (q) => q.eq("key", "demoVideoUrl"))
      .first();

    return config?.value || null;
  },
});
