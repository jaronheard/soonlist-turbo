import { v } from "convex/values";
import { z } from "zod";

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

export const getMinimumIOSVersion = query({
  args: {},
  returns: v.union(v.string(), v.null()),
  handler: async (ctx) => {
    const config = await ctx.db
      .query("appConfig")
      .withIndex("by_key", (q) => q.eq("key", "minimumIOSVersion"))
      .first();

    return config?.value || null;
  },
});

const featuredListSchema = z.array(
  z.object({
    username: z.string(),
    displayName: z.string(),
  }),
);

export const getFeaturedLists = query({
  args: {},
  returns: v.array(v.object({ username: v.string(), displayName: v.string() })),
  handler: async (ctx) => {
    const config = await ctx.db
      .query("appConfig")
      .withIndex("by_key", (q) => q.eq("key", "featuredLists"))
      .first();

    if (!config?.value) return [];

    let raw: unknown;
    try {
      raw = JSON.parse(config.value);
    } catch (error) {
      console.warn("featuredLists appConfig JSON parse failed", error);
      return [];
    }

    const result = featuredListSchema.safeParse(raw);
    if (!result.success) {
      console.warn(
        "featuredLists appConfig failed validation",
        result.error.flatten(),
      );
      return [];
    }
    return result.data;
  },
});
