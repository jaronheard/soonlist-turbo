import { z } from "zod";

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

      // Update user profile with onboarding data
      const updatedUser = await ctx.db.user.update({
        where: { id: currentUser.id },
        data: {
          onboardingData: input,
          ...(input.completedAt
            ? { onboardingCompletedAt: input.completedAt }
            : {}),
        },
      });

      return updatedUser;
    }),

  getOnboardingData: protectedProcedure.query(async ({ ctx }) => {
    const { currentUser } = ctx;

    if (!currentUser) {
      throw new Error("User not found");
    }

    return currentUser.onboardingData;
  }),
});
