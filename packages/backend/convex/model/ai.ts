"use node";

import { Buffer } from "buffer";
import { ConvexError } from "convex/values";

import { EventWithMetadata, EventWithMetadataSchema } from "@soonlist/cal";

import type { ActionCtx, MutationCtx, QueryCtx } from "../_generated/server";
import { fetchAndProcessEvent } from "./aiHelpers";

export interface GenerateTextParams {
  prompt: string;
  temperature?: number;
  maxTokens?: number;
  model?: string;
}

interface AnthropicResponse {
  content: {
    type: string;
    text: string;
  }[];
}
export interface ProcessedEventResponse {
  events: EventWithMetadata[];
  response: string;
}

export interface AIEventResponse {
  success: boolean;
  eventId?: string;
  event?: unknown;
  error?: string;
}

export interface AIErrorResponse {
  success: boolean;
  error?: string;
}

/**
 * Generate text using Anthropic's Claude model via direct API call
 */
export async function generateText({
  prompt,
  temperature = 0,
  maxTokens = 1000,
  model = "claude-3-5-sonnet-20240620",
}: GenerateTextParams): Promise<string> {
  const apiKey = process.env.ANTHROPIC_API_KEY;

  if (!apiKey) {
    throw new Error("ANTHROPIC_API_KEY environment variable is not set");
  }

  try {
    const response = await fetch("https://api.anthropic.com/v1/messages", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "x-api-key": apiKey,
        "anthropic-version": "2023-06-01",
      },
      body: JSON.stringify({
        model,
        max_tokens: maxTokens,
        temperature,
        messages: [
          {
            role: "user",
            content: prompt,
          },
        ],
      }),
    });

    if (!response.ok) {
      throw new Error(
        `Anthropic API error: ${response.status} ${response.statusText}`,
      );
    }

    const result = (await response.json()) as AnthropicResponse;

    const textContent = result.content.find(
      (content) => content.type === "text",
    );

    if (!textContent) {
      throw new Error("No text content found in response");
    }

    return textContent.text;
  } catch (error) {
    console.error("Error generating text with Anthropic:", error);
    throw error instanceof Error ? error : new Error("Unknown error occurred");
  }
}

/**
 * Upload base64 image to CDN
 */
export async function uploadImageToCDNFromBase64(
  base64Image: string,
): Promise<string | null> {
  try {
    if (!base64Image || typeof base64Image !== "string") {
      console.error("Invalid base64 string format");
      return null;
    }

    const base64Data = base64Image.replace(/^data:image\/\w+;base64,/, "");

    // Convert base64 string to Buffer
    const imageBuffer = Buffer.from(base64Data, "base64");

    const response = await fetch(
      "https://api.bytescale.com/v2/accounts/12a1yek/uploads/binary",
      {
        method: "POST",
        headers: {
          "Content-Type": "image/webp",
          Authorization: "Bearer public_12a1yekATNiLj4VVnREZ8c7LM8V8",
        },
        body: imageBuffer,
      },
    );

    if (!response.ok) {
      const errorBody = await response.text();
      console.error(
        `Upload failed with status ${response.status}: ${errorBody}`,
      );
      return null;
    }

    const parsedResponse = (await response.json()) as { fileUrl: string };
    return parsedResponse.fileUrl;
  } catch (error) {
    console.error("Error uploading image to CDN:", error);
    return null;
  }
}

/**
 * Get day bounds for a given timezone
 */
export function getDayBounds(_timezone: string) {
  const now = new Date();
  const startOfDay = new Date(now);
  startOfDay.setHours(0, 0, 0, 0);

  const endOfDay = new Date(now);
  endOfDay.setHours(23, 59, 59, 999);

  return {
    start: startOfDay,
    end: endOfDay,
  };
} /**
 * Generate structured event data from base64 image using AI
 * Extracted from eventFromImageBase64ThenCreate in ai router
 */

export async function processEventFromBase64Image(
  ctx: ActionCtx,
  input: {
    base64Image: string;
    timezone: string;
  },
): Promise<{
  events: EventWithMetadata[];
  response: string;
}> {
  try {
    const aiResult = await fetchAndProcessEvent({
      ctx,
      input,
      fnName: "eventFromImageBase64ThenCreate",
    });

    return aiResult;
  } catch (error) {
    console.error("Error in processEventFromBase64Image:", error); // Log the actual error
    throw new ConvexError(
      error instanceof Error
        ? error.message
        : "Unknown error occurred while processing image event",
    );
  }
}
/**
 * Generate structured event data from URL using AI
 * Extracted from eventFromUrlThenCreateThenNotification in ai router
 */

export async function processEventFromUrl(
  ctx: QueryCtx | MutationCtx,
  input: {
    url: string;
    timezone: string;
    userId: string;
    username: string;
    comment?: string;
    lists: { value: string }[];
    visibility?: "public" | "private";
    sendNotification?: boolean;
  },
): Promise<{
  events: EventWithMetadata[];
  validatedEvent: EventWithMetadata;
}> {
  try {
    const { events } = await fetchAndProcessEvent({
      ctx,
      input,
      fnName: "eventFromUrlThenCreateThenNotification",
    });

    const validatedEvent = validateFirstEvent(events);

    return {
      events,
      validatedEvent,
    };
  } catch (error) {
    console.error("Error in processEventFromUrl:", error); // Log the actual error
    throw new ConvexError(
      error instanceof Error
        ? error.message
        : "Unknown error occurred while processing URL event",
    );
  }
}
/**
 * Generate structured event data from raw text using AI
 * Extracted from eventFromRawTextThenCreateThenNotification in ai router
 */

export async function processEventFromText(
  ctx: QueryCtx | MutationCtx,
  input: {
    rawText: string;
    timezone: string;
    userId: string;
    username: string;
    comment?: string;
    lists: { value: string }[];
    visibility?: "public" | "private";
    sendNotification?: boolean;
  },
): Promise<{
  events: EventWithMetadata[];
  validatedEvent: EventWithMetadata;
}> {
  try {
    const { events } = await fetchAndProcessEvent({
      ctx,
      input,
      fnName: "eventFromRawTextThenCreateThenNotification",
    });

    const validatedEvent = validateFirstEvent(events);

    return {
      events,
      validatedEvent,
    };
  } catch (error) {
    console.error("Error in processEventFromText:", error); // Log the actual error
    throw new ConvexError(
      error instanceof Error
        ? error.message
        : "Unknown error occurred while processing text event",
    );
  }
}

export function validateFirstEvent(events: unknown[]) {
  if (!events.length) {
    throw new ConvexError("No events found in response");
  }

  try {
    // This will throw if validation fails
    const validatedEvent = EventWithMetadataSchema.parse(events[0]);
    return validatedEvent;
  } catch (error) {
    throw new ConvexError("Invalid event data received");
  }
}
