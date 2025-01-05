import type { CoreMessage } from "ai";
import { openai } from "@ai-sdk/openai";
import { waitUntil } from "@vercel/functions";
import { generateObject } from "ai";
import { Langfuse } from "langfuse";

import {
  addCommonAddToCalendarProps,
  EventMetadataSchema,
  EventSchema,
  getPrompt,
  getSystemMessage,
  getSystemMessageMetadata,
} from "@soonlist/cal";

import type { Context } from "../trpc";

const langfuse = new Langfuse({
  publicKey: process.env.LANGFUSE_PUBLIC_KEY || "",
  secretKey: process.env.LANGFUSE_SECRET_KEY || "",
  baseUrl: process.env.LANGFUSE_BASE_URL || "",
});

const MODEL = "gpt-4o";
const aiConfig = {
  model: openai(MODEL),
  mode: "json",
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
  return async <T>(
    generateObjectOptions: Parameters<typeof generateObject<T>>[0],
    loggingOptions: { name: string },
  ): Promise<ReturnType<typeof generateObject<T>>> => {
    const trace = langfuse.trace({
      name: loggingOptions.name,
      sessionId: ctx.auth.sessionId,
      userId: ctx.auth.userId,
      input: input.rawText || input.imageUrl,
      version: promptVersion,
    });
    const generation = trace.generation({
      name: "generation",
      input: input.rawText || input.imageUrl,
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
          error: error,
        },
      });
      waitUntil(langfuse.flushAsync());
      throw error;
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
}) {
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
      throw new Error("Failed to fetch the text from the URL.");
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

  const eventObject = { ...event.object, eventMetadata: metadata.object };

  const events = addCommonAddToCalendarProps([eventObject]);
  const response = `${event.rawResponse?.toString() || ""} ${metadata.rawResponse?.toString()}`;
  return { events, response };
}
