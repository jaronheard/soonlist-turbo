import { z } from "zod";
import { createTRPCRouter, publicProcedure } from "@/server/api/trpc";
import { waitlistSubmissions } from "@/server/db/schema";

export const waitlistRouter = createTRPCRouter({
  // This is a public procedure, meaning it can be called by anyone
  create: publicProcedure
    .input(
      z.object({
        email: z.string().email(),
        zipcode: z.string(),
        why: z.string().optional(),
      })
    )
    .mutation(({ ctx, input }) => {
      return ctx.db.insert(waitlistSubmissions).values({
        email: input.email,
        zipcode: input.zipcode,
        why: input.why || "",
      });
    }),
});
