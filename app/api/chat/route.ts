import { Configuration, OpenAIApi } from "openai-edge";
import { OpenAIStream, StreamingTextResponse } from "ai";
import { z } from "zod";
import { type RequestResponse } from "@/server/db/types";
import { getPrompt, getSystemMessage } from "@/lib/prompts";

export const dynamic = "force-dynamic";
export const runtime = "edge";
export const preferredRegion = "pdx1";

// Create an OpenAI API client (that's edge friendly!)
const config = new Configuration({
  apiKey: process.env.OPENAI_API_KEY,
});
const openai = new OpenAIApi(config);

// Define the structure of each message if you know it, here's an example
const messageSchema = z.object({
  role: z.string(),
  content: z.string(),
  // include other properties of a message here
});

const requestDataSchema = z.object({
  messages: z.array(messageSchema),
  source: z.string(),
  timezone: z.string(),
  // include other properties if they exist
});

export async function POST(req: Request) {
  // Validate the request body against the schema
  const json = (await req.json()) as unknown;
  const { messages, source, timezone } = requestDataSchema.parse(json);
  const requestStart = new Date();
  const system = getSystemMessage();
  const prompt = getPrompt(timezone);

  const userMessages = messages.filter(
    (message: { role: string }) => message.role === "user"
  );
  const lastUserMessage =
    userMessages?.[userMessages.length - 1]?.content || undefined;

  const requestData = {
    modelInput: {
      promptVersion: prompt.version,
      message: lastUserMessage,
    },
    modelStatus: "pending",
    source: source,
  } as RequestResponse;

  // Ask OpenAI for a streaming completion given the prompt
  const response = await openai.createChatCompletion({
    model: "gpt-3.5-turbo-0125",
    stream: true,

    messages: [
      {
        role: "system",
        content: system.text,
      },
      {
        role: "user",
        content: lastUserMessage,
      },
      { role: "system", content: prompt.text },
    ],
  });

  // Convert the response into a friendly text-stream
  const stream = OpenAIStream(response, {
    async onCompletion(completion) {
      const errors = [];

      // calculate time from initial request to completion
      const time = new Date().getTime() - requestStart.getTime();

      // Create a new requestResponse in the database, but don't await it
      requestData.modelOutput = { text: completion };
      requestData.modelCompletionTime = time;
      requestData.modelStatus = "success";

      // post requestData to /api/gpt-logs endpoint
      console.log("prior to gpt-logs fetch requestData", requestData);
      fetch("/api/gpt-logs", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(requestData),
      }).catch((error) => errors.push(error));
    },
  });

  return new StreamingTextResponse(stream);
}
