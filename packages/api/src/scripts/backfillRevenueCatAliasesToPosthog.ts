#!/usr/bin/env node

/**
 * RevenueCat to PostHog Alias Backfill Script
 *
 * This script merges PostHog persons created from RevenueCat anonymous IDs ($RCAnonymousID:*)
 * into the corresponding identified user persons in PostHog.
 *
 * The script searches PostHog for persons with distinct_ids matching the pattern $RCAnonymousID:*
 * and merges them into the corresponding identified user based on RevenueCat subscriber data
 * or PostHog person properties.
 *
 * Usage:
 *   POSTHOG_PERSONAL_API_KEY=your_key REVENUECAT_API_KEY=your_key node backfillRevenueCatAliasesToPosthog.ts [--dry-run] [--user <app_user_id>]
 *
 * Environment Variables:
 *   POSTHOG_PERSONAL_API_KEY - PostHog Personal API Key (required)
 *   POSTHOG_HOST - PostHog instance host (optional, defaults to https://us.i.posthog.com)
 *   REVENUECAT_API_KEY - RevenueCat Admin API Key (optional, for enhanced mapping)
 *   REVENUECAT_HOST - RevenueCat API host (optional, defaults to https://api.revenuecat.com)
 */

const POSTHOG_HOST = process.env.POSTHOG_HOST || "https://us.i.posthog.com";
const POSTHOG_PERSONAL_API_KEY = process.env.POSTHOG_PERSONAL_API_KEY;
const REVENUECAT_API_KEY = process.env.REVENUECAT_API_KEY;
const REVENUECAT_HOST =
  process.env.REVENUECAT_HOST || "https://api.revenuecat.com";
const DRY_RUN = process.argv.includes("--dry-run");
const USER_FILTER = process.argv.includes("--user")
  ? process.argv[process.argv.indexOf("--user") + 1]
  : null;

if (!POSTHOG_PERSONAL_API_KEY) {
  console.error(
    "Error: POSTHOG_PERSONAL_API_KEY environment variable is required",
  );
  process.exit(1);
}

interface PostHogPerson {
  distinct_id: string;
  properties: {
    email?: string;
    username?: string;
    [key: string]: unknown;
  };
}

interface PostHogPersonsResponse {
  results: PostHogPerson[];
  next?: string;
}

interface RevenueCatSubscriber {
  request_date: string;
  request_date_ms: number;
  subscriber: {
    first_seen: string;
    last_seen: string;
    management_url: string;
    original_app_user_id: string;
    original_application_id: string;
    other_purchases: unknown[];
    subscriptions: Record<string, unknown>;
    entitlements: Record<string, unknown>;
    non_subscriptions: Record<string, unknown>;
    attributes: Record<
      string,
      {
        updated_at_ms: number;
        value: string | null;
      }
    >;
  };
}

/**
 * Search for PostHog persons by property (email, username, etc.)
 */
async function searchPostHogPersonsByProperty(
  property: string,
  value: string,
): Promise<PostHogPerson[]> {
  const url = `${POSTHOG_HOST}/api/persons/`;
  const params = new URLSearchParams({
    properties: JSON.stringify([{ key: property, value, operator: "exact" }]),
  });

  const persons: PostHogPerson[] = [];
  let next: string | undefined;

  do {
    const requestUrl = next || `${url}?${params.toString()}`;
    const response = await fetch(requestUrl, {
      headers: {
        Authorization: `Bearer ${POSTHOG_PERSONAL_API_KEY}`,
      },
    });

    if (!response.ok) {
      throw new Error(
        `Failed to search PostHog persons: ${response.statusText}`,
      );
    }

    const data = (await response.json()) as PostHogPersonsResponse;
    persons.push(...data.results);
    next = data.next;
  } while (next);

  return persons;
}

/**
 * Get PostHog person by distinct_id
 */
async function getPostHogPerson(
  distinctId: string,
): Promise<PostHogPerson | null> {
  const url = `${POSTHOG_HOST}/api/persons/${encodeURIComponent(distinctId)}/`;
  const response = await fetch(url, {
    headers: {
      Authorization: `Bearer ${POSTHOG_PERSONAL_API_KEY}`,
    },
  });

  if (response.status === 404) {
    return null;
  }

  if (!response.ok) {
    throw new Error(
      `Failed to fetch PostHog person ${distinctId}: ${response.statusText}`,
    );
  }

  return (await response.json()) as PostHogPerson;
}

