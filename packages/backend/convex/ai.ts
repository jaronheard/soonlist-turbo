import { WorkflowManager } from "@convex-dev/workflow";
import { ConvexError, v } from "convex/values";

import type { EventWithMetadata } from "@soonlist/cal";

import { components, internal } from "./_generated/api";
import { internalAction, mutation } from "./_generated/server";
import { eventDataValidator } from "./events";
import * as AI from "./model/ai";
import { fetchAndProcessEvent, validateJinaResponse } from "./model/aiHelpers";

// Create workflow manager instance
const workflow = new WorkflowManager(components.workflow);

// Validators for complex types
const listValidator = v.object({
  value: v.string(),
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
    events: v.array(eventDataValidator),
    response: v.string(),
  }),
  handler: async (
    ctx,
    args,
  ): Promise<{ events: EventWithMetadata[]; response: string }> => {
    const result = await AI.processEventFromBase64Image(ctx, {
      base64Image: args.base64Image,
      timezone: args.timezone,
    });

    // Strip buttonStyle and options fields that are added by addCommonAddToCalendarProps
    const cleanedEvents = result.events.map((event) => {
      const {
        buttonStyle: _buttonStyle,
        options: _options,
        ...cleanEvent
      } = event as EventWithMetadata & {
        buttonStyle?: unknown;
        options?: unknown;
      };
      return cleanEvent;
    });

    return {
      events: cleanedEvents,
      response: result.response,
    };
  },
});

export const extractEventFromUrl = internalAction({
  args: {
    url: v.string(),
    timezone: v.string(),
  },
  returns: v.object({
    events: v.array(eventDataValidator),
    response: v.string(),
  }),
  handler: async (
    ctx,
    args,
  ): Promise<{ events: EventWithMetadata[]; response: string }> => {
    try {
      // Check if the URL is a valid URL
      if (!args.url.startsWith("http")) {
        throw new ConvexError({
          message: "Invalid URL: URL must start with http",
          data: { args },
        });
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
      // The AI returns an array of events, validate each one
      if (!Array.isArray(aiResult.events)) {
        throw new ConvexError({
          message: "Invalid response: expected events array",
          data: { events: aiResult.events },
        });
      }

      // Validate each event in the array
      for (const event of aiResult.events) {
        AI.validateEvent(event);
      }

      // Strip buttonStyle and options fields that are added by addCommonAddToCalendarProps
      const cleanedEvents = aiResult.events.map((event) => {
        const {
          buttonStyle: _buttonStyle,
          options: _options,
          ...cleanEvent
        } = event as EventWithMetadata & {
          buttonStyle?: unknown;
          options?: unknown;
        };
        return cleanEvent;
      });

      return {
        events: cleanedEvents,
        response: aiResult.response,
      };
    } catch (error) {
      // Re-throw ConvexError as-is, wrap other errors
      if (error instanceof ConvexError) {
        throw error;
      }

      throw new ConvexError({
        message:
          error instanceof Error
            ? error.message
            : "Unknown error occurred while processing URL",
        data: { error: error instanceof Error ? error.stack : String(error) },
      });
    }
  },
});

export const extractEventFromText = internalAction({
  args: {
    rawText: v.string(),
    timezone: v.string(),
  },
  returns: v.object({
    events: v.array(eventDataValidator),
    response: v.string(),
  }),
  handler: async (
    ctx,
    args,
  ): Promise<{ events: EventWithMetadata[]; response: string }> => {
    const result = await AI.processEventFromText(ctx, {
      rawText: args.rawText,
      timezone: args.timezone,
      userId: "workflow",
      username: "workflow",
      lists: [],
    });

    // Strip buttonStyle and options fields that are added by addCommonAddToCalendarProps
    const cleanedEvents = result.events.map((event) => {
      const {
        buttonStyle: _buttonStyle,
        options: _options,
        ...cleanEvent
      } = event as EventWithMetadata & {
        buttonStyle?: unknown;
        options?: unknown;
      };
      return cleanEvent;
    });

    return {
      events: cleanedEvents,
      response: result.response,
    };
  },
});

/**
 * Validate first event from an array of events
 */
export const validateFirstEvent = internalAction({
  args: {
    events: v.array(eventDataValidator),
  },
  returns: eventDataValidator,
  handler: (_ctx, args) => {
    if (args.events.length === 0) {
      throw new ConvexError({
        message: "No events found to validate",
        data: { eventsCount: 0 },
      });
    }

    const firstEvent = args.events[0];

    // eslint-disable-next-line @typescript-eslint/no-unnecessary-condition -- this ensures correct type
    if (!firstEvent) {
      throw new ConvexError({
        message: "No events found to validate",
        data: { eventsCount: 0 },
      });
    }

    // Additional validation can be done here
    AI.validateEvent(firstEvent);

    // The validator ensures all required fields are present
    // Return the validated event which now has all required fields populated
    return firstEvent;
  },
});
