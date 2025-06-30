import { v } from "convex/values";

import { mutation, query } from "./_generated/server";

// Query to get the current active demo video
export const getActiveDemoVideo = query({
  args: {},
  handler: async (ctx) => {
    const activeVideo = await ctx.db
      .query("demoVideos")
      .withIndex("by_active", (q) => q.eq("isActive", true))
      .first();

    return activeVideo;
  },
});

// Mutation to create or update a demo video (admin function)
export const upsertDemoVideo = mutation({
  args: {
    url: v.string(),
    version: v.string(),
    duration: v.number(),
    size: v.number(),
    title: v.optional(v.string()),
    setAsActive: v.optional(v.boolean()),
  },
  handler: async (ctx, args) => {
    const { setAsActive = false, ...videoData } = args;

    // If setting as active, deactivate all other videos first
    if (setAsActive) {
      const activeVideos = await ctx.db
        .query("demoVideos")
        .withIndex("by_active", (q) => q.eq("isActive", true))
        .collect();

      for (const video of activeVideos) {
        await ctx.db.patch(video._id, { isActive: false });
      }
    }

    // Check if video with this version already exists
    const existingVideo = await ctx.db
      .query("demoVideos")
      .withIndex("by_version", (q) => q.eq("version", args.version))
      .first();

    if (existingVideo) {
      // Update existing video
      return await ctx.db.patch(existingVideo._id, {
        ...videoData,
        isActive: setAsActive,
      });
    } else {
      // Create new video
      return await ctx.db.insert("demoVideos", {
        ...videoData,
        isActive: setAsActive,
        createdAt: new Date().toISOString(),
      });
    }
  },
});

// Mutation to set a video as active by version
export const setActiveVideoByVersion = mutation({
  args: {
    version: v.string(),
  },
  handler: async (ctx, { version }) => {
    // Find the video by version
    const video = await ctx.db
      .query("demoVideos")
      .withIndex("by_version", (q) => q.eq("version", version))
      .first();

    if (!video) {
      throw new Error(`Video with version ${version} not found`);
    }

    // Deactivate all other videos
    const activeVideos = await ctx.db
      .query("demoVideos")
      .withIndex("by_active", (q) => q.eq("isActive", true))
      .collect();

    for (const activeVideo of activeVideos) {
      await ctx.db.patch(activeVideo._id, { isActive: false });
    }

    // Activate the selected video
    await ctx.db.patch(video._id, { isActive: true });

    return video;
  },
});

// Query to get all demo videos (admin function)
export const getAllDemoVideos = query({
  args: {},
  handler: async (ctx) => {
    const videos = await ctx.db.query("demoVideos").collect();

    // Sort by createdAt descending (newest first)
    return videos.sort(
      (a, b) =>
        new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime(),
    );
  },
});
