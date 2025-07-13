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

// NEW DIRECT FUNCTIONS WITHOUT WORKFLOW OVERHEAD
// ============================================================================

/**
 * Direct event creation from base64 image - no workflow overhead
 */
/**
 * Process single image - internal action that can be called from mutations
 */
export const processSingleImage = internalAction({
  args: {
    base64Image: v.string(),
    timezone: v.string(),
    comment: v.optional(v.string()),
    lists: v.array(listValidator),
    visibility: v.optional(v.union(v.literal("public"), v.literal("private"))),
    userId: v.string(),
    username: v.string(),
    batchId: v.optional(v.string()),
  },
  returns: v.object({
    success: v.boolean(),
    eventId: v.optional(v.string()),
    error: v.optional(v.string()),
  }),
  handler: async (ctx, args) => {
    try {
      // Step 1: Extract event and upload image in parallel
      const [aiResult, uploadedImageUrl]: [
        { events: EventWithMetadata[]; response: string },
        string,
      ] = await Promise.all([
        ctx.runAction(internal.ai.extractEventFromBase64Image, {
          base64Image: args.base64Image,
          timezone: args.timezone,
        }),
        ctx.runAction(internal.files.uploadImage, {
          base64Image: args.base64Image,
        }),
      ]);

      // Step 2: Validate first event
      if (aiResult.events.length === 0) {
        throw new ConvexError({
          message: "No events found in image",
          data: { eventsCount: 0 },
        });
      }

      const firstEvent: EventWithMetadata | undefined = aiResult.events[0];
      if (!firstEvent) {
        throw new ConvexError({
          message: "No events found to validate",
          data: { eventsCount: 0 },
        });
      }

      AI.validateEvent(firstEvent);

      // Step 3: Insert event into database
      const eventArgs = {
        comment: args.comment,
        lists: args.lists,
        visibility: args.visibility,
        userId: args.userId,
        username: args.username,
        batchId: args.batchId,
      };

      const eventId: string = await ctx.runMutation(
        internal.events.insertEvent,
        {
          firstEvent,
          uploadedImageUrl,
          timezone: args.timezone,
          ...eventArgs,
        },
      );

      return {
        success: true,
        eventId,
      };
    } catch (error) {
      console.error("Error processing image:", error);
      return {
        success: false,
        error:
          error instanceof Error ? error.message : "Unknown error occurred",
      };
    }
  },
});

/**
 * Direct event creation from base64 image - no workflow overhead
 */
export const eventFromImageBase64Direct = mutation({
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
    jobId: v.string(),
    error: v.optional(v.string()),
  }),
  handler: async (ctx, args) => {
    // Schedule the processing as an action (this allows parallel execution)
    const jobId: string = await ctx.scheduler.runAfter(
      0,
      internal.ai.processSingleImageWithNotification,
      {
        base64Image: args.base64Image,
        timezone: args.timezone,
        comment: args.comment,
        lists: args.lists,
        visibility: args.visibility,
        userId: args.userId,
        username: args.username,
        sendNotification: args.sendNotification ?? true,
      },
    );

    // Return immediately with a job ID for tracking
    return {
      success: true,
      jobId: jobId,
      error: undefined,
    };
  },
});

/**
 * Add images to an existing batch
 */
export const addImagesToBatch = mutation({
  args: {
    batchId: v.string(),
    images: v.array(
      v.object({
        base64Image: v.string(),
        tempId: v.string(),
      }),
    ),
  },
  returns: v.object({
    added: v.number(),
  }),
  handler: async (ctx, args) => {
    // Get the batch to verify it exists and belongs to the user
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) {
      throw new ConvexError("Not authenticated");
    }

    const batch = await ctx.db
      .query("eventBatches")
      .withIndex("by_batch_id", (q) => q.eq("batchId", args.batchId))
      .first();

    if (!batch) {
      throw new ConvexError("Batch not found");
    }

    if (batch.userId !== identity.subject) {
      throw new ConvexError("Unauthorized");
    }

    // Schedule processing for these new images
    const _jobId: string = await ctx.scheduler.runAfter(
      0,
      internal.ai.processAdditionalBatchImages,
      {
        batchId: args.batchId,
        images: args.images,
        userId: batch.userId,
      },
    );

    return {
      added: args.images.length,
    };
  },
});

