import { Temporal } from "@js-temporal/polyfill";
import { ConvexError } from "convex/values";

import type { EventMetadataLoose } from "@soonlist/cal";

import type { Doc } from "../_generated/dataModel";
import type { MutationCtx, QueryCtx } from "../_generated/server";
import { internal } from "../_generated/api";
import {
  eventFollowsAggregate,
  eventsByCreation,
  eventsByStartTime,
  userFeedsAggregate,
} from "../aggregates";
import { DEFAULT_TIMEZONE } from "../constants";
import {
  addEventToListFeedInline,
  removeEventFromListFeedInline,
} from "../feedHelpers";
import { getOrCreatePersonalList } from "../lists";
import { generateNumericId, generatePublicId } from "../utils";
import {
  determineNewSimilarityGroup,
  findSimilarityGroup,
  generateSimilarityGroupId,
  shouldRegroupEvent,
} from "./similarityHelpers";

interface EventData {
  name: string;
  startDate: string;
  endDate: string;
  startTime?: string;
  endTime?: string;
  timeZone?: string;
  location?: string;
  description?: string;
  images?: string[];
  [key: string]: unknown;
}

function filterDuplicates<T extends { id: string }>(items: T[]): T[] {
  const seen = new Set<string>();
  return items.filter((item) => {
    if (seen.has(item.id)) {
      return false;
    }
    seen.add(item.id);
    return true;
  });
}

async function batchGetUsersByIds(ctx: QueryCtx, userIds: string[]) {
  const uniqueIds = [...new Set(userIds)];
  const users = await Promise.all(
    uniqueIds.map((id) =>
      ctx.db
        .query("users")
        .withIndex("by_custom_id", (q) => q.eq("id", id))
        .unique(),
    ),
  );
  const userMap = new Map<string, Doc<"users"> | null>();
  uniqueIds.forEach((id, i) => userMap.set(id, users[i] ?? null));
  return userMap;
}

export async function enrichEventsAndFilterNulls(
  ctx: QueryCtx,
  events: Doc<"events">[],
) {
  if (events.length === 0) return [];

  const validEvents = events;

  const [allEventFollows, allComments, allEventToLists] = await Promise.all([
    Promise.all(
      validEvents.map((event) =>
        ctx.db
          .query("eventFollows")
          .withIndex("by_event", (q) => q.eq("eventId", event.id))
          .collect(),
      ),
    ),
    Promise.all(
      validEvents.map((event) =>
        ctx.db
          .query("comments")
          .withIndex("by_event", (q) => q.eq("eventId", event.id))
          .collect(),
      ),
    ),
    Promise.all(
      validEvents.map((event) =>
        ctx.db
          .query("eventToLists")
          .withIndex("by_event", (q) => q.eq("eventId", event.id))
          .collect(),
      ),
    ),
  ]);

  const allUserIds: string[] = validEvents.map((e) => e.userId);
  for (const follows of allEventFollows) {
    for (const follow of follows) {
      allUserIds.push(follow.userId);
    }
  }

  const allListIds: string[] = [];
  for (const etls of allEventToLists) {
    for (const etl of etls) {
      allListIds.push(etl.listId);
    }
  }

  const [userMap, listDocs] = await Promise.all([
    batchGetUsersByIds(ctx, allUserIds),
    Promise.all(
      [...new Set(allListIds)].map((listId) =>
        ctx.db
          .query("lists")
          .withIndex("by_custom_id", (q) => q.eq("id", listId))
          .unique(),
      ),
    ),
  ]);

  const uniqueListIds = [...new Set(allListIds)];
  const listMap = new Map<string, Doc<"lists">>();
  uniqueListIds.forEach((listId, i) => {
    const list = listDocs[i];
    if (list) listMap.set(listId, list);
  });

  return validEvents.map((event, idx) => {
    const user = userMap.get(event.userId) ?? null;
    const eventFollowsRaw = allEventFollows[idx] ?? [];
    const comments = allComments[idx] ?? [];
    const eventToLists = allEventToLists[idx] ?? [];

    const eventFollows = eventFollowsRaw.map((follow) => {
      const follower = userMap.get(follow.userId);
      return {
        ...follow,
        user: follower
          ? {
              id: follower.id,
              username: follower.username,
              displayName: follower.displayName,
              userImage: follower.userImage,
            }
          : null,
      };
    });

    const lists: Doc<"lists">[] = [];
    for (const etl of eventToLists) {
      const list = listMap.get(etl.listId);
      if (list) lists.push(list);
    }

    if (!user) {
      console.warn(
        `User not found for event ${event.id} with userId ${event.userId}`,
      );
    }

    return { ...event, user, eventFollows, comments, eventToLists, lists };
  });
}

