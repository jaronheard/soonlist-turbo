import type { CoreMessage } from "ai";
import { createOpenAI } from "@ai-sdk/openai";
import { Temporal } from "@js-temporal/polyfill";
import { waitUntil } from "@vercel/functions";
import { generateObject } from "ai";
import { ConvexError } from "convex/values";
import { Langfuse } from "langfuse";

import type { EventWithMetadata } from "@soonlist/cal";
import {
  addCommonAddToCalendarProps,
  EventMetadataSchema,
  EventSchema,
  getPrompt,
  getSystemMessage,
  getSystemMessageMetadata,
} from "@soonlist/cal";

import type { Doc } from "../_generated/dataModel";
import type { ActionCtx, MutationCtx } from "../_generated/server";
import { generatePublicId } from "../utils";
import {
  getNotificationContent,
  sendNotification,
} from "./notificationHelpers";
import { createDeepLink } from "./utils/urlScheme";

const langfuse = new Langfuse({
  publicKey: process.env.LANGFUSE_PUBLIC_KEY || "",
  secretKey: process.env.LANGFUSE_SECRET_KEY || "",
  baseUrl: process.env.LANGFUSE_BASE_URL || "",
});

const openrouter = createOpenAI({
  apiKey: process.env.OPENROUTER_API_KEY || "",
  baseURL: process.env.OPENROUTER_BASE_URL || "",
});
const MODEL = "google/gemini-2.0-flash-001";
const aiConfig = {
  model: openrouter(MODEL),
  mode: "json",
  temperature: 0.2,
  maxRetries: 0,
} as const;

function createLoggedObjectGenerator({
  ctx,
  input,
  promptVersion,
}: {
  ctx: ActionCtx;
  input: {
    rawText?: string;
    timezone: string;
    imageUrl?: string;
    base64Image?: string;
  };
  promptVersion: string;
}) {
  return async <T>(
    generateObjectOptions: Parameters<typeof generateObject<T>>[0],
    loggingOptions: { name: string },
  ): Promise<ReturnType<typeof generateObject<T>>> => {
    const loggedInput =
      input.rawText ??
      input.imageUrl ??
      (input.base64Image ? "[base64 image omitted]" : undefined);

    const identity = await ctx.auth.getUserIdentity();
    const trace = langfuse.trace({
      name: loggingOptions.name,
      sessionId: identity?.tokenIdentifier,
      userId: identity?.subject,
      input: loggedInput,
      version: promptVersion,
    });
    const generation = trace.generation({
      name: "generation",
      input: loggedInput,
      model: MODEL,
      version: promptVersion,
    });
    generation.update({
      completionStartTime: new Date(),
    });
    try {
      const result = await generateObject(generateObjectOptions);
      generation.end({
        output: result.object,
      });
      generation.score({
        name: "eventToJson",
        value: result.object === null ? 0 : 1,
      });
      trace.update({
        output: result.object,
        metadata: {
          finishReason: result.finishReason,
          logprobs: result.logprobs,
          rawResponse: result.rawResponse,
          warnings: result.warnings,
        },
      });
      waitUntil(langfuse.flushAsync());
      return result;
    } catch (error) {
      console.error("An error occurred while generating the response:", error);
      generation.score({
        name: "eventToJson",
        value: 0,
      });
      trace.update({
        output: null,
        metadata: {
          finishReason: "error",
          error: error instanceof Error ? error.message : String(error),
        },
      });
      waitUntil(langfuse.flushAsync());
      throw new ConvexError({
        message: "Failed to generate AI response",
        data: { error: error instanceof Error ? error.message : String(error) },
      });
    }
  };
}

function getPrompts(timezone: string) {
  return {
    systemPromptEvent: getSystemMessage(),
    systemPromptMetadata: getSystemMessageMetadata(),
    prompt: getPrompt(timezone),
    promptVersion: getPrompt(timezone).version,
  };
}

function constructMessagesRawText({
  systemPrompt,
  prompt,
  rawText,
}: {
  systemPrompt: string;
  prompt: string;
  rawText: string;
}): CoreMessage[] {
  return [
    { role: "system", content: systemPrompt },
    {
      role: "user",
      content: `${prompt} Input: """
      ${rawText}
      """`,
    },
  ];
}

function constructMessagesImage({
  systemPrompt,
  prompt,
  imageUrl,
}: {
  systemPrompt: string;
  prompt: string;
  imageUrl: string;
}): CoreMessage[] {
  return [
    { role: "system", content: systemPrompt },
    {
      role: "user",
      content: prompt,
    },
    {
      role: "user",
      content: [
        {
          type: "image",
          image: new URL(imageUrl),
        },
      ],
    },
  ];
}

