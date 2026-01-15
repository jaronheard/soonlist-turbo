import type { Doc } from "../_generated/dataModel";
import type { MutationCtx, QueryCtx } from "../_generated/server";
import { generatePublicId } from "../utils";

// Constants for similarity detection
export const SIMILARITY_THRESHOLDS = {
  // Time proximity threshold in minutes (±60 minutes)
  startTimeThreshold: 60,
  endTimeThreshold: 60,
  // Text similarity threshold (10%)
  nameThreshold: 0.1,
  descriptionThreshold: 0.1,
  locationThreshold: 0.1,
} as const;

/**
 * Convert text to a word frequency vector
 */
export function textToVector(text: string): Map<string, number> {
  const wordMap = new Map<string, number>();
  const words = text.toLowerCase().match(/\w+/g) || [];

  for (const word of words) {
    wordMap.set(word, (wordMap.get(word) || 0) + 1);
  }

  return wordMap;
}

/**
 * Calculate cosine similarity between two word frequency vectors
 */
export function cosineSimilarity(
  vector1: Map<string, number>,
  vector2: Map<string, number>,
): number {
  if (vector1.size === 0 || vector2.size === 0) {
    return 0;
  }

  const intersection = new Set(
    [...vector1.keys()].filter((x) => vector2.has(x)),
  );

  let dotProduct = 0;
  for (const word of intersection) {
    dotProduct += (vector1.get(word) || 0) * (vector2.get(word) || 0);
  }

  function sumOfSquares(vector: Map<string, number>): number {
    let sum = 0;
    for (const value of vector.values()) {
      sum += value * value;
    }
    return sum;
  }

  const magnitude =
    Math.sqrt(sumOfSquares(vector1)) * Math.sqrt(sumOfSquares(vector2));

  if (magnitude === 0) {
    return 0;
  }

  return dotProduct / magnitude;
}

/**
 * Event data extracted for similarity comparison
 */
export interface EventSimilarityData {
  startDateTime: string;
  endDateTime: string;
  name?: string;
  description?: string;
  location?: string;
}

/**
 * Check if two events are similar based on time and text similarity
 */
export function areEventsSimilar(
  event1: EventSimilarityData,
  event2: EventSimilarityData,
): boolean {
  const startTime1 = new Date(event1.startDateTime).getTime();
  const startTime2 = new Date(event2.startDateTime).getTime();
  const endTime1 = new Date(event1.endDateTime).getTime();
  const endTime2 = new Date(event2.endDateTime).getTime();

  // Check time proximity (in minutes)
  const startTimeDifference = Math.abs(startTime1 - startTime2) / (1000 * 60);
  const endTimeDifference = Math.abs(endTime1 - endTime2) / (1000 * 60);

  if (
    startTimeDifference > SIMILARITY_THRESHOLDS.startTimeThreshold ||
    endTimeDifference > SIMILARITY_THRESHOLDS.endTimeThreshold
  ) {
    return false;
  }

  // Check text similarity
  const nameSimilarity = cosineSimilarity(
    textToVector(event1.name || ""),
    textToVector(event2.name || ""),
  );

  const descriptionSimilarity = cosineSimilarity(
    textToVector(event1.description || ""),
    textToVector(event2.description || ""),
  );

  const locationSimilarity = cosineSimilarity(
    textToVector(event1.location || ""),
    textToVector(event2.location || ""),
  );

  return (
    nameSimilarity >= SIMILARITY_THRESHOLDS.nameThreshold &&
    descriptionSimilarity >= SIMILARITY_THRESHOLDS.descriptionThreshold &&
    locationSimilarity >= SIMILARITY_THRESHOLDS.locationThreshold
  );
}

/**
 * Generate a new similarity group ID
 */
export function generateSimilarityGroupId(): string {
  return `sg_${generatePublicId()}`;
}

/**
 * Find an existing similarity group among nearby events
 * Returns the similarityGroupId if found, or null if no similar events exist
 * @param excludeEventId - Optional event ID to exclude from the search (used during regrouping)
 */
