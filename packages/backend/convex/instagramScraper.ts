import type { Id } from "./_generated/dataModel";
import { internal } from "./_generated/api";
import { internalAction } from "./_generated/server";
import { v } from "convex/values";

import { DEFAULT_TIMEZONE } from "./constants";
import {
  classifyPostAsEvent,
  fetchInstagramPosts,
  extractMentionsFromCaption,
} from "./model/instagramHelpers";
import { fetchAndProcessEvent } from "./model/aiHelpers";

/**
 * Process a single Instagram source: fetch posts, classify, extract events.
 */
export const processSource = internalAction({
  args: {
    sourceId: v.id("instagramSources"),
  },
  handler: async (ctx, args) => {
    // Get source details
    const source = await ctx.runQuery(
      internal.instagramSources.getSource,
      { sourceId: args.sourceId },
    );

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

      // Step 2: Process each post
      for (const post of posts) {
        // Skip posts we've already processed
        const alreadyProcessed = await ctx.runQuery(
          internal.instagramSources.isPostProcessed,
          { sourceId: args.sourceId, postUrl: post.url },
        );

        if (alreadyProcessed) {
          continue;
        }

        // Skip posts with empty captions
        if (!post.caption || post.caption.trim().length < 10) {
          await ctx.runMutation(internal.instagramSources.recordProcessedPost, {
            sourceId: args.sourceId,
            postUrl: post.url,
            postTimestamp: post.timestamp,
            isEvent: false,
          });
          postsChecked++;
          continue;
        }

        // Step 2a: Classify if this post is about an event
        const classification = await classifyPostAsEvent(post.caption);
        postsChecked++;

        if (!classification.isEvent || classification.confidence < 0.7) {
          // Not an event, record and skip
          await ctx.runMutation(internal.instagramSources.recordProcessedPost, {
            sourceId: args.sourceId,
            postUrl: post.url,
            postTimestamp: post.timestamp,
            isEvent: false,
          });
          continue;
        }

        // Step 2b: Extract event details using the existing AI pipeline
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
            const eventId = await ctx.runMutation(
              internal.events.insertEvent,
              {
                firstEvent: enrichedEvent,
                uploadedImageUrl: post.imageUrl ?? null,
                userId: source.userId,
                username: user?.username ?? source.userId,
                timezone,
                lists: [],
                visibility: "private",
              },
            );

            await ctx.runMutation(
              internal.instagramSources.recordProcessedPost,
              {
                sourceId: args.sourceId,
                postUrl: post.url,
                postTimestamp: post.timestamp,
                isEvent: true,
                eventId,
              },
            );

            eventsFound++;
          } else {
            await ctx.runMutation(
              internal.instagramSources.recordProcessedPost,
              {
                sourceId: args.sourceId,
                postUrl: post.url,
                postTimestamp: post.timestamp,
                isEvent: false,
              },
            );
          }
        } catch (error) {
          console.error(
            `Error extracting event from post ${post.url}:`,
            error,
          );
          // Record the post as processed but not an event to avoid re-processing
          await ctx.runMutation(
            internal.instagramSources.recordProcessedPost,
            {
              sourceId: args.sourceId,
              postUrl: post.url,
              postTimestamp: post.timestamp,
              isEvent: false,
            },
          );
        }
      }

      // Step 3: Update source status
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
      await ctx.scheduler.runAfter(
        0,
        internal.instagramScraper.processSource,
        { sourceId: source._id as Id<"instagramSources"> },
      );
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
