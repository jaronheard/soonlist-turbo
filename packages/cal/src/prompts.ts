import { Temporal } from "@js-temporal/polyfill";
import soft from "timezone-soft";
import { z } from "zod";
import { zodToJsonSchema } from "zod-to-json-schema";

// parse the response text into array of events. response format is:
interface Response {
  events: Event[]; // An array of events.
}

export const EventMetadataSchema = z.object({
  platform: z.string().min(1).optional(),
  mentions: z
    .array(
      z
        .string()
        .min(1)
        .regex(/^[^@\s]+$/, {
          message: "Mentions should be usernames without the @ symbol",
        }),
    )
    .optional(),
  sourceUrls: z.array(z.string().url()).optional(),
});
export type EventMetadata = z.infer<typeof EventMetadataSchema>;
export const EventMetadataSchemaLoose = EventMetadataSchema.extend({
  platform: z.string().optional(),
  mentions: z.array(z.string()).optional(),
  sourceUrls: z.array(z.string()).optional(),
});
export type EventMetadataLoose = z.infer<typeof EventMetadataSchemaLoose>;

export const EventSchema = z.object({
  name: z
    .string()
    .describe(
      "The event's name. Be specific and include any subtitle or edition. Do not include the location.",
    ),
  description: z
    .string()
    .describe(
      "Short description of the event, its significance, and what attendees can expect. If included in the source text, include the cost, allowed ages, rsvp details, performers, speakers, and any known times. When mentioning times in the description, use casual 12-hour format (e.g., '2:30 PM' instead of '14:30').",
    ),
  startDate: z
    .string()
    .regex(/^\d{4}-\d{2}-\d{2}$/)
    .describe("Start date in YYYY-MM-DD format."),
  startTime: z
    .string()
    .describe(
      "Start time in 24-hour format HH:MM:SS (e.g., 14:30:00 for 2:30 PM). Always include seconds, even if they're 00.",
    ),
  endDate: z
    .string()
    .regex(/^\d{4}-\d{2}-\d{2}$/)
    .describe("End date in YYYY-MM-DD format."),
  endTime: z
    .string()
    .describe(
      "End time in 24-hour format HH:MM:SS (e.g., 14:30:00 for 2:30 PM). Always include seconds, even if they're 00.",
    ),
  timeZone: z.string().describe("Timezone in IANA format."),
  location: z.string().describe("Location of the event."),
  // eventMetadata: EventMetadataSchema,
});
export const EventWithMetadataSchema = EventSchema.extend({
  eventMetadata: EventMetadataSchema.optional(),
});
export type EventWithMetadata = z.infer<typeof EventWithMetadataSchema>;
export const EventsSchema = z.array(EventSchema);

export type Event = z.infer<typeof EventSchema>;

export const extractJsonFromResponse = (response: string) => {
  try {
    const start = response.indexOf("```json");
    const end = response.lastIndexOf("```");
    if (start === -1 || end === -1) {
      return JSON.parse(response) as Response;
    }
    const jsonString = response.slice(start + 7, end);
    return JSON.parse(jsonString) as Response;
  } catch (error) {
    console.error("An error occurred while parsing the JSON response:", error);
    return undefined; // or handle the error in a way that is appropriate for your application
  }
};

export const addCommonAddToCalendarProps = (events: EventWithMetadata[]) => {
  return events.map((event) => {
    return {
      options: [
        "Apple",
        "Google",
        "iCal",
        "Microsoft365",
        "MicrosoftTeams",
        "Outlook.com",
        "Yahoo",
      ] as
        | (
            | "Apple"
            | "Google"
            | "iCal"
            | "Microsoft365"
            | "MicrosoftTeams"
            | "Outlook.com"
            | "Yahoo"
          )[]
        | undefined,
      buttonStyle: "text" as const,
      name: event.name,
      description: event.description,
      location: event.location,
      startDate: event.startDate,
      endDate: event.endDate,
      startTime: event.startTime,
      endTime: event.endTime,
      timeZone: event.timeZone,
      eventMetadata: event.eventMetadata || undefined,
    };
  });
};

export const addCommonAddToCalendarPropsFromResponse = (response: string) => {
  const res = extractJsonFromResponse(response);
  if (!res) return undefined;
  const { events } = res;
  return addCommonAddToCalendarProps(events);
};

export const eventMetadataSchemaAsText = JSON.stringify(
  zodToJsonSchema(EventMetadataSchema),
);

