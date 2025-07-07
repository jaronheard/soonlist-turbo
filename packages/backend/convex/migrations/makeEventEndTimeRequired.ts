// NOTE: This file documents the future schema change to make eventEndTime required
// After the addEventEndTimeToFeeds migration completes successfully,
// update the schema.ts file to change:
//   eventEndTime: v.optional(v.number())
// to:
//   eventEndTime: v.number()
//
// Also update all places where userFeeds entries are created to ensure
// eventEndTime is always provided (it should already be after the first PR).

export const makeEventEndTimeRequired = `
After migration completes, update schema.ts:

userFeeds: defineTable({
  feedId: v.string(),
  eventId: v.string(),
  eventStartTime: v.number(),
  eventEndTime: v.number(), // Remove v.optional()
  addedAt: v.number(),
})
`;