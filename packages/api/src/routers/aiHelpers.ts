import { Buffer } from "buffer";
import type { CoreMessage } from "ai";
import { createOpenAI } from "@ai-sdk/openai";
import { Temporal } from "@js-temporal/polyfill";
import { TRPCError } from "@trpc/server";
import { waitUntil } from "@vercel/functions";
import { generateObject } from "ai";
import { Langfuse } from "langfuse";
import type { z } from "zod";

import type { EventWithMetadata } from "@soonlist/cal";
import {
  addCommonAddToCalendarProps,
  EventMetadataSchema,
  EventSchema,
  EventWithMetadataSchema,
  getPrompt,
  getSystemMessage,
  getSystemMessageMetadata,
} from "@soonlist/cal";
import { eq } from "@soonlist/db";
import {
  comments,
  events,
  events as eventsSchema,
  eventToLists,
} from "@soonlist/db/schema";

import type { RouterOutputs } from "..";
import type { Context } from "../trpc";
import { generatePublicId } from "../utils";
import {
  getNotificationContent,
  sendNotification,
} from "../utils/notificationHelpers";
import { createDeepLink } from "../utils/urlScheme";

const langfuse = new Langfuse({
  publicKey: process.env.LANGFUSE_PUBLIC_KEY || "",
  secretKey: process.env.LANGFUSE_SECRET_KEY || "",
  baseUrl: process.env.LANGFUSE_BASE_URL || "",
});

const openrouter = createOpenAI({
  apiKey: process.env.OPENROUTER_API_KEY || "",
  baseURL: process.env.OPENROUTER_BASE_URL || "",
});
const MODEL = "google/gemini-2.5-flash:nitro";
const FALLBACK_MODELS = [
  "google/gemini-2.0-flash:nitro",
  "meta-llama/llama-4-maverick:nitro",
];
const aiConfig = {
  model: openrouter(MODEL),
  mode: "json",
  temperature: 0.2,
  maxRetries: 0,
  models: FALLBACK_MODELS,
} as const;

/**
 * Extracts JSON from text that may be wrapped in markdown code fences or contain extra text.
 * Handles cases where AI models return responses like ```json\n{...}\n``` instead of pure JSON.
 */
export function extractJsonFromText(text: string): string | null {
  const trimmed = text.trim();
  if (!trimmed) return null;

  // Strip code fences if present (handle both full-match and partial cases)
  const fencedFull = /^```(?:json)?\n([\s\S]*?)\n```\s*$/i.exec(trimmed);
  if (fencedFull) return fencedFull[1].trim();

  // Also try to find code fences anywhere in the text
  const fencedPartial = /```(?:json)?\n([\s\S]*?)\n```/i.exec(trimmed);
  if (fencedPartial) return fencedPartial[1].trim();

  // Find first top-level JSON object/array using a brace/bracket stack, skipping strings
  let start = -1;
  for (let i = 0; i < trimmed.length; i++) {
    const ch = trimmed[i];
    if (ch === "{" || ch === "[") {
      start = i;
      break;
    }
  }
  if (start === -1) return null;

  let i = start;
  let depth = 0;
  let inStr = false;
  let esc = false;
  const open = trimmed[start];
  const close = open === "{" ? "}" : "]";
  for (; i < trimmed.length; i++) {
    const c = trimmed[i];
    if (inStr) {
      if (!esc && c === '"') inStr = false;
      esc = c === "\\" && !esc;
      continue;
    }
    if (c === '"') {
      inStr = true;
      esc = false;
      continue;
    }
    if (c === open) depth++;
    else if (c === close) {
      depth--;
      if (depth === 0) {
        return trimmed.slice(start, i + 1);
      }
    }
  }
  return null;
}

