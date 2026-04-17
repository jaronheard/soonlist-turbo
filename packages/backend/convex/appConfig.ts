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

const featuredListValidator = v.object({
  username: v.string(),
  displayName: v.string(),
});

/** Returns `null` when the row is unset so clients can fall back to defaults. */
export const getFeaturedLists = query({
  args: {},
  returns: v.union(v.null(), v.array(featuredListValidator)),
  handler: async (ctx) => {
    const config = await ctx.db
      .query("appConfig")
      .withIndex("by_key", (q) => q.eq("key", "featuredLists"))
      .first();

    if (!config?.value) return null;

    try {
      const parsed: unknown = JSON.parse(config.value);
      if (!Array.isArray(parsed)) return null;
      const validated: { username: string; displayName: string }[] = [];
      for (const item of parsed) {
        if (
          item !== null &&
          typeof item === "object" &&
          typeof (item as { username?: unknown }).username === "string" &&
          typeof (item as { displayName?: unknown }).displayName === "string"
        ) {
          const row = item as { username: string; displayName: string };
          validated.push({
            username: row.username,
            displayName: row.displayName,
          });
        }
      }
      return validated;
    } catch {
      return null;
    }
  },
});
