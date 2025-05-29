import { WorkflowManager } from "@convex-dev/workflow";
import { ConvexError, v } from "convex/values";

import { EventWithMetadata } from "@soonlist/cal";

import { components, internal } from "./_generated/api";
import { internalAction, mutation, query } from "./_generated/server";
import * as AI from "./model/ai";
import { fetchAndProcessEvent, validateJinaResponse } from "./model/aiHelpers";

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
    // For preview purposes, create a simplified version that doesn't require full context
    const result = await AI.processEventFromText(ctx, {
      rawText: args.rawText,
      timezone: args.timezone,
      userId: "preview",
      username: "preview",
      lists: [],
    });

    return {
      events: result.events,
      response: "Preview processed successfully",
    };
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
    // For preview purposes, create a simplified version that doesn't require full context
    const result = await AI.processEventFromUrl(ctx, {
      url: args.url,
      timezone: args.timezone,
      userId: "preview",
      username: "preview",
      lists: [],
    });

    return {
      events: result.events,
      response: "Preview processed successfully",
    };
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
    // This is just for preview - convert imageUrl to base64 would be needed
    // For now, return a placeholder since we don't have processEventFromImageUrl
    return {
      events: [],
      response: "Image URL processing not implemented for preview",
    };
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
    // Start the workflow with onComplete handler
    const workflowId: string = await workflow.start(
      ctx,
      internal.workflows.eventIngestion.eventFromImageBase64Workflow,
      args,
      {
        onComplete: internal.workflows.onComplete.handleEventIngestionComplete,
        context: {
          userId: args.userId,
          username: args.username,
        },
      },
    );

    return {
      success: true,
      workflowId,
    };
  },
});

/**
 * Create event from URL using workflow
 */
export const eventFromUrlThenCreate = mutation({
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
    workflowId: v.string(),
  }),
  handler: async (
    ctx,
    args,
  ): Promise<{ success: boolean; workflowId: string }> => {
    // Start the URL workflow with onComplete handler for failure notifications
    const workflowId: string = await workflow.start(
      ctx,
      internal.workflows.eventIngestion.eventFromUrlWorkflow,
      args,
      {
        onComplete: internal.workflows.onComplete.handleEventIngestionComplete,
        context: {
          userId: args.userId,
          username: args.username,
        },
      },
    );

    return {
      success: true,
      workflowId,
    };
  },
});

/**
 * Create event from text using workflow
 */
export const eventFromTextThenCreate = mutation({
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
    workflowId: v.string(),
  }),
  handler: async (
    ctx,
    args,
  ): Promise<{ success: boolean; workflowId: string }> => {
    // Start the text workflow with onComplete handler for failure notifications
    const workflowId: string = await workflow.start(
      ctx,
      internal.workflows.eventIngestion.eventFromTextWorkflow,
      args,
      {
        onComplete: internal.workflows.onComplete.handleEventIngestionComplete,
        context: {
          userId: args.userId,
          username: args.username,
        },
      },
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

export const extractEventFromUrl = internalAction({
  args: {
    url: v.string(),
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
    try {
      // Check if the URL is a valid URL
      if (!args.url.startsWith("http")) {
        throw new ConvexError("Invalid URL: URL must start with http");
      }

      // Let Jina API process the URL and get the actual response
      const aiResult = await fetchAndProcessEvent({
        ctx,
        input: {
          url: args.url,
          timezone: args.timezone,
        },
        fnName: "eventFromUrlThenCreateThenNotification",
      });

      // Use the new validateJinaResponse helper for content-based validation
      validateJinaResponse(aiResult);

      // Use the enhanced validateEvent function for event-specific validations
      AI.validateEvent(aiResult.events);

      return aiResult;
    } catch (error) {
      // Re-throw ConvexError as-is, wrap other errors
      if (error instanceof ConvexError) {
        throw error;
      }

      // Handle any unexpected errors from the Jina API or AI processing
      console.error("Unexpected error in extractEventFromUrl:", error);
      throw new ConvexError(
        `URL processing failed: ${error instanceof Error ? error.message : "Unknown error"}`,
      );
    }
  },
});

export const extractEventFromText = internalAction({
  args: {
    rawText: v.string(),
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
    const result = await fetchAndProcessEvent({
      ctx,
      input: {
        rawText: args.rawText,
        timezone: args.timezone,
      },
      fnName: "eventFromRawTextThenCreateThenNotification",
    });
    return result;
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
    if (!args.events || args.events.length === 0) {
      throw new ConvexError("No events found in response");
    }
    return AI.validateEvent(args.events[0]);
  },
});
