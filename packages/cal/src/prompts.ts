import { Temporal } from "@js-temporal/polyfill";
import soft from "timezone-soft";
import { z } from "zod";
import { zodToJsonSchema } from "zod-to-json-schema";

// parse the response text into array of events. response format is:
interface Response {
  events: Event[]; // An array of events.
}

// Platform types for event sources
export const PLATFORMS = [
  "instagram",
  "tiktok",
  "facebook",
  "twitter",
  "unknown",
] as const;
export const PlatformSchema = z.enum(PLATFORMS);
export type Platform = z.infer<typeof PlatformSchema>;

// New simplified metadata schema focusing on social media attribution
export const EventMetadataSchema = z.object({
  platform: PlatformSchema.describe(
    "The platform where this event was sourced from (e.g., instagram, tiktok, facebook, twitter, or unknown)",
  ),
  mentions: z
    .array(z.string())
    .describe(
      "Array of usernames (without @ symbol) mentioned in the post. The FIRST username must be the main author/organizer of the event.",
    ),
  sourceUrls: z
    .array(z.string().url())
    .describe("Array of URLs to the original posts or related content"),
});
export type EventMetadata = z.infer<typeof EventMetadataSchema>;

// Legacy schemas kept for backward compatibility
// These are deprecated and should not be used for new events
// ============================================================

export const AGE_RESTRICTIONS = ["all-ages", "18+", "21+", "unknown"] as const;
export const AgeRestrictionSchema = z.enum(AGE_RESTRICTIONS);
export type AgeRestriction = z.infer<typeof AgeRestrictionSchema>;

export const PRICE_TYPE = [
  "donation",
  "free",
  "notaflof",
  "paid",
  "unknown",
] as const;
export const PriceTypeSchema = z.enum(PRICE_TYPE);
export type PriceType = z.infer<typeof PriceTypeSchema>;

export const EVENT_CATEGORIES = [
  "arts",
  "business",
  "community",
  "culture",
  "education",
  "entertainment",
  "food",
  "health",
  "lifestyle",
  "literature",
  "music",
  "religion",
  "science",
  "sports",
  "tech",
  "unknown",
] as const;
export const EventCategorySchema = z.string();
export type EventCategory = z.infer<typeof EventCategorySchema>;

export const EVENT_TYPES = [
  "competition",
  "concert",
  "conference",
  "exhibition",
  "festival",
  "game",
  "meeting",
  "movie",
  "opening",
  "party",
  "performance",
  "seminar",
  "show",
  "unknown",
  "webinar",
  "workshop",
] as const;
export const EventTypeSchema = z.string();
export type EventType = z.infer<typeof EventTypeSchema>;

export const ACCESSIBILITY_TYPES = [
  "closedCaptioning",
  "masksRequired",
  "masksSuggested",
  "signLanguageInterpretation",
  "wheelchairAccessible",
] as const;
export const AccessibilityTypeSchema = z.enum(ACCESSIBILITY_TYPES);
export type AccessibilityType = z.infer<typeof AccessibilityTypeSchema>;
export const ACCESSIBILITY_TYPES_OPTIONS = [
  { value: "closedCaptioning", label: "Closed Captioning" },
  { value: "masksRequired", label: "Masks Required" },
  { value: "masksSuggested", label: "Masks Suggested" },
  {
    value: "signLanguageInterpretation",
    label: "Sign Language Interpretation",
  },
  { value: "wheelchairAccessible", label: "Wheelchair Accessible" },
];

// Legacy metadata schema - kept for backward compatibility with old events
export const EventMetadataSchemaLegacy = z.object({
  accessibility: z.array(AccessibilityTypeSchema).optional(),
  accessibilityNotes: z.string().optional(),
  ageRestriction: AgeRestrictionSchema.optional(),
  category: EventCategorySchema.optional(),
  mentions: z.array(z.string()).optional(),
  performers: z.array(z.string()).optional(),
  priceMax: z.number().optional(),
  priceMin: z.number().optional(),
  priceType: PriceTypeSchema.optional(),
  source: PlatformSchema.optional(),
  type: EventTypeSchema.optional(),
});
export type EventMetadataLegacy = z.infer<typeof EventMetadataSchemaLegacy>;

export const EventMetadataSchemaLoose = EventMetadataSchemaLegacy.extend({
  accessibility: z.array(z.string()).optional(),
  ageRestriction: z.string().optional(),
  category: z.string().optional(),
  priceType: z.string().optional(),
  source: z.string().optional(),
  type: z.string().optional(),
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
Below, I pasted a text or image from which to extract event metadata focusing on social media attribution.

You will extract exactly 3 fields:

## 1. platform (required)
Identify the social media platform where this event was posted or sourced from.
- Valid values: "instagram", "tiktok", "facebook", "twitter", or "unknown"
- Look for visual clues in the image (app UI, icons, layout)
- Check for platform-specific URLs in the text
- If uncertain, use "unknown"

## 2. mentions (required)
Extract ALL usernames mentioned in the post as an array of strings.
- **CRITICAL**: The FIRST username in the array MUST be the main author/organizer (the user whose profile this post is from)
- Include ONLY the username without the @ symbol
- Example: If the text shows "@eventorganizer presents with @venue and @dj", extract: ["eventorganizer", "venue", "dj"]
- If no usernames are found, return an empty array: []

## 3. sourceUrls (required)
Extract all URLs found in the source text or image.
- Include the full URL (e.g., "https://instagram.com/p/ABC123/")
- Look for URLs in the text, bio, or visible in the image
- Include links to the original post if visible
- If no URLs are found, return an empty array: []

## IMPORTANT RULES:
1. Always return all 3 fields even if some are empty arrays
2. Usernames should NOT include the @ symbol
3. The first mention MUST be the main event organizer/author
4. All URLs must be valid and complete
5. Strictly adhere to the JSON schema - no extra fields

## EXAMPLE OUTPUT:
{
  "platform": "instagram",
  "mentions": ["maineventorganizer", "venue", "specialguest"],
  "sourceUrls": ["https://instagram.com/p/ABC123xyz/"]
}
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
