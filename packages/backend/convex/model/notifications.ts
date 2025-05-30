import type { QueryCtx } from "../_generated/server";

// Types for notification operations
export interface NotificationResult {
  success: boolean;
  id?: string;
  error?: string;
  notificationId: string;
  userId: string;
}

export interface BatchNotificationResult {
  success: boolean;
  totalProcessed: number;
  successfulNotifications: number;
  errors: { userId?: string; error: string }[];
}

/**
 * Get all users from the database
 */
export async function getAllUsers(ctx: QueryCtx) {
  return await ctx.db.query("users").collect();
}

/**
 * Get upcoming events for a user within the next week
 */
export async function getUpcomingEventsForUser(ctx: QueryCtx, userId: string) {
  const now = new Date();
  const oneWeekFromNow = new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000);

  // Get events created by the user
  const userEvents = await ctx.db
    .query("events")
    .withIndex("by_user", (q) => q.eq("userId", userId))
    .filter((q) =>
      q.and(
        q.gt(q.field("startDateTime"), now.toISOString()),
        q.lt(q.field("endDateTime"), oneWeekFromNow.toISOString()),
      ),
    )
    .collect();

  // Get events the user is following
  const eventFollows = await ctx.db
    .query("eventFollows")
    .withIndex("by_user", (q) => q.eq("userId", userId))
    .collect();

  const followedEventIds = eventFollows.map((follow) => follow.eventId);

  const followedEvents = await Promise.all(
    followedEventIds.map(async (eventId) => {
      const event = await ctx.db
        .query("events")
        .withIndex("by_custom_id", (q) => q.eq("id", eventId))
        .first();

      if (
        event &&
        new Date(event.startDateTime) > now &&
        new Date(event.endDateTime) < oneWeekFromNow
      ) {
        return event;
      }
      return null;
    }),
  );

  const validFollowedEvents = followedEvents.filter((event) => event !== null);

  // Combine and deduplicate events
  const allEvents = [...userEvents, ...validFollowedEvents];
  const eventMap = new Map(allEvents.map((event) => [event.id, event]));
  const uniqueEvents = Array.from(eventMap.values());

  return uniqueEvents;
}

/**
 * Get users who started their trial 5 days ago and are still trialing
 */
export async function getTrialExpirationUsers(ctx: QueryCtx) {
  const fiveBusinessDaysAgo = new Date();
  fiveBusinessDaysAgo.setDate(fiveBusinessDaysAgo.getDate() - 5);
  const targetDate = fiveBusinessDaysAgo.toISOString().split("T")[0];

  const allUsers = await ctx.db.query("users").collect();

  return allUsers.filter((user) => {
    if (!user.publicMetadata) return false;

    try {
      const metadata: unknown =
        typeof user.publicMetadata === "string"
          ? JSON.parse(user.publicMetadata)
          : user.publicMetadata;

      // Type guard to check if metadata has the expected structure
      if (
        !metadata ||
        typeof metadata !== "object" ||
        !("plan" in metadata) ||
        !metadata.plan ||
        typeof metadata.plan !== "object"
      ) {
        return false;
      }

      const plan = metadata.plan as Record<string, unknown>;

      const isTrialing = plan.status === "trialing";
      const trialStartDate = plan.trialStartDate;

      if (
        !isTrialing ||
        !trialStartDate ||
        typeof trialStartDate !== "string"
      ) {
        return false;
      }

      const startDate = new Date(trialStartDate).toISOString().split("T")[0];
      return startDate === targetDate;
    } catch {
      return false;
    }
  });
}

/**
 * Generate a prompt for creating a weekly notification with events
 */
export function getPromptForWeeklyNotificationWithEvents(
  eventDescriptions: string,
): string {
  return `You are tasked with creating an exciting and rich notification for a user's upcoming week based on their saved events. Your goal is to generate a concise, engaging message that fits into a single notification and captures the essence of the week's possibilities.

Here is the list of events for the upcoming week separated by "NEXT EVENT":
<events>
${eventDescriptions}
</events>

Follow these steps to create the notification:

1. For each event, identify the most specific and evocative single-word adjective-noun pairs that uniquely apply to that event. Be creative and don't hesitate to use esoteric or simple adjectives.

2. From the list of adjective-noun pairs you've generated, select the top three that would provide the most complete abstract picture of the week's possibilities. These should be diverse and capture different aspects of the events.

3. Format your output as follows:
   - Start with the three selected adjective-noun pairs, each preceded by a relevant emoji

4. Use Spotify's Daylists as inspiration for the tone and style. Incorporate uncommon emojis where appropriate.

5. Ensure the entire message fits into a single notification. Do not include "THIS WEEK" or any other preface. Begin directly with the adjective-noun pairs.

Example output:
🧠 Cerebral discussions, 🌀 Mesmerizing animations, 🎭 Avant-garde showcases

Remember to vary your output for different weeks, maintaining the exciting and unique elements that make each week special.`;
}

/**
 * Generate notification content for a user based on their upcoming events
 */
export async function generateWeeklyNotificationContent(
  ctx: QueryCtx,
  userId: string,
): Promise<{
  title: string;
  message: string;
  link: string;
  eventDescriptions?: string;
}> {
  const upcomingEvents = await getUpcomingEventsForUser(ctx, userId);

  let title = `🤩 ${upcomingEvents.length} possibilities this week`;
  let link = "/feed";
  let prefix = "See all events you captured: ";
  let summary = "";

  if (upcomingEvents.length === 0) {
    title = "😳 No possibilities this week";
    link = "/feed";
    prefix = "";
    summary =
      "Screenshots of events still hiding in your photos? Capture them now to remember!";
  } else if (upcomingEvents.length < 3) {
    title = `😌 ${upcomingEvents.length} possibilities this week`;
    link = "/feed";
    prefix = "";
    summary =
      "Keep capturing events you see. Missing any? Check your screenshots now!";
  } else {
    // For 3+ events, we'll need to generate AI content
    // This will be handled in the action that calls the AI
    const eventDescriptions = upcomingEvents
      .map((event) => {
        // Safely access event data
        const eventData = event.event as Record<string, unknown> | undefined;
        const name =
          (eventData?.name as string) || event.name || "Untitled Event";
        const description =
          (eventData?.description as string) || event.description || "";
        return `${name} ${description}`;
      })
      .join(" NEXT EVENT ");

    return {
      title,
      message: "", // Will be filled by AI generation
      link,
      eventDescriptions,
    };
  }

  return {
    title,
    message: `${prefix}${summary}`,
    link,
  };
}
