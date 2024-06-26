import { z } from "zod";

import { waitlistSubmissions } from "@soonlist/db/schema";

import { createTRPCRouter, publicProcedure } from "../trpc";

export const waitlistRouter = createTRPCRouter({
  // This is a public procedure, meaning it can be called by anyone
  create: publicProcedure
    .input(
      z.object({
        email: z.string().email(),
        zipcode: z.string(),
        why: z.string().optional(),
      }),
    )
    .mutation(({ ctx, input }) => {
      return ctx.db.insert(waitlistSubmissions).values({
        email: input.email,
        zipcode: input.zipcode,
        why: input.why || "",
      });
    }),
});