export async function findSimilarityGroup(
  ctx: MutationCtx | QueryCtx,
  eventData: EventSimilarityData,
  excludeEventId?: string,
): Promise<string | null> {
  const startDateTime = new Date(eventData.startDateTime);

  // Search window: events within ±2 hours of the start time
  const windowMs = 2 * 60 * 60 * 1000; // 2 hours in milliseconds
  const lowerBound = new Date(startDateTime.getTime() - windowMs);
  const upperBound = new Date(startDateTime.getTime() + windowMs);

  // Query events within the time window
  const candidateEvents = await ctx.db
    .query("events")
    .withIndex("by_startDateTime", (q) =>
      q
        .gte("startDateTime", lowerBound.toISOString())
        .lte("startDateTime", upperBound.toISOString()),
    )
    .collect();

  // Check each candidate for similarity
  for (const candidate of candidateEvents) {
    // Skip events without a similarity group
    if (!candidate.similarityGroupId) {
      continue;
    }

    // Skip the event being updated (to avoid matching itself during regrouping)
    if (excludeEventId && candidate.id === excludeEventId) {
      continue;
    }

    const candidateData: EventSimilarityData = {
      startDateTime: candidate.startDateTime,
      endDateTime: candidate.endDateTime,
      name: candidate.name,
      description: candidate.description,
      location: candidate.location,
    };

    if (areEventsSimilar(eventData, candidateData)) {
      return candidate.similarityGroupId;
    }
  }

  return null;
}

/**
 * Find similarity group for backfill migration
 * Uses earlier events (by creation date) to establish groups
 */
export async function findSimilarityGroupForBackfill(
  ctx: MutationCtx,
  event: Doc<"events">,
): Promise<string | null> {
  const eventData: EventSimilarityData = {
    startDateTime: event.startDateTime,
    endDateTime: event.endDateTime,
    name: event.name,
    description: event.description,
    location: event.location,
  };

  const startDateTime = new Date(event.startDateTime);
  const windowMs = 2 * 60 * 60 * 1000;
  const lowerBound = new Date(startDateTime.getTime() - windowMs);
  const upperBound = new Date(startDateTime.getTime() + windowMs);

  // Query events within the time window that were created before this event
  const candidateEvents = await ctx.db
    .query("events")
    .withIndex("by_startDateTime", (q) =>
      q
        .gte("startDateTime", lowerBound.toISOString())
        .lte("startDateTime", upperBound.toISOString()),
    )
    .filter((q) => q.lt(q.field("created_at"), event.created_at))
    .collect();

  // Check each candidate for similarity
  for (const candidate of candidateEvents) {
    // Skip events without a similarity group
    if (!candidate.similarityGroupId) {
      continue;
    }

    const candidateData: EventSimilarityData = {
      startDateTime: candidate.startDateTime,
      endDateTime: candidate.endDateTime,
      name: candidate.name,
      description: candidate.description,
      location: candidate.location,
    };

    if (areEventsSimilar(eventData, candidateData)) {
      return candidate.similarityGroupId;
    }
  }

  return null;
}

/**
 * Select the primary event for a feed's similarity group
 * Primary selection is feed-scoped via userFeeds membership
 * Priority:
 * 1. If this is a user feed, prefer that user's own event in the group
 * 2. Otherwise, earliest by created_at (deterministic)
 */
export async function selectPrimaryEventForFeed(
  ctx: MutationCtx | QueryCtx,
  args: { feedId: string; similarityGroupId: string },
): Promise<Doc<"events"> | null> {
  // Get all userFeeds entries for this feed+group
  const membership = await ctx.db
    .query("userFeeds")
    .withIndex("by_feed_group", (q) =>
      q
        .eq("feedId", args.feedId)
        .eq("similarityGroupId", args.similarityGroupId),
    )
    .collect();

  if (membership.length === 0) {
    return null;
  }

  // Fetch all member events
  const memberEvents = await Promise.all(
    membership.map(async (m) => {
      return await ctx.db
        .query("events")
        .withIndex("by_custom_id", (q) => q.eq("id", m.eventId))
        .first();
    }),
  );

  const validEvents = memberEvents.filter(
    (e): e is Doc<"events"> => e !== null,
  );

  if (validEvents.length === 0) {
    return null;
  }

  // Priority 1: If this is a user feed, prefer that user's own event
  const feedUserId = args.feedId.startsWith("user_")
    ? args.feedId.replace("user_", "")
    : null;

  if (feedUserId) {
    const ownEvent = validEvents.find((e) => e.userId === feedUserId);
    if (ownEvent) {
      return ownEvent;
    }
  }

  // Priority 2: earliest by created_at (deterministic)
  const sorted = validEvents.sort(
    (a, b) =>
      new Date(a.created_at).getTime() - new Date(b.created_at).getTime(),
  );
  return sorted[0] ?? null;
}

