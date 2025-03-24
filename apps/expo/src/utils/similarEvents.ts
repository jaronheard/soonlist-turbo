import { differenceInMinutes } from "date-fns";

import type { AddToCalendarButtonProps } from "@soonlist/cal/types";
import type {
  Comment,
  Event,
  EventFollow,
  EventToLists,
  List,
  User,
} from "@soonlist/db/types";

import { logDebug } from "./errorLogging";

type EventToListsWithList = EventToLists & {
  list: List;
};

export type EventWithUser = Event & {
  user: User;
  eventFollows: EventFollow[];
  comments: Comment[];
  eventToLists?: EventToListsWithList[];
};

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

  // First, sort events by ID to ensure consistent processing order
  const sortedEvents = [...events].sort((a, b) => a.id.localeCompare(b.id));

  const eventsWithSimilarity: EventWithSimilarity[] = [];
  // Use a Set to track which events we've already processed
  const processedEvents = new Set<string>();

  sortedEvents.forEach((event, index) => {
    // Skip if this event has already been processed as part of another group
    if (processedEvents.has(event.id)) {
      return;
    }

    const similarityData: EventWithSimilarity["similarEvents"] = [];

    sortedEvents.forEach((otherEvent, otherIndex) => {
      if (index !== otherIndex && !processedEvents.has(otherEvent.id)) {
        // Avoid comparing an event with itself or with already processed events
        const similarityDetails = isEventSimilar(
          event,
          otherEvent,
          startTimeThreshold,
          endTimeThreshold,
          nameThreshold,
          descriptionThreshold,
          locationThreshold,
        );
        if (similarityDetails.isSimilar) {
          similarityData.push({ event: otherEvent, similarityDetails });
          processedEvents.add(otherEvent.id);
        }
      }
    });

    eventsWithSimilarity.push({
      event,
      similarEvents: similarityData,
    });
    // Mark the current event as processed
    processedEvents.add(event.id);
  });

  logDebug("eventsWithSimilarity", eventsWithSimilarity);

  const uniqueEventsWithSimilarity: EventWithSimilarity[] = [];

  // Process each group to find the best event to display
  eventsWithSimilarity.forEach((item) => {
    const { event: currentEvent, similarEvents } = item;

    // Find an event from the current user if available
    const firstEventWithCurrentUserId = similarEvents.find(
      ({ event }) => event.userId === currentUserId,
    );
    const similarEventsHasCurrentUserId =
      firstEventWithCurrentUserId !== undefined ||
      currentEvent.userId === currentUserId;

    // Start with either current user's event or the main event
    let bestEvent =
      similarEventsHasCurrentUserId && firstEventWithCurrentUserId
        ? firstEventWithCurrentUserId.event
        : currentEvent;

    // Set initial creation date
    let bestCreationDate = new Date(bestEvent.createdAt);

    // Include the current event in similarity check if needed
    const emptySimilarityDetails: SimilarityDetails = {
      isSimilar: false,
      startTimeDifference: 0,
      endTimeDifference: 0,
      nameSimilarity: 0,
      descriptionSimilarity: 0,
      locationSimilarity: 0,
    };

    const allEvents = [
      { event: currentEvent, similarityDetails: emptySimilarityDetails },
      ...similarEvents,
    ];

    // Find the best event to display
    allEvents.forEach(({ event: candidateEvent }) => {
      const isCurrentUserEvent = candidateEvent.userId === currentUserId;
      const candidateCreationDate = new Date(candidateEvent.createdAt);

      // Prefer current user's events
      if (similarEventsHasCurrentUserId) {
        if (
          isCurrentUserEvent &&
          // Either bestEvent is not current user's event or this one is older
          (bestEvent.userId !== currentUserId ||
            candidateCreationDate < bestCreationDate)
        ) {
          bestEvent = candidateEvent;
          bestCreationDate = candidateCreationDate;
        }
      } else if (candidateCreationDate < bestCreationDate) {
        // If no current user events, just pick the oldest one
        bestEvent = candidateEvent;
        bestCreationDate = candidateCreationDate;
      }
    });

    // Add the best event to the filtered list
    uniqueEventsWithSimilarity.push({
      event: bestEvent,
      // Filter out the best event from similarEvents to avoid duplication
      similarEvents: similarEvents.filter(
        ({ event }) => event.id !== bestEvent.id,
      ),
    });
  });

  // Sort final list by start date for consistency
  return uniqueEventsWithSimilarity.sort(
    (a, b) => a.event.startDateTime.getTime() - b.event.startDateTime.getTime(),
  );
}

export { isEventSimilar, collapseSimilarEvents };
