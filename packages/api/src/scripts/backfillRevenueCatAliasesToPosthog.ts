#!/usr/bin/env node

/**
 * RevenueCat → PostHog Alias Backfill
 *
 * This script merges anonymous RevenueCat customers (e.g. $RCAnonymousID:*) into
 * the identified PostHog person for users who later created an account.
 *
 * Usage:
 *   POSTHOG_PERSONAL_API_KEY=ph_key REVENUECAT_API_KEY=rc_key CONVEX_URL=https://<convex> \
 *     node backfillRevenueCatAliasesToPosthog.ts [--dry-run] [--user user_id]
 */

const POSTHOG_HOST = process.env.POSTHOG_HOST || "https://us.i.posthog.com";
const POSTHOG_PERSONAL_API_KEY = process.env.POSTHOG_PERSONAL_API_KEY;
const REVENUECAT_HOST =
  process.env.REVENUECAT_HOST || "https://api.revenuecat.com";
const REVENUECAT_API_KEY = process.env.REVENUECAT_API_KEY;
const CONVEX_URL = process.env.CONVEX_URL;
const CONVEX_URL_PATH = process.env.CONVEX_URL_PATH || "/posthog/backfill";

const DRY_RUN = process.argv.includes("--dry-run");
const userFlagIndex = process.argv.indexOf("--user");
const USER_FILTER =
  userFlagIndex !== -1 ? (process.argv[userFlagIndex + 1] ?? null) : null;

if (!POSTHOG_PERSONAL_API_KEY) {
  console.error(
    "Error: POSTHOG_PERSONAL_API_KEY environment variable is required",
  );
  process.exit(1);
}

if (!REVENUECAT_API_KEY) {
  console.error("Error: REVENUECAT_API_KEY environment variable is required");
  process.exit(1);
}

if (!CONVEX_URL) {
  console.error("Error: CONVEX_URL environment variable is required");
  process.exit(1);
}

interface User {
  id: string;
  email: string;
  username: string;
}

interface ConvexUsersResponse {
  page: User[];
  continueCursor: string | null;
  isDone: boolean;
}

interface RevenueCatAttribute {
  value?: string | null;
}

interface RevenueCatSubscriber {
  app_user_id?: string;
  original_app_user_id?: string | null;
  aliases?: string[];
  attributes?: Record<string, RevenueCatAttribute | undefined> | null;
}

interface RevenueCatSubscriberResponse {
  subscriber: RevenueCatSubscriber;
}

interface PostHogPerson {
  distinct_id: string;
}

async function fetchUsersFromConvex(): Promise<User[]> {
  const allUsers: User[] = [];
  let cursor: string | null = null;
  let hasMore = true;

  while (hasMore) {
    const response = await fetch(`${CONVEX_URL}${CONVEX_URL_PATH}`, {
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
      throw new Error(`Failed to fetch users: ${response.statusText}`);
    }

    const data = (await response.json()) as ConvexUsersResponse;
    allUsers.push(...(data.page || []));
    cursor = data.continueCursor || null;
    hasMore = !data.isDone && cursor !== null;
  }

  if (USER_FILTER) {
    return allUsers.filter((user) => user.id === USER_FILTER);
  }

  return allUsers;
}

async function fetchRevenueCatSubscriber(
  appUserId: string,
): Promise<RevenueCatSubscriber | null> {
  const url = `${REVENUECAT_HOST}/v1/subscribers/${encodeURIComponent(appUserId)}`;
  const response = await fetch(url, {
    headers: {
      Authorization: `Bearer ${REVENUECAT_API_KEY}`,
      "Content-Type": "application/json",
    },
  });

  if (response.status === 404) {
    return null;
  }

  if (!response.ok) {
    const errorText = await response.text();
    throw new Error(
      `Failed to fetch RevenueCat subscriber ${appUserId}: ${response.status} ${errorText}`,
    );
  }

  const data = (await response.json()) as RevenueCatSubscriberResponse;
  return data.subscriber ?? null;
}

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
    body: JSON.stringify({ ids: [secondaryDistinctId] }),
  });

  if (!response.ok) {
    const errorText = await response.text();
    throw new Error(
      `Failed to merge ${secondaryDistinctId} into ${primaryDistinctId}: ${response.status} ${errorText}`,
    );
  }
}

