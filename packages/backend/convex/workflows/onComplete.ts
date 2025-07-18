import { vWorkflowId } from "@convex-dev/workflow";
import { vResultValidator } from "@convex-dev/workpool";
import { v } from "convex/values";

import { internal } from "../_generated/api";
import { internalMutation } from "../_generated/server";

export const handleEventIngestionComplete = internalMutation({
  args: {
    workflowId: vWorkflowId,
    result: vResultValidator,
    context: v.object({
      userId: v.string(),
      username: v.string(),
    }),
  },
  returns: v.null(),
  handler: async (ctx, { result, context }) => {
    if (result.kind === "success") {
      console.log("Event created successfully:", result.returnValue);
      // Success notification is already handled in the workflow
    } else if (result.kind === "failed") {
      console.error("Event ingestion failed:", result.error);

      // Send failure notification to user
      try {
        await ctx.scheduler.runAfter(0, internal.notifications.pushFailure, {
          userId: context.userId,
          userName: context.username,
          failureReason: result.error,
        });
        console.log("Failure notification scheduled for user:", context.userId);
      } catch (notificationError) {
        console.error(
          "Failed to schedule failure notification:",
          notificationError,
        );
      }
    } else {
      // Cancelled case
      console.log("Event ingestion was canceled");
      // Optionally send cancellation notification
    }
    return null;
  },
});