function constructMessagesBase64Image({
  systemPrompt,
  prompt,
  base64Image,
}: {
  systemPrompt: string;
  prompt: string;
  base64Image: string;
}): CoreMessage[] {
  return [
    { role: "system", content: systemPrompt },
    { role: "user", content: prompt },
    {
      role: "user",
      content: [
        {
          type: "image",
          image: base64Image,
        },
      ],
    },
  ];
}

export interface AIEventResponse {
  success: boolean;
  ticket?: unknown;
  id?: string;
  eventId?: string;
  event?: Doc<"events">;
  error?: string;
}

export interface AIErrorResponse {
  success: boolean;
  ticket?: unknown;
  id?: string;
  error?: string;
}

export interface ProcessedEventResponse {
  events: EventWithMetadata[];
  response: string;
}

export async function fetchAndProcessEvent({
  ctx,
  input,
  fnName,
}: {
  ctx: ActionCtx;
  input: {
    rawText?: string;
    imageUrl?: string;
    base64Image?: string;
    timezone: string;
    url?: string;
  };
  fnName: string;
}): Promise<{
  events: EventWithMetadata[];
  response: string;
}> {
  const { systemPromptEvent, systemPromptMetadata, prompt, promptVersion } =
    getPrompts(input.timezone);
  const createLoggedObject = createLoggedObjectGenerator({
    ctx,
    input,
    promptVersion,
  });

  let eventMessages: CoreMessage[];
  let metadataMessages: CoreMessage[];

  if (input.rawText) {
    eventMessages = constructMessagesRawText({
      systemPrompt: systemPromptEvent.text,
      prompt: prompt.text,
      rawText: input.rawText,
    });

    metadataMessages = constructMessagesRawText({
      systemPrompt: systemPromptMetadata.text,
      prompt: prompt.textMetadata,
      rawText: input.rawText,
    });
  } else if (input.base64Image) {
    eventMessages = constructMessagesBase64Image({
      systemPrompt: systemPromptEvent.text,
      prompt: prompt.text,
      base64Image: input.base64Image,
    });

    metadataMessages = constructMessagesBase64Image({
      systemPrompt: systemPromptMetadata.text,
      prompt: prompt.textMetadata,
      base64Image: input.base64Image,
    });
  } else if (input.imageUrl) {
    eventMessages = constructMessagesImage({
      systemPrompt: systemPromptEvent.text,
      prompt: prompt.text,
      imageUrl: input.imageUrl,
    });

    metadataMessages = constructMessagesImage({
      systemPrompt: systemPromptMetadata.text,
      prompt: prompt.textMetadata,
      imageUrl: input.imageUrl,
    });
  } else if (input.url) {
    const jinaReader = await fetch(`https://r.jina.ai/${input.url}`, {
      method: "GET",
    });
    const rawText = await jinaReader.text();
    if (!rawText) {
      throw new ConvexError({
        message: "Failed to fetch the text from the URL",
        data: { url: input.url },
      });
    }
    eventMessages = constructMessagesRawText({
      systemPrompt: systemPromptEvent.text,
      prompt: prompt.text,
      rawText: rawText,
    });

    metadataMessages = constructMessagesRawText({
      systemPrompt: systemPromptMetadata.text,
      prompt: prompt.textMetadata,
      rawText: rawText,
    });
  } else {
    throw new ConvexError({
      message: "No input provided",
      data: { input },
    });
  }

  const [event, metadata] = await Promise.all([
    createLoggedObject(
      {
        ...aiConfig,
        messages: eventMessages,
        schema: EventSchema,
      },
      { name: `${fnName}.event` },
    ),
    createLoggedObject(
      {
        ...aiConfig,
        messages: metadataMessages,
        schema: EventMetadataSchema,
      },
      { name: `${fnName}.metadata` },
    ),
  ]);

  const generatedEvent = event.object;
  const generatedMetadata = metadata.object;

  const eventObject = { ...generatedEvent, eventMetadata: generatedMetadata };

  const events = addCommonAddToCalendarProps([eventObject]);
  const response = `${
    event.rawResponse
      ? typeof event.rawResponse === "string"
        ? event.rawResponse
        : JSON.stringify(event.rawResponse)
      : ""
  } ${
    metadata.rawResponse
      ? typeof metadata.rawResponse === "string"
        ? metadata.rawResponse
        : JSON.stringify(metadata.rawResponse)
      : ""
  }`;
  return { events, response };
}

export interface CreateEventParams {
  ctx: MutationCtx;
  input: {
    timezone: string;
    comment?: string;
    lists: { value: string }[];
    visibility?: "public" | "private";
    userId: string;
    username: string;
    imageUrl?: string;
    sendNotification?: boolean;
  };
  firstEvent: EventWithMetadata;
  dailyEventsPromise: Promise<{ id: string }[]>;
  source: "rawText" | "url" | "image";
  uploadedImageUrl?: string | null;
}