function parseDateTime(date: string, time: string, timeZone: string): Date {
  if (!date || !time) {
    throw new ConvexError(
      `Invalid date or time: date="${date}", time="${time}"`,
    );
  }

  const datePattern = /^\d{4}-\d{2}-\d{2}$/;
  if (!datePattern.test(date)) {
    throw new ConvexError(
      `Invalid date format: "${date}". Expected YYYY-MM-DD`,
    );
  }

  const timePattern = /^([01]?[0-9]|2[0-3]):[0-5][0-9](:[0-5][0-9])?$/;
  if (!timePattern.test(time)) {
    throw new ConvexError(
      `Invalid time format: "${time}". Expected HH:MM or HH:MM:SS`,
    );
  }

  try {
    const timeWithSeconds =
      time.includes(":") && time.split(":").length === 3 ? time : `${time}:00`;

    const zonedDateTime = Temporal.ZonedDateTime.from(
      `${date}T${timeWithSeconds}[${timeZone || DEFAULT_TIMEZONE}]`,
    );

    return new Date(zonedDateTime.epochMilliseconds);
  } catch (error) {
    console.warn(
      "Temporal parsing failed, falling back to simple Date parsing:",
      error,
    );

    const timeWithSeconds =
      time.includes(":") && time.split(":").length === 3 ? time : `${time}:00`;
    const dateTimeString = `${date}T${timeWithSeconds}`;
    const parsedDate = new Date(dateTimeString);

    if (isNaN(parsedDate.getTime())) {
      throw new ConvexError(
        `Invalid date/time combination: "${dateTimeString}"`,
      );
    }

    return parsedDate;
  }
}

export async function getEventsForUser(ctx: QueryCtx, userName: string) {
  const user = await ctx.db
    .query("users")
    .withIndex("by_username", (q) => q.eq("username", userName))
    .unique();

  if (!user) {
    return [];
  }

  const events = await ctx.db
    .query("events")
    .withIndex("by_user", (q) => q.eq("userId", user.id))
    .collect();

  return events.sort(
    (a, b) =>
      new Date(a.startDateTime).getTime() - new Date(b.startDateTime).getTime(),
  );
}

export async function getUpcomingEventsForUser(
  ctx: QueryCtx,
  userName: string,
) {
  const now = new Date(new Date().getTime() - 24 * 60 * 60 * 1000);

  const user = await ctx.db
    .query("users")
    .withIndex("by_username", (q) => q.eq("username", userName))
    .unique();

  if (!user) {
    return [];
  }

  const createdEvents = await ctx.db
    .query("events")
    .withIndex("by_user", (q) => q.eq("userId", user.id))
    .filter((q) => q.gte(q.field("startDateTime"), now.toISOString()))
    .collect();

  const eventFollows = await ctx.db
    .query("eventFollows")
    .withIndex("by_user", (q) => q.eq("userId", user.id))
    .collect();

  const savedEvents = [];
  for (const follow of eventFollows) {
    const event = await ctx.db
      .query("events")
      .withIndex("by_custom_id", (q) => q.eq("id", follow.eventId))
      .unique();

    if (event && new Date(event.startDateTime) > now) {
      savedEvents.push(event);
    }
  }

  const allEvents = [...createdEvents, ...savedEvents];
  return allEvents.sort(
    (a, b) =>
      new Date(a.startDateTime).getTime() - new Date(b.startDateTime).getTime(),
  );
}

export async function getFollowingEventsForUser(
  ctx: QueryCtx,
  userName: string,
) {
  const user = await ctx.db
    .query("users")
    .withIndex("by_username", (q) => q.eq("username", userName))
    .unique();

  if (!user) {
    return [];
  }

  const allEvents: Doc<"events">[] = [];

  const eventFollows = await ctx.db
    .query("eventFollows")
    .withIndex("by_user", (q) => q.eq("userId", user.id))
    .collect();

  for (const follow of eventFollows) {
    const event = await ctx.db
      .query("events")
      .withIndex("by_custom_id", (q) => q.eq("id", follow.eventId))
      .unique();
    if (event) {
      allEvents.push(event);
    }
  }

  const listFollows = await ctx.db
    .query("listFollows")
    .withIndex("by_user", (q) => q.eq("userId", user.id))
    .collect();

  for (const listFollow of listFollows) {
    const eventToLists = await ctx.db
      .query("eventToLists")
      .withIndex("by_list", (q) => q.eq("listId", listFollow.listId))
      .collect();

    for (const etl of eventToLists) {
      const event = await ctx.db
        .query("events")
        .withIndex("by_custom_id", (q) => q.eq("id", etl.eventId))
        .unique();
      if (event) {
        allEvents.push(event);
      }
    }
  }

  const userFollows = await ctx.db
    .query("userFollows")
    .withIndex("by_follower", (q) => q.eq("followerId", user.id))
    .collect();

  for (const userFollow of userFollows) {
    const followedUserEvents = await ctx.db
      .query("events")
      .withIndex("by_user", (q) => q.eq("userId", userFollow.followingId))
      .collect();

    allEvents.push(...followedUserEvents);
  }

  const uniqueEvents = filterDuplicates(allEvents);
  return uniqueEvents.sort(
    (a, b) =>
      new Date(a.startDateTime).getTime() - new Date(b.startDateTime).getTime(),
  );
}

