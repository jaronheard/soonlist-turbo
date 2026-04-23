import { differenceInMinutes } from "date-fns";

import type {
  Comment,
  Event,
  EventFollow,
  EventToLists,
  List,
  User,
} from "@soonlist/validators";

import type { AddToCalendarButtonProps } from "./types";

type EventToListsWithList = EventToLists & {
  list: List;
};

export type EventWithUser = Event & {
  user: User;
  eventFollows: EventFollow[];
  comments: Comment[];
  eventToLists?: EventToListsWithList[];
};

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
    differenceInMinutes(
      new Date(event1.startDateTime),
      new Date(event2.startDateTime),
    ),
  );
  const endTimeDifference = Math.abs(
    differenceInMinutes(
      new Date(event1.endDateTime),
      new Date(event2.endDateTime),
    ),
  );

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
export interface EventWithSimilarity {
  event: EventWithUser;
  similarEvents: SimilarEvents;
}

function collapseSimilarEvents(
  events: EventWithUser[],
  currentUserId?: string,
) {
  const startTimeThreshold = 60;
  const endTimeThreshold = 60;
  const nameThreshold = 0.1;
  const descriptionThreshold = 0.1;
  const locationThreshold = 0.1;

  const eventsWithSimilarity: EventWithSimilarity[] = [];

  events.forEach((event, index) => {
    const similarityData: EventWithSimilarity["similarEvents"] = [];

    events.forEach((otherEvent, otherIndex) => {
      if (index !== otherIndex) {
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
        }
      }
    });

    eventsWithSimilarity.push({
      event,
      similarEvents: similarityData,
    });
  });


  const uniqueEventsWithSimilarity: EventWithSimilarity[] = [];

  const seenEvents = new Set();

  eventsWithSimilarity.forEach((item) => {
    const { event: currentEvent, similarEvents } = item;
    if (seenEvents.has(currentEvent.id)) {
      return;
    }

    const firstEventWithCurrentUserId = similarEvents.find(
      ({ event }) => event.userId === currentUserId,
    );
    const similarEventsHasCurrentUserId =
      firstEventWithCurrentUserId !== undefined;

    let earliestEvent = firstEventWithCurrentUserId?.event || currentEvent;
    let earliestCreationDate = new Date(
      firstEventWithCurrentUserId?.event.createdAt || currentEvent.createdAt,
    );

    similarEvents.forEach(({ event: similarEvent }) => {
      const similarEventCreationDate = new Date(similarEvent.createdAt);
      if (similarEventsHasCurrentUserId) {
        if (similarEvent.userId === currentUserId) {
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

      seenEvents.add(similarEvent.id);
    });

    uniqueEventsWithSimilarity.push({ event: earliestEvent, similarEvents });
  });

  return uniqueEventsWithSimilarity;
}

export { isEventSimilar, collapseSimilarEvents };
