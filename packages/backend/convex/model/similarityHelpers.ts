import type { QueryCtx } from "../_generated/server";
import type { Doc } from "../_generated/dataModel";

// Thresholds matching current client-side values exactly
const THRESHOLDS = {
  startTimeMinutes: 60, // ±60 minutes
  endTimeMinutes: 60, // ±60 minutes
  nameSimilarity: 0.1, // 10%
  descriptionSimilarity: 0.1, // 10%
  locationSimilarity: 0.1, // 10%
};

// Convert text to word frequency vector (bag of words)
function textToVector(text: string): Map<string, number> {
  const wordMap = new Map<string, number>();
  const words = text.toLowerCase().match(/\w+/g) || [];

  words.forEach((word) => {
    wordMap.set(word, (wordMap.get(word) || 0) + 1);
  });

  return wordMap;
}

// Calculate cosine similarity between two word vectors
function cosineSimilarity(
  vector1: Map<string, number>,
  vector2: Map<string, number>,
): number {
  // Handle empty vectors
  if (vector1.size === 0 || vector2.size === 0) {
    return 0;
  }

  const intersection = new Set(
    [...vector1.keys()].filter((x) => vector2.has(x)),
  );

  let dotProduct = 0;
  intersection.forEach((word) => {
    dotProduct += vector1.get(word)! * vector2.get(word)!;
  });

  function sumOfSquares(vector: Map<string, number>): number {
    let sum = 0;
    vector.forEach((value) => {
      sum += value * value;
    });
    return sum;
  }

  const magnitude1 = Math.sqrt(sumOfSquares(vector1));
  const magnitude2 = Math.sqrt(sumOfSquares(vector2));

  if (magnitude1 === 0 || magnitude2 === 0) {
    return 0;
  }

  return dotProduct / (magnitude1 * magnitude2);
}

// Check if two events are similar based on thresholds
function areEventsSimilar(
  event1: {
    startDateTime: string;
    endDateTime: string;
    name?: string;
    description?: string;
    location?: string;
  },
  event2: {
    startDateTime: string;
    endDateTime: string;
    name?: string;
    description?: string;
    location?: string;
  },
): boolean {
  // Time difference in minutes
  const startTimeDiff = Math.abs(
    (new Date(event1.startDateTime).getTime() -
      new Date(event2.startDateTime).getTime()) /
      (1000 * 60),
  );
  const endTimeDiff = Math.abs(
    (new Date(event1.endDateTime).getTime() -
      new Date(event2.endDateTime).getTime()) /
      (1000 * 60),
  );

  // Check time thresholds first (cheapest check)
  if (startTimeDiff > THRESHOLDS.startTimeMinutes) {
    return false;
  }
  if (endTimeDiff > THRESHOLDS.endTimeMinutes) {
    return false;
  }

  // Text similarity checks
  const nameSimilarity = cosineSimilarity(
    textToVector(event1.name || ""),
    textToVector(event2.name || ""),
  );
  if (nameSimilarity < THRESHOLDS.nameSimilarity) {
    return false;
  }

  const descriptionSimilarity = cosineSimilarity(
    textToVector(event1.description || ""),
    textToVector(event2.description || ""),
  );
  if (descriptionSimilarity < THRESHOLDS.descriptionSimilarity) {
    return false;
  }

  const locationSimilarity = cosineSimilarity(
    textToVector(event1.location || ""),
    textToVector(event2.location || ""),
  );
  if (locationSimilarity < THRESHOLDS.locationSimilarity) {
    return false;
  }

  return true;
}

/**
 * Find a similar event for a new event being created.
 * Returns the ID of the canonical (earliest) similar event, or null if none found.
 *
 * @param ctx - Convex query context
 * @param newEvent - The new event data to check for similarity
 * @returns The ID of the canonical similar event, or null
 */