/**
 * Merge persons in PostHog
 */
async function mergePersons(
  primaryDistinctId: string,
  secondaryDistinctId: string,
): Promise<void> {
  if (DRY_RUN) {
    console.log(
      `[DRY RUN] Would merge ${secondaryDistinctId} into ${primaryDistinctId}`,
    );
    return;
  }

  const url = `${POSTHOG_HOST}/api/persons/${encodeURIComponent(primaryDistinctId)}/merge/`;
  const response = await fetch(url, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${POSTHOG_PERSONAL_API_KEY}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      ids: [secondaryDistinctId],
    }),
  });

  if (!response.ok) {
    const errorText = await response.text();
    throw new Error(
      `Failed to merge persons: ${response.statusText} - ${errorText}`,
    );
  }
}

/**
 * Get RevenueCat subscriber by app_user_id
 */
async function getRevenueCatSubscriber(
  appUserId: string,
): Promise<RevenueCatSubscriber | null> {
  if (!REVENUECAT_API_KEY) {
    return null;
  }

  const url = `${REVENUECAT_HOST}/v1/subscribers/${encodeURIComponent(appUserId)}`;
  const response = await fetch(url, {
    headers: {
      Authorization: `Bearer ${REVENUECAT_API_KEY}`,
    },
  });

  if (response.status === 404) {
    return null;
  }

  if (!response.ok) {
    throw new Error(
      `Failed to fetch RevenueCat subscriber ${appUserId}: ${response.statusText}`,
    );
  }

  return (await response.json()) as RevenueCatSubscriber;
}

/**
 * Get RevenueCat subscriber by app_user_id and check for original_app_user_id
 */
async function getRevenueCatOriginalAppUserId(
  appUserId: string,
): Promise<string | null> {
  if (!REVENUECAT_API_KEY) {
    return null;
  }

  try {
    const subscriber = await getRevenueCatSubscriber(appUserId);
    if (
      subscriber?.subscriber.original_app_user_id?.startsWith("$RCAnonymousID:")
    ) {
      return subscriber.subscriber.original_app_user_id;
    }
  } catch (error) {
    console.warn(
      `Could not fetch RevenueCat subscriber for ${appUserId}:`,
      error instanceof Error ? error.message : String(error),
    );
  }

  return null;
}

interface User {
  id: string;
  email: string;
  username: string;
}

/**
 * Fetch users from Convex (if CONVEX_URL is provided)
 */
async function fetchUsersFromConvex(): Promise<User[]> {
  const CONVEX_URL = process.env.CONVEX_URL;
  if (!CONVEX_URL) {
    return [];
  }

  const allUsers: User[] = [];
  let cursor: string | null = null;
  let hasMore = true;

  console.log("Fetching users from Convex...");

  try {
    while (hasMore) {
      const response = await fetch(`${CONVEX_URL}/posthog/backfill`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          ...(process.env.POSTHOG_BACKFILL_TOKEN && {
            Authorization: `Bearer ${process.env.POSTHOG_BACKFILL_TOKEN}`,
          }),
        },
        body: JSON.stringify({
          paginationOpts: { numItems: 100, cursor },
        }),
      });

      if (!response.ok) {
        console.warn(
          `Failed to fetch users from Convex: ${response.statusText}. Continuing without Convex data.`,
        );
        return [];
      }

      const data = (await response.json()) as {
        page: User[];
        continueCursor: string | null;
        isDone: boolean;
      };
      allUsers.push(...(data.page || []));
      cursor = data.continueCursor ?? null;
      hasMore = !data.isDone && cursor !== null;

      console.log(`  Fetched ${allUsers.length} users so far...`);
    }
  } catch (error) {
    console.warn(
      `Error fetching users from Convex:`,
      error instanceof Error ? error.message : String(error),
      ". Continuing without Convex data.",
    );
    return [];
  }

  return allUsers;
}

/**
 * Main backfill function
 */
