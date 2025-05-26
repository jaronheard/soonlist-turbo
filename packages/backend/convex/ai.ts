import { ConvexError, v } from "convex/values";

import { api } from "./_generated/api";
import { action, mutation, query } from "./_generated/server";
import * as AI from "./model/ai";
import * as Events from "./model/events";

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
    try {
      // Process the event from raw text
      const { events } = await AI.processEventFromRawText(
        args.rawText,
        args.timezone,
      );

      const validatedEvent = AI.validateFirstEvent(events);

      // Create the event
      const eventResult = await Events.createEvent(
        ctx,
        args.userId,
        args.username,
        validatedEvent,
        validatedEvent.eventMetadata,
        args.comment,
        args.lists,
        args.visibility,
      );

      const eventId = eventResult.id;

      // Get the created event
      const createdEvent = await Events.getEventById(ctx, eventId);

      // Send notification if enabled (simplified for now)
      if (args.sendNotification !== false) {
        console.log(
          `Would send notification for event ${eventId} to user ${args.userId}`,
        );
      }

      return {
        success: true,
        eventId,
        event: createdEvent,
      };
    } catch (error) {
      console.error(
        "Error in eventFromRawTextThenCreateThenNotification:",
        error,
      );

      return {
        success: false,
        error:
          error instanceof Error ? error.message : "Unknown error occurred",
      };
    }
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
    try {
      // Process the event from URL
      const { events } = await AI.processEventFromUrl(args.url, args.timezone);

      const validatedEvent = AI.validateFirstEvent(events);

      // Create the event
      const eventResult = await Events.createEvent(
        ctx,
        args.userId,
        args.username,
        validatedEvent,
        validatedEvent.eventMetadata,
        args.comment,
        args.lists,
        args.visibility,
      );

      const eventId = eventResult.id;

      // Get the created event
      const createdEvent = await Events.getEventById(ctx, eventId);

      // Send notification if enabled (simplified for now)
      if (args.sendNotification !== false) {
        console.log(
          `Would send notification for event ${eventId} to user ${args.userId}`,
        );
      }

      return {
        success: true,
        eventId,
        event: createdEvent,
      };
    } catch (error) {
      console.error("Error in eventFromUrlThenCreateThenNotification:", error);

      return {
        success: false,
        error:
          error instanceof Error ? error.message : "Unknown error occurred",
      };
    }
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
    try {
      // Process the event from image
      const { events } = await AI.processEventFromImage(
        args.imageUrl,
        args.timezone,
      );

      const validatedEvent = AI.validateFirstEvent(events);

      // Create the event
      const eventResult = await Events.createEvent(
        ctx,
        args.userId,
        args.username,
        validatedEvent,
        validatedEvent.eventMetadata,
        args.comment,
        args.lists,
        args.visibility,
      );

      const eventId = eventResult.id;

      // Get the created event
      const createdEvent = await Events.getEventById(ctx, eventId);

      // Send notification if enabled (simplified for now)
      if (args.sendNotification !== false) {
        console.log(
          `Would send notification for event ${eventId} to user ${args.userId}`,
        );
      }

      return {
        success: true,
        eventId,
        event: createdEvent,
      };
    } catch (error) {
      console.error(
        "Error in eventFromImageThenCreateThenNotification:",
        error,
      );

      return {
        success: false,
        error:
          error instanceof Error ? error.message : "Unknown error occurred",
      };
    }
  },
});

/**
 * Create event from base64 image
 */
export const eventFromImageBase64ThenCreate = action({
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
    eventId: v.optional(v.string()),
    event: v.optional(v.any()),
    error: v.optional(v.string()),
  }),
  handler: async (
    ctx,
    args,
  ): Promise<{
    success: boolean;
    eventId?: string;
    event?: unknown;
    error?: string;
  }> => {
    try {
      // Start AI processing and image upload in parallel
      const [aiResult, uploadResult] = await Promise.allSettled([
        AI.processEventFromBase64Image(args.base64Image, args.timezone),
        AI.uploadImageToCDNFromBase64(args.base64Image),
      ]);

      // Handle AI processing result
      if (aiResult.status === "rejected") {
        console.error("AI Processing failed:", aiResult.reason);
        throw new ConvexError("Failed to process event data from image.");
      }

      const { events } = aiResult.value;
      const validatedEvent = AI.validateFirstEvent(events);

      // Handle image upload result (log error but don't fail the request)
      let uploadedImageUrl: string | null = null;
      if (uploadResult.status === "fulfilled") {
        uploadedImageUrl = uploadResult.value;
      } else {
        console.error("Image upload failed:", uploadResult.reason);
      }

      // Add uploaded image to event if successful
      if (uploadedImageUrl) {
        validatedEvent.images = [uploadedImageUrl];
      }

      // Create the event using mutation
      const eventResult: { id: string } = await ctx.runMutation(
        api.events.create,
        {
          event: validatedEvent,
          eventMetadata: validatedEvent.eventMetadata,
          comment: args.comment,
          lists: args.lists,
          visibility: args.visibility,
        },
      );

      const eventId: string = eventResult.id;

      // Get the created event
      const createdEvent: unknown = await ctx.runQuery(api.events.get, {
        eventId,
      });

      // Send notification if enabled (simplified for now)
      if (args.sendNotification !== false) {
        console.log(
          `Would send notification for event ${eventId} to user ${args.userId}`,
        );
      }

      return {
        success: true,
        eventId,
        event: createdEvent,
      };
    } catch (error) {
      console.error("Error in eventFromImageBase64ThenCreate:", error);

      return {
        success: false,
        error:
          error instanceof Error
            ? error.message
            : "Unknown error occurred while processing image event",
      };
    }
  },
});
