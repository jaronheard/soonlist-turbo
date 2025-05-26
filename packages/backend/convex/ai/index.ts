"use node";

import { v } from "convex/values";

import { internal } from "../_generated/api";
import { action, query } from "../_generated/server";

// Input validators
const eventFromRawTextInputValidator = v.object({
  rawText: v.string(),
  timezone: v.string(),
});

const eventFromUrlInputValidator = v.object({
  url: v.string(),
  timezone: v.string(),
});

const eventFromImageInputValidator = v.object({
  imageUrl: v.string(),
  timezone: v.string(),
});

const eventCreateBaseInputValidator = v.object({
  timezone: v.string(),
  comment: v.optional(v.string()),
  lists: v.array(v.object({ value: v.string() })),
  visibility: v.optional(v.union(v.literal("public"), v.literal("private"))),
  sendNotification: v.optional(v.boolean()),
  userId: v.string(),
  username: v.string(),
});

const eventCreateFromRawTextInputValidator = v.object({
  timezone: v.string(),
  comment: v.optional(v.string()),
  lists: v.array(v.object({ value: v.string() })),
  visibility: v.optional(v.union(v.literal("public"), v.literal("private"))),
  sendNotification: v.optional(v.boolean()),
  userId: v.string(),
  username: v.string(),
  rawText: v.string(),
});

const eventCreateFromUrlInputValidator = v.object({
  timezone: v.string(),
  comment: v.optional(v.string()),
  lists: v.array(v.object({ value: v.string() })),
  visibility: v.optional(v.union(v.literal("public"), v.literal("private"))),
  sendNotification: v.optional(v.boolean()),
  userId: v.string(),
  username: v.string(),
  url: v.string(),
});

const eventCreateFromImageInputValidator = v.object({
  timezone: v.string(),
  comment: v.optional(v.string()),
  lists: v.array(v.object({ value: v.string() })),
  visibility: v.optional(v.union(v.literal("public"), v.literal("private"))),
  sendNotification: v.optional(v.boolean()),
  userId: v.string(),
  username: v.string(),
  imageUrl: v.string(),
});

const eventCreateFromBase64InputValidator = v.object({
  timezone: v.string(),
  comment: v.optional(v.string()),
  lists: v.array(v.object({ value: v.string() })),
  visibility: v.optional(v.union(v.literal("public"), v.literal("private"))),
  sendNotification: v.optional(v.boolean()),
  userId: v.string(),
  username: v.string(),
  base64Image: v.string(),
});

// Return type validators
const processedEventResponseValidator = v.object({
  events: v.array(v.any()), // EventWithMetadata array
  response: v.string(),
});

const aiEventResponseValidator = v.object({
  success: v.boolean(),
  ticket: v.optional(v.any()),
  id: v.optional(v.string()),
  eventId: v.optional(v.string()),
  event: v.optional(v.any()),
  error: v.optional(v.string()),
});

/**
 * Process raw text to extract event information using AI
 */
export const eventFromRawText = query({
  args: eventFromRawTextInputValidator,
  returns: processedEventResponseValidator,
  handler: async (ctx, args) => {
    return await ctx.runQuery(
      internal.ai._internal.processEventFromRawText,
      args,
    );
  },
});

/**
 * Process URL content to extract event information using AI
 */
export const eventsFromUrl = query({
  args: eventFromUrlInputValidator,
  returns: processedEventResponseValidator,
  handler: async (ctx, args) => {
    return await ctx.runQuery(internal.ai._internal.processEventFromUrl, args);
  },
});

/**
 * Process image to extract event information using AI
 */
export const eventFromImage = query({
  args: eventFromImageInputValidator,
  returns: processedEventResponseValidator,
  handler: async (ctx, args) => {
    return await ctx.runQuery(
      internal.ai._internal.processEventFromImage,
      args,
    );
  },
});

/**
 * Create event from raw text, then send notification
 */
export const eventFromRawTextThenCreateThenNotification = action({
  args: eventCreateFromRawTextInputValidator,
  returns: aiEventResponseValidator,
  handler: async (ctx, args) => {
    return await ctx.runAction(
      internal.ai._internal.createEventFromRawText,
      args,
    );
  },
});

/**
 * Create event from URL, then send notification
 */
export const eventFromUrlThenCreateThenNotification = action({
  args: eventCreateFromUrlInputValidator,
  returns: aiEventResponseValidator,
  handler: async (ctx, args) => {
    return await ctx.runAction(internal.ai._internal.createEventFromUrl, args);
  },
});

/**
 * Create event from image URL, then send notification
 */
export const eventFromImageThenCreateThenNotification = action({
  args: eventCreateFromImageInputValidator,
  returns: aiEventResponseValidator,
  handler: async (ctx, args) => {
    return await ctx.runAction(
      internal.ai._internal.createEventFromImage,
      args,
    );
  },
});

/**
 * Create event from base64 image
 */
export const eventFromImageBase64ThenCreate = action({
  args: eventCreateFromBase64InputValidator,
  returns: aiEventResponseValidator,
  handler: async (ctx, args) => {
    return await ctx.runAction(
      internal.ai._internal.createEventFromBase64Image,
      args,
    );
  },
});
