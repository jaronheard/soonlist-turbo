import { differenceInMinutes } from "date-fns";

import type { Doc } from "@soonlist/backend/convex/_generated/dataModel";

import type { AddToCalendarButtonProps } from "./types";

type Event = Doc<"events">;
type User = Doc<"users">;
type EventFollow = Doc<"eventFollows">;
type Comment = Doc<"comments">;
type EventToLists = Doc<"eventToLists">;
type List = Doc<"lists">;

type EventToListsWithList = EventToLists & {
  list: List;
};

export interface EventWithUser {
  event: Event;
  user: User;
  eventFollows: EventFollow[];
  comments: Comment[];
  eventToLists?: EventToListsWithList[];
}

// Cosine Similarity Functions
function textToVector(text: string): Map<string, number> {
  const wordMap = new Map<string, number>();
  const words = text.toLowerCase().match(/\w+/g) || [];

  words.forEach((word) => {
    wordMap.set(word, (wordMap.get(word) || 0) + 1);
  });

  return wordMap;
}

function cosineSimilarity(
  vector1: Map<string, number>,
  vector2: Map<string, number>,
): number {
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

  return (
    dotProduct /
    (Math.sqrt(sumOfSquares(vector1)) * Math.sqrt(sumOfSquares(vector2)))
  );
}

// Event Similarity Check Function
function isEventSimilar(
  event1: Event,
  event2: Event,
  startTimeThreshold: number,
  endTimeThreshold: number,
  nameThreshold: number,
  descriptionThreshold: number,
  locationThreshold: number,
): {
  isSimilar: boolean;
  startTimeDifference: number;
  endTimeDifference: number;
  nameSimilarity: number;
  descriptionSimilarity: number;
  locationSimilarity: number;
} {
  const event1Data = event1.event as AddToCalendarButtonProps;
  const event2Data = event2.event as AddToCalendarButtonProps;

  const startTimeDifference = Math.abs(
    differenceInMinutes(event1.startDateTime, event2.startDateTime),
  );
  const endTimeDifference = Math.abs(
    differenceInMinutes(event1.endDateTime, event2.endDateTime),
  );

  // Text and Location Similarity
  const nameSimilarity = cosineSimilarity(
    textToVector(event1Data.name || ""),
    textToVector(event2Data.name || ""),
  );
  const descriptionSimilarity = cosineSimilarity(
    textToVector(event1Data.description || ""),
    textToVector(event2Data.description || ""),
  );
  const locationSimilarity = cosineSimilarity(
    textToVector(event1Data.location || ""),
    textToVector(event2Data.location || ""),
  );

  const isSimilar =
    startTimeDifference <= startTimeThreshold &&
    endTimeDifference <= endTimeThreshold &&
    nameSimilarity >= nameThreshold &&
    descriptionSimilarity >= descriptionThreshold &&
    locationSimilarity >= locationThreshold;

  return {
    isSimilar,
    startTimeDifference,
    endTimeDifference,
    nameSimilarity,
    descriptionSimilarity,
    locationSimilarity,
  };
}

export type SimilarityDetails = ReturnType<typeof isEventSimilar>;

export type SimilarEvents = {
  event: EventWithUser;
  similarityDetails: SimilarityDetails;
}[];
// Structure to store similarity info
export interface EventWithSimilarity {
  event: EventWithUser;
  similarEvents: SimilarEvents;
}

function collapseSimilarEvents(
  events: EventWithUser[],
  currentUserId?: string,
) {
  // Define thresholds
  const startTimeThreshold = 60; // 60 minutes for start time
  const endTimeThreshold = 60; // 60 minutes for end time
  const nameThreshold = 0.1; // 10% similarity for name
  const descriptionThreshold = 0.1; // 10% similarity for description
  const locationThreshold = 0.1; // 10% similarity for location

  const eventsWithSimilarity: EventWithSimilarity[] = [];

  events.forEach((event, index) => {
    const similarityData: EventWithSimilarity["similarEvents"] = [];

    events.forEach((otherEvent, otherIndex) => {
      if (index !== otherIndex) {
        // Avoid comparing an event with itself
        const similarityDetails = isEventSimilar(
          event.event,
          otherEvent.event,
          startTimeThreshold,
          endTimeThreshold,
          nameThreshold,
          descriptionThreshold,
          locationThreshold,
        );
        if (similarityDetails.isSimilar) {
          similarityData.push({ event: otherEvent, similarityDetails });
        }
      }
    });

    eventsWithSimilarity.push({
      event,
      similarEvents: similarityData,
    });
  });

  // console.log("eventsWithSimilarity", eventsWithSimilarity);

  const uniqueEventsWithSimilarity: EventWithSimilarity[] = [];

  // Create a Set to track events that have already been considered
  const seenEvents = new Set();

  eventsWithSimilarity.forEach((item) => {
    const { event: currentEvent, similarEvents } = item;
    if (seenEvents.has(currentEvent.event.id)) {
      // Skip this event if it has already been seen
      return;
    }

    const firstEventWithCurrentUserId = similarEvents.find(
      ({ event }) => event.user.id === currentUserId,
    );
    const similarEventsHasCurrentUserId =
      firstEventWithCurrentUserId !== undefined;

    let earliestEvent = firstEventWithCurrentUserId?.event || currentEvent;
    let earliestCreationDate = new Date(
      firstEventWithCurrentUserId?.event.event.created_at ||
        currentEvent.event.created_at,
    );

    similarEvents.forEach(({ event: similarEvent }) => {
      const similarEventCreationDate = new Date(similarEvent.event.created_at);
      if (similarEventsHasCurrentUserId) {
        // only set as earlies if it matches the current user
        if (similarEvent.user.id === currentUserId) {
          if (similarEventCreationDate < earliestCreationDate) {
            earliestEvent = similarEvent;
            earliestCreationDate = similarEventCreationDate;
          }
        }
      } else {
        if (similarEventCreationDate < earliestCreationDate) {
          earliestEvent = similarEvent;
          earliestCreationDate = similarEventCreationDate;
        }
      }

      // Mark this similar event as seen
      seenEvents.add(similarEvent.event.id);
    });

    // Add the earliest event to the filtered list
    uniqueEventsWithSimilarity.push({ event: earliestEvent, similarEvents });
  });

  return uniqueEventsWithSimilarity;
}

export { isEventSimilar, collapseSimilarEvents };
