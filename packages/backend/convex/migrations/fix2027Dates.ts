import { v } from "convex/values";

import { internalMutation, internalQuery } from "../_generated/server";

/**
 * Migration to fix events that incorrectly have 2027 dates instead of 2026.
 *
 * Usage:
 * 1. Run dry run first to review changes:
 *    npx convex run migrations/fix2027Dates:dryRun
 *
 * 2. After reviewing, run the actual migration:
 *    npx convex run migrations/fix2027Dates:migrate
 */

// Helper to replace 2027 with 2026 in date strings
function fixYear(dateStr: string): string {
  return dateStr.replace(/2027/g, "2026");
}

function fixYearOptional(dateStr: string | undefined): string | undefined {
  if (!dateStr) return dateStr;
  return dateStr.replace(/2027/g, "2026");
}

export const dryRun = internalQuery({
  args: {},
  handler: async (ctx) => {
    // Find all events with 2027 in their dates
    const allEvents = await ctx.db.query("events").collect();

    const affectedEvents = allEvents.filter((event) => {
      const has2027 =
        event.startDateTime.includes("2027") ||
        event.endDateTime.includes("2027") ||
        event.startDate?.includes("2027") ||
        event.endDate?.includes("2027");
      return has2027;
    });

    const changes = affectedEvents.map((event) => ({
      _id: event._id,
      userId: event.userId,
      userName: event.userName,
      name: event.name,
      image: event.image,
      current: {
        startDateTime: event.startDateTime,
        endDateTime: event.endDateTime,
        startDate: event.startDate,
        endDate: event.endDate,
      },
      proposed: {
        startDateTime: fixYear(event.startDateTime),
        endDateTime: fixYear(event.endDateTime),
        startDate: fixYearOptional(event.startDate),
        endDate: fixYearOptional(event.endDate),
      },
    }));

    return {
      totalAffected: changes.length,
      uniqueUsers: [...new Set(changes.map((c) => c.userId))].length,
      events: changes,
    };
  },
});

export const migrate = internalMutation({
  args: {
    dryRun: v.optional(v.boolean()),
  },
  handler: async (ctx, args) => {
    const isDryRun = args.dryRun ?? false;

    // Find all events with 2027 in their dates
    const allEvents = await ctx.db.query("events").collect();

    const affectedEvents = allEvents.filter((event) => {
      const has2027 =
        event.startDateTime.includes("2027") ||
        event.endDateTime.includes("2027") ||
        event.startDate?.includes("2027") ||
        event.endDate?.includes("2027");
      return has2027;
    });

    const results = [];

    for (const event of affectedEvents) {
      const updates: Record<string, unknown> = {};

      if (event.startDateTime.includes("2027")) {
        updates.startDateTime = fixYear(event.startDateTime);
      }
      if (event.endDateTime.includes("2027")) {
        updates.endDateTime = fixYear(event.endDateTime);
      }
      if (event.startDate?.includes("2027")) {
        updates.startDate = fixYearOptional(event.startDate);
      }
      if (event.endDate?.includes("2027")) {
        updates.endDate = fixYearOptional(event.endDate);
      }

      // Also fix the nested event object if it exists
      if (event.event && typeof event.event === "object") {
        const eventStr = JSON.stringify(event.event);
        if (eventStr.includes("2027")) {
          updates.event = JSON.parse(
            eventStr.replace(/2027/g, "2026"),
          ) as unknown;
        }
      }

      if (!isDryRun) {
        await ctx.db.patch(event._id, {
          ...updates,
          updatedAt: new Date().toISOString(),
        });
      }

      results.push({
        _id: event._id,
        name: event.name,
        image: event.image,
        updated: !isDryRun,
        changes: updates,
      });
    }

    return {
      mode: isDryRun ? "DRY RUN" : "MIGRATED",
      totalAffected: results.length,
      events: results,
    };
  },
});
