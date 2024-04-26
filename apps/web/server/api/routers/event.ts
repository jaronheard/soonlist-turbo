import { z } from "zod";

import { Temporal } from "@js-temporal/polyfill";
import { TRPCError } from "@trpc/server";
import { and, asc, eq, gte, lte } from "drizzle-orm";
import {
  createTRPCRouter,
  protectedProcedure,
  publicProcedure,
} from "@/server/api/trpc";
import { filterDuplicates, generatePublicId } from "@/lib/utils";
import {
  events,
  eventFollows,
  users,
  comments,
  eventToLists,
} from "@/server/db/schema";
import {
  type NewComment,
  type NewEvent,
  type NewEventToLists,
  type UpdateEvent,
} from "@/server/db/types";
import { AddToCalendarButtonPropsSchema } from "@/types/zodSchema";
import { EventMetadataSchemaLoose } from "@/lib/prompts";

const eventCreateSchema = z.object({
  event: AddToCalendarButtonPropsSchema,
  eventMetadata: EventMetadataSchemaLoose.optional(),
  comment: z.string().optional(),
  lists: z.array(z.record(z.string().trim())),
  visibility: z.enum(["public", "private"]).optional(),
});

const eventUpdateSchema = z.object({
  id: z.string(),
  // event infers type of AddToCalendarButtonProps
  event: AddToCalendarButtonPropsSchema,
  eventMetadata: EventMetadataSchemaLoose.optional(),
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
        user.eventFollows.map((eventFollow) => eventFollow.event)
      );
      const followedEventsFromLists = following.flatMap((user) =>
        user.listFollows.flatMap((listFollow) =>
          listFollow.list.eventToLists.flatMap(
            (eventToList) => eventToList.event
          )
        )
      );
      const followedEventsFromUsers = following.flatMap((user) =>
        user.following.flatMap((userFollow) => userFollow.following.events)
      );
      const followedEventsFromEventsAndLists = [
        ...followedEvents,
        ...followedEventsFromLists,
        ...followedEventsFromUsers,
      ];
      const allFollowedEvents = filterDuplicates(
        followedEventsFromEventsAndLists
      );
      const sortedFollowedEvents = allFollowedEvents.sort(
        (a, b) =>
          new Date(a.startDateTime).getTime() -
          new Date(b.startDateTime).getTime()
      );
      return sortedFollowedEvents;
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
        userWithEventFollows?.[0]?.eventFollows
          .map((eventFollow) => eventFollow.event)
          .sort(
            (a, b) =>
              new Date(a.startDateTime).getTime() -
              new Date(b.startDateTime).getTime()
          ) || []
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
          lte(events.startDateTime, startDateTimeUpperBound)
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
      })
    )
    .query(({ ctx, input }) => {
      return ctx.db.query.events.findMany({
        where: input?.excludeCurrent
          ? gte(events.endDateTime, new Date())
          : gte(events.startDateTime, new Date()),
        with: {
          user: true,
          eventFollows: true,
          comments: true,
        },
        orderBy: [asc(events.startDateTime)],
        limit: input?.limit,
      });
    }),
  delete: protectedProcedure.input(eventIdSchema).mutation(({ ctx, input }) => {
    const { userId, sessionClaims } = ctx.auth;
    if (!userId) {
      throw new TRPCError({
        code: "INTERNAL_SERVER_ERROR",
        message: "No user id found in session",
      });
    }

    const roles = sessionClaims?.roles || [];
    const isAdmin = roles?.includes("admin");

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
        return ctx.db.delete(events).where(eq(events.id, input.id));
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

      const roles = sessionClaims?.roles || [];
      const isAdmin = roles?.includes("admin");

      const { event, eventMetadata } = input;
      const hasComment = input.comment && input.comment.length > 0;
      const hasLists = input.lists && input.lists.length > 0;
      const hasVisibility = input.visibility && input.visibility.length > 0;

      let startTime = event.startTime;
      let endTime = event.endTime;
      let timeZone = event.timeZone;

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
        `${event.startDate}T${startTime}[${timeZone}]`
      );
      const end = Temporal.ZonedDateTime.from(
        `${event.endDate}T${endTime}[${timeZone}]`
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
            input.id
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
              input.lists.map((list) => ({
                eventId: input.id,
                listId: list.value!,
              }))
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
      const hasLists = input.lists && input.lists.length > 0;
      const hasVisibility = input.visibility && input.visibility.length > 0;

      let startTime = event.startTime;
      let endTime = event.endTime;
      let timeZone = event.timeZone;

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
        `${event.startDate}T${startTime}[${timeZone}]`
      );
      const end = Temporal.ZonedDateTime.from(
        `${event.endDate}T${endTime}[${timeZone}]`
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
              input.lists.map((list) => ({
                eventId: eventid,
                listId: list.value!,
              }))
            );
          } else {
            // no need to insert event to list if there is no list
          }
        })
        .then(() => ({ id: eventid }));
    }),
  follow: protectedProcedure.input(eventIdSchema).mutation(({ ctx, input }) => {
    const { userId } = ctx.auth;
    if (!userId) {
      throw new TRPCError({
        code: "INTERNAL_SERVER_ERROR",
        message: "No user id found in session",
      });
    }
    return ctx.db.insert(eventFollows).values({
      userId: userId,
      eventId: input.id,
    });
  }),
  unfollow: protectedProcedure.input(eventIdSchema).mutation(({ ctx }) => {
    const { userId } = ctx.auth;
    if (!userId) {
      throw new TRPCError({
        code: "INTERNAL_SERVER_ERROR",
        message: "No user id found in session",
      });
    }
    return ctx.db.delete(eventFollows).where(eq(eventFollows.userId, userId));
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
            eq(eventToLists.listId, input.listId)
          )
        );
    }),
});
