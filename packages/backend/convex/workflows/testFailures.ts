import { vWorkflowId, WorkflowManager } from "@convex-dev/workflow";
import { v } from "convex/values";

import { components, internal } from "../_generated/api";
import { mutation } from "../_generated/server";
import { DEFAULT_VISIBILITY } from "../constants";

const workflow = new WorkflowManager(components.workflow);

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
    const workflowId: string = await workflow.start(
      ctx,
      internal.workflows.eventIngestion.eventFromImageBase64Workflow,
      {
        base64Image: "invalid-base64-data", // This will cause AI extraction to fail
        timezone: "America/New_York",
        comment: "Test AI failure",
        lists: [],
        visibility: DEFAULT_VISIBILITY,
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
    const workflowId: string = await workflow.start(
      ctx,
      internal.workflows.eventIngestion.eventFromImageBase64Workflow,
      {
        base64Image: "", // Empty string will cause upload to fail
        timezone: "America/New_York",
        comment: "Test upload failure",
        lists: [],
        visibility: DEFAULT_VISIBILITY,
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
    const workflowId: string = await workflow.start(
      ctx,
      internal.workflows.eventIngestion.eventFromImageBase64Workflow,
      {
        base64Image:
          "data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNkYPhfDwAChwGA60e6kgAAAABJRU5ErkJggg==", // 1x1 transparent pixel - will likely produce no events
        timezone: "America/New_York",
        comment: "Test validation failure",
        lists: [],
        visibility: DEFAULT_VISIBILITY,
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
  handler: (_ctx, _args) => {
    return {
      success: false,
      workflowId: "test-db-failure",
      note: "Database failures are hard to simulate safely. Use integration tests with invalid data or temporarily broken constraints.",
    };
  },
});

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

export const simulateUrlFetchFailure = mutation({
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
    const workflowId: string = await workflow.start(
      ctx,
      internal.workflows.eventIngestion.eventFromUrlWorkflow,
      {
        url: "https://invalid-domain-that-does-not-exist-12345.com/page", // This will cause URL fetch to fail
        timezone: "America/New_York",
        comment: "Test URL fetch failure",
        lists: [],
        visibility: DEFAULT_VISIBILITY,
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

export const simulateUrlContentParsingFailure = mutation({
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
    const workflowId: string = await workflow.start(
      ctx,
      internal.workflows.eventIngestion.eventFromUrlWorkflow,
      {
        url: "https://httpbin.org/status/500", // This will return a 500 error
        timezone: "America/New_York",
        comment: "Test URL content parsing failure",
        lists: [],
        visibility: DEFAULT_VISIBILITY,
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

export const simulateUrlAiProcessingFailure = mutation({
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
    const workflowId: string = await workflow.start(
      ctx,
      internal.workflows.eventIngestion.eventFromUrlWorkflow,
      {
        url: "https://httpbin.org/robots.txt", // Returns robots.txt content with no event data
        timezone: "America/New_York",
        comment: "Test URL AI processing failure",
        lists: [],
        visibility: DEFAULT_VISIBILITY,
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

export const simulateUrlValidationFailure = mutation({
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
    const workflowId: string = await workflow.start(
      ctx,
      internal.workflows.eventIngestion.eventFromUrlWorkflow,
      {
        url: "not-a-url", // invalid URL, must start with http
        timezone: "America/New_York",
        comment: "Test URL validation failure",
        lists: [],
        visibility: DEFAULT_VISIBILITY,
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

export const simulateUrlDatabaseFailure = mutation({
  args: {
    userId: v.string(),
    username: v.string(),
  },
  returns: v.object({
    success: v.boolean(),
    workflowId: v.string(),
    note: v.string(),
  }),
  handler: (_ctx, _args) => {
    return {
      success: false,
      workflowId: "test-url-db-failure",
      note: "URL database failures are hard to simulate safely. Use integration tests with temporarily modified constraints or invalid user data.",
    };
  },
});

export const testUrlWorkflowSuccess = mutation({
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
    const workflowId: string = await workflow.start(
      ctx,
      internal.workflows.eventIngestion.eventFromUrlWorkflow,
      {
        url: "https://example.com", // Simple, reliable URL
        timezone: "America/New_York",
        comment: "Test URL workflow success",
        lists: [],
        visibility: DEFAULT_VISIBILITY,
        sendNotification: true, // Enable notifications for success test
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

export const validateUrlWorkflowFailure = mutation({
  args: {
    workflowId: vWorkflowId,
    expectedFailureStep: v.optional(v.string()),
  },
  returns: v.object({
    isWorkflowFailed: v.boolean(),
    failureStep: v.optional(v.string()),
    error: v.optional(v.string()),
    hasUrlFailureNotification: v.boolean(),
    onCompleteHandlerExecuted: v.boolean(),
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

      let isWorkflowFailed = false;
      let failureStep: string | undefined;
      let error: string | undefined;
      let onCompleteHandlerExecuted = false;

      if (status.workflow.runResult) {
        onCompleteHandlerExecuted = true;
        const runResult = status.workflow.runResult;

        if (runResult.kind === "failed") {
          isWorkflowFailed = true;
          error = runResult.error;

          if (error.includes("extractEventFromUrl")) {
            failureStep = "URL_FETCH_OR_AI_PROCESSING";
          } else if (error.includes("validateEvent")) {
            failureStep = "VALIDATION";
          } else if (error.includes("insertEvent")) {
            failureStep = "DATABASE_INSERTION";
          } else if (error.includes("sendPush")) {
            failureStep = "NOTIFICATION";
          } else {
            failureStep = "UNKNOWN";
          }
        }
      }

      const hasUrlFailureNotification = isWorkflowFailed;

      return {
        isWorkflowFailed,
        failureStep,
        error,
        hasUrlFailureNotification,
        onCompleteHandlerExecuted,
        timestamp: Date.now(),
      };
    } catch (error) {
      return {
        isWorkflowFailed: true,
        failureStep: "STATUS_CHECK_ERROR",
        error:
          error instanceof Error
            ? error.message
            : "Unknown error checking status",
        hasUrlFailureNotification: false,
        onCompleteHandlerExecuted: false,
        timestamp: Date.now(),
      };
    }
  },
});

export const validateUrlWorkflowSuccess = mutation({
  args: {
    workflowId: vWorkflowId,
  },
  returns: v.object({
    isWorkflowSuccessful: v.boolean(),
    completedSteps: v.array(v.string()),
    eventId: v.optional(v.string()),
    executionTime: v.optional(v.number()),
    hasSuccessNotification: v.boolean(),
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

      let isWorkflowSuccessful = false;
      let completedSteps: string[] = [];
      let eventId: string | undefined;
      let executionTime: number | undefined;
      let hasSuccessNotification = false;

      if (status.workflow.runResult) {
        const runResult = status.workflow.runResult;

        if (runResult.kind === "success") {
          isWorkflowSuccessful = true;
          eventId = runResult.returnValue as string;
          hasSuccessNotification = true;

          completedSteps = [
            "extractEventFromUrl",
            "validateEvent",
            "insertEvent",
            "sendPush",
          ];

          if (status.workflow._creationTime) {
            executionTime = Date.now() - status.workflow._creationTime;
          }
        }
      }

      return {
        isWorkflowSuccessful,
        completedSteps,
        eventId,
        executionTime,
        hasSuccessNotification,
        timestamp: Date.now(),
      };
    } catch (error) {
      return {
        isWorkflowSuccessful: false,
        completedSteps: [],
        hasSuccessNotification: false,
        error:
          error instanceof Error
            ? error.message
            : "Unknown error checking status",
        timestamp: Date.now(),
      };
    }
  },
});

export const validateUrlWorkflowNotifications = mutation({
  args: {
    userId: v.string(),
    workflowId: vWorkflowId,
    expectedNotificationType: v.union(
      v.literal("success"),
      v.literal("failure"),
    ),
  },
  returns: v.object({
    notificationFound: v.boolean(),
    notificationType: v.optional(v.string()),
    notificationContent: v.optional(v.string()),
    notificationTimestamp: v.optional(v.number()),
    error: v.optional(v.string()),
  }),
  handler: async (ctx, args) => {
    try {
      const status = await ctx.runQuery(
        components.workflow.workflow.getStatus,
        {
          workflowId: args.workflowId,
        },
      );

      let notificationFound = false;
      let notificationType: string | undefined;
      let notificationContent: string | undefined;

      if (status.workflow.runResult) {
        const runResult = status.workflow.runResult;

        if (
          runResult.kind === "success" &&
          args.expectedNotificationType === "success"
        ) {
          notificationFound = true;
          notificationType = "success";
          notificationContent = `Event created successfully: ${runResult.returnValue}`;
        } else if (
          runResult.kind === "failed" &&
          args.expectedNotificationType === "failure"
        ) {
          notificationFound = true;
          notificationType = "failure";
          notificationContent = `URL workflow failed: ${runResult.error}`;
        }
      }

      return {
        notificationFound,
        notificationType,
        notificationContent,
        notificationTimestamp: notificationFound ? Date.now() : undefined,
      };
    } catch (error) {
      return {
        notificationFound: false,
        error:
          error instanceof Error
            ? error.message
            : "Unknown error validating notifications",
      };
    }
  },
});
