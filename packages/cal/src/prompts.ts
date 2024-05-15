import { Temporal } from "@js-temporal/polyfill";
import soft from "timezone-soft";
import { z } from "zod";

// parse the response text into array of events. response format is:
interface Response {
  events: Event[]; // An array of events.
}

export const PLATFORMS = ["instagram", "unknown"] as const;
export const PlatformSchema = z.enum(PLATFORMS);
export type Platform = z.infer<typeof PlatformSchema>;

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
export const EventCategorySchema = z.enum(EVENT_CATEGORIES);
export type EventCategory = z.infer<typeof EventCategorySchema>;

export const EVENT_TYPES = [
  "competition",
  "concert",
  "conference",
  "exhibition",
  "festival",
  "game",
  "meeting",
  "opening",
  "party",
  "performance",
  "seminar",
  "show",
  "unknown",
  "webinar",
  "workshop",
] as const;
export const EventTypeSchema = z.enum(EVENT_TYPES);
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

export const EventMetadataSchema = z.object({
  mentions: z.array(z.string()).optional(),
  source: PlatformSchema.optional(),
  priceMin: z.number().optional(),
  priceMax: z.number().optional(),
  priceType: PriceTypeSchema,
  ageRestriction: AgeRestrictionSchema,
  category: EventCategorySchema,
  type: EventTypeSchema,
  performers: z.array(z.string()).optional(),
  accessibility: z.array(AccessibilityTypeSchema).optional(),
  accessibilityNotes: z.string().optional(),
});
export type EventMetadata = z.infer<typeof EventMetadataSchema>;
export const EventMetadataSchemaLoose = EventMetadataSchema.extend({
  source: z.string().optional(),
  priceType: z.string().optional(),
  ageRestriction: z.string().optional(),
  category: z.string().optional(),
  type: z.string().optional(),
  accessibility: z.array(z.string()).optional(),
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
      "Short description of the event, its significance, and what attendees can expect. If included in the source text, include the cost, allowed ages, rsvp details, performers, speakers, and any known times.",
    ),
  startDate: z
    .string()
    .regex(/^\d{4}-\d{2}-\d{2}$/)
    .describe("Start date in YYYY-MM-DD format."),
  startTime: z
    .string()
    .optional()
    .describe(
      "Start time. ALWAYS include if known. Omit ONLY if known to be an all-day event.",
    ),
  endDate: z
    .string()
    .regex(/^\d{4}-\d{2}-\d{2}$/)
    .describe("End date in YYYY-MM-DD format."),
  endTime: z
    .string()
    .optional()
    .describe(
      "End time. ALWAYS include, inferring if necessary. Omit ONLY known to be an all-day event.",
    ),
  timeZone: z.string().describe("Timezone in IANA format."),
  location: z.string().describe("Location of the event."),
  eventMetadata: EventMetadataSchema,
});
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

export const addCommonAddToCalendarProps = (events: Event[]) => {
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
      startTime: event.startTime || undefined,
      endTime: event.endTime || undefined,
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

export const systemMessage = () =>
  `You are an AI assistant that extracts calendar event details from text or images. Provide structured outputs in JSON format, following a specific schema. Make reasonable assumptions when needed, but prioritize facts and direct information backed by the given data or logical inference. Acknowledge uncertainties and avoid unsupported statements. Keep responses concise, clear, and relevant.`;

export const getText = (date: string, timezone: string) => `
Your task is to extract details about the primary upcoming event mentioned in the input below and format the information into a JSON object following a specific schema. NEVER DEVIATE FROM THE SCHEMA, INCLUDING VERIFYING ALL ENUMS ARE VALID.

First, carefully read through the input text and identify all the key details provided about the event, such as the name, date, time, location, price, age restrictions, accessibility, category, type, and any performers or speakers.

Next, try to determine the platform the input text was likely copied from, such as Instagram, Facebook, Twitter, etc. If you can't determine the source platform, set it to "unknown". Also extract any @username mentions included in the text, leaving out the @ symbol.

As you extract the event details, try to remove any subjective opinions or commentary, and focus solely on the factual information. If any required fields are missing from the input text, do your best to infer reasonable values based on context clues, the type of event, and general conventions. For example, if no start time is specified, infer a likely time based on the event type.

The current date is ${date}, and the default timezone is ${timezone} unless specified otherwise.

Write the event name and description in a concise, engaging style, as if you were an editor for the events section of the Village Voice. The name should be 8 words or less. The description should be exactly 4 sentences focused on describing the event itself, what attendees can expect to experience there, and any other key factual details. Quote any book/movie/album titles or event names.

Avoid any language that sounds like an invitation, call-to-action, or advertisement, such as "Join us for...", "Don't miss...", "Get your tickets...", etc. Stick closely to the facts provided in the input text. Do not editorialize or add fluffy adjectives and adverbs not found in the original text. Be specific about the event.`;

const formatOffsetAsIANASoft = (offset: string) => {
  const timezone = soft(offset)[0];
  return timezone?.iana || "America/Los_Angeles";
};

export const getPrompt = (timezone = "America/Los_Angeles") => {
  const timezoneIANA = formatOffsetAsIANASoft(timezone);
  const now = Temporal.Now.instant().toZonedDateTimeISO(timezoneIANA);
  const date = now.toString();

  return {
    text: getText(date, timezoneIANA),
    version: "v2024.5.14.1",
  };
};

export const getSystemMessage = () => {
  return {
    text: systemMessage(),
    version: "v2024.03.16.1",
  };
};
