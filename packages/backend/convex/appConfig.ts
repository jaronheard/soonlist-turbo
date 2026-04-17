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

export const getFeaturedLists = query({
  args: {},
  returns: v.array(featuredListValidator),
  handler: async (ctx) => {
    const config = await ctx.db
      .query("appConfig")
      .withIndex("by_key", (q) => q.eq("key", "featuredLists"))
      .first();

    if (!config?.value) return [];

    try {
      const parsed: unknown = JSON.parse(config.value);
      if (!Array.isArray(parsed)) {
        console.warn("featuredLists appConfig is not an array");
        return [];
      }
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
      if (validated.length !== parsed.length) {
        console.warn(
          `featuredLists appConfig dropped ${parsed.length - validated.length} malformed row(s)`,
        );
      }
      return validated;
    } catch (error) {
      console.warn("featuredLists appConfig JSON parse failed", error);
      return [];
    }
  },
});