function createLoggedObjectGenerator({
  ctx,
  input,
  promptVersion,
}: {
  ctx: Context;
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
    const trace = langfuse.trace({
      name: loggingOptions.name,
      sessionId: ctx.auth.sessionId,
      userId: ctx.auth.userId,
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

      const actualModel =
        typeof result.rawResponse === "object" &&
        result.rawResponse !== null &&
        "model" in result.rawResponse
          ? (result.rawResponse as { model: string }).model
          : MODEL;

      generation.update({
        model: actualModel,
      });
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
          actualModel,
        },
      });
      waitUntil(langfuse.flushAsync());
      return result;
    } catch (error) {
      // Check if this is a JSON parsing error with text we can sanitize
      const isJsonParseError =
        error &&
        typeof error === "object" &&
        "name" in error &&
        (error as { name: string }).name === "AI_JSONParseError" &&
        "text" in error &&
        typeof (error as { text: unknown }).text === "string";

      if (isJsonParseError) {
        const errorWithText = error as { text: string; message?: string };
        const jsonText = extractJsonFromText(errorWithText.text);

        if (jsonText) {
          try {
            const parsedValue = JSON.parse(jsonText);
            // Validate against the schema from generateObjectOptions
            const schema = generateObjectOptions.schema as z.ZodSchema;
            const validatedObject = schema.parse(parsedValue);

            // Synthesize a success-like result
            const sanitizedResult = {
              object: validatedObject,
              rawResponse: errorWithText.text,
              warnings: ["sanitized-json-fallback"],
              finishReason: "stop" as const,
              logprobs: undefined,
            };

            const actualModel =
              typeof sanitizedResult.rawResponse === "object" &&
              sanitizedResult.rawResponse !== null &&
              "model" in sanitizedResult.rawResponse
                ? (sanitizedResult.rawResponse as { model: string }).model
                : MODEL;

            generation.update({
              model: actualModel,
            });
            generation.end({
              output: sanitizedResult.object,
            });
            generation.score({
              name: "eventToJson",
              value: 1,
            });
            trace.update({
              output: sanitizedResult.object,
              metadata: {
                finishReason: sanitizedResult.finishReason,
                rawResponse: sanitizedResult.rawResponse,
                warnings: sanitizedResult.warnings,
                actualModel,
                sanitizedJsonFallback: true,
              },
            });
            waitUntil(langfuse.flushAsync());
            return sanitizedResult as ReturnType<typeof generateObject<T>>;
          } catch (sanitizeError) {
            // If sanitization fails, log and fall through to original error handling
            console.error(
              "Failed to sanitize JSON from error response:",
              sanitizeError,
            );
          }
        }
      }

      console.error("An error occurred while generating the response:", error);
      generation.score({
        name: "eventToJson",
        value: 0,
      });
      trace.update({
        output: null,
        metadata: {
          finishReason: "error",
          error: error,
        },
      });
      waitUntil(langfuse.flushAsync());
      throw new TRPCError({
        code: "INTERNAL_SERVER_ERROR",
        message: "Failed to generate AI response",
        cause: error,
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
  event?: RouterOutputs["event"]["get"];
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
  ctx: Context;
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
      throw new TRPCError({
        code: "BAD_REQUEST",
        message: "Failed to fetch the text from the URL",
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
    throw new Error("No input provided");
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
  const generatedMetadata = EventMetadataSchema.parse(metadata.object);

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
  ctx: Context;
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
    throw new TRPCError({
      code: "INTERNAL_SERVER_ERROR",
      message: "No user id found in session",
    });
  }

  if (!username) {
    throw new TRPCError({
      code: "INTERNAL_SERVER_ERROR",
      message: "No username found in session",
    });
  }

  const hasComment = input.comment && input.comment.length > 0;
  const hasLists = input.lists.length > 0;
  const hasVisibility = input.visibility && input.visibility.length > 0;

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
    startDateTime: startUtcDate,
    endDateTime: endUtcDate,
    ...(hasVisibility && {
      visibility: input.visibility,
    }),
  };

  await ctx.db.transaction(async (tx: Context["db"]) => {
    // Insert event
    await tx.insert(eventsSchema).values(values);

    // Insert comment, if any
    if (hasComment) {
      await tx.insert(comments).values({
        eventId: eventid,
        content: input.comment ?? "",
        userId,
      });
    }

    // Insert event-to-lists, if any
    if (hasLists) {
      await tx.delete(eventToLists).where(eq(eventToLists.eventId, eventid));
      await tx.insert(eventToLists).values(
        input.lists.map((list) => ({
          eventId: eventid,
          listId: list.value,
        })),
      );
    }

    return eventid;
  });

  const createdEvent = await ctx.db.query.events
    .findMany({
      where: eq(events.id, eventid),
      with: {
        user: {
          with: {
            lists: true,
          },
        },
        eventFollows: true,
        comments: true,
        eventToLists: {
          with: {
            list: true,
          },
        },
      },
    })
    .then((events) => events[0] || null);

  if (!createdEvent) {
    throw new TRPCError({
      code: "INTERNAL_SERVER_ERROR",
      message: "Failed to create event",
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
    throw new TRPCError({
      code: "INTERNAL_SERVER_ERROR",
      message: "No user id found in session",
    });
  }

  if (!username) {
    throw new TRPCError({
      code: "INTERNAL_SERVER_ERROR",
      message: "No username found in session",
    });
  }

  const hasComment = input.comment && input.comment.length > 0;
  const hasLists = input.lists.length > 0;
  const hasVisibility = input.visibility && input.visibility.length > 0;

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
    startDateTime: startUtcDate,
    endDateTime: endUtcDate,
    ...(hasVisibility && {
      visibility: input.visibility,
    }),
  };

  await ctx.db.transaction(async (tx: Context["db"]) => {
    // Insert event
    await tx.insert(eventsSchema).values(values);

    // Insert comment, if any
    if (hasComment) {
      await tx.insert(comments).values({
        eventId: eventid,
        content: input.comment ?? "",
        userId,
      });
    }

    // Insert event-to-lists, if any
    if (hasLists) {
      await tx.delete(eventToLists).where(eq(eventToLists.eventId, eventid));
      await tx.insert(eventToLists).values(
        input.lists.map((list) => ({
          eventId: eventid,
          listId: list.value,
        })),
      );
    }

    return eventid;
  });

  const createdEvent = await ctx.db.query.events
    .findMany({
      where: eq(events.id, eventid),
      with: {
        user: {
          with: {
            lists: true,
          },
        },
        eventFollows: true,
        comments: true,
        eventToLists: {
          with: {
            list: true,
          },
        },
      },
    })
    .then((events) => events[0] || null);

  if (!createdEvent) {
    throw new TRPCError({
      code: "INTERNAL_SERVER_ERROR",
      message: "Failed to create event",
    });
  }

  return {
    success: true,
    eventId: eventid,
    event: createdEvent,
  };
}

export function validateFirstEvent(events: unknown[]) {
  if (!events.length) {
    throw new TRPCError({
      code: "BAD_REQUEST",
      message: "No events found in response",
    });
  }

  try {
    // This will throw if validation fails
    const validatedEvent = EventWithMetadataSchema.parse(events[0]);
    return validatedEvent;
  } catch (error) {
    throw new TRPCError({
      code: "BAD_REQUEST",
      message: "Invalid event data received",
      cause: error,
    });
  }
}

interface UploadResponse {
  fileUrl: string;
}

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
          "Content-Type": "image/webp", // Assuming optimizeImage always produces webp
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
      // Optionally log this error more formally
      return null; // Return null on failure, don't throw to avoid failing the whole event creation
    }

    const parsedResponse = (await response.json()) as UploadResponse;
    return parsedResponse.fileUrl;
  } catch (error) {
    console.error("Error uploading image to CDN:", error);
    // Optionally log this error more formally (e.g., using Sentry or Langfuse)
    return null; // Return null on error
  }
}
