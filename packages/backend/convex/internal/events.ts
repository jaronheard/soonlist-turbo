import { v } from "convex/values";

import { internalAction } from "../_generated/server";

/**
 * Insert event into database
 */
export const insertEvent = internalAction({
  args: {
    firstEvent: v.any(), // TODO: Use proper event validator
    uploadedImageUrl: v.union(v.string(), v.null()),
    timezone: v.string(),
    comment: v.optional(v.string()),
    lists: v.array(v.object({ value: v.string() })),
    visibility: v.optional(v.union(v.literal("public"), v.literal("private"))),
    userId: v.string(),
    username: v.string(),
  },
  returns: v.string(), // eventId
  handler: async (ctx, args) => {
    // TODO: Implement event insertion logic
    // This will extract the DB write logic from aiHelpers.createEventAndNotify
    return "stub-event-id";
  },
});
