import { WorkflowManager } from "@convex-dev/workflow";
import { v } from "convex/values";

import { components, internal } from "../_generated/api";

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
    // ── step 1 (parallel)
    const [aiResult, uploadedImageUrl] = await Promise.all([
      step.runAction(
        internal.ai.extractEvent,
        {
          base64Image: args.base64Image,
          timezone: args.timezone,
        },
        { name: "extractEvent" },
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

    // ── step 3 write DB
    const eventId = await step.runAction(
      internal.events.insertEvent,
      {
        firstEvent,
        uploadedImageUrl,
        ...args,
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