export async function createEventAndNotify(
  params: CreateEventParams,
): Promise<AIEventResponse> {
  const {
    ctx,
    input,
    firstEvent,
    dailyEventsPromise,
    source,
    uploadedImageUrl,
  } = params;
  const { userId, username } = input;

  const shouldNotify = input.sendNotification !== false;

  if (!userId) {
    throw new ConvexError({
      message: "No user id found in session",
      data: { input },
    });
  }

  if (!username) {
    throw new ConvexError({
      message: "No username found in session",
      data: { input },
    });
  }

  const hasComment = input.comment && input.comment.length > 0;
  const hasLists = input.lists.length > 0;

  let { startTime, endTime, timeZone } = firstEvent;
  if (!timeZone) {
    timeZone = input.timezone;
  }
  if (!startTime) {
    startTime = "00:00";
  }
  if (!endTime) {
    endTime = "23:59";
  }

  const start = Temporal.ZonedDateTime.from(
    `${firstEvent.startDate}T${startTime}[${timeZone}]`,
  );
  const end = Temporal.ZonedDateTime.from(
    `${firstEvent.endDate}T${endTime}[${timeZone}]`,
  );
  const startUtcDate = new Date(start.epochMilliseconds);
  const endUtcDate = new Date(end.epochMilliseconds);

  const eventid = generatePublicId();

  const imageToUse = uploadedImageUrl ?? input.imageUrl;

  const values = {
    id: eventid,
    userId,
    userName: username,
    event: {
      ...firstEvent,
      ...(imageToUse && {
        images: [imageToUse, imageToUse, imageToUse, imageToUse],
      }),
    },
    eventMetadata: firstEvent.eventMetadata,
    startDateTime: startUtcDate.toISOString(),
    endDateTime: endUtcDate.toISOString(),
    visibility: input.visibility ?? "public",
    created_at: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
    // Extract fields from event object for indexing
    name: firstEvent.name,
    image: imageToUse || null,
    endDate: firstEvent.endDate,
    endTime: firstEvent.endTime,
    location: firstEvent.location,
    timeZone: firstEvent.timeZone,
    startDate: firstEvent.startDate,
    startTime: firstEvent.startTime,
    description: firstEvent.description,
  };

  // Insert event
  await ctx.db.insert("events", values);

  // Insert comment, if any
  if (hasComment) {
    await ctx.db.insert("comments", {
      eventId: eventid,
      content: input.comment ?? "",
      userId,
      id: Math.floor(Math.random() * 1000000), // temporary numeric id
      oldId: null,
      created_at: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    });
  }

  // Insert event-to-lists, if any
  if (hasLists) {
    // Remove existing associations
    const existingAssociations = await ctx.db
      .query("eventToLists")
      .withIndex("by_event", (q) => q.eq("eventId", eventid))
      .collect();

    for (const association of existingAssociations) {
      await ctx.db.delete(association._id);
    }

    // Insert new associations
    for (const list of input.lists) {
      await ctx.db.insert("eventToLists", {
        eventId: eventid,
        listId: list.value,
      });
    }
  }

  const createdEvent = await ctx.db
    .query("events")
    .withIndex("by_custom_id", (q) => q.eq("id", eventid))
    .unique();

  if (!createdEvent) {
    throw new ConvexError({
      message: "Failed to create event",
      data: { eventid },
    });
  }

  // Resolve daily events
  const dailyEvents = await dailyEventsPromise;
  const eventCount = dailyEvents.length;

  // Create push notification using the extracted helper
  const { title, subtitle, body } = getNotificationContent(
    firstEvent.name,
    eventCount,
  );

  if (shouldNotify) {
    waitUntil(
      (async () => {
        try {
          const notificationResult = await sendNotification({
            userId,
            title,
            subtitle,
            body,
            url: createDeepLink(`event/${eventid}`),
            eventId: eventid,
            source: "ai_router",
            method: source,
          });
          if (!notificationResult.success) {
            console.error(
              "Background notification sending failed:",
              notificationResult.error,
              "ID:",
              notificationResult.id,
            );
            // Log this error more formally (Sentry, Langfuse, etc.)
          } else {
            console.log(
              "Background notification sent successfully:",
              notificationResult.id,
            );
          }
        } catch (notificationError) {
          console.error(
            "Error in background notification task:",
            notificationError,
          );
          // Log this error more formally
        }
      })(),
    );
  }

  return {
    success: true, // Event creation was successful
    eventId: eventid,
    event: createdEvent,
    // id and error fields related to notification are not part of this main success response
  };
}