/**
 * Batch event creation from multiple base64 images
 */
export const createEventBatch = mutation({
  args: {
    batchId: v.string(),
    images: v.array(
      v.object({
        base64Image: v.string(),
        tempId: v.string(), // Temporary ID for tracking on client
      }),
    ),
    totalCount: v.optional(v.number()), // Expected total count (for streaming)
    timezone: v.string(),
    comment: v.optional(v.string()),
    lists: v.array(listValidator),
    visibility: v.optional(v.union(v.literal("public"), v.literal("private"))),
    sendNotification: v.optional(v.boolean()),
    userId: v.string(),
    username: v.string(),
  },
  returns: v.object({
    batchId: v.string(),
    totalImages: v.number(),
    jobId: v.optional(v.string()),
  }),
  handler: async (
    ctx,
    args,
  ): Promise<{
    batchId: string;
    totalImages: number;
    jobId?: string;
  }> => {
    // Create batch tracking record
    await ctx.runMutation(internal.eventBatches.createBatch, {
      batchId: args.batchId,
      userId: args.userId,
      totalCount: args.totalCount ?? args.images.length,
      timezone: args.timezone,
    });

    // Only schedule processing if we have images
    let jobId: string | undefined;
    if (args.images.length > 0) {
      jobId = await ctx.scheduler.runAfter(0, internal.ai.processBatchImages, {
        batchId: args.batchId,
        images: args.images,
        timezone: args.timezone,
        comment: args.comment,
        lists: args.lists,
        visibility: args.visibility,
        userId: args.userId,
        username: args.username,
        sendNotification: args.sendNotification ?? true,
      });
    }

    return {
      batchId: args.batchId,
      totalImages: args.totalCount ?? args.images.length,
      jobId,
    };
  },
});

/**
 * Process single image with notification - internal action
 */
export const processSingleImageWithNotification = internalAction({
  args: {
    base64Image: v.string(),
    timezone: v.string(),
    comment: v.optional(v.string()),
    lists: v.array(listValidator),
    visibility: v.optional(v.union(v.literal("public"), v.literal("private"))),
    userId: v.string(),
    username: v.string(),
    sendNotification: v.boolean(),
  },
  handler: async (ctx, args) => {
    const result: { success: boolean; eventId?: string; error?: string } =
      await ctx.runAction(internal.ai.processSingleImage, {
        base64Image: args.base64Image,
        timezone: args.timezone,
        comment: args.comment,
        lists: args.lists,
        visibility: args.visibility,
        userId: args.userId,
        username: args.username,
      });

    if (result.success && result.eventId && args.sendNotification) {
      try {
        const _notificationResult = await ctx.runAction(
          internal.notifications.push,
          {
            eventId: result.eventId,
            userId: args.userId,
            userName: args.username,
          },
        );
      } catch (error) {
        console.error(`Failed to send notification:`, error);
      }
    }

    return result;
  },
});

/**
 * Process additional images for an existing batch
 */
export const processAdditionalBatchImages = internalAction({
  args: {
    batchId: v.string(),
    images: v.array(
      v.object({
        base64Image: v.string(),
        tempId: v.string(),
      }),
    ),
    userId: v.string(),
  },
  handler: async (ctx, args) => {
    // Get the batch info to get the other parameters
    const batch = await ctx.runQuery(internal.eventBatches.getBatchInfo, {
      batchId: args.batchId,
    });

    if (!batch) {
      throw new ConvexError("Batch not found");
    }

    // Process these images using the same logic as processBatchImages
    const results: {
      tempId: string;
      success: boolean;
      eventId?: string;
      error?: string;
    }[] = [];

    // Process images (reusing the chunk logic)
    const CHUNK_SIZE = 5;
    const chunks: (typeof args.images)[] = [];

    for (let i = 0; i < args.images.length; i += CHUNK_SIZE) {
      chunks.push(args.images.slice(i, i + CHUNK_SIZE));
    }

    const timezone = batch.timezone ?? "America/Los_Angeles"; // Default fallback

    for (const [_chunkIndex, chunk] of chunks.entries()) {
      const chunkResults = await Promise.allSettled(
        chunk.map(async (image) => {
          const result: { success: boolean; eventId?: string; error?: string } =
            await ctx.runAction(internal.ai.processSingleImage, {
              base64Image: image.base64Image,
              timezone: timezone,
              comment: undefined,
              lists: [],
              visibility: "private" as const,
              userId: args.userId,
              username: batch.username ?? args.userId,
              batchId: args.batchId,
            });
          return {
            tempId: image.tempId,
            ...result,
          };
        }),
      );

      // Convert Promise.allSettled results
      for (let i = 0; i < chunkResults.length; i++) {
        const result = chunkResults[i];
        const image = chunk[i];
        if (!result || !image) continue;

        if (result.status === "fulfilled") {
          results.push(result.value);
        } else {
          results.push({
            tempId: image.tempId,
            success: false,
            error:
              result.reason instanceof Error
                ? result.reason.message
                : "Processing failed",
          });
        }
      }
    }

    // Update batch progress
    const successCount = results.filter((r) => r.success).length;
    const failureCount = results.filter((r) => !r.success).length;

    await ctx.runMutation(internal.eventBatches.incrementBatchProgress, {
      batchId: args.batchId,
      successCount,
      failureCount,
    });

    return results;
  },
});

