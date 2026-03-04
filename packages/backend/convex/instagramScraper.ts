import { v } from "convex/values";

import type { Id } from "./_generated/dataModel";
import { internal } from "./_generated/api";
import { internalAction } from "./_generated/server";
import { DEFAULT_TIMEZONE } from "./constants";
import { fetchAndProcessEvent } from "./model/aiHelpers";
import {
  classifyPostAsEvent,
  extractMentionsFromCaption,
  fetchInstagramPosts,
} from "./model/instagramHelpers";

/**
 * Process a single Instagram source: fetch posts, classify, extract events.
 */
export const processSource = internalAction({
  args: {
    sourceId: v.id("instagramSources"),
  },
  returns: v.null(),
  handler: async (ctx, args) => {
    // Get source details
    const source = await ctx.runQuery(internal.instagramSources.getSource, {
      sourceId: args.sourceId,
    });

    if (!source || source.status === "paused") {
      return;
    }

    // Get the user to find their timezone
    const user = await ctx.runQuery(internal.users.getByCustomId, {
      id: source.userId,
    });
    const timezone = DEFAULT_TIMEZONE; // Could be user-specific if stored

    let postsChecked = 0;
    let eventsFound = 0;
    let latestPostTimestamp: string | undefined;

    try {
      // Step 1: Fetch recent posts from Instagram
      const posts = await fetchInstagramPosts(source.username, 12);

      if (posts.length === 0) {
        await ctx.runMutation(internal.instagramSources.updateAfterCheck, {
          sourceId: args.sourceId,
          postsChecked: 0,
          eventsFound: 0,
        });
        return;
      }

      // Track the latest post timestamp for next check
      latestPostTimestamp = posts[0]?.timestamp;

      // Step 2: Atomically claim unprocessed posts before doing any work.
      // This prevents concurrent scrapes of the same source from both seeing a
      // post as unprocessed and inserting duplicate events. The claim mutation
      // is transactional in Convex (read + write in one mutation), so the first
      // concurrent run to reach a post wins the claim. Subsequent runs see it
      // as already processed and skip it.
      const claimedUrls = await ctx.runMutation(
        internal.instagramSources.claimUnprocessedPosts,
        {
          sourceId: args.sourceId,
          postUrls: posts.map((p) => ({
            url: p.url,
            timestamp: p.timestamp,
          })),
        },
      );

      const claimedUrlSet = new Set(claimedUrls);

      // Step 3: Process only the posts we successfully claimed
      for (const post of posts) {
        if (!claimedUrlSet.has(post.url)) {
          // Already processed by a previous or concurrent run – skip
          continue;
        }

        // Skip posts with empty captions (already claimed with isEvent=false placeholder)
        if (!post.caption || post.caption.trim().length < 10) {
          postsChecked++;
          continue;
        }

        // Step 3a: Classify if this post is about an event
        const classification = await classifyPostAsEvent(post.caption);
        postsChecked++;

        if (!classification.isEvent || classification.confidence < 0.7) {
          // Not an event – claimed placeholder already has isEvent=false
          continue;
        }

        // Step 3b: Extract event details using the existing AI pipeline
        try {
          const aiResult = await fetchAndProcessEvent({
            ctx,
            input: {
              rawText: buildEventExtractionInput(
                post.caption,
                source.username,
                post.url,
              ),
              timezone,
            },
            fnName: "instagramScraper",
          });

          if (aiResult.events.length > 0) {
            const firstEvent = aiResult.events[0];
            if (!firstEvent) continue;

            // Enrich with Instagram metadata
            const mentions = extractMentionsFromCaption(post.caption);
            const enrichedEvent = {
              ...firstEvent,
              eventMetadata: {
                platform: "instagram" as const,
                mentions: [source.username, ...mentions],
                sourceUrls: [post.url],
              },
            };

            // Get user info for event creation
            const eventId = await ctx.runMutation(internal.events.insertEvent, {
              firstEvent: enrichedEvent,
              uploadedImageUrl: post.imageUrl ?? null,
              userId: source.userId,
              username: user?.username ?? source.userId,
              timezone,
              lists: [],
              visibility: "private",
            });

            // Update the claimed placeholder with actual event details
            await ctx.runMutation(
              internal.instagramSources.updateProcessedPost,
              {
                sourceId: args.sourceId,
                postUrl: post.url,
                isEvent: true,
                eventId,
              },
            );

            eventsFound++;
          }
          // If no events extracted, the claimed placeholder (isEvent=false) is already correct
        } catch (error) {
          console.error(`Error extracting event from post ${post.url}:`, error);
          // Claimed placeholder already has isEvent=false, so no update needed.
          // The post won't be retried, which is acceptable for this prototype.
        }
      }

      // Step 4: Update source status
      await ctx.runMutation(internal.instagramSources.updateAfterCheck, {
        sourceId: args.sourceId,
        postsChecked,
        eventsFound,
        lastPostTimestamp: latestPostTimestamp,
      });
    } catch (error) {
      console.error(
        `Error processing Instagram source ${source.username}:`,
        error,
      );
      await ctx.runMutation(internal.instagramSources.updateAfterCheck, {
        sourceId: args.sourceId,
        postsChecked,
        eventsFound,
        error:
          error instanceof Error ? error.message : "Unknown error occurred",
      });
    }
  },
});

/**
 * Cron handler: check all due Instagram sources
 */
export const checkDueSources = internalAction({
  args: {},
  returns: v.null(),
  handler: async (ctx) => {
    const dueSources = await ctx.runQuery(
      internal.instagramSources.getDueSources,
    );

    if (dueSources.length === 0) {
      return;
    }

    // Process up to 5 sources per cron run to avoid timeouts
    const sourcesToProcess = dueSources.slice(0, 5);

    for (const source of sourcesToProcess) {
      // Schedule each source processing as a separate action
      // to avoid one failure blocking others
      await ctx.scheduler.runAfter(0, internal.instagramScraper.processSource, {
        sourceId: source._id as Id<"instagramSources">,
      });
    }
  },
});

/**
 * Build the text input for the AI event extraction pipeline.
 * Adds context about the source being an Instagram post.
 */
function buildEventExtractionInput(
  caption: string,
  username: string,
  postUrl: string,
): string {
  return `Instagram post by @${username} (${postUrl}):

${caption}`;
}
