import { v } from "convex/values";

import { mutation } from "../_generated/server";

export const handleEventIngestionComplete = mutation({
  args: {
    workflowId: v.string(), // TODO: Use proper workflow ID validator when available
    result: v.any(), // TODO: Use proper result validator when available
    context: v.any(),
  },
  returns: v.null(),
  handler: async (ctx, { result, context }) => {
    if (result.kind === "success") {
      console.log("Event created:", result.returnValue);
      // TODO: Optional: store success for UI
    } else {
      console.error("Ingestion failed:", result);
      // TODO: Optional: store error for UI
    }
    return null;
  },
});
