"use node";

import { ConvexError } from "convex/values";

import type { EventWithMetadata } from "@soonlist/cal";
import { EventWithMetadataSchema } from "@soonlist/cal";

import type { ActionCtx } from "../_generated/server";
import { safeStringify } from "../utils";
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

    // eslint-disable-next-line @typescript-eslint/consistent-type-assertions
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
    throw new ConvexError({
      message:
        error instanceof Error
          ? error.message
          : "Unknown error occurred while processing image event",
      data: { input },
    });
  }
}
/**
 * Generate structured event data from URL using AI
 * Extracted from eventFromUrlThenCreateThenNotification in ai router
 */

export async function processEventFromUrl(
  ctx: ActionCtx,
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

    // Validate that we have at least one event
    if (events.length === 0) {
      throw new ConvexError({
        message: "No events found in response",
        data: { input },
      });
    }

    const validatedEvent = validateEvent(events[0]);

    return {
      events,
      validatedEvent,
    };
  } catch (error) {
    console.error("Error in processEventFromUrl:", error); // Log the actual error
    throw new ConvexError({
      message:
        error instanceof Error
          ? error.message
          : "Unknown error occurred while processing URL event",
      data: { input },
    });
  }
}
/**
 * Generate structured event data from raw text using AI
 * Extracted from eventFromRawTextThenCreateThenNotification in ai router
 */

export async function processEventFromText(
  ctx: ActionCtx,
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

    // Validate that we have at least one event
    if (events.length === 0) {
      throw new ConvexError({
        message: "No events found in response",
        data: { input },
      });
    }

    const validatedEvent = validateEvent(events[0]);

    return {
      events,
      validatedEvent,
    };
  } catch (error) {
    console.error("Error in processEventFromText:", error); // Log the actual error
    throw new ConvexError({
      message:
        error instanceof Error
          ? error.message
          : "Unknown error occurred while processing text event",
      data: { input },
    });
  }
}

export function validateEvent(event: unknown) {
  if (!event) {
    throw new ConvexError({
      message: "No event provided for validation",
      data: {
        event: safeStringify(event),
      },
    });
  }

  let validatedEvent: EventWithMetadata;
  try {
    validatedEvent = EventWithMetadataSchema.parse(event);
  } catch (e) {
    // If Zod parsing fails, it's invalid event data
    if (e instanceof Error) {
      // You could log e.message here if more detail is needed for debugging
      console.error("Zod validation failed:", e.message);
    }

    const originalEventString = safeStringify(event);

    throw new ConvexError({
      message: "Invalid event data received: Failed basic structure validation",
      data: {
        parseError: e instanceof Error ? e.message : String(e),
        originalEvent: originalEventString,
        errorName: e instanceof Error ? e.name : "UnknownError",
      },
    });
  }

  // 1. Check if event has proper date/time information
  if (
    !validatedEvent.startDate ||
    validatedEvent.startDate === "TBD" ||
    validatedEvent.startDate === "Unknown" ||
    validatedEvent.startDate === "" ||
    validatedEvent.startDate.toLowerCase().includes("error")
  ) {
    const eventString = safeStringify(event);

    throw new ConvexError({
      message: "Event validation failed: Event lacks valid date information",
      data: { event: eventString },
    });
  }

  // 2. Check for extremely generic event names that suggest hallucination
  const name = validatedEvent.name.toLowerCase() || "";
  const description = validatedEvent.description.toLowerCase() || "";

  // Invalid names (exact matches)
  const invalidNames = [
    "title",
    "name",
    "event name",
    "event title",
    "event description",
  ];

  // Very specific patterns that indicate the AI made something up from error/test content
  const invalidPatterns = [
    "paramvalidationerror",
    "domain resolution error",
    "domains could not be resolved",
    "domain could not be resolved",
    "domain resolution error",
    "robots.txt",
    "error page",
    "page not found",
    "server error",
    "httpbin test",
    "example page",
    "test content",
    "http error",
  ];

  const isInvalidName = invalidNames.some((invalid) => name.includes(invalid));

  const isInvalidPattern = invalidPatterns.some(
    (invalid) => name.includes(invalid) || description.includes(invalid),
  );

  const isTooShort = name.trim().length < 3;

  if (isInvalidName || isTooShort || isInvalidPattern) {
    const eventString = safeStringify(event);

    throw new ConvexError({
      message:
        "Event validation failed: Event appears to be hallucinated from non-event content",
      data: { event: eventString },
    });
  }

  // If all checks pass, return the Zod-validated event
  return validatedEvent;
}
