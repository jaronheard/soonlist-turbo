import type { CoreMessage } from "ai";
import { createOpenAI } from "@ai-sdk/openai";
import { generateObject } from "ai";
import { z } from "zod";

/**
 * Represents a single Instagram post's data
 */
export interface InstagramPost {
  url: string;
  caption: string;
  timestamp: string;
  imageUrl?: string;
  type: "image" | "video" | "carousel" | "unknown";
}

/**
 * Result of classifying whether a post is an event
 */
export interface ClassificationResult {
  isEvent: boolean;
  confidence: number;
  reason: string;
}

// AI config for event classification (lightweight, fast)
const CLASSIFICATION_MODEL = "google/gemini-2.5-flash:nitro";

const ClassificationSchema = z.object({
  isEvent: z
    .boolean()
    .describe("Whether this post is about a specific, attendable event"),
  confidence: z.number().min(0).max(1).describe("Confidence score from 0 to 1"),
  reason: z
    .string()
    .describe("Brief explanation of why this is or isn't an event"),
});

/**
 * Classify whether an Instagram post caption describes an event.
 * This is a lightweight AI call (short prompt, boolean output) to avoid
 * wasting tokens on non-event posts.
 * Requires OPENROUTER_API_KEY and OPENROUTER_BASE_URL environment variables.
 */
export async function classifyPostAsEvent(
  caption: string,
): Promise<ClassificationResult> {
  const apiKey = process.env.OPENROUTER_API_KEY;
  if (!apiKey) {
    throw new Error(
      "OPENROUTER_API_KEY environment variable is required for event classification",
    );
  }
  const baseURL = process.env.OPENROUTER_BASE_URL;
  if (!baseURL) {
    throw new Error(
      "OPENROUTER_BASE_URL environment variable is required for event classification",
    );
  }

  const openrouter = createOpenAI({ apiKey, baseURL });

  const messages: CoreMessage[] = [
    {
      role: "system",
      content: `You classify Instagram post captions as event announcements or not.
An "event" must have ALL of these characteristics:
1. A specific date or time (or strong temporal language like "this Saturday", "tomorrow night")
2. A physical or virtual location where people gather
3. Something people can attend or participate in

NOT events: Product launches, sales, general announcements, motivational quotes, personal updates, food photos, memes, art posts without a show/opening.

Return JSON with: isEvent (boolean), confidence (0-1), reason (brief explanation).
Return ONLY pure JSON, no markdown.`,
    },
    {
      role: "user",
      content: `Classify this Instagram post caption:\n\n"""${caption}"""`,
    },
  ];

  const result = await generateObject({
    model: openrouter(CLASSIFICATION_MODEL),
    messages,
    schema: ClassificationSchema,
    temperature: 0.1,
    maxRetries: 1,
  });

  return result.object;
}

/**
 * Fetch an Instagram profile's recent posts using Apify.
 * Requires APIFY_API_TOKEN environment variable.
 */
export async function fetchInstagramPosts(
  username: string,
  maxPosts = 12,
): Promise<InstagramPost[]> {
  const apiToken = process.env.APIFY_API_TOKEN;
  if (!apiToken) {
    throw new Error(
      "APIFY_API_TOKEN environment variable is required for Instagram scraping",
    );
  }

  // Use Apify's Instagram Profile Scraper actor
  const response = await fetch(
    `https://api.apify.com/v2/acts/apify~instagram-profile-scraper/run-sync-get-dataset-items?token=${encodeURIComponent(apiToken)}`,
    {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        usernames: [username],
        resultsLimit: maxPosts,
        resultsType: "posts",
      }),
    },
  );

  if (!response.ok) {
    const errorText = await response.text();
    throw new Error(
      `Apify API error (${response.status}): ${errorText.slice(0, 200)}`,
    );
  }

  const rawItems = (await response.json()) as ApifyInstagramPost[];

  return rawItems
    .map((item) => ({
      url: item.url || `https://www.instagram.com/p/${item.shortCode || ""}`,
      caption: item.caption || "",
      timestamp: item.timestamp || new Date().toISOString(),
      imageUrl: item.displayUrl || item.imageUrl,
      type: mapPostType(item.type),
    }))
    .sort(
      (a, b) =>
        new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime(),
    );
}

// Apify response shape (subset of fields we use)
interface ApifyInstagramPost {
  url?: string;
  shortCode?: string;
  caption?: string;
  timestamp?: string;
  displayUrl?: string;
  imageUrl?: string;
  type?: string;
}

function mapPostType(
  type: string | undefined,
): "image" | "video" | "carousel" | "unknown" {
  switch (type) {
    case "Image":
    case "Sidecar":
      return type === "Image" ? "image" : "carousel";
    case "Video":
      return "video";
    default:
      return "unknown";
  }
}

/**
 * Fetch a single Instagram post's content by URL.
 * Uses Jina Reader API (already integrated in the codebase) as a fallback
 * when Apify is not available.
 */
export async function fetchSinglePostViaJina(
  url: string,
): Promise<string | null> {
  const response = await fetch(`https://r.jina.ai/${url}`, {
    method: "GET",
  });

  if (!response.ok) {
    return null;
  }

  return response.text();
}

/**
 * Extract mentions from an Instagram caption.
 * Returns usernames without the @ symbol.
 */
export function extractMentionsFromCaption(caption: string): string[] {
  const mentions: string[] = [];
  for (const match of caption.matchAll(/@([a-zA-Z0-9._]+)/g)) {
    const username = match[1];
    if (username && !mentions.includes(username)) {
      mentions.push(username);
    }
  }
  return mentions;
}

/**
 * Sanitize and validate an Instagram username.
 * Returns the cleaned username or null if invalid.
 */
export function sanitizeInstagramUsername(input: string): string | null {
  // Remove @ prefix if present
  let username = input.trim().replace(/^@/, "");

  // Handle full URL input
  const urlMatch = /instagram\.com\/([a-zA-Z0-9._]+)/.exec(username);
  if (urlMatch?.[1]) {
    username = urlMatch[1];
  }

  // Validate: Instagram usernames are 1-30 chars, alphanumeric + . and _
  if (!/^[a-zA-Z0-9._]{1,30}$/.test(username)) {
    return null;
  }

  return username.toLowerCase();
}