async function backfillRevenueCatAliases() {
  console.log(
    `Starting RevenueCat to PostHog alias backfill${DRY_RUN ? " (DRY RUN)" : ""}...`,
  );

  try {
    const users = await fetchUsersFromConvex();
    console.log(`Found ${users.length} users from Convex`);

    let processed = 0;
    let merged = 0;
    let skipped = 0;
    let errors = 0;

    if (users.length > 0 && REVENUECAT_API_KEY) {
      console.log(
        "\nProcessing users with RevenueCat API to find RC anonymous IDs...",
      );

      for (const user of users) {
        processed++;

        if (USER_FILTER && user.id !== USER_FILTER) {
          skipped++;
          continue;
        }

        console.log(
          `\n[${processed}/${users.length}] Processing user ${user.id}...`,
        );

        try {
          const rcAnonymousId = await getRevenueCatOriginalAppUserId(user.id);

          if (!rcAnonymousId) {
            console.log(`  No RC anonymous ID found for user`);
            skipped++;
            continue;
          }

          console.log(`  Found RC anonymous ID: ${rcAnonymousId}`);

          const rcPerson = await getPostHogPerson(rcAnonymousId);
          const userPerson = await getPostHogPerson(user.id);

          if (!rcPerson) {
            console.log(
              `  RC anonymous person ${rcAnonymousId} not found in PostHog`,
            );
            skipped++;
            continue;
          }

          if (!userPerson) {
            console.log(`  User person ${user.id} not found in PostHog`);
            skipped++;
            continue;
          }

          console.log(`  Merging ${rcAnonymousId} into ${user.id}`);
          await mergePersons(user.id, rcAnonymousId);
          merged++;
        } catch (error) {
          console.error(
            `  Error processing user ${user.id}:`,
            error instanceof Error ? error.message : String(error),
          );
          errors++;
        }
      }
    } else if (users.length > 0) {
      console.log(
        "\nProcessing users by email matching (RevenueCat API not available)...",
      );

      for (const user of users) {
        processed++;

        if (USER_FILTER && user.id !== USER_FILTER) {
          skipped++;
          continue;
        }

        if (!user.email) {
          skipped++;
          continue;
        }

        console.log(
          `\n[${processed}/${users.length}] Processing user ${user.id}...`,
        );

        try {
          const persons = await searchPostHogPersonsByProperty(
            "email",
            user.email,
          );

          const rcAnonymousPersons = persons.filter((p) =>
            p.distinct_id.startsWith("$RCAnonymousID:"),
          );
          const identifiedPerson = persons.find(
            (p) => p.distinct_id === user.id,
          );

          if (rcAnonymousPersons.length === 0) {
            console.log(`  No RC anonymous persons found for email`);
            skipped++;
            continue;
          }

          if (!identifiedPerson) {
            console.log(`  Identified person ${user.id} not found in PostHog`);
            skipped++;
            continue;
          }

          for (const rcPerson of rcAnonymousPersons) {
            console.log(`  Merging ${rcPerson.distinct_id} into ${user.id}`);
            await mergePersons(user.id, rcPerson.distinct_id);
            merged++;
          }
        } catch (error) {
          console.error(
            `  Error processing user ${user.id}:`,
            error instanceof Error ? error.message : String(error),
          );
          errors++;
        }
      }
    } else {
      console.log(
        "\nNo users found from Convex. Please set CONVEX_URL or provide REVENUECAT_API_KEY to use RevenueCat API directly.",
      );
      console.log("\nTo use this script:");
      console.log("  1. Set CONVEX_URL to fetch users from Convex");
      console.log(
        "  2. Set REVENUECAT_API_KEY to use RevenueCat API for better matching",
      );
      console.log(
        "  3. Or manually process specific users with --user <app_user_id>",
      );
      process.exit(1);
    }

    console.log(`\n=== Backfill Complete ===`);
    console.log(`Processed: ${processed}`);
    console.log(`Merged: ${merged}`);
    console.log(`Skipped: ${skipped}`);
    console.log(`Errors: ${errors}`);
  } catch (error) {
    console.error("Fatal error during backfill:", error);
    process.exit(1);
  }
}

// Run the backfill
void backfillRevenueCatAliases();