export async function createEvent(
  params: CreateEventParams,
): Promise<AIEventResponse> {
  const { ctx, input, firstEvent, uploadedImageUrl } = params;
  const { userId, username } = input;

  if (!userId) {
    throw new ConvexError({
      message: "No user id found in session",
      data: { input },
    });
  }

  if (!username) {
    throw new ConvexError({
      message: "No username found in session",
      data: { input },
    });
  }

  const hasComment = input.comment && input.comment.length > 0;
  const hasLists = input.lists.length > 0;

  let { startTime, endTime, timeZone } = firstEvent;
  if (!timeZone) {
    timeZone = input.timezone;
  }
  if (!startTime) {
    startTime = "00:00";
  }
  if (!endTime) {
    endTime = "23:59";
  }

  const start = Temporal.ZonedDateTime.from(
    `${firstEvent.startDate}T${startTime}[${timeZone}]`,
  );
  const end = Temporal.ZonedDateTime.from(
    `${firstEvent.endDate}T${endTime}[${timeZone}]`,
  );
  const startUtcDate = new Date(start.epochMilliseconds);
  const endUtcDate = new Date(end.epochMilliseconds);

  const eventid = generatePublicId();

  const values = {
    id: eventid,
    userId,
    userName: username,
    event: {
      ...firstEvent,
      ...(uploadedImageUrl && {
        images: [
          uploadedImageUrl,
          uploadedImageUrl,
          uploadedImageUrl,
          uploadedImageUrl,
        ],
      }),
    },
    eventMetadata: firstEvent.eventMetadata,
    startDateTime: startUtcDate.toISOString(),
    endDateTime: endUtcDate.toISOString(),
    visibility: input.visibility ?? "public",
    created_at: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
    // Extract fields from event object for indexing
    name: firstEvent.name,
    image: uploadedImageUrl || null,
    endDate: firstEvent.endDate,
    endTime: firstEvent.endTime,
    location: firstEvent.location,
    timeZone: firstEvent.timeZone,
    startDate: firstEvent.startDate,
    startTime: firstEvent.startTime,
    description: firstEvent.description,
  };

  // Insert event
  await ctx.db.insert("events", values);

  // Insert comment, if any
  if (hasComment) {
    await ctx.db.insert("comments", {
      eventId: eventid,
      content: input.comment ?? "",
      userId,
      id: Math.floor(Math.random() * 1000000), // temporary numeric id
      oldId: null,
      created_at: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    });
  }

  // Insert event-to-lists, if any
  if (hasLists) {
    // Remove existing associations
    const existingAssociations = await ctx.db
      .query("eventToLists")
      .withIndex("by_event", (q) => q.eq("eventId", eventid))
      .collect();

    for (const association of existingAssociations) {
      await ctx.db.delete(association._id);
    }

    // Insert new associations
    for (const list of input.lists) {
      await ctx.db.insert("eventToLists", {
        eventId: eventid,
        listId: list.value,
      });
    }
  }

  const createdEvent = await ctx.db
    .query("events")
    .withIndex("by_custom_id", (q) => q.eq("id", eventid))
    .unique();

  if (!createdEvent) {
    throw new ConvexError({
      message: "Failed to create event",
      data: { eventid },
    });
  }

  return {
    success: true,
    eventId: eventid,
    event: createdEvent,
  };
}

/**
 * Validates Jina API response for common error patterns and content issues
 */
export function validateJinaResponse(aiResult: {
  events: EventWithMetadata[];
  response: string;
}): void {
  const responseText = aiResult.response.toLowerCase();

  // 1. Check for Jina/network error responses
  if (
    responseText.includes("failed to fetch") ||
    responseText.includes("network error") ||
    responseText.includes("dns resolution failed") ||
    responseText.includes("connection refused") ||
    responseText.includes("timeout")
  ) {
    throw new ConvexError({
      message: "URL fetch failed: Network error or invalid domain",
      data: { responseText },
    });
  }

  // 2. Check for HTTP error content
  if (
    responseText.includes("500 internal server error") ||
    responseText.includes("404 not found") ||
    responseText.includes("503 service unavailable") ||
    responseText.includes("error 500") ||
    responseText.includes("error 404")
  ) {
    throw new ConvexError({
      message: "URL content parsing failed: HTTP error status received",
      data: { responseText },
    });
  }

  // 3. Check for robots.txt content specifically
  if (
    responseText.includes("user-agent:") &&
    responseText.includes("disallow:")
  ) {
    throw new ConvexError({
      message:
        "AI processing failed: Content is robots.txt file, not event information",
      data: { responseText },
    });
  }

  // 4. Check for minimal/empty content that Jina couldn't process
  if (responseText.trim().length < 100) {
    throw new ConvexError({
      message: "URL content parsing failed: Insufficient content retrieved",
      data: { responseText },
    });
  }
}
