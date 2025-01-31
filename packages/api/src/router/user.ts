import { eq } from "drizzle-orm";
import { z } from "zod";

import type { OnboardingData } from "@soonlist/db/types";
import { users } from "@soonlist/db/schema";

import { createTRPCRouter, protectedProcedure } from "../trpc";

const prioritySchema = z.object({
  text: z.string(),
  emoji: z.string(),
});

const onboardingDataSchema = z.object({
  notificationsEnabled: z.boolean().optional(),
  ageRange: z
    .enum(["Under 24", "25-34", "35-44", "45-54", "55-64", "65+"])
    .optional(),
  priority: prioritySchema.optional(),
  completedAt: z.date().optional(),
});

export const userRouter = createTRPCRouter({
  saveOnboardingData: protectedProcedure
    .input(onboardingDataSchema)
    .mutation(async ({ ctx, input }) => {
      const { currentUser } = ctx;

      if (!currentUser) {
        throw new Error("User not found");
      }

      // Get user from database
      const dbUser = await ctx.db.query.users.findFirst({
        where: eq(users.id, currentUser.id),
      });

      if (!dbUser) {
        throw new Error("User not found in database");
      }

      // Get existing onboarding data
      const existingData = (dbUser.onboardingData ?? {}) as OnboardingData;

      // Merge existing data with new data
      const mergedData = {
        ...existingData,
        ...input,
      };

      // Update user profile with onboarding data
      await ctx.db
        .update(users)
        .set({
          onboardingData: mergedData,
          ...(input.completedAt
            ? { onboardingCompletedAt: input.completedAt }
            : {}),
        })
        .where(eq(users.id, currentUser.id));

      return mergedData;
    }),

  getOnboardingData: protectedProcedure.query(async ({ ctx }) => {
    const { currentUser } = ctx;

    if (!currentUser) {
      throw new Error("User not found");
    }

    // Get user from database
    const dbUser = await ctx.db.query.users.findFirst({
      where: eq(users.id, currentUser.id),
    });

    if (!dbUser) {
      throw new Error("User not found in database");
    }

    return (dbUser.onboardingData ?? {}) as OnboardingData;
  }),
});