export async function getFollowingUpcomingEventsForUser(
  ctx: QueryCtx,
  userName: string,
) {
  const now = new Date();

  const user = await ctx.db
    .query("users")
    .withIndex("by_username", (q) => q.eq("username", userName))
    .unique();

  if (!user) {
    return [];
  }

  const eventIds = new Set<string>();

  const eventFollows = await ctx.db
    .query("eventFollows")
    .withIndex("by_user", (q) => q.eq("userId", user.id))
    .collect();

  eventFollows.forEach((ef) => eventIds.add(ef.eventId));

  const listFollows = await ctx.db
    .query("listFollows")
    .withIndex("by_user", (q) => q.eq("userId", user.id))
    .collect();

  for (const lf of listFollows) {
    const eventToLists = await ctx.db
      .query("eventToLists")
      .withIndex("by_list", (q) => q.eq("listId", lf.listId))
      .collect();
    eventToLists.forEach((etl) => eventIds.add(etl.eventId));
  }

  const userFollows = await ctx.db
    .query("userFollows")
    .withIndex("by_follower", (q) => q.eq("followerId", user.id))
    .collect();

  for (const uf of userFollows) {
    const followedUserEvents = await ctx.db
      .query("events")
      .withIndex("by_user", (q) => q.eq("userId", uf.followingId))
      .collect();
    followedUserEvents.forEach((e) => eventIds.add(e.id));
  }

  const upcomingEvents = [];
  for (const eventId of eventIds) {
    const event = await ctx.db
      .query("events")
      .withIndex("by_custom_id", (q) => q.eq("id", eventId))
      .unique();

    if (event && new Date(event.startDateTime) > now) {
      upcomingEvents.push(event);
    }
  }

  return upcomingEvents.sort(
    (a, b) =>
      new Date(a.startDateTime).getTime() - new Date(b.startDateTime).getTime(),
  );
}

export async function getSavedEventsForUser(ctx: QueryCtx, userName: string) {
  const user = await ctx.db
    .query("users")
    .withIndex("by_username", (q) => q.eq("username", userName))
    .unique();

  if (!user) {
    return [];
  }

  const eventFollows = await ctx.db
    .query("eventFollows")
    .withIndex("by_user", (q) => q.eq("userId", user.id))
    .collect();

  const savedEvents = [];
  for (const follow of eventFollows) {
    const event = await ctx.db
      .query("events")
      .withIndex("by_custom_id", (q) => q.eq("id", follow.eventId))
      .unique();
    if (event) {
      savedEvents.push(event);
    }
  }

  return savedEvents.sort(
    (a, b) =>
      new Date(a.startDateTime).getTime() - new Date(b.startDateTime).getTime(),
  );
}

export async function getSavedEventIdsForUser(ctx: QueryCtx, userName: string) {
  const user = await ctx.db
    .query("users")
    .withIndex("by_username", (q) => q.eq("username", userName))
    .unique();

  if (!user) {
    return [];
  }

  const eventFollows = await ctx.db
    .query("eventFollows")
    .withIndex("by_user", (q) => q.eq("userId", user.id))
    .collect();

  return eventFollows.map((follow) => ({ id: follow.eventId }));
}

export async function getPossibleDuplicateEvents(
  ctx: QueryCtx,
  startDateTime: Date,
) {
  const startDateTimeLowerBound = new Date(startDateTime);
  startDateTimeLowerBound.setHours(startDateTime.getHours() - 1);
  const startDateTimeUpperBound = new Date(startDateTime);
  startDateTimeUpperBound.setHours(startDateTime.getHours() + 1);

  const events = await ctx.db
    .query("events")
    .withIndex("by_startDateTime", (q) =>
      q
        .gte("startDateTime", startDateTimeLowerBound.toISOString())
        .lte("startDateTime", startDateTimeUpperBound.toISOString()),
    )
    .collect();

  return events;
}

export async function getEventById(ctx: QueryCtx, eventId: string) {
  const event = await ctx.db
    .query("events")
    .withIndex("by_custom_id", (q) => q.eq("id", eventId))
    .unique();

  if (!event) {
    return null;
  }

  const user = await ctx.db
    .query("users")
    .withIndex("by_custom_id", (q) => q.eq("id", event.userId))
    .unique();

  const eventFollowsRaw = await ctx.db
    .query("eventFollows")
    .withIndex("by_event", (q) => q.eq("eventId", eventId))
    .collect();

  const followerIds = eventFollowsRaw.map((f) => f.userId);
  const followerMap = await batchGetUsersByIds(ctx, followerIds);

  const eventFollows = eventFollowsRaw.map((follow) => {
    const follower = followerMap.get(follow.userId);
    return {
      ...follow,
      user: follower
        ? {
            id: follower.id,
            username: follower.username,
            displayName: follower.displayName,
            userImage: follower.userImage,
          }
        : null,
    };
  });

  const comments = await ctx.db
    .query("comments")
    .withIndex("by_event", (q) => q.eq("eventId", eventId))
    .collect();

  const eventToLists = await ctx.db
    .query("eventToLists")
    .withIndex("by_event", (q) => q.eq("eventId", eventId))
    .collect();

  const lists = [];
  for (const etl of eventToLists) {
    const list = await ctx.db
      .query("lists")
      .withIndex("by_custom_id", (q) => q.eq("id", etl.listId))
      .unique();
    if (list) {
      lists.push(list);
    }
  }

  if (!user) {
    console.warn(
      `User not found for event ${eventId} with userId ${event.userId}`,
    );
  }

  return {
    ...event,
    user,
    eventFollows,
    comments,
    eventToLists,
    lists,
  };
}

