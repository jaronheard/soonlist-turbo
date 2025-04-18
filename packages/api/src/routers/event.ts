import { Temporal } from "@js-temporal/polyfill";
import { TRPCError } from "@trpc/server";
import { and, asc, desc, eq, gte, lt, lte, not, or } from "drizzle-orm";
import { z } from "zod";

import type {
  NewComment,
  NewEvent,
  NewEventToLists,
  UpdateEvent,
} from "@soonlist/db/types";
import { EventMetadataSchemaLoose } from "@soonlist/cal";
import { gt, inArray } from "@soonlist/db";
import {
  comments,
  eventFollows,
  events,
  eventToLists,
  users,
} from "@soonlist/db/schema";
import { AddToCalendarButtonPropsSchema } from "@soonlist/validators";

import { createTRPCRouter, protectedProcedure, publicProcedure } from "../trpc";
import { filterDuplicates, generatePublicId } from "../utils";

const stringArraySchema = z.array(z.string());

const eventCreateSchema = z.object({
  event: z.custom<typeof AddToCalendarButtonPropsSchema>(() => true),
  eventMetadata: z.custom<typeof EventMetadataSchemaLoose.optional>(() => true),
  comment: z.string().optional(),
  lists: z.array(z.record(z.string().trim())),
  visibility: z.enum(["public", "private"]).optional(),
});

const eventUpdateSchema = z.object({
  id: z.string(),
  // event infers type of AddToCalendarButtonProps
  event: z.custom<typeof AddToCalendarButtonPropsSchema>(() => true),
  eventMetadata: z.custom<typeof EventMetadataSchemaLoose.optional>(() => true),
  comment: z.string().optional(),
  lists: z.array(z.record(z.string().trim())),
  visibility: z.enum(["public", "private"]).optional(),
});

const eventIdSchema = z.object({
  id: z.string(),
});

