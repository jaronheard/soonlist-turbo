import { WorkflowManager } from "@convex-dev/workflow";
import { v } from "convex/values";

import { components, internal } from "../_generated/api";
import { query } from "../_generated/server";

const workflow = new WorkflowManager(components.workflow);

const listValidator = v.object({
  value: v.string(),
});

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

    const firstEvent = await step.runAction(
      internal.ai.validateFirstEvent,
      { events: aiResult.events },
      { name: "validateEvent" },
    );

    const eventId = await step.runMutation(
      internal.events.insertEvent,
      {
        firstEvent,
        uploadedImageUrl,
        ...eventArgs,
      },
      { name: "insertEvent" },
    );

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

export const eventFromUrlWorkflow = workflow.define({
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
  handler: async (step, args): Promise<string> => {
    const eventArgs = {
      ...args,
      url: undefined,
      sendNotification: undefined,
    };

    const aiResult = await step.runAction(
      internal.ai.extractEventFromUrl,
      {
        url: args.url,
        timezone: args.timezone,
      },
      { name: "extractEventFromUrl" },
    );

    const firstEvent = await step.runAction(
      internal.ai.validateFirstEvent,
      { events: aiResult.events },
      { name: "validateEvent" },
    );

    const eventId = await step.runMutation(
      internal.events.insertEvent,
      {
        firstEvent,
        uploadedImageUrl: null, // URLs don't need image upload
        ...eventArgs,
      },
      { name: "insertEvent" },
    );

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

export const eventFromTextWorkflow = workflow.define({
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
  handler: async (step, args): Promise<string> => {
    const eventArgs = {
      ...args,
      rawText: undefined,
      sendNotification: undefined,
    };

    const aiResult = await step.runAction(
      internal.ai.extractEventFromText,
      {
        rawText: args.rawText,
        timezone: args.timezone,
      },
      { name: "extractEventFromText" },
    );

    const firstEvent = await step.runAction(
      internal.ai.validateFirstEvent,
      { events: aiResult.events },
      { name: "validateEvent" },
    );

    const eventId = await step.runMutation(
      internal.events.insertEvent,
      {
        firstEvent,
        uploadedImageUrl: null, // Text input don't need image upload
        ...eventArgs,
      },
      { name: "insertEvent" },
    );

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

      let currentStep: string | undefined;
      let progress: number | undefined;

      if (status.workflow.runResult) {
        const runResult = status.workflow.runResult;
        if (runResult.kind === "success") {
          return {
            workflowId: args.workflowId,
            status: "completed" as const,
            currentStep: "Complete",
            progress: 100,
            // eslint-disable-next-line @typescript-eslint/consistent-type-assertions
            result: runResult.returnValue as unknown,
            startedAt: status.workflow._creationTime,
          };
        } else if (runResult.kind === "failed") {
          return {
            workflowId: args.workflowId,
            status: "failed" as const,
            error: runResult.error,
            startedAt: status.workflow._creationTime,
          };
        } else {
          return {
            workflowId: args.workflowId,
            status: "canceled" as const,
            startedAt: status.workflow._creationTime,
          };
        }
      }

      const inProgressSteps = status.inProgress;
      const totalSteps = 4;

      if (inProgressSteps.length > 0) {
        const latestStep = inProgressSteps[inProgressSteps.length - 1] || {
          step: { name: "Processing" },
          stepNumber: 0,
        };
        currentStep = latestStep.step.name;

        const completedSteps = latestStep.stepNumber || 0;
        progress = Math.min((completedSteps / totalSteps) * 100, 90);
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
      return {
        workflowId: args.workflowId,
        status: "failed" as const,
        error: error instanceof Error ? error.message : "Unknown error",
      };
    }
  },
});
