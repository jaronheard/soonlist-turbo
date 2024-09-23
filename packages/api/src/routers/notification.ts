import type { ExpoPushMessage } from "expo-server-sdk";
import { Expo } from "expo-server-sdk";
import { anthropic } from "@ai-sdk/anthropic";
import { waitUntil } from "@vercel/functions";
import { generateText } from "ai";
import { and, eq, gt, sql } from "drizzle-orm";
import { Langfuse } from "langfuse";
import { z } from "zod";

import type { AddToCalendarButtonProps } from "@soonlist/cal/types";
import { db, lt } from "@soonlist/db";
import { events, pushTokens, users } from "@soonlist/db/schema";

import { createTRPCRouter, publicProcedure } from "../trpc";

// Create a single Expo SDK client to be reused
const expo = new Expo();

const langfuse = new Langfuse({
  publicKey: process.env.LANGFUSE_PUBLIC_KEY || "",
  secretKey: process.env.LANGFUSE_SECRET_KEY || "",
  baseUrl: process.env.LANGFUSE_BASE_URL || "",
});

// Define the input schema for the sendNotification procedure
const sendNotificationInputSchema = z.object({
  expoPushToken: z.string(),
  title: z.string(),
  body: z.string(),
  data: z.record(z.unknown()).optional(),
});

export const notificationRouter = createTRPCRouter({
  sendSingleNotification: publicProcedure
    .input(sendNotificationInputSchema)
    .mutation(async ({ input }) => {
      const { expoPushToken, title, body, data } = input;

      if (!Expo.isExpoPushToken(expoPushToken)) {
        throw new Error(
          // eslint-disable-next-line @typescript-eslint/restrict-template-expressions
          `Push token ${expoPushToken} is not a valid Expo push token`,
        );
      }

      const message: ExpoPushMessage = {
        to: expoPushToken,
        sound: "default",
        title,
        body,
        data,
      };

      try {
        const [ticket] = await expo.sendPushNotificationsAsync([message]);
        return {
          success: true,
          ticket,
        };
      } catch (error) {
        console.error("Error sending notification:", error);
        return {
          success: false,
          // eslint-disable-next-line @typescript-eslint/consistent-type-assertions
          error: (error as Error).message,
        };
      }
    }),

  sendWeeklyNotifications: publicProcedure.mutation(async () => {
    const now = new Date();
    const oneWeekFromNow = new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000);

    // Fetch all users with valid push tokens
    const usersWithTokens = await db
      .select({
        userId: pushTokens.userId,
        expoPushToken: pushTokens.expoPushToken,
      })
      .from(pushTokens)
      .innerJoin(
        users,
        sql`${users.id} COLLATE utf8mb4_unicode_ci = ${pushTokens.userId} COLLATE utf8mb4_unicode_ci`,
      )
      .where(
        sql`${pushTokens.expoPushToken} != 'Error: Must use physical device for push notifications'`,
      );

    console.log("usersWithTokens", usersWithTokens);

    for (const user of usersWithTokens) {
      // Fetch upcoming events for the user
      const upcomingEvents = await db
        .select()
        .from(events)
        .where(
          and(
            eq(events.userId, user.userId),
            gt(events.startDateTime, now),
            lt(events.endDateTime, oneWeekFromNow),
          ),
        );

      if (upcomingEvents.length > 0) {
        // Format events for the AI prompt
        const eventDescriptions = upcomingEvents
          .map((event) => {
            const eventData = event.event as AddToCalendarButtonProps;
            return `${eventData.name} ${eventData.description}`;
          })
          .join("\n");

        const prompt = `You are tasked with creating an exciting and rich notification for a user's upcoming week based on their saved events. Your goal is to generate a concise, engaging message that fits into a single notification and captures the essence of the week's possibilities.

Here is the list of events for the upcoming week:
<events>
${eventDescriptions}
</events>

Follow these steps to create the notification:

1. For each event, identify the most specific and evocative single-word adjective-noun pairs that uniquely apply to that event. Be creative and don't hesitate to use esoteric or simple adjectives.

2. From the list of adjective-noun pairs you've generated, select the top three that would provide the most complete abstract picture of the week's possibilities. These should be diverse and capture different aspects of the events.

3. For each specific event, create a highlight using a verb + specific noun form. Be super succinct and focus on the most exciting and unique action elements. Include all events in this list.

4. Format your output as follows:
   - Start with the three selected adjective-noun pairs, each preceded by a relevant emoji
   - Add the 🔜 emoji as a separator (no new lines)
   - List the event highlights without emojis

5. Use Spotify's Daylists as inspiration for the tone and style. Incorporate uncommon emojis where appropriate.

6. Ensure the entire message fits into a single notification. Do not include "THIS WEEK" or any other preface. Begin directly with the adjective-noun pairs.

Example output:
🧠 Cerebral discussions, 🌀 Mesmerizing animations, 🎭 Avant-garde showcases 🔜 Meditate at William Basinski, converse at UX book, dance gracefully at StepsPDX

Remember to vary your output for different weeks, maintaining the exciting and unique elements that make each week special.`;

        const trace = langfuse.trace({
          name: "sendWeeklyNotifications",
          userId: user.userId,
          input: eventDescriptions,
        });

        const generation = trace.generation({
          name: "generateWeeklyNotification",
          input: eventDescriptions,
          model: "claude-3-5-sonnet-20240620",
        });

        generation.update({
          completionStartTime: new Date(),
        });

        try {
          const { text: summary } = await generateText({
            model: anthropic("claude-3-5-sonnet-20240620"),
            prompt,
            temperature: 0,
            maxTokens: 1000,
          });

          generation.end({
            output: summary,
          });

          generation.score({
            name: "notificationGeneration",
            value: summary ? 1 : 0,
          });

          trace.update({
            output: summary,
            metadata: {
              eventDescriptions,
            },
          });

          // Prepare and send the notification to each valid push token
          const validPushTokens = usersWithTokens
            .filter(
              (token) =>
                token.expoPushToken !==
                "Error: Must use physical device for push notifications",
            )
            .map((token) => token.expoPushToken);

          for (const expoPushToken of validPushTokens) {
            if (Expo.isExpoPushToken(expoPushToken)) {
              const message: ExpoPushMessage = {
                to: expoPushToken,
                sound: "default",
                title: "✨ Your week of possibilities",
                body: summary,
                data: { url: "/feed" },
              };

              await expo.sendPushNotificationsAsync([message]);
            }
          }
        } catch (error) {
          console.error(
            "An error occurred while generating the notification:",
            error,
          );

          generation.score({
            name: "notificationGeneration",
            value: 0,
          });

          trace.update({
            output: null,
            metadata: {
              error: (error as Error).message,
            },
          });

          throw error;
        } finally {
          waitUntil(langfuse.flushAsync());
        }
      }
    }

    return { success: true };
  }),
});