function extractAnonymousIds(subscriber: RevenueCatSubscriber): string[] {
  const anonymousIds = new Set<string>();

  if (subscriber.original_app_user_id?.startsWith("$RCAnonymousID:")) {
    anonymousIds.add(subscriber.original_app_user_id);
  }

  for (const alias of subscriber.aliases ?? []) {
    if (alias.startsWith("$RCAnonymousID:")) {
      anonymousIds.add(alias);
    }
  }

  return Array.from(anonymousIds.values());
}

function resolveTargetDistinctId(
  subscriber: RevenueCatSubscriber,
  fallbackDistinctId: string,
): string {
  const attributes = subscriber.attributes ?? {};
  const candidateKeys = [
    "$posthogUserId",
    "$posthog_user_id",
    "$posthogDistinctId",
    "$posthog_distinct_id",
    "posthogUserId",
  ];

  for (const key of candidateKeys) {
    const value = attributes[key]?.value;
    if (value && typeof value === "string" && value.trim().length > 0) {
      return value;
    }
  }

  return fallbackDistinctId;
}

async function backfillRevenueCatAliases() {
  console.log(
    `Starting RevenueCat → PostHog alias backfill${
      DRY_RUN ? " (DRY RUN)" : ""
    }${USER_FILTER ? ` for ${USER_FILTER}` : ""}...`,
  );

  try {
    const users = await fetchUsersFromConvex();
    console.log(`Found ${users.length} user(s) to inspect`);

    let processed = 0;
    let merged = 0;
    let skipped = 0;
    let errors = 0;

    for (const user of users) {
      processed++;
      console.log(`\n[${processed}/${users.length}] Processing ${user.id}`);

      try {
        const subscriber = await fetchRevenueCatSubscriber(user.id);

        if (!subscriber) {
          console.log("  No RevenueCat subscriber found, skipping");
          skipped++;
          continue;
        }

        const targetDistinctId = resolveTargetDistinctId(subscriber, user.id);

        let primaryDistinctId = targetDistinctId;
        let primaryPerson = await getPostHogPerson(primaryDistinctId);

        if (!primaryPerson && primaryDistinctId !== user.id) {
          console.log(
            `  No PostHog person for ${primaryDistinctId}, falling back to ${user.id}`,
          );
          primaryDistinctId = user.id;
          primaryPerson = await getPostHogPerson(primaryDistinctId);
        }

        if (!primaryPerson) {
          console.log(
            `  No PostHog person found for ${primaryDistinctId}, skipping`,
          );
          skipped++;
          continue;
        }

        const anonymousIds = extractAnonymousIds(subscriber);

        if (anonymousIds.length === 0) {
          console.log("  No anonymous RevenueCat IDs found to merge");
          skipped++;
          continue;
        }

        for (const anonymousId of anonymousIds) {
          if (anonymousId === primaryDistinctId) {
            console.log(
              `  Anonymous ID ${anonymousId} already matches primary distinct id`,
            );
            continue;
          }

          const aliasPerson = await getPostHogPerson(anonymousId);
          if (!aliasPerson) {
            console.log(
              `  No PostHog person found for anonymous ID ${anonymousId}, skipping`,
            );
            continue;
          }

          console.log(
            `  Merging anonymous ${anonymousId} into ${primaryDistinctId}`,
          );
          await mergePersons(primaryDistinctId, anonymousId);
          merged++;
        }
      } catch (error) {
        console.error(`  Error processing user ${user.id}:`, error);
        errors++;
      }
    }

    console.log("\n=== Backfill Complete ===");
    console.log(`Processed: ${processed}`);
    console.log(`Merged: ${merged}`);
    console.log(`Skipped: ${skipped}`);
    console.log(`Errors: ${errors}`);
  } catch (error) {
    console.error("Fatal error during backfill:", error);
    process.exit(1);
  }
}

void backfillRevenueCatAliases();
