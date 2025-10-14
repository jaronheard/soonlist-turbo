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
# YOUR TASK
Extract social media attribution metadata from the provided text or image.

Return a JSON object with exactly 3 fields: platform, mentions, and sourceUrls.

---

## FIELD 1: platform (string, required)

Identify which social media platform this content is from.

**Valid values ONLY:** "instagram", "tiktok", "facebook", "twitter", "unknown"

**CRITICAL RULES:**
- **Default to "unknown"** - Only identify a platform if you can CLEARLY and CONFIDENTLY see platform-specific UI elements
- **If no usernames are visible, platform MUST be "unknown"** - Without usernames, we cannot attribute content
- Platform must be immediately obvious from visual indicators (icons, distinctive layouts, verified platform fonts/colors)
- Check for platform-specific URLs that are fully visible
- When in doubt, use "unknown"

---

## FIELD 2: mentions (array of strings, required)

Extract Instagram usernames that are FULLY VISIBLE in the image or text.

**CRITICAL RULES - READ CAREFULLY:**

1. **ONLY extract COMPLETE usernames** - If you see "johndoe...", "john..." or any text with ellipsis (...), DO NOT extract it
2. **⚠️ WATCH FOR COLLAB POST PATTERNS ⚠️** - Instagram collab posts show multiple authors like "username1 and username2..." where the second username is ALWAYS truncated. If you see "and username" or "username..." patterns in the author line, that username is incomplete - DO NOT extract it
3. **Verify it's actually a username** - Only extract text shown with @ symbol (like @username) or clearly labeled as a username in the UI
4. **NO display names** - "John Doe" is NOT a username. Only extract actual handles like "johndoe"
5. **NO truncated text** - Any username that appears cut off or abbreviated must be excluded. If the username appears before "..." or is followed by ellipsis anywhere nearby in the UI, it is truncated
6. **⚠️ ABSOLUTELY NO ENGAGEMENT SECTIONS ⚠️** - This is critical:
   - **NEVER** extract from "Liked by..." sections
   - **NEVER** extract from "Followed by..." sections  
   - **NEVER** extract from like counts or follower lists
   - Even if usernames are fully visible in these sections, DO NOT include them
   - Engagement sections show who interacted with content, NOT who created/organized it
7. **NO DUPLICATES** - Each username should only appear ONCE in the array. If the post author is mentioned again in the caption or tags, do NOT list them twice
8. **Remove the @ symbol** - Return just "johndoe", not "@johndoe"

**Order matters:**
- First item: The main author/organizer (person who posted the content)
- Remaining items: Any other fully visible usernames mentioned in the post

**Special case - Shared Story Posts:**
When someone shares another person's post in their Instagram story:
- First item: Original post author (the creator of the content being shared)
- Second item: Story sharer (the person who shared it to their story)

**If no complete usernames are visible:** Return empty array []

**⛔ NEVER EXTRACT FROM THESE LOCATIONS:**
- "Liked by username1, username2 and others" ❌
- "Liked by username and 42 others" ❌
- "Followed by username1, username2 and 3 others" ❌
- Any text near heart icons or like counts ❌
- Any usernames in engagement metrics at the bottom of posts ❌

**Examples of what NOT to extract:**
- "john..." ❌ (truncated)
- "John Doe" ❌ (display name, not username)
- "Liked by johndoe, janedoe and others" ❌ (from engagement - IGNORE all these usernames)
- "Followed by musicfan" ❌ (from engagement section)
- "@john" where the full username is cut off ❌

**Examples of what TO extract:**
- "@eventorganizer" in post caption/text → "eventorganizer" ✓
- Username in profile header (post author) → "username" ✓
- "@venue" tagged in caption → "venue" ✓
- "@dj" mentioned in event description → "dj" ✓

---

## FIELD 3: sourceUrls (array of strings, required)

Extract any URLs visible in the text or image.

**Include:**
- Full URLs to posts (e.g., "https://instagram.com/p/ABC123/")
- Links in bio or caption
- Any visible web addresses

**Format:** Must be complete, valid URLs

**If no URLs found:** Return empty array []

---

## OUTPUT FORMAT

Always return valid JSON with all 3 fields:

