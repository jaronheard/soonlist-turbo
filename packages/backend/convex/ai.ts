import { WorkflowManager } from "@convex-dev/workflow";
import { ConvexError, v } from "convex/values";

import { EventWithMetadata } from "@soonlist/cal";

import { components, internal } from "./_generated/api";
import { internalAction, mutation, query } from "./_generated/server";
import * as AI from "./model/ai";
import { fetchAndProcessEvent } from "./model/aiHelpers";

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
 * Extract event data from URL using AI
 */
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

      // Content-based validation: Check what Jina actually returned
      const responseText = aiResult.response.toLowerCase();

      // 1. Check for Jina/network error responses
      if (
        responseText.includes("failed to fetch") ||
        responseText.includes("network error") ||
        responseText.includes("dns resolution failed") ||
        responseText.includes("connection refused") ||
        responseText.includes("timeout")
      ) {
        throw new ConvexError(
          "URL fetch failed: Network error or invalid domain",
        );
      }

      // 2. Check for HTTP error content
      if (
        responseText.includes("500 internal server error") ||
        responseText.includes("404 not found") ||
        responseText.includes("503 service unavailable") ||
        responseText.includes("error 500") ||
        responseText.includes("error 404")
      ) {
        throw new ConvexError(
          "URL content parsing failed: HTTP error status received",
        );
      }

      // 3. Check for robots.txt content specifically
      if (
        responseText.includes("user-agent:") &&
        responseText.includes("disallow:")
      ) {
        throw new ConvexError(
          "AI processing failed: Content is robots.txt file, not event information",
        );
      }

      // 4. Check for minimal/empty content that Jina couldn't process
      if (responseText.trim().length < 100) {
        throw new ConvexError(
          "URL content parsing failed: Insufficient content retrieved",
        );
      }

      // 5. Validate that we got meaningful events
      if (!aiResult.events || aiResult.events.length === 0) {
        throw new ConvexError(
          "Event validation failed: No events could be extracted from content",
        );
      }

      // 6. More strict validation: Check if ALL events lack proper date/time information
      const eventsWithValidDates = aiResult.events.filter((event) => {
        return (
          event.startDate &&
          event.startDate !== "TBD" &&
          event.startDate !== "Unknown" &&
          event.startDate !== "" &&
          !event.startDate.toLowerCase().includes("error")
        );
      });

      if (eventsWithValidDates.length === 0) {
        throw new ConvexError(
          "Event validation failed: No events with valid dates found",
        );
      }

      // 7. Check for extremely generic event names that suggest hallucination
      const eventsWithMeaningfulNames = aiResult.events.filter((event) => {
        const name = event.name?.toLowerCase() || "";
        const description = event.description?.toLowerCase() || "";

        // Invalid names (not patterns, so should be exact matches)
        const invalidNames = [
          "title",
          "name",
          "event name",
          "event title",
          "event description",
          "event name",
          "event title",
          "event description",
          "event name",
          "event title",
          "event description",
        ];

        // Very specific patterns that indicate the AI made something up from error/test content
        const invalidPatterns = [
          "paramvalidationerror",
          "domain resolution error",
          "domains could not be resolved",
          "domain could not be resolved",
          "domain resolution error",
          "robots.txt",
          "error page",
          "page not found",
          "server error",
          "httpbin test",
          "example page",
          "test content",
          "http error",
        ];

        const isInvalidName = invalidNames.some((invalid) =>
          name.includes(invalid),
        );

        const isInvalidPattern = invalidPatterns.some(
          (invalid) => name.includes(invalid) || description.includes(invalid),
        );

        const isTooShort = name.trim().length < 3;

        return !isInvalidName && !isTooShort && !isInvalidPattern;
      });

      if (eventsWithMeaningfulNames.length === 0) {
        throw new ConvexError(
          "Event validation failed: All extracted events appear to be hallucinated from non-event content",
        );
      }

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
