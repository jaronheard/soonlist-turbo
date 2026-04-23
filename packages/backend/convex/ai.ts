import { WorkflowManager } from "@convex-dev/workflow";
import { ConvexError, v } from "convex/values";

import type { EventWithMetadata } from "@soonlist/cal";

import { components, internal } from "./_generated/api";
import { internalAction, mutation } from "./_generated/server";
import { DEFAULT_TIMEZONE } from "./constants";
import { eventDataValidator } from "./events";
import * as AI from "./model/ai";
import { fetchAndProcessEvent, validateJinaResponse } from "./model/aiHelpers";

const workflow = new WorkflowManager(components.workflow);

const listValidator = v.object({
  value: v.string(),
});

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
      if (!args.url.startsWith("http")) {
        throw new ConvexError({
          message: "Invalid URL: URL must start with http",
          data: { args },
        });
      }

      const aiResult = await fetchAndProcessEvent({
        ctx,
        input: {
          url: args.url,
          timezone: args.timezone,
        },
        fnName: "eventFromUrlThenCreateThenNotification",
      });

      validateJinaResponse(aiResult);

      if (!Array.isArray(aiResult.events)) {
        throw new ConvexError({
          message: "Invalid response: expected events array",
          data: { events: aiResult.events },
        });
      }

      for (const event of aiResult.events) {
        AI.validateEvent(event);
      }

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

    AI.validateEvent(firstEvent);

    return firstEvent;
  },
});


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
    format: v.optional(
      v.union(v.literal("image/webp"), v.literal("image/jpeg")),
    ),
  },
  returns: v.object({
    success: v.boolean(),
    eventId: v.optional(v.string()),
    error: v.optional(v.string()),
  }),
  handler: async (ctx, args) => {
    try {
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
          contentType: args.format,
        }),
      ]);

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
    format: v.optional(
      v.union(v.literal("image/webp"), v.literal("image/jpeg")),
    ),
  },
  returns: v.object({
    success: v.boolean(),
    jobId: v.string(),
    error: v.optional(v.string()),
  }),
  handler: async (ctx, args) => {
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
        format: args.format,
      },
    );

    return {
      success: true,
      jobId: jobId,
      error: undefined,
    };
  },
});

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
    await ctx.runMutation(internal.eventBatches.createBatch, {
      batchId: args.batchId,
      userId: args.userId,
      totalCount: args.totalCount ?? args.images.length,
      timezone: args.timezone,
    });

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
    format: v.optional(
      v.union(v.literal("image/webp"), v.literal("image/jpeg")),
    ),
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
        format: args.format,
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
    const batch = await ctx.runQuery(internal.eventBatches.getBatchInfo, {
      batchId: args.batchId,
    });

    if (!batch) {
      throw new ConvexError("Batch not found");
    }

    const results: {
      tempId: string;
      success: boolean;
      eventId?: string;
      error?: string;
    }[] = [];

    const CHUNK_SIZE = 5;
    const chunks: (typeof args.images)[] = [];

    for (let i = 0; i < args.images.length; i += CHUNK_SIZE) {
      chunks.push(args.images.slice(i, i + CHUNK_SIZE));
    }

    const timezone = batch.timezone ?? DEFAULT_TIMEZONE;

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

    const successCount = allResults.filter((r) => r.success).length;
    const failureCount = allResults.filter((r) => !r.success).length;

    await ctx.runMutation(internal.eventBatches.updateBatchStatus, {
      batchId: args.batchId,
      successCount,
      failureCount,
      status: "completed",
    });

    if (args.sendNotification) {
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
