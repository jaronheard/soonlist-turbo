import { WorkflowManager } from "@convex-dev/workflow";
import { ConvexError, v } from "convex/values";

import { components, internal } from "../_generated/api";
import { query } from "../_generated/server";

const workflow = new WorkflowManager(components.workflow);

export const eventFromImageBase64Workflow = workflow.define({
  args: {
    base64Image: v.string(),
    timezone: v.string(),
    comment: v.optional(v.string()),
    lists: v.array(v.object({ value: v.string() })),
    visibility: v.optional(v.union(v.literal("public"), v.literal("private"))),
    sendNotification: v.optional(v.boolean()),
    userId: v.string(),
    username: v.string(),
  },
  handler: async (step, args): Promise<string> => {
    const eventArgs = {
      ...args,
      base64Image: undefined,
      sendNotification: undefined,
    };
    // ── step 1 (parallel)
    const [aiResult, uploadedImageUrl] = await Promise.all([
      step.runAction(
        internal.ai.extractEventFromBase64Image,
        {
          base64Image: args.base64Image,
          timezone: args.timezone,
        },
        { name: "extractEventFromBase64Image" },
      ),
      step.runAction(
        internal.files.uploadImage,
        {
          base64Image: args.base64Image,
        },
        { name: "uploadImage" },
      ),
    ]);

    // ── step 2 validate
    const firstEvent = await step.runAction(
      internal.ai.validateFirstEvent,
      { events: aiResult.events },
      { name: "validateEvent" },
    );

    if (!firstEvent) {
      throw new ConvexError("No events found in response");
    }

    // ── step 3 write DB
    const eventId = await step.runAction(
      internal.events.insertEvent,
      {
        firstEvent,
        uploadedImageUrl,
        ...eventArgs,
      },
      { name: "insertEvent" },
    );

    // ── step 4 push notification
    if (args.sendNotification ?? true) {
      await step.runAction(
        internal.notifications.push,
        { eventId, userId: args.userId, userName: args.username },
        { name: "sendPush" },
      );
    }

    return eventId;
  },
  returns: v.string(),
});

/**
 * Get workflow status for client-side tracking
 */
export const getWorkflowStatus = query({
  args: { workflowId: v.string() },
  returns: v.object({
    workflowId: v.string(),
    status: v.union(
      v.literal("inProgress"),
      v.literal("completed"),
      v.literal("failed"),
      v.literal("canceled"),
    ),
    currentStep: v.optional(v.string()),
    progress: v.optional(v.number()),
    error: v.optional(v.string()),
    result: v.optional(v.any()),
    startedAt: v.optional(v.number()),
  }),
  handler: async (ctx, args) => {
    try {
      const status = await ctx.runQuery(
        components.workflow.workflow.getStatus,
        {
          workflowId: args.workflowId,
        },
      );

      // Determine the current step and progress
      let currentStep: string | undefined;
      let progress: number | undefined;

      if (status.workflow.runResult) {
        // Workflow is complete
        const runResult = status.workflow.runResult;
        if (runResult.kind === "success") {
          return {
            workflowId: args.workflowId,
            status: "completed" as const,
            currentStep: "Complete",
            progress: 100,
            result: runResult.returnValue,
            startedAt: status.workflow._creationTime,
          };
        } else if (runResult.kind === "failed") {
          return {
            workflowId: args.workflowId,
            status: "failed" as const,
            error: runResult.error,
            startedAt: status.workflow._creationTime,
          };
        } else if (runResult.kind === "canceled") {
          return {
            workflowId: args.workflowId,
            status: "canceled" as const,
            startedAt: status.workflow._creationTime,
          };
        }
      }

      // Workflow is in progress
      const inProgressSteps = status.inProgress;
      const totalSteps = 4; // Based on our workflow: extract+upload (parallel), validate, insert, notify

      if (inProgressSteps.length > 0) {
        const latestStep = inProgressSteps[inProgressSteps.length - 1];
        currentStep = latestStep?.step.name || "Processing";

        // Calculate progress based on completed steps
        const completedSteps = latestStep?.stepNumber || 0;
        progress = Math.min((completedSteps / totalSteps) * 100, 90); // Cap at 90% until complete
      } else {
        currentStep = "Starting";
        progress = 10;
      }

      return {
        workflowId: args.workflowId,
        status: "inProgress" as const,
        currentStep,
        progress,
        startedAt: status.workflow._creationTime,
      };
    } catch (error) {
      // Workflow might not exist or be cleaned up
      return {
        workflowId: args.workflowId,
        status: "failed" as const,
        error: error instanceof Error ? error.message : "Unknown error",
      };
    }
  },
});