export async function getAllEvents(ctx: QueryCtx) {
  const events = await ctx.db.query("events").collect();
  return events.sort(
    (a, b) =>
      new Date(a.startDateTime).getTime() - new Date(b.startDateTime).getTime(),
  );
}

export async function getNextEvents(
  ctx: QueryCtx,
  limit?: number,
  excludeCurrent?: boolean,
) {
  const now = new Date();

  const query = ctx.db.query("events").withIndex("by_startDateTime", (q) => {
    if (excludeCurrent) {
      return q.gte("startDateTime", now.toISOString());
    } else {
      return q.gte("startDateTime", now.toISOString());
    }
  });

  const events = await query.collect();

  const filteredEvents = excludeCurrent
    ? events.filter((event) => new Date(event.endDateTime) >= now)
    : events;

  const sortedEvents = filteredEvents.sort(
    (a, b) =>
      new Date(a.startDateTime).getTime() - new Date(b.startDateTime).getTime(),
  );

  return limit ? sortedEvents.slice(0, limit) : sortedEvents;
}

export async function getDiscoverEvents(
  ctx: QueryCtx,
  userId: string,
  limit?: number,
  excludeCurrent?: boolean,
) {
  const now = new Date();

  const query = ctx.db
    .query("events")
    .withIndex("by_visibility_and_startDateTime", (q) =>
      q.eq("visibility", "public").gte("startDateTime", now.toISOString()),
    );

  const events = await query.collect();

  const filteredEvents = events.filter((event) => {
    if (event.userId === userId) return false;

    if (excludeCurrent) {
      return new Date(event.endDateTime) >= now;
    }
    return true;
  });

  const sortedEvents = filteredEvents.sort(
    (a, b) =>
      new Date(a.startDateTime).getTime() - new Date(b.startDateTime).getTime(),
  );

  return limit ? sortedEvents.slice(0, limit) : sortedEvents;
}

export async function createEvent(
  ctx: MutationCtx,
  userId: string,
  userName: string,
  eventData: EventData,
  eventMetadata?: EventMetadataLoose,
  comment?: string,
  lists?: { value: string }[],
  visibility?: "public" | "private",
  batchId?: string,
) {
  const eventId = generatePublicId();

  const startTime = eventData.startTime || "00:00";
  const endTime = eventData.endTime || "23:59";
  const timeZone = eventData.timeZone || DEFAULT_TIMEZONE;

  const startDateTime = parseDateTime(eventData.startDate, startTime, timeZone);
  const endDateTime = parseDateTime(eventData.endDate, endTime, timeZone);

  const similarityGroupId =
    (await findSimilarityGroup(ctx, {
      startDateTime: startDateTime.toISOString(),
      endDateTime: endDateTime.toISOString(),
      name: eventData.name,
      description: eventData.description,
      location: eventData.location,
    })) || generateSimilarityGroupId();

  let effectiveVisibility = visibility;
  if (effectiveVisibility === undefined) {
    const user = await ctx.db
      .query("users")
      .withIndex("by_custom_id", (q) => q.eq("id", userId))
      .first();
    effectiveVisibility = user?.publicListEnabled ? "public" : "private";
  }

  const eventDocId = await ctx.db.insert("events", {
    id: eventId,
    userId,
    userName,
    event: eventData,
    eventMetadata,
    startDateTime: startDateTime.toISOString(),
    endDateTime: endDateTime.toISOString(),
    visibility: effectiveVisibility,
    created_at: new Date().toISOString(),
    updatedAt: null,
    name: eventData.name,
    image: eventData.images?.[0] || null,
    endDate: eventData.endDate,
    endTime,
    location: eventData.location,
    timeZone,
    startDate: eventData.startDate,
    startTime,
    description: eventData.description,
    batchId,
    similarityGroupId,
  });

  const createdEvent = await ctx.db.get(eventDocId);
  if (createdEvent) {
    await eventsByCreation.replaceOrInsert(ctx, createdEvent, createdEvent);
    await eventsByStartTime.replaceOrInsert(ctx, createdEvent, createdEvent);
  }

  if (comment && comment.length > 0) {
    await ctx.db.insert("comments", {
      content: comment,
      userId,
      eventId,
      id: generateNumericId(),
      oldId: null,
      created_at: new Date().toISOString(),
      updatedAt: null,
    });
  }

  if (lists && lists.length > 0) {
    for (const list of lists) {
      if (list.value) {
        await addEventToList(ctx, eventId, list.value, userId);
      }
    }
  }

  const personalList = await getOrCreatePersonalList(ctx, userId);
  await addEventToList(ctx, eventId, personalList.id, userId);

  await ctx.runMutation(internal.feedHelpers.updateEventInFeeds, {
    eventId,
    userId,
    visibility: effectiveVisibility,
    startDateTime: startDateTime.toISOString(),
    endDateTime: endDateTime.toISOString(),
    similarityGroupId,
  });

  return { id: eventId };
}