/**
 * Process batch of images - internal action
 */
export const processBatchImages = internalAction({
  args: {
    batchId: v.string(),
    images: v.array(
      v.object({
        base64Image: v.string(),
        tempId: v.string(),
      }),
    ),
    timezone: v.string(),
    comment: v.optional(v.string()),
    lists: v.array(listValidator),
    visibility: v.optional(v.union(v.literal("public"), v.literal("private"))),
    userId: v.string(),
    username: v.string(),
    sendNotification: v.boolean(),
  },
  handler: async (ctx, args) => {
    // Process in chunks to avoid overwhelming the system
    const CHUNK_SIZE = 5;
    const chunks: (typeof args.images)[] = [];

    for (let i = 0; i < args.images.length; i += CHUNK_SIZE) {
      chunks.push(args.images.slice(i, i + CHUNK_SIZE));
    }

    const allResults: {
      tempId: string;
      success: boolean;
      eventId?: string;
      error?: string;
    }[] = [];

    // Process chunks sequentially, items within chunks in parallel
    for (const [chunkIndex, chunk] of chunks.entries()) {
      const chunkResults = await Promise.allSettled(
        chunk.map(async (image) => {
          const result: { success: boolean; eventId?: string; error?: string } =
            await ctx.runAction(internal.ai.processSingleImage, {
              base64Image: image.base64Image,
              timezone: args.timezone,
              comment: args.comment,
              lists: args.lists,
              visibility: args.visibility,
              userId: args.userId,
              username: args.username,
              batchId: args.batchId,
            });
          return {
            tempId: image.tempId,
            ...result,
          };
        }),
      );

      // Convert Promise.allSettled results for this chunk
      for (let i = 0; i < chunkResults.length; i++) {
        const result = chunkResults[i];
        const image = chunk[i];
        if (!result || !image) {
          console.error(
            `Unexpected null result or image at index ${i} in chunk ${chunkIndex}`,
          );
          continue;
        }

        const tempId = image.tempId;

        if (result.status === "fulfilled") {
          allResults.push(result.value);
        } else {
          allResults.push({
            tempId,
            success: false,
            error:
              result.reason instanceof Error
                ? result.reason.message
                : "Processing failed",
          });
        }
      }
    }

    // Count successes and failures
    const successCount = allResults.filter((r) => r.success).length;
    const failureCount = allResults.filter((r) => !r.success).length;

    // Update batch status
    await ctx.runMutation(internal.eventBatches.updateBatchStatus, {
      batchId: args.batchId,
      successCount,
      failureCount,
      status: "completed",
    });

    // Send batch notification if enabled
    if (args.sendNotification) {
      // Collect failed image details for better error reporting
      const failedImages = allResults
        .filter((r) => !r.success)
        .map((r) => ({
          tempId: r.tempId,
          error: r.error || "Unknown error",
        }));

      try {
        await ctx.runAction(
          internal.eventBatches.sendBatchNotificationWithErrors,
          {
            batchId: args.batchId,
            userId: args.userId,
            username: args.username,
            totalCount: args.images.length,
            successCount,
            failureCount,
            failedImages,
          },
        );
      } catch (error) {
        console.error(`Failed to send batch notification:`, error);
      }
    }

    return allResults;
  },
});
