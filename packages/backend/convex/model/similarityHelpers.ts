import type { Doc } from "../_generated/dataModel";
import type { MutationCtx, QueryCtx } from "../_generated/server";
import { generatePublicId } from "../utils";

const TIME_WINDOW_MS = 60 * 60 * 1000;
const TEXT_SIMILARITY_THRESHOLD = 0.1;

export type SimilarityEventInput = {
  name?: string | null;
  location?: string | null;
  description?: string | null;
  startDateTime: string;
};

type DbCtx = Pick<QueryCtx | MutationCtx, "db">;

function normalizeText(input: string): string[] {
  const tokens = input.toLowerCase().match(/[a-z0-9]+/g);
  return tokens ?? [];
}

export function textToVector(text: string): Map<string, number> {
  const vector = new Map<string, number>();
  for (const token of normalizeText(text)) {
    vector.set(token, (vector.get(token) ?? 0) + 1);
  }
  return vector;
}

export function cosineSimilarity(
  vectorA: Map<string, number>,
  vectorB: Map<string, number>,
): number {
  if (vectorA.size === 0 || vectorB.size === 0) {
    return 0;
  }

  let dot = 0;
  let magnitudeA = 0;
  let magnitudeB = 0;

  for (const value of vectorA.values()) {
    magnitudeA += value * value;
  }

  for (const [key, value] of vectorB.entries()) {
    magnitudeB += value * value;
    const otherValue = vectorA.get(key);
    if (otherValue) {
      dot += otherValue * value;
    }
  }

  if (magnitudeA === 0 || magnitudeB === 0) {
    return 0;
  }

  return dot / (Math.sqrt(magnitudeA) * Math.sqrt(magnitudeB));
}

function buildSimilarityText(event: SimilarityEventInput): string {
  return [event.name, event.location, event.description]
    .filter((value): value is string => Boolean(value && value.trim().length > 0))
    .join(" ");
}

export function areEventsSimilar(
  eventA: SimilarityEventInput,
  eventB: SimilarityEventInput,
): boolean {
  const timeA = new Date(eventA.startDateTime).getTime();
  const timeB = new Date(eventB.startDateTime).getTime();

  if (Number.isNaN(timeA) || Number.isNaN(timeB)) {
    return false;
  }

  if (Math.abs(timeA - timeB) > TIME_WINDOW_MS) {
    return false;
  }

  const textA = buildSimilarityText(eventA);
  const textB = buildSimilarityText(eventB);

  if (!textA || !textB) {
    return false;
  }

  const similarity = cosineSimilarity(textToVector(textA), textToVector(textB));
  return similarity >= TEXT_SIMILARITY_THRESHOLD;
}

export function generateSimilarityGroupId(): string {
  return `sg_${generatePublicId()}`;
}

function toSimilarityEvent(event: Doc<"events">): SimilarityEventInput {
  return {
    name: event.name ?? null,
    location: event.location ?? null,
    description: event.description ?? null,
    startDateTime: event.startDateTime,
  };
}

export async function findSimilarityGroup(
  ctx: DbCtx,
  eventData: SimilarityEventInput,
): Promise<string | null> {
  const startTime = new Date(eventData.startDateTime).getTime();
  if (Number.isNaN(startTime)) {
    return null;
  }

  const windowStart = new Date(startTime - TIME_WINDOW_MS).toISOString();
  const windowEnd = new Date(startTime + TIME_WINDOW_MS).toISOString();

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

    if (areEventsSimilar(eventData, toSimilarityEvent(candidate))) {
      return candidate.similarityGroupId;
    }
  }

  return null;
}

export async function findSimilarityGroupForBackfill(
  ctx: DbCtx,
  event: Doc<"events">,
): Promise<string | null> {
  if (!event.created_at) {
    return null;
  }

  const startTime = new Date(event.startDateTime).getTime();
  if (Number.isNaN(startTime)) {
    return null;
  }

  const windowStart = new Date(startTime - TIME_WINDOW_MS).toISOString();
  const windowEnd = new Date(startTime + TIME_WINDOW_MS).toISOString();
  const createdAtTime = new Date(event.created_at).getTime();

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

    const candidateCreatedAt = new Date(candidate.created_at).getTime();
    if (Number.isNaN(candidateCreatedAt)) {
      continue;
    }

    if (candidateCreatedAt >= createdAtTime) {
      continue;
    }

    if (areEventsSimilar(toSimilarityEvent(event), toSimilarityEvent(candidate))) {
      return candidate.similarityGroupId;
    }
  }

  return null;
}

export async function selectPrimaryEventForFeed(
  ctx: DbCtx,
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
    const own = validEvents.find((event) => event.userId === feedUserId);
    if (own) {
      return own;
    }
  }

  return validEvents.sort(
    (a, b) =>
      new Date(a.created_at).getTime() - new Date(b.created_at).getTime(),
  )[0];
}