async function regroupEvent(
  ctx: MutationCtx,
  eventId: string,
  oldGroupId: string,
  newGroupId: string,
): Promise<void> {
  const event = await ctx.db
    .query("events")
    .withIndex("by_custom_id", (q) => q.eq("id", eventId))
    .unique();

  if (!event) {
    throw new ConvexError(`Event ${eventId} not found for regrouping`);
  }

  await ctx.db.patch(event._id, {
    similarityGroupId: newGroupId,
  });

  const feedEntries = await ctx.db
    .query("userFeeds")
    .withIndex("by_event", (q) => q.eq("eventId", eventId))
    .collect();

  const affectedOldGroups = new Set<string>();
  const affectedNewGroups = new Set<string>();

  for (const entry of feedEntries) {
    if (entry.similarityGroupId) {
      affectedOldGroups.add(`${entry.feedId}:${entry.similarityGroupId}`);
    }

    await ctx.db.patch(entry._id, {
      similarityGroupId: newGroupId,
    });

    affectedNewGroups.add(`${entry.feedId}:${newGroupId}`);
  }

  for (const pair of affectedOldGroups) {
    const [feedId, groupId] = pair.split(":");
    if (feedId && groupId) {
      await ctx.runMutation(internal.feedGroupHelpers.upsertGroupedFeedEntry, {
        feedId,
        similarityGroupId: groupId,
      });
    }
  }

  for (const pair of affectedNewGroups) {
    const [feedId, groupId] = pair.split(":");
    if (feedId && groupId) {
      await ctx.runMutation(internal.feedGroupHelpers.upsertGroupedFeedEntry, {
        feedId,
        similarityGroupId: groupId,
      });
    }
  }
}

