import { defineSchema, defineTable } from "convex/server";
import { v } from "convex/values";

export default defineSchema({
  comments: defineTable({
    content: v.string(),
    eventId: v.string(),
    userId: v.string(),
    oldId: v.optional(v.string()), // for migration
  })
    .index("by_event", ["eventId"])
    .index("by_user", ["userId"]),

  events: defineTable({
    id: v.string(), // keeping the custom id field
    userId: v.string(),
    userName: v.string(),
    event: v.any(), // JSON field
    eventMetadata: v.optional(v.any()), // JSON field
    endDateTime: v.number(), // timestamp
    startDateTime: v.number(), // timestamp
    visibility: v.union(v.literal("public"), v.literal("private")),
  })
    .index("by_user", ["userId"])
    .index("by_id", ["id"]),

  eventToLists: defineTable({
    eventId: v.string(),
    listId: v.string(),
  })
    .index("by_event", ["eventId"])
    .index("by_list", ["listId"])
    .index("by_event_and_list", ["eventId", "listId"]),

  eventFollows: defineTable({
    userId: v.string(),
    eventId: v.string(),
  })
    .index("by_user", ["userId"])
    .index("by_event", ["eventId"])
    .index("by_user_and_event", ["userId", "eventId"]),

  listFollows: defineTable({
    userId: v.string(),
    listId: v.string(),
  })
    .index("by_user", ["userId"])
    .index("by_list", ["listId"])
    .index("by_user_and_list", ["userId", "listId"]),

  userFollows: defineTable({
    followerId: v.string(),
    followingId: v.string(),
  })
    .index("by_follower", ["followerId"])
    .index("by_following", ["followingId"])
    .index("by_follower_and_following", ["followerId", "followingId"]),

  lists: defineTable({
    id: v.string(), // keeping the custom id field
    userId: v.string(),
    name: v.string(),
    description: v.string(),
    visibility: v.union(v.literal("public"), v.literal("private")),
  })
    .index("by_user", ["userId"])
    .index("by_id", ["id"]),

  requestResponses: defineTable({
    modelOutput: v.optional(v.any()), // JSON field
    modelInput: v.any(), // JSON field
    modelStatus: v.string(),
    source: v.string(),
    modelCompletionTime: v.optional(v.number()),
    parsedOutput: v.optional(v.any()), // JSON field
  }),

  users: defineTable({
    id: v.string(), // keeping the custom id field
    username: v.string(),
    email: v.string(),
    displayName: v.string(),
    userImage: v.string(),
    bio: v.optional(v.string()),
    publicEmail: v.optional(v.string()),
    publicPhone: v.optional(v.string()),
    publicInsta: v.optional(v.string()),
    publicWebsite: v.optional(v.string()),
    publicMetadata: v.optional(v.any()), // JSON field
    emoji: v.optional(v.string()),
    // Onboarding fields
    onboardingData: v.optional(v.any()), // JSON field
    onboardingCompletedAt: v.optional(v.number()), // timestamp
  })
    .index("by_username", ["username"])
    .index("by_email", ["email"])
    .index("by_id", ["id"]),

  pushTokens: defineTable({
    userId: v.string(),
    expoPushToken: v.string(),
  })
    .index("by_user", ["userId"])
    .index("by_user_and_token", ["userId", "expoPushToken"]),

  waitlistSubmissions: defineTable({
    email: v.string(),
    zipcode: v.string(),
    why: v.string(),
  }).index("by_email", ["email"]),
});