export const eventRouter = createTRPCRouter({
  getForUser: publicProcedure
    .input(z.object({ userName: z.string() }))
    .query(async ({ ctx, input }) => {
      const user = await ctx.db.query.users
        .findMany({
          where: eq(users.username, input.userName),
          with: {
            events: {
              orderBy: [asc(events.startDateTime)],
              with: {
                eventFollows: true,
                comments: true,
                user: true,
              },
            },
          },
        })
        .then((users) => users[0]?.events || []);
      return user;
    }),
  getUpcomingForUser: publicProcedure
    .input(z.object({ userName: z.string() }))
    .query(async ({ ctx, input }) => {
      const now = new Date(new Date().getTime() - 24 * 60 * 60 * 1000);
      const createdEvents = await ctx.db.query.users
        .findMany({
          where: eq(users.username, input.userName),
          with: {
            events: {
              where: gte(events.startDateTime, now),
              orderBy: [asc(events.startDateTime)],
              with: {
                eventFollows: true,
                comments: true,
                user: true,
                // includes lists
                eventToLists: {
                  with: {
                    list: true,
                  },
                },
              },
            },
          },
        })
        .then((users) => users[0]?.events || []);
      const savedEvents = await ctx.db.query.users
        .findMany({
          where: eq(users.username, input.userName),
          with: {
            eventFollows: {
              with: {
                event: {
                  with: {
                    user: true,
                    eventFollows: true,
                    comments: true,
                  },
                },
              },
            },
          },
        })
        .then(
          (users) =>
            users[0]?.eventFollows
              .map((eventFollow) => eventFollow.event)
              // eslint-disable-next-line @typescript-eslint/no-unnecessary-condition
              .filter((event) => event?.startDateTime)
              .filter((event) => event.startDateTime > now) || [],
        );
      return [...savedEvents, ...createdEvents].sort(
        (a, b) =>
          new Date(a.startDateTime).getTime() -
          new Date(b.startDateTime).getTime(),
      );
    }),
  getCreatedForUser: publicProcedure
    .input(z.object({ userName: z.string() }))
    .query(({ ctx, input }) => {
      const user = ctx.db.query.users
        .findMany({
          where: eq(users.username, input.userName),
          with: {
            events: {
              orderBy: [asc(events.startDateTime)],
              with: {
                eventFollows: true,
                comments: true,
                user: true,
              },
            },
          },
        })
        .then((users) => users[0]?.events || []);
      return user;
    }),
  getFollowingForUser: publicProcedure
    .input(z.object({ userName: z.string() }))
    .query(async ({ ctx, input }) => {
      const following = await ctx.db.query.users.findMany({
        where: eq(users.username, input.userName),
        columns: {
          username: true,
        },
        with: {
          listFollows: {
            with: {
              list: {
                with: {
                  eventToLists: {
                    with: {
                      event: {
                        with: {
                          user: true,
                          eventFollows: true,
                          comments: true,
                        },
                      },
                    },
                  },
                },
              },
            },
          },
          eventFollows: {
            with: {
              event: {
                with: {
                  user: true,
                  eventFollows: true,
                  comments: true,
                },
              },
            },
          },
          following: {
            with: {
              following: {
                with: {
                  events: {
                    with: {
                      eventFollows: true,
                      comments: true,
                      user: true,
                    },
                  },
                },
              },
            },
          },
        },
      });
      const followedEvents = following.flatMap((user) =>
        user.eventFollows.map((eventFollow) => eventFollow.event),
      );
      const followedEventsFromLists = following.flatMap((user) =>
        user.listFollows.flatMap((listFollow) =>
          listFollow.list.eventToLists.flatMap(
            (eventToList) => eventToList.event,
          ),
        ),
      );
      const followedEventsFromUsers = following.flatMap((user) =>
        user.following.flatMap((userFollow) => userFollow.following.events),
      );
      const followedEventsFromEventsAndLists = [
        ...followedEvents,
        ...followedEventsFromLists,
        ...followedEventsFromUsers,
      ];
      const allFollowedEvents = filterDuplicates(
        followedEventsFromEventsAndLists,
      );
      const sortedFollowedEvents = allFollowedEvents.sort(
        (a, b) =>
          new Date(a.startDateTime).getTime() -
          new Date(b.startDateTime).getTime(),
      );
      return sortedFollowedEvents;
    }),
  getFollowingUpcomingForUser: publicProcedure
    .input(z.object({ userName: z.string() }))
    .query(async ({ ctx, input }) => {
      const now = new Date();

      // Step 1: Fetch user and relationships
      const following = await ctx.db.query.users.findMany({
        where: eq(users.username, input.userName),
        columns: {
          username: true,
        },
        with: {
          listFollows: {
            with: {
              list: {
                with: {
                  eventToLists: true,
                },
              },
            },
          },
          eventFollows: true,
          following: {
            with: {
              following: {
                with: { events: true },
              },
            },
          },
        },
      });

      // Collect all event IDs
      const eventIds = new Set<string>();
      following.forEach((user) => {
        user.eventFollows.forEach((ef) => eventIds.add(ef.eventId));
        user.listFollows.forEach((lf) =>
          lf.list.eventToLists.forEach((etl) => eventIds.add(etl.eventId)),
        );
        user.following.forEach((f) =>
          f.following.events.forEach((e) => eventIds.add(e.id)),
        );
      });

      // Step 2: Fetch upcoming events
      if (eventIds.size === 0) {
        return []; // Return an empty array if there are no events to fetch
      }

      const upcomingEvents = await ctx.db.query.events.findMany({
        where: and(
          inArray(events.id, Array.from(eventIds)),
          gt(events.startDateTime, now),
        ),
        with: {
          user: true,
          eventFollows: true,
          comments: true,
        },
      });

      // Step 3: Sort events
      const sortedEvents = upcomingEvents.sort(
        (a, b) =>
          new Date(a.startDateTime).getTime() -
          new Date(b.startDateTime).getTime(),
      );

      return sortedEvents;
    }),
  getSavedForUser: publicProcedure
    .input(z.object({ userName: z.string() }))
    .query(async ({ ctx, input }) => {
      const userWithEventFollows = await ctx.db.query.users.findMany({
        where: eq(users.username, input.userName),
        with: {
          eventFollows: {
            with: {
              event: {
                with: {
                  user: true,
                  eventFollows: true,
                  comments: true,
                },
              },
            },
          },
        },
      });
      return (
        userWithEventFollows[0]?.eventFollows
          .map((eventFollow) => eventFollow.event)
          .sort(
            (a, b) =>
              new Date(a.startDateTime).getTime() -
              new Date(b.startDateTime).getTime(),
          ) || []
      );
    }),
  getSavedIdsForUser: publicProcedure
    .input(z.object({ userName: z.string() }))
    .query(async ({ ctx, input }) => {
      const userWithEventFollows = await ctx.db.query.users.findMany({
        where: eq(users.username, input.userName),
        with: {
          eventFollows: {
            with: {
              event: {
                columns: {
                  id: true,
                },
              },
            },
          },
        },
      });
      return (
        userWithEventFollows[0]?.eventFollows
          // event could be undefined if it was deleted
          // eslint-disable-next-line @typescript-eslint/no-unnecessary-condition
          .filter((eventFollow) => eventFollow.event?.id)
          .map((eventFollow) => ({
            id: eventFollow.event.id,
          })) || []
      );
    }),
  getPossibleDuplicates: publicProcedure
    .input(z.object({ startDateTime: z.date() }))
    .query(({ ctx, input }) => {
      const { startDateTime } = input;
      // start date time should be within 1 hour of the start date time of the event
      const startDateTimeLowerBound = new Date(startDateTime);
      startDateTimeLowerBound.setHours(startDateTime.getHours() - 1);
      const startDateTimeUpperBound = new Date(startDateTime);
      startDateTimeUpperBound.setHours(startDateTime.getHours() + 1);
      const possibleDuplicateEvents = ctx.db.query.events.findMany({
        where: and(
          gte(events.startDateTime, startDateTimeLowerBound),
          lte(events.startDateTime, startDateTimeUpperBound),
        ),
        with: {
          user: true,
          eventFollows: true,
          comments: true,
        },
      });
      return possibleDuplicateEvents;
    }),
  get: publicProcedure
    .input(z.object({ eventId: z.string() }))
    .query(({ ctx, input }) => {
      return ctx.db.query.events
        .findMany({
          where: eq(events.id, input.eventId),
          with: {
            user: {
              with: {
                lists: true,
              },
            },
            eventFollows: true,
            comments: true,
            eventToLists: {
              with: {
                list: true,
              },
            },
          },
        })
        .then((events) => events[0] || null);
    }),
  getAll: publicProcedure.query(({ ctx }) => {
    return ctx.db.query.events.findMany({
      orderBy: [asc(events.startDateTime)],
      with: {
        user: true,
        eventFollows: true,
        comments: true,
      },
    });
  }),
  getNext: publicProcedure
    .input(
      z.object({
        limit: z.number().optional(),
        excludeCurrent: z.boolean().optional(),
      }),
    )
    .query(({ ctx, input }) => {
      return ctx.db.query.events.findMany({
        where: input.excludeCurrent
          ? gte(events.endDateTime, new Date())
          : gte(events.startDateTime, new Date()),
        with: {
          user: true,
          eventFollows: true,
          comments: true,
        },
        orderBy: [asc(events.startDateTime)],
        limit: input.limit,
      });
    }),
  getDiscover: protectedProcedure
    .input(
      z.object({
        limit: z.number().optional(),
        excludeCurrent: z.boolean().optional(),
      }),
    )
    .query(({ ctx, input }) => {
      const { userId } = ctx.auth;
      if (!userId) {
        throw new TRPCError({
          code: "UNAUTHORIZED",
          message: "User must be logged in to discover events",
        });
      }

      return ctx.db.query.events.findMany({
        where: and(
          input.excludeCurrent
            ? gte(events.endDateTime, new Date())
            : gte(events.startDateTime, new Date()),
          not(eq(events.userId, userId)),
        ),
        with: {
          user: true,
          eventFollows: true,
          comments: true,
        },
        orderBy: [asc(events.startDateTime)],
        limit: input.limit,
      });
    }),
  getDiscoverInfinite: protectedProcedure
    .input(
      z.object({
        limit: z.number().min(1).max(100).default(20),
        cursor: z.number().nullish(),
      }),
    )
    .query(async ({ ctx, input }) => {
      const { userId } = ctx.auth;
      const { limit, cursor } = input;
      const now = new Date();

      if (!userId) {
        throw new TRPCError({
          code: "UNAUTHORIZED",
          message: "User must be logged in to discover events",
        });
      }

      const e = await ctx.db.query.events.findMany({
        where: and(
          gte(events.startDateTime, now),
          not(eq(events.userId, userId)),
          eq(events.visibility, "public"),
        ),
        orderBy: [asc(events.startDateTime)],
        limit: limit + 1,
        offset: cursor || 0,
        with: {
          user: true,
          eventFollows: true,
          comments: true,
        },
      });

      let nextCursor: typeof cursor | undefined = undefined;
      if (e.length > limit) {
        e.pop();
        nextCursor = cursor ? cursor + limit : limit;
      }

      return {
        events: e,
        nextCursor,
      };
    }),
  delete: protectedProcedure.input(eventIdSchema).mutation(({ ctx, input }) => {
    const { userId, sessionClaims } = ctx.auth;
    if (!userId) {
      throw new TRPCError({
        code: "INTERNAL_SERVER_ERROR",
        message: "No user id found in session",
      });
    }

    const roles = stringArraySchema.safeParse(sessionClaims.roles).data || [];
    const isAdmin = roles.includes("admin");

    return ctx.db.query.events
      .findMany({
        where: and(eq(events.id, input.id), eq(events.userId, userId)),
        columns: {
          id: true,
        },
      })
      .then((events) => events.length > 0)
      .then((isEventOwner) => {
        if (!isEventOwner && !isAdmin) {
          throw new TRPCError({
            code: "FORBIDDEN",
            message: "Unauthorized",
          });
        }
        return ctx.db
          .transaction(async (tx) => {
            await tx.delete(events).where(eq(events.id, input.id));
            await tx
              .delete(eventToLists)
              .where(eq(eventToLists.eventId, input.id));
            await tx
              .delete(eventFollows)
              .where(eq(eventFollows.eventId, input.id));
            await tx.delete(comments).where(eq(comments.eventId, input.id));
          })
          .then(() => ({ id: input.id }));
      })
      .then(() => ({ id: input.id }));
  }),
  update: protectedProcedure
    .input(eventUpdateSchema)
    .mutation(async ({ ctx, input }) => {
      const { userId, sessionClaims } = ctx.auth;

      if (!userId) {
        throw new TRPCError({
          code: "INTERNAL_SERVER_ERROR",
          message: "No user id found in session",
        });
      }

      const roles = stringArraySchema.safeParse(sessionClaims.roles).data || [];
      const isAdmin = roles.includes("admin");

      const { event, eventMetadata } = input;
      const hasComment = input.comment && input.comment.length > 0;
      const hasLists = input.lists.length > 0;
      const hasVisibility = input.visibility && input.visibility.length > 0;

      const typedEvent = event as any;
      let startTime = typedEvent.startTime;
      let endTime = typedEvent.endTime;
      let timeZone = typedEvent.timeZone;

      // time zone is America/Los_Angeles if not specified
      if (!timeZone) {
        timeZone = "America/Los_Angeles";
      }

      // start time is 00:00 if not specified
      if (!startTime) {
        startTime = "00:00";
      }
      // end time is 23:59 if not specified
      if (!endTime) {
        endTime = "23:59";
      }

      const start = Temporal.ZonedDateTime.from(
        `${typedEvent.startDate}T${startTime}[${timeZone}]`,
      );
      const end = Temporal.ZonedDateTime.from(
        `${typedEvent.endDate}T${endTime}[${timeZone}]`,
      );
      const startUtcDate = new Date(start.epochMilliseconds);
      const endUtcDate = new Date(end.epochMilliseconds);

      // check if user is event owner
      const eventOwner = await ctx.db.query.events
        .findMany({
          where: and(eq(events.id, input.id), eq(events.userId, userId)),
          columns: {
            id: true,
          },
        })
        .then((events) => events.length > 0);

      if (!eventOwner && !isAdmin) {
        throw new TRPCError({
          code: "FORBIDDEN",
          message: "Unauthorized",
        });
      }

      return ctx.db
        .transaction(async (tx) => {
          const updateEvent = async (event: UpdateEvent, id: string) => {
            return tx.update(events).set(event).where(eq(events.id, id));
          };
          const insertComment = async (comment: NewComment) => {
            return tx
              .insert(comments)
              .values(comment)
              .onDuplicateKeyUpdate({
                set: { content: input.comment },
              });
          };
          const insertEventToLists = async (eventToList: NewEventToLists[]) => {
            return tx.insert(eventToLists).values(eventToList);
          };
          await updateEvent(
            {
              userId: userId,
              event: event,
              eventMetadata: eventMetadata,
              startDateTime: startUtcDate,
              endDateTime: endUtcDate,
              ...(hasVisibility && {
                visibility: input.visibility,
              }),
            },
            input.id,
          );
          if (hasComment) {
            await insertComment({
              content: input.comment || "",
              userId: userId,
              eventId: input.id,
            });
          } else {
            await ctx.db.delete(comments).where(eq(comments.eventId, input.id));
          }
          if (hasLists) {
            await ctx.db
              .delete(eventToLists)
              .where(eq(eventToLists.eventId, input.id));
            await insertEventToLists(
              input.lists.map((list: { value?: string }) => ({
                eventId: input.id,
                listId: list.value!,
              })),
            );
          } else {
            await ctx.db
              .delete(eventToLists)
              .where(eq(eventToLists.eventId, input.id));
          }
        })
        .then(() => ({ id: input.id }));
    }),
  create: protectedProcedure
    .input(eventCreateSchema)
    .mutation(async ({ ctx, input }) => {
      const userId = ctx.auth.userId;
      const username = ctx.currentUser?.username;
      if (!userId) {
        throw new TRPCError({
          code: "INTERNAL_SERVER_ERROR",
          message: "No user id found in session",
        });
      }

      if (!username) {
        throw new TRPCError({
          code: "INTERNAL_SERVER_ERROR",
          message: "No username found in session",
        });
      }

      const { event, eventMetadata } = input;
      const hasComment = input.comment && input.comment.length > 0;
      const hasLists = input.lists.length > 0;
      const hasVisibility = input.visibility && input.visibility.length > 0;

      const typedEvent = event as any;
      let startTime = typedEvent.startTime;
      let endTime = typedEvent.endTime;
      let timeZone = typedEvent.timeZone;

      // time zone is America/Los_Angeles if not specified
      if (!timeZone) {
        timeZone = "America/Los_Angeles";
      }

      // start time is 00:00 if not specified
      if (!startTime) {
        startTime = "00:00";
      }
      // end time is 23:59 if not specified
      if (!endTime) {
        endTime = "23:59";
      }

      const start = Temporal.ZonedDateTime.from(
        `${typedEvent.startDate}T${startTime}[${timeZone}]`,
      );
      const end = Temporal.ZonedDateTime.from(
        `${typedEvent.endDate}T${endTime}[${timeZone}]`,
      );
      const startUtcDate = new Date(start.epochMilliseconds);
      const endUtcDate = new Date(end.epochMilliseconds);
      const eventid = generatePublicId();

      const values = {
        id: eventid,
        userId: userId,
        userName: username || "unknown",
        event: event,
        eventMetadata: eventMetadata,
        startDateTime: startUtcDate,
        endDateTime: endUtcDate,
        ...(hasVisibility && {
          visibility: input.visibility,
        }),
      };
      return ctx.db
        .transaction(async (tx) => {
          const insertEvent = async (event: NewEvent) => {
            return tx.insert(events).values(event);
          };
          const insertComment = async (comment: NewComment) => {
            return tx.insert(comments).values(comment);
          };
          const insertEventToLists = async (eventToList: NewEventToLists[]) => {
            return tx.insert(eventToLists).values(eventToList);
          };

          await insertEvent(values);
          if (hasComment) {
            await insertComment({
              eventId: eventid,
              content: input.comment || "",
              userId: userId,
            });
          } else {
            // no need to insert comment if there is no comment
          }
          if (hasLists) {
            await tx
              .delete(eventToLists)
              .where(eq(eventToLists.eventId, eventid));
            await insertEventToLists(
              input.lists.map((list: { value?: string }) => ({
                eventId: eventid,
                listId: list.value!,
              })),
            );
          } else {
            // no need to insert event to list if there is no list
          }
        })
        .then(() => ({ id: eventid }));
    }),
  follow: protectedProcedure
    .input(z.object({ id: z.string() }))
    .mutation(async ({ ctx, input }) => {
      const { id } = input;
      const userId = ctx.auth.userId;

      if (!userId) {
        throw new TRPCError({
          code: "INTERNAL_SERVER_ERROR",
          message: "No user id found in session",
        });
      }

      // Check if the follow relationship already exists
      const existingFollow = await ctx.db.query.eventFollows.findFirst({
        where: (eventFollows, { and, eq }) =>
          and(eq(eventFollows.userId, userId), eq(eventFollows.eventId, id)),
      });

      // If the follow relationship doesn't exist, create it
      if (!existingFollow) {
        await ctx.db.insert(eventFollows).values({
          userId: userId,
          eventId: id,
        });
      }

      // Return the event data regardless of whether a new follow was created
      return ctx.db.query.events.findFirst({
        where: (events, { eq }) => eq(events.id, id),
        with: {
          eventFollows: true,
          user: true,
        },
      });
    }),
  getEventsForUser: protectedProcedure
    .input(
      z.object({
        userName: z.string(),
        filter: z.enum(["upcoming", "past"]),
        limit: z.number().min(1).max(100).default(20),
        cursor: z.number().nullish(),
      }),
    )
    .query(async ({ ctx, input }) => {
      const { userName, filter, limit, cursor } = input;
      const now = new Date();

      const user = await ctx.db.query.users.findFirst({
        where: eq(users.username, userName),
        columns: { id: true },
      });

      if (!user) {
        throw new TRPCError({
          code: "NOT_FOUND",
          message: "User not found",
        });
      }

      const e = await ctx.db.query.events.findMany({
        where: and(
          or(
            eq(events.userName, userName),
            inArray(
              events.id,
              ctx.db
                .select({ eventId: eventFollows.eventId })
                .from(eventFollows)
                .where(eq(eventFollows.userId, user.id)),
            ),
          ),
          filter === "upcoming"
            ? gte(events.endDateTime, now)
            : lt(events.endDateTime, now),
        ),
        orderBy: [
          filter === "upcoming"
            ? asc(events.startDateTime)
            : desc(events.startDateTime),
        ],
        limit: limit + 1,
        offset: cursor || 0,
        with: {
          eventFollows: true,
          comments: true,
          user: true,
          eventToLists: {
            with: {
              list: true,
            },
          },
        },
      });

      let nextCursor: number | undefined = undefined;
      if (e.length > limit) {
        e.pop();
        nextCursor = (cursor || 0) + limit;
      }

      // Convert Drizzle objects to plain JavaScript objects
      const plainEvents = e.map((event) => ({
        ...event,
        eventFollows: event.eventFollows.map((ef) => ({ ...ef })),
        comments: event.comments.map((c) => ({ ...c })),
        user: { ...event.user },
        eventToLists: event.eventToLists.map((etl) => ({
          ...etl,
          list: { ...etl.list },
        })),
      }));

      return {
        events: plainEvents,
        nextCursor,
      };
    }),
  unfollow: protectedProcedure
    .input(z.object({ id: z.string() }))
    .mutation(async ({ ctx, input }) => {
      const { id } = input;
      const userId = ctx.auth.userId;

      if (!userId) {
        throw new TRPCError({
          code: "INTERNAL_SERVER_ERROR",
          message: "No user id found in session",
        });
      }

      // Check if the follow relationship exists
      const existingFollow = await ctx.db.query.eventFollows.findFirst({
        where: (eventFollows, { and, eq }) =>
          and(eq(eventFollows.userId, userId), eq(eventFollows.eventId, id)),
      });

      // If the follow relationship exists, delete it
      if (existingFollow) {
        await ctx.db
          .delete(eventFollows)
          .where(
            and(eq(eventFollows.userId, userId), eq(eventFollows.eventId, id)),
          );
      }

      // Return the event data regardless of whether an unfollow was performed
      return ctx.db.query.events.findFirst({
        where: (events, { eq }) => eq(events.id, id),
        with: {
          eventFollows: true,
          user: true,
        },
      });
    }),
  addToList: protectedProcedure
    .input(z.object({ eventId: z.string(), listId: z.string() }))
    .mutation(({ ctx, input }) => {
      const { userId } = ctx.auth;
      if (!userId) {
        throw new TRPCError({
          code: "INTERNAL_SERVER_ERROR",
          message: "No user id found in session",
        });
      }
      return ctx.db
        .insert(eventToLists)
        .values({
          eventId: input.eventId,
          listId: input.listId,
        })
        .onDuplicateKeyUpdate({
          set: { eventId: input.eventId, listId: input.listId },
        });
    }),
  removeFromList: protectedProcedure
    .input(z.object({ eventId: z.string(), listId: z.string() }))
    .mutation(({ ctx, input }) => {
      const { userId } = ctx.auth;
      if (!userId) {
        throw new TRPCError({
          code: "INTERNAL_SERVER_ERROR",
          message: "No user id found in session",
        });
      }
      return ctx.db
        .delete(eventToLists)
        .where(
          and(
            eq(eventToLists.eventId, input.eventId),
            eq(eventToLists.listId, input.listId),
          ),
        );
    }),
  toggleVisibility: protectedProcedure
    .input(
      z.object({
        id: z.string(),
        visibility: z.enum(["public", "private"]),
      }),
    )
    .mutation(async ({ ctx, input }) => {
      const { id, visibility } = input;
      const userId = ctx.auth.userId;
      // Check if the event exists and belongs to the user
      const event = await ctx.db.query.events.findFirst({
        where: (events, { eq }) => eq(events.id, id),
        columns: { userId: true },
      });

      if (!event) {
        throw new TRPCError({
          code: "NOT_FOUND",
          message: "Event not found",
        });
      }

      if (event.userId !== userId) {
        throw new TRPCError({
          code: "FORBIDDEN",
          message: "You don't have permission to modify this event",
        });
      }
      // Update the event visibility
      const updatedEvent = await ctx.db
        .update(events)
        .set({ visibility })
        .where(eq(events.id, id));

      return updatedEvent;
    }),
  getStats: publicProcedure
    .input(
      z.object({
        userName: z.string(),
      }),
    )
    .query(async ({ ctx, input }) => {
      const now = new Date();
      const sevenDaysAgo = new Date(now);
      sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);

      // First get the user's ID
      const user = await ctx.db.query.users.findFirst({
        where: eq(users.username, input.userName),
        columns: { id: true },
      });

      if (!user) {
        return {
          capturesThisWeek: 0,
          weeklyGoal: 5,
          upcomingEvents: 0,
          allTimeEvents: 0,
        };
      }

      // Get user's own events for the last 7 days
      const capturesThisWeek = await ctx.db.query.events
        .findMany({
          where: and(
            eq(events.userName, input.userName),
            gte(events.createdAt, sevenDaysAgo),
            lte(events.createdAt, now),
          ),
        })
        .then((events) => events.length);

      // Get upcoming events (own and followed)
      const upcomingEvents = await ctx.db.query.events
        .findMany({
          where: and(
            or(
              eq(events.userName, input.userName),
              inArray(
                events.id,
                ctx.db
                  .select({ eventId: eventFollows.eventId })
                  .from(eventFollows)
                  .where(eq(eventFollows.userId, user.id)),
              ),
            ),
            gte(events.startDateTime, now),
          ),
        })
        .then((events) => events.length);

      // Get all time events (own and followed)
      const allTimeEvents = await ctx.db.query.events
        .findMany({
          where: or(
            eq(events.userName, input.userName),
            inArray(
              events.id,
              ctx.db
                .select({ eventId: eventFollows.eventId })
                .from(eventFollows)
                .where(eq(eventFollows.userId, user.id)),
            ),
          ),
        })
        .then((events) => events.length);

      return {
        capturesThisWeek,
        weeklyGoal: 5,
        upcomingEvents,
        allTimeEvents,
      };
    }),
});