\`\`\`json
{
  "platform": "instagram",
  "mentions": ["username1", "username2"],
  "sourceUrls": ["https://example.com"]
}
\`\`\`

If a field has no values, use an empty array:

\`\`\`json
{
  "platform": "unknown",
  "mentions": [],
  "sourceUrls": []
}
\`\`\`

---

## EXAMPLES

**Example 1 - Regular Instagram Post:**
Image shows: "@musicvenue presents @djname this Friday"
Output:
\`\`\`json
{
  "platform": "instagram",
  "mentions": ["musicvenue", "djname"],
  "sourceUrls": []
}
\`\`\`

**Example 2 - Collab post with truncated second author:**
Image shows post header: "theoffbeatpdx and friendsofnoi..."
Output:
\`\`\`json
{
  "platform": "instagram",
  "mentions": ["theoffbeatpdx"],
  "sourceUrls": []
}
\`\`\`
Note: "friendsofnoi" was excluded (truncated in collab post pattern)

**Example 3 - Post with truncated username:**
Image shows: "@fullvisiblename with John Doe... and @anotherclear"
Output:
\`\`\`json
{
  "platform": "instagram",
  "mentions": ["fullvisiblename", "anotherclear"],
  "sourceUrls": []
}
\`\`\`
Note: "John Doe..." was excluded (truncated/display name)

**Example 4 - Shared story:**
Story by @storysharer sharing a post from @originalcreator
Output:
\`\`\`json
{
  "platform": "instagram",
  "mentions": ["originalcreator", "storysharer"],
  "sourceUrls": []
}
\`\`\`
Note: Original creator comes first

**Example 5 - Post with engagement section (CRITICAL):**
Image shows: 
- Post by @venueofficial: "Live music tonight with @bandname"
- Below post: "Liked by musicfan1, musicfan2 and 50 others"

Output:
\`\`\`json
{
  "platform": "instagram",
  "mentions": ["venueofficial", "bandname"],
  "sourceUrls": []
}
\`\`\`
Note: "musicfan1" and "musicfan2" were EXCLUDED (from "Liked by" engagement section)

**Example 6 - Multiple engagement patterns:**
Image shows:
- Post by @eventspace about a show
- "Followed by artistfriend and 5 others" at top
- Caption mentions "@headliner and @supportact"
- "Liked by randomuser1, randomuser2 and others" at bottom

Output:
\`\`\`json
{
  "platform": "instagram",
  "mentions": ["eventspace", "headliner", "supportact"],
  "sourceUrls": []
}
\`\`\`
Note: ALL users from "Followed by" and "Liked by" sections were EXCLUDED

**Example 7 - No visible usernames:**
Image shows event flyer with no @ mentions visible
Output:
\`\`\`json
{
  "platform": "unknown",
  "mentions": [],
  "sourceUrls": []
}
\`\`\`
Note: Platform is "unknown" because no usernames are visible

**Example 8 - Duplicate mentions:**
Image shows: Post by @musicvenue with caption "Join us @musicvenue this Friday with @djname"
Output:
\`\`\`json
{
  "platform": "instagram",
  "mentions": ["musicvenue", "djname"],
  "sourceUrls": []
}
\`\`\`
Note: "musicvenue" only appears once despite being mentioned twice

---

## FINAL REMINDER

**MOST COMMON MISTAKES TO AVOID:**
- ⚠️ DO NOT extract usernames from "Liked by..." or "Followed by..." text
- ⚠️ Engagement sections are NEVER relevant for event attribution
- ⚠️ DO NOT list the same username multiple times (deduplicate!)
- ⚠️ DO NOT guess the platform - if unclear, use "unknown"
- ⚠️ If no usernames are visible, platform MUST be "unknown"

**General rules:**
- When in doubt, EXCLUDE the username
- Truncated = excluded
- Display names = excluded  
- Duplicates = excluded (only list each username once)
- **Engagement lists = ALWAYS excluded**
- Only COMPLETE, VERIFIED usernames from POST CONTENT
- Platform identification requires clear, obvious visual indicators
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
    version: "v2025.10.14.5", // Added explicit collab post truncation rules and example
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
