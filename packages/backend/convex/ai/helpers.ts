"use node";

import { Buffer } from "buffer";
import type { CoreMessage } from "ai";
import { createOpenAI } from "@ai-sdk/openai";
import { Temporal } from "@js-temporal/polyfill";
import { generateObject } from "ai";
import { v } from "convex/values";
import { Langfuse } from "langfuse";

// Types and interfaces
export interface AIEventResponse {
  success: boolean;
  ticket?: unknown;
  id?: string;
  eventId?: string;
  event?: any;
  error?: string;
}

export interface ProcessedEventResponse {
  events: any[];
  response: string;
}

// Initialize AI services
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

// Mock schemas for now - these would come from @soonlist/cal
const EventSchema = v.any();
const EventMetadataSchema = v.any();

function createLoggedObjectGenerator({
  sessionId,
  userId,
  input,
  promptVersion,
}: {
  sessionId?: string;
  userId?: string;
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
      sessionId: sessionId,
      userId: userId,
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
      await langfuse.flushAsync();
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
          error: error,
        },
      });
      await langfuse.flushAsync();
      throw error;
    }
  };
}

function getPrompts(timezone: string) {
  // Mock prompts - these would come from @soonlist/cal
  return {
    systemPromptEvent: {
      text: "You are an AI that extracts event information.",
    },
    systemPromptMetadata: {
      text: "You are an AI that extracts event metadata.",
    },
    prompt: {
      text: `Extract event information from the following input. Timezone: ${timezone}`,
      textMetadata: `Extract event metadata from the following input. Timezone: ${timezone}`,
      version: "1.0.0",
    },
    promptVersion: "1.0.0",
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

export async function fetchAndProcessEvent({
  sessionId,
  userId,
  input,
  fnName,
}: {
  sessionId?: string;
  userId?: string;
  input: {
    rawText?: string;
    imageUrl?: string;
    base64Image?: string;
    timezone: string;
    url?: string;
  };
  fnName: string;
}): Promise<ProcessedEventResponse> {
  const { systemPromptEvent, systemPromptMetadata, prompt, promptVersion } =
    getPrompts(input.timezone);

  const createLoggedObject = createLoggedObjectGenerator({
    sessionId,
    userId,
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
      throw new Error("Failed to fetch the text from the URL");
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
  const generatedMetadata = metadata.object;

  const eventObject = { ...generatedEvent, eventMetadata: generatedMetadata };

  // Mock addCommonAddToCalendarProps function
  const events = [eventObject];
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

export function validateFirstEvent(events: unknown[]) {
  if (!events.length) {
    throw new Error("No events found in response");
  }

  // Mock validation - this would use EventWithMetadataSchema
  return events[0];
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

export function getDayBounds(timezone: string) {
  const now = Temporal.Now.zonedDateTimeISO(timezone);
  const startOfDay = now.startOfDay();
  const endOfDay = now.add({ days: 1 }).startOfDay();

  return {
    start: new Date(startOfDay.epochMilliseconds),
    end: new Date(endOfDay.epochMilliseconds),
  };
}
