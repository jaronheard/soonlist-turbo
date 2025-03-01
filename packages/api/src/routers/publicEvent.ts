import { Temporal } from "@js-temporal/polyfill";
import { z } from "zod";

import type { NewEvent, NewEventToLists } from "@soonlist/db/types";
import { EventMetadataSchemaLoose } from "@soonlist/cal";
import { events, eventToLists } from "@soonlist/db/schema";
import { AddToCalendarButtonPropsSchema } from "@soonlist/validators";

import { createTRPCRouter, publicProcedure } from "../trpc";
import { generatePublicId } from "../utils";

const eventCreateSchema = z.object({
  event: AddToCalendarButtonPropsSchema,
  eventMetadata: EventMetadataSchemaLoose.optional(),
  comment: z.string().optional(),
  lists: z.array(z.record(z.string().trim())),
  visibility: z.enum(["public", "private"]).optional(),
  environment: z.enum(["development", "production"]).default("development"),
});

export const publicEventRouter = createTRPCRouter({
  create: publicProcedure
    .input(eventCreateSchema)
    .mutation(async ({ ctx, input }) => {
      // Use the Soonlist event generator user ID based on environment
      // Always use development ID for preview environments (Vercel previews use development database)
      const isProduction =
        input.environment === "production" &&
        process.env.VERCEL_ENV === "production";

      const userId = isProduction
        ? "user_2ZpagQAYjGEBe7JiRlfI99Ph92y" // Production ID
        : "user_2s7b2Ek9fVHtCPRy4h4D2ynDZDE"; // Development ID (also used for preview)
      const username = "soonlist";

      const { event, eventMetadata } = input;
      const hasLists = input.lists.length > 0;

      // Always set visibility to public
      const visibility = "public";

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
        `${event.startDate}T${startTime}[${timeZone}]`,
      );
      const end = Temporal.ZonedDateTime.from(
        `${event.endDate}T${endTime}[${timeZone}]`,
      );
      const startUtcDate = new Date(start.epochMilliseconds);
      const endUtcDate = new Date(end.epochMilliseconds);
      const eventid = generatePublicId();

      const values: NewEvent = {
        id: eventid,
        userId: userId,
        userName: username,
        event: event,
        eventMetadata: eventMetadata,
        startDateTime: startUtcDate,
        endDateTime: endUtcDate,
        visibility: visibility,
      };

      return ctx.db
        .transaction(async (tx) => {
          const insertEvent = async (event: NewEvent) => {
            return tx.insert(events).values(event);
          };

          const insertEventToLists = async (eventToList: NewEventToLists[]) => {
            return tx.insert(eventToLists).values(eventToList);
          };

          await insertEvent(values);

          if (hasLists) {
            await insertEventToLists(
              input.lists.map((list) => ({
                eventId: eventid,
                listId: list.value!,
              })),
            );
          }
        })
        .then(() => ({ id: eventid }));
    }),
});