export async function findSimilarEvent(
  ctx: QueryCtx,
  newEvent: {
    startDateTime: string;
    endDateTime: string;
    name?: string;
    description?: string;
    location?: string;
  },
): Promise<string | null> {
  // Calculate time window for query (±60 minutes from start time)
  const newStartTime = new Date(newEvent.startDateTime);
  const minTime = new Date(
    newStartTime.getTime() - THRESHOLDS.startTimeMinutes * 60 * 1000,
  ).toISOString();
  const maxTime = new Date(
    newStartTime.getTime() + THRESHOLDS.startTimeMinutes * 60 * 1000,
  ).toISOString();

  // Query events within the time window using the startDateTime index
  const candidates = await ctx.db
    .query("events")
    .withIndex("by_startDateTime", (q) =>
      q.gte("startDateTime", minTime).lte("startDateTime", maxTime),
    )
    .collect();

  // Find the earliest similar event (by created_at)
  let earliestSimilar: Doc<"events"> | null = null;

  for (const candidate of candidates) {
    // Check if events are similar
    const isSimilar = areEventsSimilar(newEvent, {
      startDateTime: candidate.startDateTime,
      endDateTime: candidate.endDateTime,
      name: candidate.name,
      description: candidate.description,
      location: candidate.location,
    });

    if (isSimilar) {
      // If this candidate already points to a canonical event, use that
      if (candidate.similarToEventId) {
        return candidate.similarToEventId;
      }

      // Otherwise, check if this is earlier than our current earliest
      if (
        !earliestSimilar ||
        new Date(candidate.created_at) < new Date(earliestSimilar.created_at)
      ) {
        earliestSimilar = candidate;
      }
    }
  }

  // Return the ID of the earliest similar event (canonical)
  return earliestSimilar?.id ?? null;
}

/**
 * Find a similar event for backfill purposes.
 * Similar to findSimilarEvent but excludes the event being backfilled.
 *
 * @param ctx - Convex query context
 * @param event - The event document being backfilled
 * @returns The ID of the canonical similar event, or null
 */
export async function findSimilarEventForBackfill(
  ctx: QueryCtx,
  event: Doc<"events">,
): Promise<string | null> {
  // Calculate time window for query (±60 minutes from start time)
  const eventStartTime = new Date(event.startDateTime);
  const minTime = new Date(
    eventStartTime.getTime() - THRESHOLDS.startTimeMinutes * 60 * 1000,
  ).toISOString();
  const maxTime = new Date(
    eventStartTime.getTime() + THRESHOLDS.startTimeMinutes * 60 * 1000,
  ).toISOString();

  // Query events within the time window using the startDateTime index
  const candidates = await ctx.db
    .query("events")
    .withIndex("by_startDateTime", (q) =>
      q.gte("startDateTime", minTime).lte("startDateTime", maxTime),
    )
    .collect();

  // Find the earliest similar event that was created BEFORE this event
  let earliestSimilar: Doc<"events"> | null = null;
  const eventCreatedAt = new Date(event.created_at);

  for (const candidate of candidates) {
    // Skip self
    if (candidate.id === event.id) {
      continue;
    }

    // Only consider events created before this one (they're the potential canonical)
    const candidateCreatedAt = new Date(candidate.created_at);
    if (candidateCreatedAt >= eventCreatedAt) {
      continue;
    }

    // Check if events are similar
    const isSimilar = areEventsSimilar(
      {
        startDateTime: event.startDateTime,
        endDateTime: event.endDateTime,
        name: event.name,
        description: event.description,
        location: event.location,
      },
      {
        startDateTime: candidate.startDateTime,
        endDateTime: candidate.endDateTime,
        name: candidate.name,
        description: candidate.description,
        location: candidate.location,
      },
    );

    if (isSimilar) {
      // If this candidate already points to a canonical event, use that
      if (candidate.similarToEventId) {
        return candidate.similarToEventId;
      }

      // Otherwise, check if this is earlier than our current earliest
      if (!earliestSimilar || candidateCreatedAt < new Date(earliestSimilar.created_at)) {
        earliestSimilar = candidate;
      }
    }
  }

  // Return the ID of the earliest similar event (canonical)
  return earliestSimilar?.id ?? null;
}
