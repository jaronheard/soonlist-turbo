import { and, eq } from "drizzle-orm";
import { z } from "zod";

import { pushTokens } from "@soonlist/db/schema";

import { createTRPCRouter, protectedProcedure, publicProcedure } from "../trpc";

export const pushTokenRouter = createTRPCRouter({
  create: protectedProcedure
    .input(
      z.object({
        userId: z.string(),
        expoPushToken: z.string(),
      }),
    )
    .mutation(async ({ ctx, input }) => {
      const { userId, expoPushToken } = input;

      // First, try to find an existing record
      const existingRecord = await ctx.db
        .select()
        .from(pushTokens)
        .where(
          and(
            eq(pushTokens.userId, userId),
            eq(pushTokens.expoPushToken, expoPushToken),
          ),
        )
        .limit(1);

      if (existingRecord.length > 0) {
        // If record exists, update the updatedAt
        return ctx.db
          .update(pushTokens)
          .set({ updatedAt: new Date() })
          .where(
            and(
              eq(pushTokens.userId, userId),
              eq(pushTokens.expoPushToken, expoPushToken),
            ),
          );
      } else {
        // If record doesn't exist, insert a new one
        return ctx.db.insert(pushTokens).values({
          userId: userId,
          expoPushToken: expoPushToken,
        });
      }
    }),
  getForUser: publicProcedure
    .input(z.object({ userId: z.string() }))
    .query(({ ctx, input }) => {
      return ctx.db
        .select()
        .from(pushTokens)
        .where(eq(pushTokens.userId, input.userId))
        .then((pushTokens) =>
          pushTokens.map((pushToken) => pushToken.expoPushToken),
        );
    }),
});
