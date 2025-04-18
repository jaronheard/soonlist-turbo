import type { CoreMessage } from "ai";
import { openai } from "@ai-sdk/openai";
import { Temporal } from "@js-temporal/polyfill";
import { TRPCError } from "@trpc/server";
import { waitUntil } from "@vercel/functions";
import { generateObject } from "ai";
import { LangfuseExporter } from "langfuse-vercel";

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

const langfuseExporter = new LangfuseExporter({
  publicKey: process.env.LANGFUSE_PUBLIC_KEY || "",
  secretKey: process.env.LANGFUSE_SECRET_KEY || "",
  baseUrl: process.env.LANGFUSE_HOST || "",
});

const MODEL = "gpt-4o";
const aiConfig = {
  model: openai(MODEL),
  temperature: 0.2,
  maxRetries: 0,
} as const;

function createLoggedObjectGenerator({
  ctx,
  input,
  promptVersion,
}: {
  ctx: Context;
  input: { rawText?: string; timezone: string; imageUrl?: string };
  promptVersion: string;
}) {
  return async (
    generateObjectOptions: {
      model: any;
      messages: any[];
      schema?: any;
      temperature?: number;
      maxRetries?: number;
    },
    loggingOptions: { name: string },
  ) => {
    try {
      const result = await generateObject({
        ...generateObjectOptions,
        output: "object",
        experimental_telemetry: {
          isEnabled: true,
          functionId: loggingOptions.name,
          metadata: {
            sessionId: ctx.auth.sessionId,
            userId: ctx.auth.userId,
            input: input.rawText || input.imageUrl,
            version: promptVersion,
            source: "soonlist-api",
          },
          exporter: langfuseExporter,
        },
      } as any);

      return result;
    } catch (error) {
      console.error("An error occurred while generating the response:", error);
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

  const eventData = event.object as {
    name?: string;
    description?: string;
    startDate?: string;
    startTime?: string;
    endDate?: string;
    endTime?: string;
    timeZone?: string;
    location?: string;
  };

  // Create a properly typed event object with all required fields
  const eventObject = {
    name:
      typeof eventData.name === "string" ? eventData.name : "Untitled Event",
    description:
      typeof eventData.description === "string" ? eventData.description : "",
    startDate:
      typeof eventData.startDate === "string"
        ? eventData.startDate
        : new Date().toISOString().split("T")[0],
    startTime:
      typeof eventData.startTime === "string"
        ? eventData.startTime
        : "00:00:00",
    endDate:
      typeof eventData.endDate === "string"
        ? eventData.endDate
        : new Date().toISOString().split("T")[0],
    endTime:
      typeof eventData.endTime === "string" ? eventData.endTime : "23:59:00",
    timeZone:
      typeof eventData.timeZone === "string"
        ? eventData.timeZone
        : "America/Los_Angeles",
    location: typeof eventData.location === "string" ? eventData.location : "",
    eventMetadata: metadata.object as EventWithMetadata["eventMetadata"],
  } as EventWithMetadata;

  const events = addCommonAddToCalendarProps([eventObject]);
  const response = `${event.response?.toString() || ""} ${metadata.response?.toString()}`;
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
  };
  firstEvent: EventWithMetadata;
  dailyEventsPromise: Promise<{ id: string }[]>;
  source: "rawText" | "url" | "image";
}

export async function createEventAndNotify(
  params: CreateEventParams,
): Promise<AIEventResponse> {
  const { ctx, input, firstEvent, dailyEventsPromise, source } = params;
  const { userId, username, imageUrl } = input;

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
      ...(imageUrl && {
        images: [imageUrl, imageUrl, imageUrl, imageUrl],
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

  return {
    success: notificationResult.success,
    id: notificationResult.id,
    eventId: eventid,
    event: createdEvent,
    ...(notificationResult.error && { error: notificationResult.error }),
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