export async function updateEvent(
  ctx: MutationCtx,
  userId: string,
  eventId: string,
  eventData: EventData,
  eventMetadata?: Record<string, unknown>,
  comment?: string,
  lists?: { value: string }[],
  visibility?: "public" | "private",
  isAdmin?: boolean,
) {
  const existingEvent = await ctx.db
    .query("events")
    .withIndex("by_custom_id", (q) => q.eq("id", eventId))
    .unique();

  if (!existingEvent) {
    throw new ConvexError("Event not found");
  }

  if (existingEvent.userId !== userId && !isAdmin) {
    throw new ConvexError("Unauthorized");
  }

  const startTime = eventData.startTime || "00:00";
  const endTime = eventData.endTime || "23:59";
  const timeZone = eventData.timeZone || DEFAULT_TIMEZONE;

  if (!eventData.startDate) {
    throw new ConvexError("Start date is required");
  }
  if (!eventData.endDate) {
    throw new ConvexError("End date is required");
  }

  const startDateTime = parseDateTime(eventData.startDate, startTime, timeZone);
  const endDateTime = parseDateTime(eventData.endDate, endTime, timeZone);

  await ctx.db.patch(existingEvent._id, {
    event: eventData,
    eventMetadata,
    startDateTime: startDateTime.toISOString(),
    endDateTime: endDateTime.toISOString(),
    ...(visibility && { visibility }),
    updatedAt: new Date().toISOString(),
    name: eventData.name,
    image: eventData.images?.[0] || null,
    endDate: eventData.endDate,
    endTime,
    location: eventData.location,
    timeZone,
    startDate: eventData.startDate,
    startTime,
    description: eventData.description,
  });

  const updatedEvent = await ctx.db.get(existingEvent._id);
  if (updatedEvent) {
    await eventsByCreation.replaceOrInsert(ctx, existingEvent, updatedEvent);
    await eventsByStartTime.replaceOrInsert(ctx, existingEvent, updatedEvent);
  }

  const existingComment = await ctx.db
    .query("comments")
    .withIndex("by_event", (q) => q.eq("eventId", eventId))
    .filter((q) => q.eq(q.field("userId"), userId))
    .unique();

  if (comment && comment.length > 0) {
    if (existingComment) {
      await ctx.db.patch(existingComment._id, {
        content: comment,
        updatedAt: new Date().toISOString(),
      });
    } else {
      await ctx.db.insert("comments", {
        content: comment,
        userId,
        eventId,
        id: generateNumericId(),
        oldId: null,
        created_at: new Date().toISOString(),
        updatedAt: null,
      });
    }
  } else if (existingComment) {
    await ctx.db.delete(existingComment._id);
  }

  if (lists !== undefined) {
    const existingEventToLists = await ctx.db
      .query("eventToLists")
      .withIndex("by_event", (q) => q.eq("eventId", eventId))
      .collect();

    const existingListIds = new Set(
      existingEventToLists.map((etl) => etl.listId),
    );
    const newListIds = new Set(
      lists.filter((l) => l.value).map((l) => l.value),
    );

    for (const etl of existingEventToLists) {
      if (!newListIds.has(etl.listId)) {
        await removeEventFromList(ctx, eventId, etl.listId, userId);
      }
    }

    if (lists.length > 0) {
      for (const list of lists) {
        if (list.value && !existingListIds.has(list.value)) {
          await addEventToList(ctx, eventId, list.value, userId);
        }
      }
    }
  }

  const visibilityChanged =
    visibility && existingEvent.visibility !== visibility;
  const timeChanged =
    existingEvent.startDateTime !== startDateTime.toISOString() ||
    existingEvent.endDateTime !== endDateTime.toISOString();

  const newEventData = {
    startDateTime: startDateTime.toISOString(),
    endDateTime: endDateTime.toISOString(),
    name: eventData.name,
    description: eventData.description,
    location: eventData.location,
  };
  const similarityFieldsChanged = shouldRegroupEvent(
    existingEvent,
    newEventData,
  );

  let similarityGroupId = existingEvent.similarityGroupId;

  if (similarityFieldsChanged && existingEvent.similarityGroupId) {
    const { newGroupId, needsRegroup } = await determineNewSimilarityGroup(
      ctx,
      eventId,
      existingEvent.similarityGroupId,
      newEventData,
    );

    if (needsRegroup) {
      await regroupEvent(
        ctx,
        eventId,
        existingEvent.similarityGroupId,
        newGroupId,
      );
      similarityGroupId = newGroupId;
    }
  }

  if (visibilityChanged || timeChanged) {
    if (visibility === "private" && existingEvent.visibility === "public") {
      await ctx.runMutation(internal.feedHelpers.removeEventFromFeeds, {
        eventId,
        keepCreatorFeed: true,
      });
    }

    await ctx.runMutation(internal.feedHelpers.updateEventInFeeds, {
      eventId,
      userId: existingEvent.userId,
      visibility: visibility || existingEvent.visibility,
      startDateTime: startDateTime.toISOString(),
      endDateTime: endDateTime.toISOString(),
      similarityGroupId,
    });

    if (visibilityChanged) {
      await ctx.runMutation(internal.feedHelpers.updateEventVisibilityInFeeds, {
        eventId,
        visibility: visibility || existingEvent.visibility,
      });
    }

    if (visibility === "public" && existingEvent.visibility === "private") {
      const eventToLists = await ctx.db
        .query("eventToLists")
        .withIndex("by_event", (q) => q.eq("eventId", eventId))
        .collect();

      for (const etl of eventToLists) {
        await ctx.runMutation(
          internal.feedHelpers.addEventToListFollowersFeeds,
          {
            eventId,
            listId: etl.listId,
          },
        );
      }
    }

    if (timeChanged) {
      await ctx.runMutation(internal.feedHelpers.updateEventTimesInAllFeeds, {
        eventId,
        startDateTime: startDateTime.toISOString(),
        endDateTime: endDateTime.toISOString(),
      });
    }
  }

  return { id: eventId };
}

export async function deleteEvent(
  ctx: MutationCtx,
  userId: string,
  eventId: string,
  isAdmin?: boolean,
) {
  const event = await ctx.db
    .query("events")
    .withIndex("by_custom_id", (q) => q.eq("id", eventId))
    .unique();

  if (!event) {
    throw new ConvexError("Event not found");
  }

  if (event.userId !== userId && !isAdmin) {
    throw new ConvexError("Unauthorized");
  }

  const eventFollows = await ctx.db
    .query("eventFollows")
    .withIndex("by_event", (q) => q.eq("eventId", eventId))
    .collect();

  const comments = await ctx.db
    .query("comments")
    .withIndex("by_event", (q) => q.eq("eventId", eventId))
    .collect();

  const eventToLists = await ctx.db
    .query("eventToLists")
    .withIndex("by_event", (q) => q.eq("eventId", eventId))
    .collect();

  for (const ef of eventFollows) {
    await eventFollowsAggregate.deleteIfExists(ctx, ef);
    await ctx.db.delete(ef._id);
  }

  for (const comment of comments) {
    await ctx.db.delete(comment._id);
  }

  for (const etl of eventToLists) {
    await ctx.db.delete(etl._id);
  }

  await ctx.runMutation(internal.feedHelpers.removeEventFromFeeds, {
    eventId,
    keepCreatorFeed: false,
    keepListFeeds: false,
  });

  await eventsByCreation.deleteIfExists(ctx, event);
  await eventsByStartTime.deleteIfExists(ctx, event);

  await ctx.db.delete(event._id);

  return { id: eventId };
}

