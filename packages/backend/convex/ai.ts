import { WorkflowManager } from "@convex-dev/workflow";
import { v } from "convex/values";

import { EventWithMetadata } from "@soonlist/cal";

import { components, internal } from "./_generated/api";
import { internalAction, mutation, query } from "./_generated/server";
import * as AI from "./model/ai";

// Create workflow manager instance
const workflow = new WorkflowManager(components.workflow);

// Validators for complex types
const listValidator = v.object({
  value: v.string(),
});

/**
 * Process event from raw text (query for preview)
 */
export const eventFromRawText = query({
  args: {
    rawText: v.string(),
    timezone: v.string(),
  },
  returns: v.object({
    events: v.array(
      v.object({
        name: v.string(),
        startDate: v.string(),
        endDate: v.string(),
        startTime: v.optional(v.string()),
        endTime: v.optional(v.string()),
        timeZone: v.optional(v.string()),
        location: v.optional(v.string()),
        description: v.optional(v.string()),
        images: v.optional(v.array(v.string())),
        eventMetadata: v.optional(v.any()),
      }),
    ),
    response: v.string(),
  }),
  handler: async (ctx, args) => {
    return await AI.processEventFromRawText(args.rawText, args.timezone);
  },
});

/**
 * Process events from URL (query for preview)
 */
export const eventsFromUrl = query({
  args: {
    url: v.string(),
    timezone: v.string(),
  },
  returns: v.object({
    events: v.array(
      v.object({
        name: v.string(),
        startDate: v.string(),
        endDate: v.string(),
        startTime: v.optional(v.string()),
        endTime: v.optional(v.string()),
        timeZone: v.optional(v.string()),
        location: v.optional(v.string()),
        description: v.optional(v.string()),
        images: v.optional(v.array(v.string())),
        eventMetadata: v.optional(v.any()),
      }),
    ),
    response: v.string(),
  }),
  handler: async (ctx, args) => {
    return await AI.processEventFromUrl(args.url, args.timezone);
  },
});

/**
 * Process event from image URL (query for preview)
 */
export const eventFromImage = query({
  args: {
    imageUrl: v.string(),
    timezone: v.string(),
  },
  returns: v.object({
    events: v.array(
      v.object({
        name: v.string(),
        startDate: v.string(),
        endDate: v.string(),
        startTime: v.optional(v.string()),
        endTime: v.optional(v.string()),
        timeZone: v.optional(v.string()),
        location: v.optional(v.string()),
        description: v.optional(v.string()),
        images: v.optional(v.array(v.string())),
        eventMetadata: v.optional(v.any()),
      }),
    ),
    response: v.string(),
  }),
  handler: async (ctx, args) => {
    return await AI.processEventFromImage(args.imageUrl, args.timezone);
  },
});

/**
 * Create event from raw text with notification
 */
export const eventFromRawTextThenCreateThenNotification = mutation({
  args: {
    rawText: v.string(),
    timezone: v.string(),
    comment: v.optional(v.string()),
    lists: v.array(listValidator),
    visibility: v.optional(v.union(v.literal("public"), v.literal("private"))),
    sendNotification: v.optional(v.boolean()),
    userId: v.string(),
    username: v.string(),
  },
  returns: v.object({
    success: v.boolean(),
    eventId: v.optional(v.string()),
    event: v.optional(v.any()),
    error: v.optional(v.string()),
  }),
  handler: async (ctx, args) => {
    // do stuff - process raw text and create event
    return {
      success: true,
      eventId: "stub-event-id",
      event: { id: "stub-event-id", name: "Stub Event" },
    };
  },
});

/**
 * Create event from URL with notification
 */
export const eventFromUrlThenCreateThenNotification = mutation({
  args: {
    url: v.string(),
    timezone: v.string(),
    comment: v.optional(v.string()),
    lists: v.array(listValidator),
    visibility: v.optional(v.union(v.literal("public"), v.literal("private"))),
    sendNotification: v.optional(v.boolean()),
    userId: v.string(),
    username: v.string(),
  },
  returns: v.object({
    success: v.boolean(),
    eventId: v.optional(v.string()),
    event: v.optional(v.any()),
    error: v.optional(v.string()),
  }),
  handler: async (ctx, args) => {
    // do stuff - process URL and create event
    return {
      success: true,
      eventId: "stub-event-id",
      event: { id: "stub-event-id", name: "Stub Event" },
    };
  },
});

/**
 * Create event from image URL with notification
 */
export const eventFromImageThenCreateThenNotification = mutation({
  args: {
    imageUrl: v.string(),
    timezone: v.string(),
    comment: v.optional(v.string()),
    lists: v.array(listValidator),
    visibility: v.optional(v.union(v.literal("public"), v.literal("private"))),
    sendNotification: v.optional(v.boolean()),
    userId: v.string(),
    username: v.string(),
  },
  returns: v.object({
    success: v.boolean(),
    eventId: v.optional(v.string()),
    event: v.optional(v.any()),
    error: v.optional(v.string()),
  }),
  handler: async (ctx, args) => {
    // do stuff - process image and create event
    return {
      success: true,
      eventId: "stub-event-id",
      event: { id: "stub-event-id", name: "Stub Event" },
    };
  },
});

/**
 * Create event from base64 image using workflow
 */
export const eventFromImageBase64ThenCreate = mutation({
  args: {
    base64Image: v.string(),
    timezone: v.string(),
    comment: v.optional(v.string()),
    lists: v.array(listValidator),
    visibility: v.optional(v.union(v.literal("public"), v.literal("private"))),
    sendNotification: v.optional(v.boolean()),
    userId: v.string(),
    username: v.string(),
  },
  returns: v.object({
    success: v.boolean(),
    workflowId: v.string(),
  }),
  handler: async (
    ctx,
    args,
  ): Promise<{ success: boolean; workflowId: string }> => {
    // Start the workflow
    const workflowId: string = await workflow.start(
      ctx,
      internal.workflows.eventIngestion.eventFromImageBase64Workflow,
      args,
    );

    return {
      success: true,
      workflowId,
    };
  },
});

// ============================================================================
// INTERNAL ACTIONS FOR WORKFLOW
// ============================================================================

/**
 * Extract event data from base64 image using AI
 */
export const extractEventFromBase64Image = internalAction({
  args: {
    base64Image: v.string(),
    timezone: v.string(),
  },
  returns: v.object({
    events: v.array(v.any()), // TODO: Use proper event validator
    response: v.string(),
  }),
  handler: async (
    ctx,
    args,
  ): Promise<{ events: EventWithMetadata[]; response: string }> => {
    return await AI.processEventFromBase64Image(ctx, {
      base64Image: args.base64Image,
      timezone: args.timezone,
    });
  },
});

/**
 * Validate that we have at least one valid event
 */
export const validateFirstEvent = internalAction({
  args: {
    events: v.array(v.any()),
  },
  returns: v.any(), // TODO: Use proper event validator
  handler: (ctx, args) => {
    return AI.validateFirstEvent(args.events);
  },
});
