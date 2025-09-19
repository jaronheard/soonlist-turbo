import { v } from "convex/values";

import { internalMutation, internalQuery, mutation } from "./_generated/server";

function generateShareToken(): string {
  const bytes = new Uint8Array(32);
  crypto.getRandomValues(bytes);
  // Convert to lowercase hex string
  return Array.from(bytes)
    .map((byte) => byte.toString(16).padStart(2, "0"))
    .join("");
}

export const createShareToken = mutation({
  args: {
    userId: v.string(),
  },
  returns: v.object({ token: v.string() }),
  handler: async (ctx, { userId }) => {
    const user = await ctx.db
      .query("users")
      .withIndex("by_custom_id", (q) => q.eq("id", userId))
      .first();

    const username = user?.username || userId;

    // Generate a unique token, checking for collisions
    let token: string;
    let attempts = 0;
    const maxAttempts = 10;

    do {
      token = generateShareToken();
      const existing = await ctx.db
        .query("shareTokens")
        .withIndex("by_token", (q) => q.eq("token", token))
        .first();
      if (!existing) break;
      attempts++;
    } while (attempts < maxAttempts);

    if (attempts >= maxAttempts) {
      throw new Error(
        "Failed to generate unique share token after maximum attempts",
      );
    }

    await ctx.db.insert("shareTokens", {
      token,
      userId,
      username,
      createdAt: new Date().toISOString(),
      revokedAt: null,
    });

    return { token };
  },
});

export const resolveShareToken = internalQuery({
  args: { token: v.string() },
  returns: v.union(
    v.object({ userId: v.string(), username: v.string() }),
    v.null(),
  ),
  handler: async (ctx, { token }) => {
    const record = await ctx.db
      .query("shareTokens")
      .withIndex("by_token", (q) => q.eq("token", token))
      .unique();

    if (!record || record.revokedAt) return null;
    return { userId: record.userId, username: record.username };
  },
});

export const revokeShareToken = internalMutation({
  args: { token: v.string() },
  returns: v.object({ success: v.boolean() }),
  handler: async (ctx, { token }) => {
    const record = await ctx.db
      .query("shareTokens")
      .withIndex("by_token", (q) => q.eq("token", token))
      .unique();
    if (!record) return { success: false };
    await ctx.db.patch(record._id, { revokedAt: new Date().toISOString() });
    return { success: true };
  },
});
