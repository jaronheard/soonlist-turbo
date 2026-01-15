import type { Doc } from "../_generated/dataModel";
import type { QueryCtx } from "../_generated/server";
import { generatePublicId } from "../utils";

const TIME_THRESHOLD_MINUTES = 60;
const TEXT_SIMILARITY_THRESHOLD = 0.1;

function textToVector(text: string): Map<string, number> {
  const wordMap = new Map<string, number>();
  const words = text.toLowerCase().match(/\w+/g) || [];

  for (const word of words) {
    wordMap.set(word, (wordMap.get(word) || 0) + 1);
  }

  return wordMap;
}

function cosineSimilarity(
  vector1: Map<string, number>,
  vector2: Map<string, number>,
): number {
  if (vector1.size === 0 || vector2.size === 0) {
    return 0;
  }

  const intersection = new Set(
    [...vector1.keys()].filter((key) => vector2.has(key)),
  );
  let dotProduct = 0;
  for (const word of intersection) {
    dotProduct += (vector1.get(word) || 0) * (vector2.get(word) || 0);
  }

  const sumOfSquares = (vector: Map<string, number>) => {
    let sum = 0;
    for (const value of vector.values()) {
      sum += value * value;
    }
    return sum;
  };

  const denominator =
    Math.sqrt(sumOfSquares(vector1)) * Math.sqrt(sumOfSquares(vector2));
  return denominator === 0 ? 0 : dotProduct / denominator;
}

function minutesBetween(dateA: string, dateB: string): number {
  return Math.abs(
    (new Date(dateA).getTime() - new Date(dateB).getTime()) / 60000,
  );
}

export function areEventsSimilar(
  eventA: Pick<
    Doc<"events">,
    "startDateTime" | "endDateTime" | "name" | "description" | "location"
  >,
  eventB: Pick<
    Doc<"events">,
    "startDateTime" | "endDateTime" | "name" | "description" | "location"
  >,
): boolean {
  const startTimeDifference = minutesBetween(
    eventA.startDateTime,
    eventB.startDateTime,
  );
  const endTimeDifference = minutesBetween(
    eventA.endDateTime,
    eventB.endDateTime,
  );

  const nameSimilarity = cosineSimilarity(
    textToVector(eventA.name || ""),
    textToVector(eventB.name || ""),
  );
  const descriptionSimilarity = cosineSimilarity(
    textToVector(eventA.description || ""),
    textToVector(eventB.description || ""),
  );
  const locationSimilarity = cosineSimilarity(
    textToVector(eventA.location || ""),
    textToVector(eventB.location || ""),
  );

  return (
    startTimeDifference <= TIME_THRESHOLD_MINUTES &&
    endTimeDifference <= TIME_THRESHOLD_MINUTES &&
    nameSimilarity >= TEXT_SIMILARITY_THRESHOLD &&
    descriptionSimilarity >= TEXT_SIMILARITY_THRESHOLD &&
    locationSimilarity >= TEXT_SIMILARITY_THRESHOLD
  );
}

export function generateSimilarityGroupId() {
  return `sg_${generatePublicId()}`;
}

export async function findSimilarityGroup(
  ctx: QueryCtx,
  event: Pick<
    Doc<"events">,
    "startDateTime" | "endDateTime" | "name" | "description" | "location"
  >,
) {
  const startTime = new Date(event.startDateTime).getTime();
  const windowStart = new Date(
    startTime - TIME_THRESHOLD_MINUTES * 60 * 1000,
  ).toISOString();
  const windowEnd = new Date(
    startTime + TIME_THRESHOLD_MINUTES * 60 * 1000,
  ).toISOString();

  const candidates = await ctx.db
    .query("events")
    .withIndex("by_startDateTime", (q) =>
      q.gte("startDateTime", windowStart).lte("startDateTime", windowEnd),
    )
    .collect();

  for (const candidate of candidates) {
    if (!candidate.similarityGroupId) {
      continue;
    }
    if (areEventsSimilar(candidate, event)) {
      return candidate.similarityGroupId;
    }
  }

  return null;
}

export async function findSimilarityGroupForBackfill(
  ctx: QueryCtx,
  event: Doc<"events">,
) {
  const startTime = new Date(event.startDateTime).getTime();
  const windowStart = new Date(
    startTime - TIME_THRESHOLD_MINUTES * 60 * 1000,
  ).toISOString();
  const windowEnd = new Date(
    startTime + TIME_THRESHOLD_MINUTES * 60 * 1000,
  ).toISOString();

  const candidates = await ctx.db
    .query("events")
    .withIndex("by_startDateTime", (q) =>
      q.gte("startDateTime", windowStart).lte("startDateTime", windowEnd),
    )
    .collect();

  const earlierCandidates = candidates.filter(
    (candidate) =>
      candidate.similarityGroupId &&
      new Date(candidate.created_at).getTime() <=
        new Date(event.created_at).getTime(),
  );

  for (const candidate of earlierCandidates) {
    if (areEventsSimilar(candidate, event)) {
      return candidate.similarityGroupId;
    }
  }

  return null;
}

export async function selectPrimaryEventForFeed(
  ctx: QueryCtx,
  args: { feedId: string; similarityGroupId: string },
): Promise<Doc<"events"> | null> {
  const membership = await ctx.db
    .query("userFeeds")
    .withIndex("by_feed_group", (q) =>
      q.eq("feedId", args.feedId).eq("similarityGroupId", args.similarityGroupId),
    )
    .collect();

  if (membership.length === 0) {
    return null;
  }

  const memberEvents = await Promise.all(
    membership.map((member) =>
      ctx.db
        .query("events")
        .withIndex("by_custom_id", (q) => q.eq("id", member.eventId))
        .unique(),
    ),
  );

  const validEvents = memberEvents.filter(
    (event): event is Doc<"events"> => event !== null,
  );

  if (validEvents.length === 0) {
    return null;
  }

  const feedUserId = args.feedId.startsWith("user_")
    ? args.feedId.replace("user_", "")
    : null;

  if (feedUserId) {
    const ownEvent = validEvents.find((event) => event.userId === feedUserId);
    if (ownEvent) {
      return ownEvent;
    }
  }

  return validEvents.sort(
    (a, b) =>
      new Date(a.created_at).getTime() - new Date(b.created_at).getTime(),
  )[0];
}
