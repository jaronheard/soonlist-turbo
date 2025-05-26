import { defineSchema, defineTable } from "convex/server";
import { v } from "convex/values";

export default defineSchema({
  comments: defineTable({
    content: v.string(),
    eventId: v.string(),
    userId: v.string(),
    id: v.number(), // numeric id field from Planetscale
    oldId: v.union(v.string(), v.null()), // This is an oldId from Planetscale
    created_at: v.string(), // ISO date string
    updatedAt: v.union(v.string(), v.null()), // ISO date string or null
  })
    .index("by_event", ["eventId"])
    .index("by_user", ["userId"]),

  events: defineTable({
    id: v.string(), // custom id field from Planetscale
    userId: v.string(),
    userName: v.string(),
    event: v.any(), // JSON field
    endDateTime: v.string(), // ISO date string
    startDateTime: v.string(), // ISO date string
    visibility: v.union(v.literal("public"), v.literal("private")),
    created_at: v.string(), // ISO date string
    updatedAt: v.union(v.string(), v.null()), // ISO date string or null
    // Fields extracted from nested event object
    name: v.optional(v.string()),
    image: v.optional(v.union(v.string(), v.null())), // First image from images array or null
    endDate: v.optional(v.string()),
    endTime: v.optional(v.string()),
    location: v.optional(v.string()),
    timeZone: v.optional(v.string()),
    startDate: v.optional(v.string()),
    startTime: v.optional(v.string()),
    description: v.optional(v.string()),
  })
    .index("by_user", ["userId"])
    .index("by_custom_id", ["id"]),

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
    id: v.string(), // custom id field from Planetscale
    userId: v.string(),
    name: v.string(),
    description: v.string(),
    visibility: v.union(v.literal("public"), v.literal("private")),
    created_at: v.string(), // ISO date string
    updatedAt: v.union(v.string(), v.null()), // ISO date string or null
  })
    .index("by_user", ["userId"])
    .index("by_custom_id", ["id"]),

  users: defineTable({
    id: v.string(), // keeping the custom id field
    username: v.string(),
    email: v.string(),
    displayName: v.string(),
    userImage: v.string(),
    bio: v.union(v.string(), v.null()),
    publicEmail: v.union(v.string(), v.null()),
    publicPhone: v.union(v.string(), v.null()),
    publicInsta: v.union(v.string(), v.null()),
    publicWebsite: v.union(v.string(), v.null()),
    publicMetadata: v.union(v.any(), v.null()), // JSON field
    emoji: v.union(v.string(), v.null()),
    // Onboarding fields
    onboardingData: v.union(v.any(), v.null()), // JSON field
    onboardingCompletedAt: v.union(v.string(), v.null()), // ISO date string or null
    created_at: v.string(), // ISO date string
    updatedAt: v.union(v.string(), v.null()), // ISO date string or null
  })
    .index("by_username", ["username"])
    .index("by_email", ["email"])
    .index("by_custom_id", ["id"]),

  pushTokens: defineTable({
    userId: v.string(),
    expoPushToken: v.string(),
    id: v.number(), // numeric id field from Planetscale
    created_at: v.string(), // ISO date string
    updatedAt: v.union(v.string(), v.null()), // ISO date string or null
  })
    .index("by_user", ["userId"])
    .index("by_user_and_token", ["userId", "expoPushToken"]),

  waitlistSubmissions: defineTable({
    email: v.string(),
    zipcode: v.string(),
    why: v.string(),
  }).index("by_email", ["email"]),
});