export async function followEvent(
  ctx: MutationCtx,
  userId: string,
  eventId: string,
) {
  const existingFollow = await ctx.db
    .query("eventFollows")
    .withIndex("by_user_and_event", (q) =>
      q.eq("userId", userId).eq("eventId", eventId),
    )
    .unique();

  if (!existingFollow) {
    const followId = await ctx.db.insert("eventFollows", {
      userId,
      eventId,
    });

    const createdFollow = await ctx.db.get(followId);
    if (createdFollow) {
      await eventFollowsAggregate.replaceOrInsert(
        ctx,
        createdFollow,
        createdFollow,
      );
    }

    const event = await ctx.db
      .query("events")
      .withIndex("by_custom_id", (q) => q.eq("id", eventId))
      .unique();

    if (event) {
      await ctx.runMutation(internal.feedHelpers.addEventToUserFeed, {
        userId,
        eventId,
      });
    }
  }

  return await getEventById(ctx, eventId);
}

export async function unfollowEvent(
  ctx: MutationCtx,
  userId: string,
  eventId: string,
) {
  const existingFollow = await ctx.db
    .query("eventFollows")
    .withIndex("by_user_and_event", (q) =>
      q.eq("userId", userId).eq("eventId", eventId),
    )
    .unique();

  if (existingFollow) {
    await eventFollowsAggregate.deleteIfExists(ctx, existingFollow);
    await ctx.db.delete(existingFollow._id);

    const event = await ctx.db
      .query("events")
      .withIndex("by_custom_id", (q) => q.eq("id", eventId))
      .first();

    if (event) {
      const isCreator = event.userId === userId;
      if (isCreator) {
        return await getEventById(ctx, eventId);
      }

      const listFollows = await ctx.db
        .query("listFollows")
        .withIndex("by_user", (q) => q.eq("userId", userId))
        .collect();

      if (listFollows.length > 0) {
        const followedListIds = new Set(listFollows.map((f) => f.listId));
        const eventToLists = await ctx.db
          .query("eventToLists")
          .withIndex("by_event", (q) => q.eq("eventId", eventId))
          .collect();

        const isInFollowedList = eventToLists.some((etl) =>
          followedListIds.has(etl.listId),
        );

        if (isInFollowedList) {
          return await getEventById(ctx, eventId);
        }
      }

      const feedId = `user_${userId}`;
      const feedEntry = await ctx.db
        .query("userFeeds")
        .withIndex("by_feed_event", (q) =>
          q.eq("feedId", feedId).eq("eventId", eventId),
        )
        .unique();

      if (feedEntry) {
        const similarityGroupId = feedEntry.similarityGroupId;
        await userFeedsAggregate.deleteIfExists(ctx, feedEntry);
        await ctx.db.delete(feedEntry._id);

        if (similarityGroupId) {
          await ctx.runMutation(
            internal.feedGroupHelpers.upsertGroupedFeedEntry,
            { feedId, similarityGroupId },
          );
        }
      }
    }
  }

  return await getEventById(ctx, eventId);
}

export async function addEventToList(
  ctx: MutationCtx,
  eventId: string,
  listId: string,
  userId: string,
) {
  const list = await ctx.db
    .query("lists")
    .withIndex("by_custom_id", (q) => q.eq("id", listId))
    .first();

  if (!list) {
    throw new ConvexError("List not found");
  }

  const contribution = list.contribution ?? "open";

  if (list.userId === userId) {
    // Owner can always contribute
  } else if (contribution === "open") {
    // Open mode: anyone can contribute
  } else if (contribution === "owner") {
    throw new ConvexError(
      "Cannot add event to list: contribution is restricted to owner only",
    );
  } else {
    const membership = await ctx.db
      .query("listMembers")
      .withIndex("by_list_and_user", (q) =>
        q.eq("listId", listId).eq("userId", userId),
      )
      .first();

    if (!membership) {
      throw new ConvexError(
        "Cannot add event to list: contribution is restricted to members only",
      );
    }
  }

  const existing = await ctx.db
    .query("eventToLists")
    .withIndex("by_event_and_list", (q) =>
      q.eq("eventId", eventId).eq("listId", listId),
    )
    .first();

  if (!existing) {
    await ctx.db.insert("eventToLists", {
      eventId,
      listId,
    });

    await addEventToListFeedInline(ctx, eventId, listId);

    await ctx.runMutation(internal.feedHelpers.addEventToListFollowersFeeds, {
      eventId,
      listId,
    });
  }
}

export async function removeEventFromList(
  ctx: MutationCtx,
  eventId: string,
  listId: string,
  userId: string,
) {
  const list = await ctx.db
    .query("lists")
    .withIndex("by_custom_id", (q) => q.eq("id", listId))
    .first();

  if (!list) {
    throw new ConvexError("List not found");
  }

  const contribution = list.contribution ?? "open";

  if (list.userId === userId) {
    // Owner can always contribute
  } else if (contribution === "open") {
    // Open mode: anyone can contribute
  } else if (contribution === "owner") {
    throw new ConvexError(
      "Cannot remove event from list: contribution is restricted to owner only",
    );
  } else {
    const membership = await ctx.db
      .query("listMembers")
      .withIndex("by_list_and_user", (q) =>
        q.eq("listId", listId).eq("userId", userId),
      )
      .first();

    if (!membership) {
      throw new ConvexError(
        "Cannot remove event from list: contribution is restricted to members only",
      );
    }
  }

  const existingLinks = await ctx.db
    .query("eventToLists")
    .withIndex("by_event_and_list", (q) =>
      q.eq("eventId", eventId).eq("listId", listId),
    )
    .collect();

  if (existingLinks.length > 0) {
    for (const link of existingLinks) {
      await ctx.db.delete(link._id);
    }

    await removeEventFromListFeedInline(ctx, eventId, listId);

    await ctx.runMutation(
      internal.feedHelpers.removeEventFromListFollowersFeeds,
      {
        eventId,
        listId,
      },
    );
  }
}

