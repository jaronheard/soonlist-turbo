import { internalAction, internalQuery } from "./_generated/server";
import { internal } from "./_generated/api";
import { posthog } from "@soonlist/api/utils/posthog";
import { v } from "convex/values";

/**
 * Internal query to get all users for backfill
 */
export const getAllUsersForBackfill = internalQuery({
  args: {},
  handler: async (ctx) => {
    const users = await ctx.db.query("users").collect();
    return users.map((user) => ({
      id: user.id,
      email: user.email,
    }));
  },
});

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

    console.log("Starting PostHog alias backfill...", { dryRun });

    // Get all users from Convex
    const allUsers = await ctx.runQuery(
      internal.posthogBackfill.getAllUsersForBackfill,
    );

    const results: Array<{
      userId: string;
      email?: string;
      aliased: boolean;
      error?: string;
    }> = [];

    for (const user of allUsers) {
      try {
        // Query PostHog REST API for events with this user's ID
        // We're looking for cases where:
        // 1. User has events identified with their user ID (userId)
        // 2. User also has onboarding events with a different distinct ID (anonymous)

        // Query PostHog API for events
        // Note: PostHog API endpoint format may vary - this is a simplified approach
        // You may need to adjust based on your PostHog instance configuration
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

        // If user has trial events but no onboarding events with same ID,
        // they likely need aliasing
        const hasTrialEvents = trialResponse?.ok ?? false;
        const hasOnboardingEvents = identifiedResponse?.ok ?? false;

        if (hasTrialEvents && !hasOnboardingEvents) {
          // Need to find the anonymous ID that has onboarding events
          // Query PostHog for onboarding events by email
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

              // Find distinct IDs that are different from the user ID
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

              // Create aliases for each anonymous ID
              for (const anonymousId of anonymousIds) {
                if (!dryRun) {
                  // Use PostHog SDK to create alias
                  // Note: alias(identifiedId, anonymousId) links anonymousId -> identifiedId
                  posthog.alias(user.id, anonymousId);
                  await new Promise((resolve) => setTimeout(resolve, 100)); // Rate limiting
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

    // Flush PostHog events
    if (!dryRun) {
      await posthog.shutdown();
    }

    return {
      success: true,
      processed: results.length,
      aliased: results.filter((r) => r.aliased).length,
      errors: results.filter((r) => r.error).length,
      results,
    };
  },
});