export const systemMessage = (schema?: string) =>
  `You are an AI assistant that extracts calendar event details from text or images. Provide structured outputs in JSON format, strictly adhering to the provided schema. Non-conforming outputs will cause fatal errors.

  **Schema Adherence:**
  * **Only Valid Options**: Enum fields must only use values explicitly defined in the schema.
  * **Always Omit Unknowns:** Always completely omit fields if their values are undefined or cannot be reasonably inferred from the input. No placeholders, null, or undefined values.

  **Reasoning and Assumptions:**

  * Make reasonable assumptions when necessary, but prioritize facts and direct information from the input.
  * Acknowledge any uncertainties and avoid making unsupported statements.

  **Output Style:** Keep responses concise, clear, and relevant.

  ${
    schema
      ? `
    **Schema:** The schema is as follows:
    ${schema}
      `
      : ``
  }`;

export const getText = (date: string, timezone: string) => `# CONTEXT
The current date is ${date}, and the default timezone is ${timezone} unless specified otherwise.

## YOUR JOB
Below, I pasted a text or image from which to extract calendar event details.

You will
1. Identify details of the primary event mentioned in the text or image. Only the first event from multi-day events should be captured.
2. Remove the perspective or opinion from the input, focusing only on factual details.
3. Extract and format these details into a valid JSON response, strictly following the schema below. 
4. Infer any missing information based on event context, type, or general conventions.
5. Write your JSON response by summarizing the event details from the provided data or your own inferred knowledge. Your response must be detailed, specific, and directly relevant to the JSON schema requirements.
6. Limit event to a single time within a <24 hour period. Late night events can extend into the next day.

Stylistically write titles and descriptions in short, approachable, and professional language, like an editor of the Village Voice event section.
Stick to known facts, and be concise. Use proper capitalization for all fields.
No new adjectives/adverbs not in source text. No editorializing. No fluff. Nothing should be described as "engaging", "compelling", etc...
Avoid using phrases like 'join us,' 'come celebrate,' or any other invitations. Instead, maintain a neutral and descriptive tone. For example, instead of saying 'Join a family-friendly bike ride,' describe it as 'A family-friendly bike ride featuring murals, light installations, and a light-up dance party.'"
Use they/them pronouns when referring to people whose gender is not explicitly stated.
Do not mention event times in the description unless they provide extra context beyond start and end times.

## DATE AND TIME PARSING AND FORMATTING
The system using the output requires specific date and time formatting.

- There are no all-day events. Always provide start and end times.
- Events must be limited to a single time within a 24 hour period. Only the first event from multi-day events should be captured.
- Dates MUST be in the format YYYY-MM-DD (e.g., 2024-03-15).
- Times MUST be in 24-hour format HH:MM:SS (e.g., 14:30:00 for 2:30 PM).
- Always include seconds in the time, even if they're 00.
- Always provide both startTime and endTime.
- When interpreting dates, assume they are in the future unless clearly stated otherwise.
- If start time is not explicitly stated, infer a reasonable start time based on the event type and context (e.g., 19:00:00 for an evening concert, 10:00:00 for a morning workshop).
- If end time is not explicitly stated, infer a reasonable duration based on the event type and context (e.g., 2 hours for a movie, 3 hours for a concert, etc.).
- Ensure the endDate is always provided and is either the same as or later than the startDate.
`;

// eslint-disable-next-line @typescript-eslint/no-unused-vars
export const getTextMetadata = (date: string, timezone: string) => `
# YOUR JOB
Below, I pasted a text or image from which to extract social metadata for the event.

You will:
1. Identify the social platform hosting the post (for example, instagram, tiktok, facebook). Return the platform name in lowercase without additional words.
2. Build an ordered list of account usernames referenced in the content. Usernames must never include the "@" symbol. The first username **must** be the main author of the post (the profile that published the content). Include other mentioned accounts after the main author in the order they appear. Remove duplicates.
3. Collect every additional source URL found in the content (excluding the platform URL itself). Return fully qualified URLs.
4. Omit any field that cannot be confidently determined. Never invent usernames or links.

Respond with a JSON object that exactly matches the metadata schema. Do not include comments or extra fields.
`;

const formatOffsetAsIANASoft = (offset: string) => {
  const timezone = soft(offset)[0];
  return timezone?.iana || Intl.DateTimeFormat().resolvedOptions().timeZone;
};

export const getPrompt = (
  timezone = Intl.DateTimeFormat().resolvedOptions().timeZone,
) => {
  const timezoneIANA = formatOffsetAsIANASoft(timezone);
  const now = Temporal.Now.instant().toZonedDateTimeISO(timezoneIANA);
  const date = now.toString();

  return {
    text: getText(date, timezoneIANA),
    textMetadata: getTextMetadata(date, timezoneIANA),
    version: "v2025.10.02.1", // Increment the version number
  };
};

export const getSystemMessage = () => {
  return {
    text: systemMessage(),
    version: "v2024.06.02.4",
  };
};

export const getSystemMessageMetadata = () => {
  return {
    text: systemMessage(eventMetadataSchemaAsText),
    version: "v2024.06.02.4",
  };
};
