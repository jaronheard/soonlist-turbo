import type { Doc } from "../_generated/dataModel";
import type { MutationCtx, QueryCtx } from "../_generated/server";
import { generatePublicId } from "../utils";

export const SIMILARITY_THRESHOLDS = {
  startTimeThreshold: 60,
  endTimeThreshold: 60,
  nameThreshold: 0.1,
  descriptionThreshold: 0.1,
  locationThreshold: 0.1,
} as const;

export function textToVector(text: string): Map<string, number> {
  const wordMap = new Map<string, number>();
  const words = text.toLowerCase().match(/\w+/g) || [];

  for (const word of words) {
    wordMap.set(word, (wordMap.get(word) || 0) + 1);
  }

  return wordMap;
}

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

export interface EventSimilarityData {
  startDateTime: string;
  endDateTime: string;
  name?: string;
  description?: string;
  location?: string;
}

export function areEventsSimilar(
  event1: EventSimilarityData,
  event2: EventSimilarityData,
): boolean {
  const startTime1 = new Date(event1.startDateTime).getTime();
  const startTime2 = new Date(event2.startDateTime).getTime();
  const endTime1 = new Date(event1.endDateTime).getTime();
  const endTime2 = new Date(event2.endDateTime).getTime();

  const startTimeDifference = Math.abs(startTime1 - startTime2) / (1000 * 60);
  const endTimeDifference = Math.abs(endTime1 - endTime2) / (1000 * 60);

  if (
    startTimeDifference > SIMILARITY_THRESHOLDS.startTimeThreshold ||
    endTimeDifference > SIMILARITY_THRESHOLDS.endTimeThreshold
  ) {
    return false;
  }

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

export function generateSimilarityGroupId(): string {
  return `sg_${generatePublicId()}`;
}

export async function findSimilarityGroup(
  ctx: MutationCtx | QueryCtx,
  eventData: EventSimilarityData,
  excludeEventId?: string,
): Promise<string | null> {
  const startDateTime = new Date(eventData.startDateTime);

  const windowMs = 2 * 60 * 60 * 1000;
  const lowerBound = new Date(startDateTime.getTime() - windowMs);
  const upperBound = new Date(startDateTime.getTime() + windowMs);

  const candidateEvents = await ctx.db
    .query("events")
    .withIndex("by_startDateTime", (q) =>
      q
        .gte("startDateTime", lowerBound.toISOString())
        .lte("startDateTime", upperBound.toISOString()),
    )
    .collect();

  for (const candidate of candidateEvents) {
    if (!candidate.similarityGroupId) {
      continue;
    }

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

  const candidateEvents = await ctx.db
    .query("events")
    .withIndex("by_startDateTime", (q) =>
      q
        .gte("startDateTime", lowerBound.toISOString())
        .lte("startDateTime", upperBound.toISOString()),
    )
    .filter((q) => q.lt(q.field("created_at"), event.created_at))
    .collect();

  for (const candidate of candidateEvents) {
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

export async function selectPrimaryEventForFeed(
  ctx: MutationCtx | QueryCtx,
  args: { feedId: string; similarityGroupId: string },
): Promise<Doc<"events"> | null> {
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

  const feedUserId = args.feedId.startsWith("user_")
    ? args.feedId.replace("user_", "")
    : null;

  if (feedUserId) {
    const ownEvent = validEvents.find((e) => e.userId === feedUserId);
    if (ownEvent) {
      return ownEvent;
    }
  }

  const sorted = validEvents.sort(
    (a, b) =>
      new Date(a.created_at).getTime() - new Date(b.created_at).getTime(),
  );
  return sorted[0] ?? null;
}

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

export async function determineNewSimilarityGroup(
  ctx: MutationCtx,
  eventId: string,
  currentGroupId: string,
  eventData: EventSimilarityData,
): Promise<{
  newGroupId: string;
  needsRegroup: boolean;
}> {
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
      return { newGroupId: currentGroupId, needsRegroup: false };
    }
  }

  const foundGroupId = await findSimilarityGroup(ctx, eventData, eventId);

  if (foundGroupId && foundGroupId !== currentGroupId) {
    return { newGroupId: foundGroupId, needsRegroup: true };
  }

  if (!foundGroupId) {
    return { newGroupId: generateSimilarityGroupId(), needsRegroup: true };
  }

  return { newGroupId: currentGroupId, needsRegroup: false };
}