/**
 * Get the count of events in a feed's similarity group
 */
export async function getGroupMemberCount(
  ctx: MutationCtx | QueryCtx,
  args: { feedId: string; similarityGroupId: string },
): Promise<number> {
  const membership = await ctx.db
    .query("userFeeds")
    .withIndex("by_feed_group", (q) =>
      q
        .eq("feedId", args.feedId)
        .eq("similarityGroupId", args.similarityGroupId),
    )
    .collect();

  return membership.length;
}

/**
 * Determines if event changes warrant a regroup check
 * Returns true if any similarity-affecting fields changed
 */
export function shouldRegroupEvent(
  existingEvent: Doc<"events">,
  newEventData: {
    startDateTime: string;
    endDateTime: string;
    name?: string;
    description?: string;
    location?: string;
  },
): boolean {
  const timeChanged =
    existingEvent.startDateTime !== newEventData.startDateTime ||
    existingEvent.endDateTime !== newEventData.endDateTime;

  const nameChanged = existingEvent.name !== newEventData.name;
  const descriptionChanged =
    existingEvent.description !== newEventData.description;
  const locationChanged = existingEvent.location !== newEventData.location;

  return timeChanged || nameChanged || descriptionChanged || locationChanged;
}

/**
 * Get one representative event from a similarity group (excluding a specific event)
 * Used to check if an event still belongs to its current group
 */
export async function getRepresentativeGroupMember(
  ctx: MutationCtx | QueryCtx,
  similarityGroupId: string,
  excludeEventId: string,
): Promise<Doc<"events"> | null> {
  const members = await ctx.db
    .query("events")
    .withIndex("by_similarity_group", (q) =>
      q.eq("similarityGroupId", similarityGroupId),
    )
    .filter((q) => q.neq(q.field("id"), excludeEventId))
    .take(1);

  return members[0] ?? null;
}

/**
 * Determine the new similarity group for an updated event
 * Returns the new group ID and whether regrouping is needed
 */
export async function determineNewSimilarityGroup(
  ctx: MutationCtx,
  eventId: string,
  currentGroupId: string,
  eventData: EventSimilarityData,
): Promise<{
  newGroupId: string;
  needsRegroup: boolean;
}> {
  // Step 1: Check if event still fits in current group
  const currentGroupMember = await getRepresentativeGroupMember(
    ctx,
    currentGroupId,
    eventId,
  );

  if (currentGroupMember) {
    const stillSimilarToCurrentGroup = areEventsSimilar(eventData, {
      startDateTime: currentGroupMember.startDateTime,
      endDateTime: currentGroupMember.endDateTime,
      name: currentGroupMember.name,
      description: currentGroupMember.description,
      location: currentGroupMember.location,
    });

    if (stillSimilarToCurrentGroup) {
      // Still fits in current group, no regroup needed
      return { newGroupId: currentGroupId, needsRegroup: false };
    }
  }

  // Step 2: Event no longer fits current group. Search for a new group.
  // Exclude the event being updated to avoid matching itself
  const foundGroupId = await findSimilarityGroup(ctx, eventData, eventId);

  if (foundGroupId && foundGroupId !== currentGroupId) {
    // Found a different existing group
    return { newGroupId: foundGroupId, needsRegroup: true };
  }

  if (!foundGroupId) {
    // No similar events found - create a new unique group
    return { newGroupId: generateSimilarityGroupId(), needsRegroup: true };
  }

  // Found same group (shouldn't normally happen after checking), no regroup needed
  return { newGroupId: currentGroupId, needsRegroup: false };
}
