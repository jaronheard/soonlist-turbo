"use node";

import { Buffer } from "buffer";
import { ConvexError } from "convex/values";

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

// Types for event processing
export interface EventData {
  name: string;
  startDate: string;
  endDate: string;
  startTime?: string;
  endTime?: string;
  timeZone?: string;
  location?: string;
  description?: string;
  images?: string[];
  [key: string]: unknown;
}

export interface EventMetadata {
  category?: string;
  tags?: string[];
  source?: string;
  confidence?: number;
  [key: string]: unknown;
}

export interface EventWithMetadata extends EventData {
  eventMetadata?: EventMetadata;
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
 * Generate structured event data from raw text using AI
 */
export async function processEventFromRawText(
  rawText: string,
  timezone: string,
): Promise<ProcessedEventResponse> {
  const prompt = `Extract event information from the following text and return it as a JSON object with the following structure:
{
  "events": [{
    "name": "Event Name",
    "startDate": "YYYY-MM-DD",
    "endDate": "YYYY-MM-DD", 
    "startTime": "HH:MM",
    "endTime": "HH:MM",
    "timeZone": "${timezone}",
    "location": "Event Location",
    "description": "Event Description",
    "images": []
  }],
  "eventMetadata": {
    "category": "category",
    "tags": ["tag1", "tag2"],
    "source": "text",
    "confidence": 0.9
  }
}

Text to process: ${rawText}`;

  try {
    const response = await generateText({
      prompt,
      temperature: 0.2,
      maxTokens: 2000,
    });

    const parsed = JSON.parse(response) as {
      events: EventData[];
      eventMetadata?: EventMetadata;
    };

    // Validate the response structure
    if (!parsed.events || !Array.isArray(parsed.events)) {
      throw new Error("Invalid response format: missing events array");
    }

    // Add metadata to each event
    const eventsWithMetadata: EventWithMetadata[] = parsed.events.map(
      (event: EventData) => ({
        ...event,
        eventMetadata: parsed.eventMetadata || {},
      }),
    );

    return {
      events: eventsWithMetadata,
      response,
    };
  } catch (error) {
    console.error("Error processing event from raw text:", error);
    throw new ConvexError("Failed to process event from text");
  }
}

/**
 * Generate structured event data from image URL using AI
 */
export async function processEventFromImage(
  imageUrl: string,
  timezone: string,
): Promise<ProcessedEventResponse> {
  const prompt = `Analyze this image and extract any event information. Return it as a JSON object with the following structure:
{
  "events": [{
    "name": "Event Name",
    "startDate": "YYYY-MM-DD",
    "endDate": "YYYY-MM-DD", 
    "startTime": "HH:MM",
    "endTime": "HH:MM",
    "timeZone": "${timezone}",
    "location": "Event Location",
    "description": "Event Description",
    "images": ["${imageUrl}"]
  }],
  "eventMetadata": {
    "category": "category",
    "tags": ["tag1", "tag2"],
    "source": "image",
    "confidence": 0.9
  }
}

If no event information can be extracted, return an empty events array.`;

  try {
    // For now, we'll use text-based processing since Anthropic's vision API
    // requires a different approach. This would need to be enhanced with
    // proper image analysis capabilities.
    const response = await generateText({
      prompt: `${prompt}\n\nImage URL: ${imageUrl}`,
      temperature: 0.2,
      maxTokens: 2000,
    });

    const parsed = JSON.parse(response) as {
      events: EventData[];
      eventMetadata?: EventMetadata;
    };

    if (!parsed.events || !Array.isArray(parsed.events)) {
      throw new Error("Invalid response format: missing events array");
    }

    const eventsWithMetadata: EventWithMetadata[] = parsed.events.map(
      (event: EventData) => ({
        ...event,
        eventMetadata: parsed.eventMetadata || {},
        images: [imageUrl], // Ensure the original image is included
      }),
    );

    return {
      events: eventsWithMetadata,
      response,
    };
  } catch (error) {
    console.error("Error processing event from image:", error);
    throw new ConvexError("Failed to process event from image");
  }
}

/**
 * Generate structured event data from base64 image using AI
 */
export async function processEventFromBase64Image(
  base64Image: string,
  timezone: string,
): Promise<ProcessedEventResponse> {
  // For now, we'll process this similarly to image URL
  // In a full implementation, you'd want to upload the base64 image first
  // and then process it, or use a vision API that accepts base64 directly

  const prompt = `Analyze this base64 image and extract any event information. Return it as a JSON object with the following structure:
{
  "events": [{
    "name": "Event Name",
    "startDate": "YYYY-MM-DD",
    "endDate": "YYYY-MM-DD", 
    "startTime": "HH:MM",
    "endTime": "HH:MM",
    "timeZone": "${timezone}",
    "location": "Event Location",
    "description": "Event Description",
    "images": []
  }],
  "eventMetadata": {
    "category": "category",
    "tags": ["tag1", "tag2"],
    "source": "image",
    "confidence": 0.9
  }
}

If no event information can be extracted, return an empty events array.`;

  try {
    const response = await generateText({
      prompt: `${prompt}\n\nBase64 image provided (truncated for processing)`,
      temperature: 0.2,
      maxTokens: 2000,
    });

    const parsed = JSON.parse(response) as {
      events: EventData[];
      eventMetadata?: EventMetadata;
    };

    if (!parsed.events || !Array.isArray(parsed.events)) {
      throw new Error("Invalid response format: missing events array");
    }

    const eventsWithMetadata: EventWithMetadata[] = parsed.events.map(
      (event: EventData) => ({
        ...event,
        eventMetadata: parsed.eventMetadata || {},
      }),
    );

    return {
      events: eventsWithMetadata,
      response,
    };
  } catch (error) {
    console.error("Error processing event from base64 image:", error);
    throw new ConvexError("Failed to process event from base64 image");
  }
}

/**
 * Fetch content from URL and process for events
 */
export async function processEventFromUrl(
  url: string,
  timezone: string,
): Promise<ProcessedEventResponse> {
  try {
    // Use Jina Reader to extract text content from URL
    const jinaResponse = await fetch(`https://r.jina.ai/${url}`, {
      method: "GET",
    });

    if (!jinaResponse.ok) {
      throw new Error(
        `Failed to fetch content from URL: ${jinaResponse.statusText}`,
      );
    }

    const rawText = await jinaResponse.text();

    if (!rawText || rawText.trim().length === 0) {
      throw new Error("No content found at the provided URL");
    }

    // Process the extracted text
    return await processEventFromRawText(rawText, timezone);
  } catch (error) {
    console.error("Error processing event from URL:", error);
    throw new ConvexError("Failed to process event from URL");
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
 * Validate that the first event in the array is valid
 */
export function validateFirstEvent(
  events: EventWithMetadata[],
): EventWithMetadata {
  if (!events.length) {
    throw new ConvexError("No events found in response");
  }

  const firstEvent = events[0];

  if (!firstEvent.name || !firstEvent.startDate) {
    throw new ConvexError("Invalid event data: missing required fields");
  }

  return firstEvent;
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
}
