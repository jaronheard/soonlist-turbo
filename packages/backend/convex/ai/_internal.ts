"use node";

import { Buffer } from "buffer";
import { ConvexError, v } from "convex/values";

import type { AIEventResponse, ProcessedEventResponse } from "./helpers";
import { internal } from "../_generated/api";
import {
  internalAction,
  internalMutation,
  internalQuery,
} from "../_generated/server";
import { generatePublicId } from "../utils";
import {
  fetchAndProcessEvent,
  getDayBounds,
  uploadImageToCDNFromBase64,
  validateFirstEvent,
} from "./helpers";

// Input validators for internal functions
const createEventInputValidator = v.object({
  timezone: v.string(),
  comment: v.optional(v.string()),
  lists: v.array(v.object({ value: v.string() })),
  visibility: v.optional(v.union(v.literal("public"), v.literal("private"))),
  sendNotification: v.optional(v.boolean()),
  userId: v.string(),
  username: v.string(),
  rawText: v.optional(v.string()),
  url: v.optional(v.string()),
  imageUrl: v.optional(v.string()),
  base64Image: v.optional(v.string()),
});

// Return validators
const processedEventResponseValidator = v.object({
  events: v.array(v.any()),
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
 * Process raw text to extract event information
 */
export const processEventFromRawText = internalQuery({
  args: v.object({
    rawText: v.string(),
    timezone: v.string(),
  }),
  returns: processedEventResponseValidator,
  handler: async (_ctx, args): Promise<ProcessedEventResponse> => {
    return await fetchAndProcessEvent({
      input: args,
      fnName: "processEventFromRawText",
    });
  },
});

/**
 * Process URL content to extract event information
 */
export const processEventFromUrl = internalQuery({
  args: v.object({
    url: v.string(),
    timezone: v.string(),
  }),
  returns: processedEventResponseValidator,
  handler: async (_ctx, args): Promise<ProcessedEventResponse> => {
    return await fetchAndProcessEvent({
      input: args,
      fnName: "processEventFromUrl",
    });
  },
});

/**
 * Process image to extract event information
 */
export const processEventFromImage = internalQuery({
  args: v.object({
    imageUrl: v.string(),
    timezone: v.string(),
  }),
  returns: processedEventResponseValidator,
  handler: async (_ctx, args): Promise<ProcessedEventResponse> => {
    return await fetchAndProcessEvent({
      input: args,
      fnName: "processEventFromImage",
    });
  },
});

/**
 * Create event from raw text with AI processing and notification
 */
export const createEventFromRawText = internalAction({
  args: createEventInputValidator,
  returns: aiEventResponseValidator,
  handler: async (ctx, args): Promise<AIEventResponse> => {
    try {
      // Process the event using AI
      const result = await ctx.runQuery(
        internal.ai._internal.processEventFromRawText,
        {
          rawText: args.rawText!,
          timezone: args.timezone,
        },
      );

      if (!result.events.length) {
        return {
          success: false,
          error: "No events found in AI response",
        };
      }

      const validatedEvent = validateFirstEvent(result.events);

      // Get daily events count
      const dailyEvents = await ctx.runQuery(
        internal.ai._internal.getDailyEventsCount,
        {
          userId: args.userId,
          timezone: args.timezone,
        },
      );

      // Create the event
      const eventId = await ctx.runMutation(internal.ai._internal.createEvent, {
        ...args,
        events: result.events,
      });

      // Send notification if enabled
      if (args.sendNotification !== false) {
        await ctx.runAction(internal.ai._internal.sendEventNotification, {
          userId: args.userId,
          eventId,
          eventName: validatedEvent.name || "New Event",
          eventCount: dailyEvents.count,
          source: "rawText",
        });
      }

      return {
        success: true,
        eventId,
      };
    } catch (error) {
      console.error("Error creating event from raw text:", error);
      return {
        success: false,
        error: error instanceof Error ? error.message : "Unknown error",
      };
    }
  },
});

/**
 * Create event from URL with AI processing and notification
 */
export const createEventFromUrl = internalAction({
  args: createEventInputValidator,
  returns: aiEventResponseValidator,
  handler: async (ctx, args): Promise<AIEventResponse> => {
    try {
      // Process the event using AI
      const result = await ctx.runQuery(
        internal.ai._internal.processEventFromUrl,
        {
          url: args.url!,
          timezone: args.timezone,
        },
      );

      if (!result.events.length) {
        return {
          success: false,
          error: "No events found in AI response",
        };
      }

      const validatedEvent = validateFirstEvent(result.events);

      // Get daily events count
      const dailyEvents = await ctx.runQuery(
        internal.ai._internal.getDailyEventsCount,
        {
          userId: args.userId,
          timezone: args.timezone,
        },
      );

      // Create the event
      const eventId = await ctx.runMutation(internal.ai._internal.createEvent, {
        ...args,
        events: result.events,
      });

      // Send notification if enabled
      if (args.sendNotification !== false) {
        await ctx.runAction(internal.ai._internal.sendEventNotification, {
          userId: args.userId,
          eventId,
          eventName: validatedEvent.name || "New Event",
          eventCount: dailyEvents.count,
          source: "url",
        });
      }

      return {
        success: true,
        eventId,
      };
    } catch (error) {
      console.error("Error creating event from URL:", error);
      return {
        success: false,
        error: error instanceof Error ? error.message : "Unknown error",
      };
    }
  },
});

/**
 * Create event from image with AI processing and notification
 */
export const createEventFromImage = internalAction({
  args: createEventInputValidator,
  returns: aiEventResponseValidator,
  handler: async (ctx, args): Promise<AIEventResponse> => {
    try {
      // Process the event using AI
      const result = await ctx.runQuery(
        internal.ai._internal.processEventFromImage,
        {
          imageUrl: args.imageUrl!,
          timezone: args.timezone,
        },
      );

      if (!result.events.length) {
        return {
          success: false,
          error: "No events found in AI response",
        };
      }

      const validatedEvent = validateFirstEvent(result.events);

      // Get daily events count
      const dailyEvents = await ctx.runQuery(
        internal.ai._internal.getDailyEventsCount,
        {
          userId: args.userId,
          timezone: args.timezone,
        },
      );

      // Create the event
      const eventId = await ctx.runMutation(internal.ai._internal.createEvent, {
        ...args,
        events: result.events,
      });

      // Send notification if enabled
      if (args.sendNotification !== false) {
        await ctx.runAction(internal.ai._internal.sendEventNotification, {
          userId: args.userId,
          eventId,
          eventName: validatedEvent.name || "New Event",
          eventCount: dailyEvents.count,
          source: "image",
        });
      }

      return {
        success: true,
        eventId,
      };
    } catch (error) {
      console.error("Error creating event from image:", error);
      return {
        success: false,
        error: error instanceof Error ? error.message : "Unknown error",
      };
    }
  },
});

/**
 * Create event from base64 image with AI processing
 */
export const createEventFromBase64Image = internalAction({
  args: createEventInputValidator,
  returns: aiEventResponseValidator,
  handler: async (ctx, args): Promise<AIEventResponse> => {
    try {
      // Upload image and process with AI
      const uploadedImageUrl = await uploadImageToCDNFromBase64(
        args.base64Image!,
      );

      // Process the event using AI
      const result = await ctx.runQuery(
        internal.ai._internal.processEventFromImage,
        {
          imageUrl: uploadedImageUrl || args.base64Image!,
          timezone: args.timezone,
        },
      );

      if (!result.events.length) {
        return {
          success: false,
          error: "No events found in AI response",
        };
      }

      const validatedEvent = validateFirstEvent(result.events);

      // Get daily events count
      const dailyEvents = await ctx.runQuery(
        internal.ai._internal.getDailyEventsCount,
        {
          userId: args.userId,
          timezone: args.timezone,
        },
      );

      // Create the event
      const eventId = await ctx.runMutation(internal.ai._internal.createEvent, {
        ...args,
        events: result.events,
        uploadedImageUrl,
      });

      // Send notification if enabled
      if (args.sendNotification !== false) {
        await ctx.runAction(internal.ai._internal.sendEventNotification, {
          userId: args.userId,
          eventId,
          eventName: validatedEvent.name || "New Event",
          eventCount: dailyEvents.count,
          source: "image",
        });
      }

      return {
        success: true,
        eventId,
      };
    } catch (error) {
      console.error("Error creating event from base64 image:", error);
      return {
        success: false,
        error: error instanceof Error ? error.message : "Unknown error",
      };
    }
  },
});

/**
 * Get daily events count for a user
 */
export const getDailyEventsCount = internalQuery({
  args: v.object({
    userId: v.string(),
    timezone: v.string(),
  }),
  returns: v.object({
    count: v.number(),
  }),
  handler: async (ctx, args) => {
    const { start, end } = getDayBounds(args.timezone);

    const events = await ctx.db
      .query("events")
      .withIndex("by_user", (q) => q.eq("userId", args.userId))
      .filter((q) =>
        q.and(
          q.gte(q.field("_creationTime"), start.getTime()),
          q.lte(q.field("_creationTime"), end.getTime()),
        ),
      )
      .collect();

    return { count: events.length };
  },
});

/**
 * Create event in database
 */
export const createEvent = internalMutation({
  args: v.object({
    timezone: v.string(),
    comment: v.optional(v.string()),
    lists: v.array(v.object({ value: v.string() })),
    visibility: v.optional(v.union(v.literal("public"), v.literal("private"))),
    userId: v.string(),
    username: v.string(),
    events: v.array(v.any()),
    uploadedImageUrl: v.optional(v.string()),
  }),
  returns: v.string(),
  handler: async (ctx, args) => {
    if (!args.events.length) {
      throw new ConvexError("No events to create");
    }

    const firstEvent = args.events[0];
    const eventId = generatePublicId();
    const now = new Date().toISOString();

    // Create the event
    await ctx.db.insert("events", {
      id: eventId,
      userId: args.userId,
      userName: args.username,
      event: firstEvent,
      startDateTime: now, // This should be calculated from the event data
      endDateTime: now, // This should be calculated from the event data
      visibility: args.visibility || "public",
      created_at: now,
      updatedAt: null,
      // Extract fields from event object
      name: firstEvent.name,
      image: args.uploadedImageUrl || firstEvent.images?.[0] || null,
      endDate: firstEvent.endDate,
      endTime: firstEvent.endTime,
      location: firstEvent.location,
      timeZone: firstEvent.timeZone || args.timezone,
      startDate: firstEvent.startDate,
      startTime: firstEvent.startTime,
      description: firstEvent.description,
    });

    // Add comment if provided
    if (args.comment) {
      await ctx.db.insert("comments", {
        eventId,
        content: args.comment,
        userId: args.userId,
        id: Date.now(), // This should be a proper ID
        oldId: null,
        created_at: now,
        updatedAt: null,
      });
    }

    // Add to lists if provided
    if (args.lists.length > 0) {
      for (const list of args.lists) {
        await ctx.db.insert("eventToLists", {
          eventId,
          listId: list.value,
        });
      }
    }

    return eventId;
  },
});

/**
 * Send event notification
 */
export const sendEventNotification = internalAction({
  args: v.object({
    userId: v.string(),
    eventId: v.string(),
    eventName: v.string(),
    eventCount: v.number(),
    source: v.string(),
  }),
  returns: v.null(),
  handler: async (_ctx, args) => {
    // Mock notification sending - this would integrate with the actual notification system
    console.log(
      `Sending notification to user ${args.userId} for event ${args.eventId}`,
    );
    console.log(
      `Event: ${args.eventName}, Count: ${args.eventCount}, Source: ${args.source}`,
    );
    return null;
  },
});
