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

export interface Event {
  name: string; // The event's name. Be specific and include any subtitle or edition. Do not include the location.
  description: string; // Short description of the event, its significance, and what attendees can expect. If included in the source text, include the cost, allowed ages, rsvp details, performers, speakers, and any known times.
  startDate: string; // Start date in YYYY-MM-DD format.
  startTime?: string; // Start time. ALWAYS include if known. Omit ONLY if known to be an all-day event.
  endDate: string; // End date in YYYY-MM-DD format.
  endTime?: string; // End time. ALWAYS include, inferring if necessary. Omit ONLY known to be an all-day event.
  timeZone: string; // Timezone in IANA format.
  location: string; // Location of the event.
  eventMetadata: EventMetadata;
}

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
  `You are a sophisticated AI capable of parsing text or images to extract calendar event details. Your outputs are structured, reliable, and candid, formatted in JSON according to a specific schema. You make assumptions when necessary but remain factual and direct. You admit uncertainties and avoid unfounded statements, ensuring every piece of information is backed up by the data provided or logical inference. Your responses are concise, prioritizing clarity and relevance to the task. You follow the JSON schema exactly.`;

export const getText = (date: string, timezone: string) => `# CONTEXT
The current date is ${date}, and the default timezone is ${timezone} unless specified otherwise.

## YOUR JOB
Above, I pasted a text or image from which to extract calendar event details for upcoming events.

You will
1. Identify details of the primary event mentioned in the text or image.
2. Identify the platform from which the input text was extracted, and extract all usernames @-mentioned.
3. Remove the perspective or opinion from the input, focusing only on factual details.
4. Extract and format these details into a valid JSON response, strictly following the schema below. 
5. Infer any missing information based on event context, type, or general conventions.
6. NO COMMENTS ALLOWED in the JSON response, only the required fields and values.
7. Write your JSON response by summarizing the event details from the provided data or your own inferred knowledge. Your response must be detailed, specific, and directly relevant to the JSON schema requirements.

Stylistically write in short, approachable, and professional language, like an editor of the Village Voice event section.
Stick to known facts, and be concise. Use proper capitalization for all fields.
No new adjectives/adverbs not in source text. No editorializing. No fluff. Nothing should be described as "engaging", "compelling", etc...
The title, location and first 2 sentences of description should tell what attendees should expect. The remaining 2 sentences can be used for further description of the content of the event.

## JSON Schema

interface Response {
  events: Event[]; // An array of events.
}

enum Platform {
  "instagram",
  "unknown",
}

enum AgeRestriction {
  "all-ages", // default assumption
  "18+",
  "21+",
  "unknown",
}

enum PriceType {
  "free", // default assumption
  "notaflof", // no one turned away for lack of funds
  "donation",
  "paid",
  "unknown",
}

enum EventCategory {
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
}

enum EventType {
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
}

enum AccessibilityTypes {
  "masksRequired",
  "masksSuggested",
  "wheelchairAccessible",
  "signLanguageInterpretation",
  "closedCaptioning",
}
  
interface EventMetadata {
  mentions?: string[]; // An array of mentions of usernames or handles in the input text, excluding at sign.
  source?: Platform; // The source platform from which the input text was extracted.
  priceMin: number; // The minimum cost of the event in dollars. Use 0 if unknown.
  priceMax: number; // The maximum cost of the event in dollars. Use 0 if unknown.
  priceType: PriceType;
  ageRestriction: AgeRestriction;
  category: EventCategory;
  type: EventType;
  performers?: string[]; // An array of all performers or speakers at the event, if known. Infer if not explicitly stated.
  accessibility?: AccessibilityTypes[]; // An array of known accessibility features available at the event.
  accessibilityNotes?: string; // Any additional notes about the event's accessibility.
}

interface Event {
  name: string; // 8 WORDS OR LESS. A short, informative, name for the event. Use title capitalization, disregarding any use of all caps in the source text. Quote any titles or subtitles. Do not include the location. 
  description: string; // 4 sentence description of the event. Be specific and precise. Prioritize what attendees can expect in 2-3 sentences… if the original text captures what to expect in <5 sentences, then just use it, otherwise summarize
  startDate: string; // Start date in YYYY-MM-DD format.
  startTime?: string; // Start time, only the time portion (HH:MM:SS) of ISO 8601 format. CANNOT BE UNKNOWN. Do not include the date or time zone. Infer based on event type if not specified. Only omit if known to be an all-day event. 
  endDate: string; // End date in YYYY-MM-DD format.
  endTime?: string; // End time (estimated), only the time portion (HH:MM:SS) of ISO 8601 format. CANNOT BE UNKNOWN. Do not include the date or time zone. Infer based on start time and event type if not specified. Only omit if known to be an all-day event.
  timeZone: string; // Timezone in IANA format.
  location: string; // Location of the event.
  eventMetadata: EventMetadata;
}

Below, your report, following the JSON schema exactly:`;

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
    version: "v2024.4.13.2",
  };
};

export const getSystemMessage = () => {
  return {
    text: systemMessage(),
    version: "v2024.03.16.1",
  };
};
