import type { CoreMessage } from "ai";
import { createOpenAI } from "@ai-sdk/openai";
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

import type { ActionCtx } from "../_generated/server";

const langfuse = new Langfuse({
  publicKey: process.env.LANGFUSE_PUBLIC_KEY || "",
  secretKey: process.env.LANGFUSE_SECRET_KEY || "",
  baseUrl: process.env.LANGFUSE_BASE_URL || "",
});

const openrouter = createOpenAI({
  apiKey: process.env.OPENROUTER_API_KEY || "",
  baseURL: process.env.OPENROUTER_BASE_URL || "",
});

// Primary model and fallbacks
const PRIMARY_MODEL = "google/gemini-2.5-flash:nitro";
const FALLBACK_MODELS = [
  "google/gemini-2.0-flash:nitro",
  "meta-llama/llama-4-maverick:nitro"
];

const aiConfig = {
  model: openrouter(PRIMARY_MODEL),
  mode: "json",
  temperature: 0.2,
  maxRetries: 0,
} as const;

async function generateObjectWithFallback<T>(
  generateObjectOptions: Parameters<typeof generateObject<T>>[0],
  models: string[] = [PRIMARY_MODEL, ...FALLBACK_MODELS],
): Promise<ReturnType<typeof generateObject<T>>> {
  let lastError: Error | null = null;
  
  for (const model of models) {
    try {
      const result = await generateObject({
        ...generateObjectOptions,
        model: openrouter(model),
      });
      return result;
    } catch (error) {
      console.warn(`Model ${model} failed, trying next fallback:`, error);
      lastError = error instanceof Error ? error : new Error(String(error));
    }
  }
  
  // If all models failed, throw the last error
  throw lastError || new Error("All models failed");
}

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
      model: PRIMARY_MODEL,
      version: promptVersion,
    });
    generation.update({
      completionStartTime: new Date(),
    });
    try {
      // Remove the model from generateObjectOptions since we handle it in the fallback function
      const { model: _, ...optionsWithoutModel } = generateObjectOptions;
      const result = await generateObjectWithFallback({
        ...optionsWithoutModel,
        // The model will be set inside generateObjectWithFallback
      } as Parameters<typeof generateObject<T>>[0]);
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

/**
 * Validates a URL to prevent SSRF attacks
 * @param url - The URL to validate
 * @throws ConvexError if the URL is invalid or potentially dangerous
 */
function validateUrl(url: string): void {
  let parsedUrl: URL;

  // Check if URL is well-formed
  try {
    parsedUrl = new URL(url);
  } catch (error) {
    throw new ConvexError({
      message: "Invalid URL format",
      data: {
        url,
        error: error instanceof Error ? error.message : String(error),
      },
    });
  }

  // Only allow http and https protocols
  if (!["http:", "https:"].includes(parsedUrl.protocol)) {
    throw new ConvexError({
      message: "Only HTTP and HTTPS protocols are allowed",
      data: { url, protocol: parsedUrl.protocol },
    });
  }

  const hostname = parsedUrl.hostname.toLowerCase();

  // Prevent localhost access
  if (
    hostname === "localhost" ||
    hostname === "127.0.0.1" ||
    hostname === "::1"
  ) {
    throw new ConvexError({
      message: "Access to localhost is not allowed",
      data: { url, hostname },
    });
  }

  // Prevent access to private IP ranges
  const ipv4Regex = /^(\d{1,3})\.(\d{1,3})\.(\d{1,3})\.(\d{1,3})$/;
  const ipv4Match = ipv4Regex.exec(hostname);

  if (ipv4Match) {
    const octetsAsTuple = ipv4Match.map(Number) as [
      number,
      number,
      number,
      number,
      number,
    ];
    const [, a, b, _c, _d] = octetsAsTuple;

    // Check for private IP ranges
    if (
      // 10.0.0.0/8
      a === 10 ||
      // 172.16.0.0/12
      (a === 172 && b >= 16 && b <= 31) ||
      // 192.168.0.0/16
      (a === 192 && b === 168) ||
      // 169.254.0.0/16 (link-local)
      (a === 169 && b === 254) ||
      // 127.0.0.0/8 (additional loopback check)
      a === 127
    ) {
      throw new ConvexError({
        message: "Access to private IP ranges is not allowed",
        data: { url, hostname },
      });
    }
  }

  // Prevent access to common cloud metadata endpoints
  const blockedHosts = [
    "metadata.google.internal",
    "169.254.169.254", // AWS/Azure/GCP metadata
    "metadata.azure.com",
    "metadata.packet.net",
    "metadata.digitalocean.com",
  ];

  if (blockedHosts.includes(hostname)) {
    throw new ConvexError({
      message: "Access to cloud metadata endpoints is not allowed",
      data: { url, hostname },
    });
  }

  // Optional: Add domain whitelist if needed
  // const allowedDomains = ['example.com', 'api.example.com'];
  // if (!allowedDomains.some(domain => hostname === domain || hostname.endsWith('.' + domain))) {
  //   throw new ConvexError({
  //     message: "Domain not in whitelist",
  //     data: { url, hostname },
  //   });
  // }
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
    try {
      // Validate URL to prevent SSRF attacks
      validateUrl(input.url);

      const jinaReader = await fetch(`https://r.jina.ai/${input.url}`, {
        method: "GET",
      });

      if (!jinaReader.ok) {
        throw new ConvexError({
          message: `Failed to fetch content from Jina Reader API: ${jinaReader.status} ${jinaReader.statusText}`,
          data: {
            url: input.url,
            status: jinaReader.status,
            statusText: jinaReader.statusText,
          },
        });
      }

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
    } catch (error) {
      // If the error is already a ConvexError, re-throw it
      if (error instanceof ConvexError) {
        throw error;
      }

      // Handle network errors and other fetch failures
      throw new ConvexError({
        message: "Network error when fetching content from Jina Reader API",
        data: {
          url: input.url,
          error: error instanceof Error ? error.message : String(error),
        },
      });
    }
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
