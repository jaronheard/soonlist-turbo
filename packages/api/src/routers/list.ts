import { TRPCError } from "@trpc/server";
import { and, eq } from "drizzle-orm";
import { z } from "zod";

import type { List } from "@soonlist/db/types";
import { eventToLists, listFollows, lists, users } from "@soonlist/db/schema";

import { createTRPCRouter, protectedProcedure, publicProcedure } from "../trpc";
import { generatePublicId } from "../utils";

export const listRouter = createTRPCRouter({
  getAllForUser: publicProcedure
    .input(z.object({ userName: z.string() }))
    .query(({ ctx, input }) => {
      const usersWithLists = ctx.db.query.users.findMany({
        where: eq(users.username, input.userName),
        with: {
          lists: {
            orderBy: (list, { asc }) => [asc(list.updatedAt)],
            with: {
              // userId replaced here
              user: {
                columns: { id: true, username: true },
              },
              // event to list replaced count
              eventToLists: true,
            },
          },
        },
      });
      return usersWithLists.then((users) => users[0]?.lists || []);
    }),
  getFollowing: publicProcedure
    .input(z.object({ userName: z.string() }))
    .query(({ ctx, input }) => {
      const followLists = ctx.db.query.listFollows.findMany({
        where: eq(users.username, input.userName),
        with: {
          list: {
            // not sure why this is needed or not working
            // orderBy: (list, { asc }) => [asc(list.updatedAt)],
            with: {
              // userId replaced here
              user: {
                columns: { id: true, username: true },
              },
              // event to list replaced count
              eventToLists: true,
            },
            columns: {
              id: true,
              userId: true,
              name: true,
              description: true,
              visibility: true,
              createdAt: true,
              updatedAt: true,
            },
          },
        },
      });
      return followLists.then((followList) =>
        followList.map((item) => item.list as List),
      );
    }),
  get: publicProcedure
    .input(z.object({ listId: z.string() }))
    .query(({ ctx, input }) => {
      return ctx.db.query.lists
        .findMany({
          where: eq(lists.id, input.listId),
          columns: {
            id: true,
            name: true,
            description: true,
            visibility: true,
            createdAt: true,
            updatedAt: true,
          },
          with: {
            eventToLists: {
              with: {
                event: {
                  with: { user: true, eventFollows: true, comments: true },
                },
              },
            },
            user: true,
            listFollows: true,
          },
        })
        .then((lists) => lists[0] || null);
    }),
  follow: protectedProcedure
    .input(z.object({ listId: z.string() }))
    .mutation(({ ctx, input }) => {
      const { userId } = ctx.auth;
      if (!userId) {
        throw new TRPCError({
          code: "INTERNAL_SERVER_ERROR",
          message: "No user id found in session",
        });
      }
      return ctx.db.insert(listFollows).values({
        userId: userId,
        listId: input.listId,
      });
    }),
  unfollow: protectedProcedure
    .input(z.object({ listId: z.string() }))
    .mutation(({ ctx, input }) => {
      const { userId } = ctx.auth;
      if (!userId) {
        throw new TRPCError({
          code: "INTERNAL_SERVER_ERROR",
          message: "No user id found in session",
        });
      }
      return ctx.db
        .delete(listFollows)
        .where(
          and(
            eq(listFollows.userId, userId),
            eq(listFollows.listId, input.listId),
          ),
        );
    }),
  create: protectedProcedure
    .input(
      z.object({
        name: z.string(),
        description: z.string(),
        visibility: z.enum(["public", "private"]),
      }),
    )
    .mutation(({ ctx, input }) => {
      const { userId } = ctx.auth;
      const id = generatePublicId();
      if (!userId) {
        throw new TRPCError({
          code: "INTERNAL_SERVER_ERROR",
          message: "No user id found in session",
        });
      }
      return ctx.db
        .insert(lists)
        .values({
          id: id,
          userId: userId,
          name: input.name,
          description: input.description,
          visibility: input.visibility,
        })
        .then(() => ({
          id,
        }));
    }),
  update: protectedProcedure
    .input(
      z.object({
        listId: z.string(),
        name: z.string(),
        description: z.string(),
        visibility: z.enum(["public", "private"]),
      }),
    )
    .mutation(({ ctx, input }) => {
      const { userId } = ctx.auth;
      if (!userId) {
        throw new TRPCError({
          code: "INTERNAL_SERVER_ERROR",
          message: "No user id found in session",
        });
      }
      return ctx.db
        .update(lists)
        .set({
          name: input.name,
          description: input.description,
          visibility: input.visibility,
        })
        .where(eq(lists.id, input.listId))
        .then(() => ({ id: input.listId }));
    }),
  delete: protectedProcedure
    .input(z.object({ listId: z.string() }))
    .mutation(({ ctx, input }) => {
      const { userId } = ctx.auth;
      if (!userId) {
        throw new TRPCError({
          code: "INTERNAL_SERVER_ERROR",
          message: "No user id found in session",
        });
      }
      return ctx.db.transaction(async (db) => {
        await db.delete(lists).where(eq(lists.id, input.listId));
        await db
          .delete(eventToLists)
          .where(eq(eventToLists.listId, input.listId));
      });
    }),
});
