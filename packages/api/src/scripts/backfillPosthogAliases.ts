#!/usr/bin/env node

/**
 * PostHog Backfill Script
 *
 * This script backfills PostHog aliases for users who converted from guest to identified
 * without proper aliasing. It merges anonymous persons into identified user persons.
 *
 * Usage:
 *   POSTHOG_PERSONAL_API_KEY=your_key CONVEX_URL=your_url node backfillPosthogAliases.ts [--dry-run]
 *
 * Environment Variables:
 *   POSTHOG_PERSONAL_API_KEY - PostHog Personal API Key (required)
 *   CONVEX_URL - Convex deployment URL (required)
 *   CONVEX_URL_PATH - Optional path to PostHog backfill endpoint (default: /posthog/backfill)
 */

const POSTHOG_HOST = process.env.POSTHOG_HOST || "https://us.i.posthog.com";
const POSTHOG_PERSONAL_API_KEY = process.env.POSTHOG_PERSONAL_API_KEY;
const CONVEX_URL = process.env.CONVEX_URL;
const CONVEX_URL_PATH = process.env.CONVEX_URL_PATH || "/posthog/backfill";
const DRY_RUN = process.argv.includes("--dry-run");

if (!POSTHOG_PERSONAL_API_KEY) {
  console.error(
    "Error: POSTHOG_PERSONAL_API_KEY environment variable is required",
  );
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

interface PostHogPerson {
  distinct_id: string;
  properties: {
    email?: string;
    username?: string;
    $anon_distinct_id?: string;
  };
}

interface PostHogPersonsResponse {
  results: PostHogPerson[];
  next?: string;
}

interface ConvexUsersResponse {
  page: User[];
  continueCursor: string | null;
  isDone: boolean;
}

/**
 * Fetch users from Convex via HTTP endpoint
 */
async function fetchUsersFromConvex(): Promise<User[]> {
  const allUsers: User[] = [];
  let cursor: string | null = null;
  let hasMore = true;

  console.log("Fetching users from Convex...");

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

    console.log(`  Fetched ${allUsers.length} users so far...`);
  }

  return allUsers;
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
 * Search for PostHog persons by property
 */
async function searchPostHogPersons(
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
 * Main backfill function
 */
async function backfillAliases() {
  console.log(
    `Starting PostHog alias backfill${DRY_RUN ? " (DRY RUN)" : ""}...`,
  );

  try {
    const users = await fetchUsersFromConvex();
    console.log(`Found ${users.length} users to process`);

    let processed = 0;
    let merged = 0;
    let skipped = 0;
    let errors = 0;

    for (const user of users) {
      processed++;
      console.log(
        `\n[${processed}/${users.length}] Processing user ${user.id}...`,
      );

      try {
        // Get the identified person for this user
        const identifiedPerson = await getPostHogPerson(user.id);

        if (!identifiedPerson) {
          console.log(`  No identified person found for ${user.id}, skipping`);
          skipped++;
          continue;
        }

        // Find anonymous persons that might belong to this user
        // We'll search by email if available, or look for persons with this user's ID as an alias
        const anonymousPersons: PostHogPerson[] = [];

        if (user.email) {
          const emailPersons = await searchPostHogPersons("email", user.email);
          anonymousPersons.push(
            ...emailPersons.filter((p) => p.distinct_id !== user.id),
          );
        }

        // Also check for persons with $anon_distinct_id matching patterns
        // This is a heuristic - PostHog doesn't expose this directly via API search
        // So we rely on email matching primarily

        // Merge anonymous persons into the identified person
        for (const anonPerson of anonymousPersons) {
          if (anonPerson.distinct_id === user.id) continue;

          console.log(
            `  Found anonymous person ${anonPerson.distinct_id} to merge`,
          );
          await mergePersons(user.id, anonPerson.distinct_id);
          merged++;
        }

        if (anonymousPersons.length === 0) {
          console.log(`  No anonymous persons found to merge`);
          skipped++;
        }
      } catch (error) {
        console.error(`  Error processing user ${user.id}:`, error);
        errors++;
      }
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
void backfillAliases();
