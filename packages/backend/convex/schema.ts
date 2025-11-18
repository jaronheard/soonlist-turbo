import { defineSchema, defineTable } from "convex/server";
import { v } from "convex/values";

// Define reusable validators
export const priorityValidator = v.object({
  text: v.string(),
  emoji: v.string(),
});

export const onboardingDataValidator = v.object({
  notificationsEnabled: v.optional(v.boolean()),
  ageRange: v.optional(
    v.union(
      v.literal("Under 24"),
      v.literal("25-34"),
      v.literal("35-44"),
      v.literal("45-54"),
      v.literal("55-64"),
      v.literal("65+"),
    ),
  ),
  source: v.optional(v.string()),
  discoveryMethod: v.optional(v.string()),
  screenshotEvents: v.optional(v.string()),
  goals: v.optional(v.array(v.string())), // Multi-select goals
  priority: v.optional(priorityValidator), // Keep for backward compatibility
  watchedDemo: v.optional(v.boolean()), // Whether user watched the demo
  completedAt: v.optional(v.string()), // ISO date string
  // Subscription fields
  subscribed: v.optional(v.boolean()),
  subscribedAt: v.optional(v.string()), // ISO date string
  subscriptionPlan: v.optional(v.string()),
  trialMode: v.optional(v.boolean()),
  trialStartedAt: v.optional(v.string()), // ISO date string
});

export const userAdditionalInfoValidator = v.object({
  bio: v.optional(v.string()),
  publicEmail: v.optional(v.string()),
  publicPhone: v.optional(v.string()),
  publicInsta: v.optional(v.string()),
  publicWebsite: v.optional(v.string()),
  displayName: v.optional(v.string()),
});

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
    eventMetadata: v.optional(v.any()), // JSON field for event metadata
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
    // Batch tracking
    batchId: v.optional(v.string()),
  })
    .index("by_user", ["userId"])
    .index("by_custom_id", ["id"])
    .index("by_user_and_startDateTime", ["userId", "startDateTime"])
    .index("by_startDateTime", ["startDateTime"])
    .index("by_visibility_and_startDateTime", ["visibility", "startDateTime"])
    .index("by_user_and_endDateTime", ["userId", "endDateTime"])
    .index("by_visibility_and_endDateTime", ["visibility", "endDateTime"])
    .index("by_batch_id", ["batchId"]),

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
    visibility: v.union(
      v.literal("public"),
      v.literal("unlisted"),
      v.literal("private"),
    ),
    contribution: v.optional(
      v.union(v.literal("open"), v.literal("restricted"), v.literal("owner")),
    ),
    created_at: v.string(), // ISO date string
    updatedAt: v.union(v.string(), v.null()), // ISO date string or null
  })
    .index("by_user", ["userId"])
    .index("by_custom_id", ["id"]),

  listMembers: defineTable({
    listId: v.string(),
    userId: v.string(),
  })
    .index("by_list", ["listId"])
    .index("by_user", ["userId"])
    .index("by_list_and_user", ["listId", "userId"]),

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
    // Onboarding fields - now properly typed
    onboardingData: v.union(onboardingDataValidator, v.null()),
    onboardingCompletedAt: v.union(v.string(), v.null()), // ISO date string or null
    // Public list sharing
    publicListEnabled: v.optional(v.boolean()),
    publicListName: v.optional(v.string()),
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

  syncState: defineTable({
    key: v.string(),
    lastSyncedAt: v.string(), // ISO date string for timestamp-based syncs
    status: v.union(v.literal("success"), v.literal("failed")),
    error: v.optional(v.string()),
    // Additional fields for different sync strategies
    offset: v.optional(v.number()), // For offset-based pagination
    metadata: v.optional(v.any()), // For any additional sync metadata
  }).index("by_key", ["key"]),

  userFeeds: defineTable({
    feedId: v.string(), // Feed identifier (user_${userId}, discover, curated_${topic}, etc.)
    eventId: v.string(), // Event in the feed
    eventStartTime: v.number(), // For chronological ordering (timestamp)
    eventEndTime: v.number(), // For filtering ongoing/past events (timestamp)
    addedAt: v.number(), // When added to feed (timestamp)
    hasEnded: v.boolean(), // Pre-computed field: true if event has ended, false if ongoing/upcoming (now required)
    beforeThisDateTime: v.optional(v.string()), // Optional ISO date string for custom filtering
  })
    .index("by_feed_hasEnded_startTime", [
      "feedId",
      "hasEnded",
      "eventStartTime",
    ]) // For efficient filtering and sorting
    .index("by_feed_event", ["feedId", "eventId"]) // For deduplication checks
    .index("by_event", ["eventId"]), // For event removal across all feeds

  guestOnboardingData: defineTable({
    ownerToken: v.string(), // Guest user ID
    isGuest: v.boolean(),
    data: onboardingDataValidator,
    createdAt: v.string(), // ISO date string
    updatedAt: v.string(), // ISO date string
  }).index("by_owner", ["ownerToken"]),

  appConfig: defineTable({
    key: v.string(), // Config key (e.g., "demoVideoUrl")
    value: v.string(), // Config value
    updatedAt: v.string(), // ISO date string
  }).index("by_key", ["key"]),

  eventBatches: defineTable({
    batchId: v.string(),
    userId: v.string(),
    username: v.optional(v.string()),
    timezone: v.optional(v.string()), // User's timezone for proper event processing
    totalCount: v.number(),
    successCount: v.number(),
    failureCount: v.number(),
    status: v.union(
      v.literal("processing"),
      v.literal("completed"),
      v.literal("failed"),
    ),
    progress: v.optional(v.number()), // 0-1 progress indicator
    createdAt: v.number(), // timestamp
    completedAt: v.optional(v.number()), // timestamp
  })
    .index("by_batch_id", ["batchId"])
    .index("by_user", ["userId"])
    .index("by_user_and_status", ["userId", "status"]),

  shareTokens: defineTable({
    token: v.string(),
    userId: v.string(),
    username: v.string(),
    createdAt: v.string(), // ISO date string
    revokedAt: v.union(v.string(), v.null()), // ISO date string or null
  })
    .index("by_token", ["token"]) // For quick token lookup
    .index("by_user", ["userId"]),
});