export async function toggleEventVisibility(
  ctx: MutationCtx,
  userId: string,
  eventId: string,
  visibility: "public" | "private",
) {
  const event = await ctx.db
    .query("events")
    .withIndex("by_custom_id", (q) => q.eq("id", eventId))
    .unique();

  if (!event) {
    throw new ConvexError("Event not found");
  }

  if (event.userId !== userId) {
    throw new ConvexError("You don't have permission to modify this event");
  }

  await ctx.db.patch(event._id, {
    visibility,
    updatedAt: new Date().toISOString(),
  });

  if (event.visibility !== visibility) {
    if (visibility === "private") {
      await ctx.runMutation(internal.feedHelpers.removeEventFromFeeds, {
        eventId,
        keepCreatorFeed: true,
      });
    } else {
      await ctx.runMutation(internal.feedHelpers.updateEventInFeeds, {
        eventId,
        userId: event.userId,
        visibility,
        startDateTime: event.startDateTime,
        endDateTime: event.endDateTime,
      });

      const eventToLists = await ctx.db
        .query("eventToLists")
        .withIndex("by_event", (q) => q.eq("eventId", eventId))
        .collect();

      for (const etl of eventToLists) {
        await ctx.runMutation(
          internal.feedHelpers.addEventToListFollowersFeeds,
          {
            eventId,
            listId: etl.listId,
          },
        );
      }
    }

    await ctx.runMutation(internal.feedHelpers.updateEventVisibilityInFeeds, {
      eventId,
      visibility,
    });
  }

  return event;
}

export async function getUserStats(ctx: QueryCtx, userName: string) {
  const user = await ctx.db
    .query("users")
    .withIndex("by_username", (q) => q.eq("username", userName))
    .unique();

  if (!user) {
    return {
      capturesThisWeek: 0,
      weeklyGoal: 5,
      upcomingEvents: 0,
      allTimeEvents: 0,
    };
  }

  const now = new Date();
  const sevenDaysAgo = new Date(now);
  sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);

  const nowMs = now.getTime();
  const sevenDaysAgoMs = sevenDaysAgo.getTime();

  const feedId = `user_${user.id}`;
  const [capturesThisWeek, allTimeOwnEvents, totalFollows, upcomingEvents] =
    await Promise.all([
      eventsByCreation.count(ctx, {
        namespace: user.id,
        bounds: {
          lower: { key: sevenDaysAgoMs, inclusive: true },
          upper: { key: nowMs, inclusive: true },
        },
      }),

      eventsByCreation.count(ctx, {
        namespace: user.id,
      }),

      eventFollowsAggregate.count(ctx, {
        namespace: user.id,
      }),

      userFeedsAggregate.count(ctx, {
        namespace: feedId,
        bounds: {
          lower: { key: 0, inclusive: true },
          upper: { key: 0, inclusive: true },
        },
      }),
    ]);
  const allTimeEvents = allTimeOwnEvents + totalFollows;

  return {
    capturesThisWeek,
    weeklyGoal: 5,
    upcomingEvents,
    allTimeEvents,
  };
}

export async function getEventsForUserPaginated(
  ctx: QueryCtx,
  userName: string,
  filter: "upcoming" | "past",
  paginationOpts: { numItems: number; cursor: string | null },
) {
  const user = await ctx.db
    .query("users")
    .withIndex("by_username", (q) => q.eq("username", userName))
    .unique();

  if (!user) {
    return { page: [], isDone: true, continueCursor: null };
  }

  const now = new Date().toISOString();

  let queryBuilder;

  if (filter === "upcoming") {
    queryBuilder = ctx.db
      .query("events")
      .withIndex("by_user_and_startDateTime", (q) => q.eq("userId", user.id))
      // Index provides ascending order by startDateTime by default as it's the second field.
      .filter((q) => q.gte(q.field("startDateTime"), now));
  } else {
    queryBuilder = ctx.db
      .query("events")
      .withIndex("by_user_and_startDateTime", (q) => q.eq("userId", user.id))
      .order("desc")
      .filter((q) => q.lt(q.field("startDateTime"), now));
  }

  const result = await queryBuilder.paginate(paginationOpts);

  const enrichedEvents = await enrichEventsAndFilterNulls(ctx, result.page);

  return {
    ...result,
    page: enrichedEvents,
  };
}
