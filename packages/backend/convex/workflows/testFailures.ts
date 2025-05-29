import { vWorkflowId, WorkflowManager } from "@convex-dev/workflow";
import { v } from "convex/values";

import { components, internal } from "../_generated/api";
import { mutation } from "../_generated/server";

const workflow = new WorkflowManager(components.workflow);

/**
 * Test function that simulates AI extraction failure
 */
export const testAIExtractionFailure = mutation({
  args: {
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
    // Start workflow with a known bad base64 string that will cause AI extraction to fail
    const workflowId: string = await workflow.start(
      ctx,
      internal.workflows.eventIngestion.eventFromImageBase64Workflow,
      {
        base64Image: "invalid-base64-data", // This will cause AI extraction to fail
        timezone: "America/New_York",
        comment: "Test AI failure",
        lists: [],
        visibility: "private" as const,
        sendNotification: true,
        userId: args.userId,
        username: args.username,
      },
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
 * Test function that simulates image upload failure
 */
export const testImageUploadFailure = mutation({
  args: {
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
    // Start workflow with empty base64 string that will cause upload to fail
    const workflowId: string = await workflow.start(
      ctx,
      internal.workflows.eventIngestion.eventFromImageBase64Workflow,
      {
        base64Image: "", // Empty string will cause upload to fail
        timezone: "America/New_York",
        comment: "Test upload failure",
        lists: [],
        visibility: "private" as const,
        sendNotification: true,
        userId: args.userId,
        username: args.username,
      },
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
 * Test function that simulates validation failure by providing data that won't validate
 */
export const testValidationFailure = mutation({
  args: {
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
    // Start workflow with a base64 string that might extract but will fail validation
    const workflowId: string = await workflow.start(
      ctx,
      internal.workflows.eventIngestion.eventFromImageBase64Workflow,
      {
        base64Image:
          "data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNkYPhfDwAChwGA60e6kgAAAABJRU5ErkJggg==", // 1x1 transparent pixel - will likely produce no events
        timezone: "America/New_York",
        comment: "Test validation failure",
        lists: [],
        visibility: "private" as const,
        sendNotification: true,
        userId: args.userId,
        username: args.username,
      },
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
 * Test function that simulates database insertion failure
 * This is harder to simulate without actually breaking the DB, so we'll rely on integration testing
 */
export const testDatabaseFailure = mutation({
  args: {
    userId: v.string(),
    username: v.string(),
  },
  returns: v.object({
    success: v.boolean(),
    workflowId: v.string(),
    note: v.string(),
  }),
  handler: async (ctx, args) => {
    return {
      success: false,
      workflowId: "test-db-failure",
      note: "Database failures are hard to simulate safely. Use integration tests with invalid data or temporarily broken constraints.",
    };
  },
});

/**
 * Workflow status checker to validate that workflows are failing and notifications are being sent
 */
export const checkWorkflowFailureStatus = mutation({
  args: {
    workflowId: vWorkflowId,
  },
  returns: v.object({
    workflowStatus: v.string(),
    hasOnCompleteHandler: v.boolean(),
    error: v.optional(v.string()),
    timestamp: v.number(),
  }),
  handler: async (ctx, args) => {
    try {
      const status = await ctx.runQuery(
        components.workflow.workflow.getStatus,
        {
          workflowId: args.workflowId,
        },
      );

      let workflowStatus = "unknown";
      let error: string | undefined;

      if (status.workflow.runResult) {
        const runResult = status.workflow.runResult;
        if (runResult.kind === "success") {
          workflowStatus = "completed";
        } else if (runResult.kind === "failed") {
          workflowStatus = "failed";
          error = runResult.error;
        } else if (runResult.kind === "canceled") {
          workflowStatus = "canceled";
        }
      } else {
        workflowStatus = "in-progress";
      }

      return {
        workflowStatus,
        hasOnCompleteHandler: !!status.workflow.onComplete,
        error,
        timestamp: Date.now(),
      };
    } catch (error) {
      return {
        workflowStatus: "error-checking-status",
        hasOnCompleteHandler: false,
        error: error instanceof Error ? error.message : "Unknown error",
        timestamp: Date.now(),
      };
    }
  },
});

/**
 * Utility function to test notification system directly
 */
export const testNotificationSystemDirectly = mutation({
  args: {
    userId: v.string(),
    username: v.string(),
    failureReason: v.optional(v.string()),
  },
  returns: v.object({
    success: v.boolean(),
    notificationScheduled: v.boolean(),
    error: v.optional(v.string()),
  }),
  handler: async (ctx, args) => {
    try {
      // Directly test the failure notification system
      await ctx.scheduler.runAfter(0, internal.notifications.pushFailure, {
        userId: args.userId,
        userName: args.username,
        failureReason: args.failureReason || "Test failure notification",
      });

      return {
        success: true,
        notificationScheduled: true,
      };
    } catch (error) {
      return {
        success: false,
        notificationScheduled: false,
        error: error instanceof Error ? error.message : "Unknown error",
      };
    }
  },
});
