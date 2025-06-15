import { ConvexHttpClient } from "convex/browser";

import { db } from "@soonlist/db";
import { users } from "@soonlist/db/schema";

import { api } from "../_generated/api";

/**
 * Migration script to sync existing users from MySQL to Convex
 * Run this after deploying the user sync functionality
 *
 * Usage: pnpm tsx packages/backend/convex/migrations/syncExistingUsers.ts
 */
async function syncExistingUsers() {
  const convexUrl = process.env.NEXT_PUBLIC_CONVEX_URL;
  if (!convexUrl) {
    throw new Error("NEXT_PUBLIC_CONVEX_URL not set");
  }

  const client = new ConvexHttpClient(convexUrl);

  try {
    // Fetch all users from MySQL
    const existingUsers = await db.select().from(users);

    console.log(`Found ${existingUsers.length} users to sync`);

    // Process users in batches of 50 to avoid overwhelming the system
    const batchSize = 50;
    const batches = [];

    for (let i = 0; i < existingUsers.length; i += batchSize) {
      batches.push(existingUsers.slice(i, i + batchSize));
    }

    console.log(
      `Processing ${batches.length} batches of up to ${batchSize} users each`,
    );

    let totalSynced = 0;
    let totalFailed = 0;

    for (let i = 0; i < batches.length; i++) {
      const batch = batches[i];
      console.log(`Processing batch ${i + 1}/${batches.length}...`);

      const batchData = batch.map((user) => ({
        id: user.id,
        username: user.username,
        email: user.email,
        displayName: user.displayName,
        userImage: user.userImage,
        publicMetadata: user.publicMetadata as
          | Record<string, unknown>
          | undefined,
      }));

      try {
        const results = await client.action(api.users.syncMultipleUsers, {
          users: batchData,
        });

        const succeeded = results.filter((r) => r.success).length;
        const failed = results.filter((r) => !r.success).length;

        totalSynced += succeeded;
        totalFailed += failed;

        console.log(`Batch ${i + 1}: ${succeeded} succeeded, ${failed} failed`);

        // Log any failures
        results
          .filter((r) => !r.success)
          .forEach((r) =>
            console.error(`Failed to sync user ${r.userId}: ${r.error}`),
          );
      } catch (error) {
        console.error(`Failed to process batch ${i + 1}:`, error);
        totalFailed += batch.length;
      }
    }

    console.log("\nMigration completed:");
    console.log(`Total users synced: ${totalSynced}`);
    console.log(`Total users failed: ${totalFailed}`);
  } catch (error) {
    console.error("Failed to sync users:", error);
    process.exit(1);
  }
}

// Run the migration
if (require.main === module) {
  syncExistingUsers()
    .then(() => process.exit(0))
    .catch((error) => {
      console.error(error);
      process.exit(1);
    });
}

export { syncExistingUsers };
