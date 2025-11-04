"use node";

import { internalAction } from "./_generated/server";
import { internal } from "./_generated/api";
import { PostHog } from "posthog-node";
import { v } from "convex/values";

/**
 * Backfill PostHog aliases for users who converted from guest to identified
 * without proper aliasing. This merges their anonymous and identified event histories.
 *
 * Strategy:
 * 1. Query Convex for all users
 * 2. For each user, use PostHog's REST API to query for events
 * 3. Find distinct IDs that have onboarding events but are different from the user's identified distinct ID
 * 4. Create aliases using PostHog's alias API
 *
 * Note: This uses PostHog's node SDK alias method which creates proper aliases.
 * The $merge_dangerously event is more dangerous and should be avoided if possible.
 *
 * Usage:
 * - Run in dry-run mode first: npx convex run posthogBackfill:backfillPostHogAliases '{"dryRun": true}'
 * - Then run for real: npx convex run posthogBackfill:backfillPostHogAliases '{"dryRun": false}'
 */
export const backfillPostHogAliases = internalAction({
  args: {
    // Optional: limit to specific users for testing
    userIds: v.optional(v.array(v.string())),
    // Dry run mode - don't actually create aliases
    dryRun: v.optional(v.boolean()),
    // PostHog API key (should be in env, but can override)
    posthogApiKey: v.optional(v.string()),
    // PostHog host (defaults to app.posthog.com)
    posthogHost: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const dryRun = args.dryRun ?? false;
    const posthogApiKey =
      args.posthogApiKey ?? process.env.NEXT_PUBLIC_POSTHOG_KEY;
    const posthogHost =
      args.posthogHost ?? process.env.NEXT_PUBLIC_POSTHOG_HOST ?? "https://app.posthog.com";

    if (!posthogApiKey) {
      throw new Error("PostHog API key is required");
    }

    // Create PostHog instance for this action
    const posthog = new PostHog(posthogApiKey, {
      host: posthogHost,
      flushAt: 1,
      flushInterval: 0,
    });

    console.log("Starting PostHog alias backfill...", { dryRun });

    const allUsers = await ctx.runQuery(
      internal.users.getAllUsersForBackfill,
    );

    const results: Array<{
      userId: string;
      email?: string;
      aliased: boolean;
      error?: string;
    }> = [];

    for (const user of allUsers) {
      try {
        const identifiedEventsUrl = `${posthogHost}/api/projects/${posthogApiKey}/events/?distinct_id=${encodeURIComponent(user.id)}&event=onboarding_step_completed&limit=1`;
        const trialEventsUrl = `${posthogHost}/api/projects/${posthogApiKey}/events/?distinct_id=${encodeURIComponent(user.id)}&event=rc_trial_started_event&limit=1`;

        const [identifiedResponse, trialResponse] = await Promise.all([
          fetch(identifiedEventsUrl, {
            headers: {
              Authorization: `Bearer ${posthogApiKey}`,
            },
          }).catch(() => null),
          fetch(trialEventsUrl, {
            headers: {
              Authorization: `Bearer ${posthogApiKey}`,
            },
          }).catch(() => null),
        ]);

        const hasTrialEvents = trialResponse?.ok ?? false;
        const hasOnboardingEvents = identifiedResponse?.ok ?? false;

        if (hasTrialEvents && !hasOnboardingEvents) {
          if (user.email) {
            const emailQueryUrl = `${posthogHost}/api/projects/${posthogApiKey}/events/?properties=%5B%7B%22key%22%3A%22email%22%2C%22value%22%3A%22${encodeURIComponent(user.email)}%22%7D%5D&event=onboarding_step_completed&limit=100`;

            const emailResponse = await fetch(emailQueryUrl, {
              headers: {
                Authorization: `Bearer ${posthogApiKey}`,
              },
            });

            if (emailResponse.ok) {
              const emailData = (await emailResponse.json()) as {
                results?: Array<{
                  distinct_id: string;
                  properties?: Record<string, unknown>;
                }>;
              };

              const anonymousIds = new Set<string>();
              emailData.results?.forEach((event) => {
                if (
                  event.distinct_id &&
                  event.distinct_id !== user.id &&
                  !event.distinct_id.startsWith(user.id)
                ) {
                  anonymousIds.add(event.distinct_id);
                }
              });

              for (const anonymousId of anonymousIds) {
                if (!dryRun) {
                  posthog.alias({
                    distinctId: anonymousId,
                    alias: user.id,
                  });
                  await new Promise((resolve) => setTimeout(resolve, 100));
                }

                results.push({
                  userId: user.id,
                  email: user.email,
                  aliased: !dryRun,
                });

                console.log(
                  dryRun
                    ? `[DRY RUN] Would alias ${anonymousId} -> ${user.id}`
                    : `Aliased ${anonymousId} -> ${user.id}`,
                );
              }
            }
          }
        }
      } catch (error) {
        console.error(`Error processing user ${user.id}:`, error);
        results.push({
          userId: user.id,
          email: user.email,
          aliased: false,
          error: error instanceof Error ? error.message : String(error),
        });
      }
    }

    // Note: We don't call shutdown() here because:
    // 1. In serverless environments like Convex, the process terminates naturally
    // 2. With flushAt: 1 and flushInterval: 0, events are sent immediately
    // 3. Calling shutdown() on a PostHog instance could potentially affect other
    //    PostHog instances if they share any global state, even though we use a
    //    dedicated instance here. Removing shutdown() is safer for serverless.

    return {
      success: true,
      processed: results.length,
      aliased: results.filter((r) => r.aliased).length,
      errors: results.filter((r) => r.error).length,
      results,
    };
  },
});
