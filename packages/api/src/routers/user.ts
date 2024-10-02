import { TRPCError } from "@trpc/server";
import { and, asc, eq, inArray, sql } from "drizzle-orm";
import { z } from "zod";

import { userFollows, users } from "@soonlist/db/schema";
import { userAdditionalInfoSchema } from "@soonlist/validators";

import { createTRPCRouter, protectedProcedure, publicProcedure } from "../trpc";

function normalizeEmoji(emoji: string | null): string {
  if (!emoji) return "";
  return emoji
    .toString()
    .replace(/[\uFE00-\uFE0F]/g, "")
    .normalize("NFC");
}

export const userRouter = createTRPCRouter({
  getById: publicProcedure
    .input(z.object({ id: z.string() }))
    .query(async ({ ctx, input }) => {
      const user = await ctx.db.query.users
        .findMany({
          where: eq(users.id, input.id),
        })
        .then((users) => users[0] || null);
      return user;
    }),
  getByUsername: publicProcedure
    .input(z.object({ userName: z.string() }))
    .query(async ({ ctx, input }) => {
      return ctx.db.query.users
        .findMany({
          where: eq(users.username, input.userName),
        })
        .then((users) => users[0] || null);
    }),
  getAll: publicProcedure.query(({ ctx }) => {
    return ctx.db.query.users.findMany({
      orderBy: [asc(users.username)],
    });
  }),
  getFollowing: publicProcedure
    .input(z.object({ userName: z.string() }))
    .query(async ({ ctx, input }) => {
      // TODO: make this more efficient
      const userId = await ctx.db.query.users
        .findMany({
          where: eq(users.username, input.userName),
          columns: {
            id: true,
          },
        })
        .then((u) => u[0]?.id || null);
      if (!userId) {
        return [];
      }
      const userFollowRecords = await ctx.db.query.userFollows.findMany({
        where: eq(userFollows.followerId, userId),
        with: {
          following: true,
        },
        columns: {
          followingId: true,
        },
      });
      const followingIds = userFollowRecords.map(
        (userFollowRecord) => userFollowRecord.followingId,
      );
      if (!followingIds.length || followingIds.length === 0) {
        return [];
      }
      const userRecords = await ctx.db
        .select()
        .from(users)
        .where(inArray(users.id, followingIds));
      return userRecords;
    }),
  getIfFollowing: publicProcedure
    .input(z.object({ followerId: z.string(), followingId: z.string() }))
    .query(async ({ ctx, input }) => {
      const userFollowsRecords = await ctx.db
        .select()
        .from(userFollows)
        .where(
          and(
            eq(userFollows.followerId, input.followerId),
            eq(userFollows.followingId, input.followingId),
          ),
        );
      return userFollowsRecords.length > 0;
    }),
  follow: protectedProcedure
    .input(z.object({ followingId: z.string() }))
    .mutation(({ ctx, input }) => {
      const { userId } = ctx.auth;
      if (!userId) {
        throw new TRPCError({
          code: "INTERNAL_SERVER_ERROR",
          message: "No user id found in session",
        });
      }
      return ctx.db.insert(userFollows).values({
        followerId: userId,
        followingId: input.followingId,
      });
    }),
  unfollow: protectedProcedure
    .input(z.object({ followingId: z.string() }))
    .mutation(({ ctx, input }) => {
      const { userId } = ctx.auth;
      if (!userId) {
        throw new TRPCError({
          code: "INTERNAL_SERVER_ERROR",
          message: "No user id found in session",
        });
      }
      return ctx.db
        .delete(userFollows)
        .where(
          and(
            eq(userFollows.followerId, userId),
            eq(userFollows.followingId, input.followingId),
          ),
        );
    }),
  updateAdditionalInfo: protectedProcedure
    .input(userAdditionalInfoSchema)
    .mutation(async ({ ctx, input }) => {
      const { userId } = ctx.auth;
      if (!userId) {
        throw new TRPCError({
          code: "INTERNAL_SERVER_ERROR",
          message: "No user id found in session",
        });
      }
      return ctx.db
        .update(users)
        .set({
          bio: input.bio || null,
          publicEmail: input.publicEmail || null,
          publicPhone: input.publicPhone || null,
          publicInsta: input.publicInsta || null,
          publicWebsite: input.publicWebsite || null,
        })
        .where(eq(users.id, userId));
    }),

  updateEmoji: protectedProcedure
    .input(z.object({ emoji: z.string().max(10).nullable() }))
    .mutation(async ({ ctx, input }) => {
      const { userId } = ctx.auth;
      if (!userId) {
        throw new TRPCError({
          code: "UNAUTHORIZED",
          message: "User must be logged in to update emoji",
        });
      }

      const normalizedEmoji = normalizeEmoji(input.emoji);

      try {
        return await ctx.db
          .update(users)
          .set({ emoji: normalizedEmoji || null })
          .where(eq(users.id, userId));
      } catch (error: unknown) {
        if (error instanceof Error && error.message.includes("ER_DUP_ENTRY")) {
          throw new TRPCError({
            code: "CONFLICT",
            message: "This emoji is already in use by another user",
          });
        }
        // Re-throw any other errors
        throw error;
      }
    }),

  getAllTakenEmojis: publicProcedure.query(async ({ ctx }) => {
    const takenEmojis = await ctx.db
      .select({ emoji: users.emoji })
      .from(users)
      .where(sql`${users.emoji} IS NOT NULL`);

    return {
      takenEmojis: takenEmojis
        .map((user) => user.emoji)
        .filter((emoji): emoji is string => emoji !== null),
    };
  }),
});
