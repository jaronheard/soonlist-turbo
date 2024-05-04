import { z } from "zod";

export const userAdditionalInfoSchema = z.object({
  bio: z.string().max(150, "Bio must be 150 characters or less").optional(),
  publicEmail: z.string().email("Enter a valid email address").optional(),
  publicPhone: z
    .string()
    .max(20, "Phone number must be 20 digits or less")
    .optional(),
  publicInsta: z
    .string()
    .max(31, "Instagram username must be 31 characters or less")
    .optional(),
  publicWebsite: z
    .string()
    .max(1083, "Website url must be 2083 characters or less")
    .optional(),
});

const dateSchema = z.object({
  name: z.string().optional(),
  description: z.string().optional(),
  startDate: z.string().optional(),
  startTime: z.string().optional(),
  endDate: z.string().optional(),
  endTime: z.string().optional(),
  timeZone: z.string().optional(),
  location: z.string().optional(),
  status: z.enum(["TENTATIVE", "CONFIRMED", "CANCELLED"]).optional(),
  sequence: z.union([z.string(), z.number()]).optional(),
  uid: z.string().optional(),
  organizer: z.string().optional(),
  attendee: z.string().optional(),
});

export const AddToCalendarButtonPropsSchema = z.object({
  proKey: z.string().optional(),
  name: z.string().optional(),
  dates: z.union([z.string(), z.array(dateSchema)]).optional(),
  description: z.string().optional(),
  startDate: z.string().optional(),
  startTime: z.string().optional(),
  endDate: z.string().optional(),
  endTime: z.string().optional(),
  timeZone: z.string().optional(),
  location: z.string().optional(),
  status: z.enum(["TENTATIVE", "CONFIRMED", "CANCELLED"]).optional(),
  sequence: z.union([z.string(), z.number()]).optional(),
  uid: z.string().optional(),
  organizer: z.string().optional(),
  attendee: z.string().optional(),
  icsFile: z.string().optional(),
  images: z.union([z.array(z.string()), z.string()]).optional(),
  recurrence: z.string().optional(),
  recurrence_interval: z.union([z.string(), z.number()]).optional(),
  recurrence_until: z.string().optional(),
  recurrence_count: z.union([z.string(), z.number()]).optional(),
  recurrence_byDay: z.string().optional(),
  recurrence_byMonth: z.string().optional(),
  recurrence_byMonthDay: z.string().optional(),
  recurrence_weekstart: z.string().optional(),
  availability: z.enum(["busy", "free"]).optional(),
  created: z.string().optional(),
  updated: z.string().optional(),
  identifier: z.string().optional(),
  subscribe: z.union([z.string(), z.boolean()]).optional(),
  // one of string or array of strings
  options: z
    .union([
      z.string(),
      z.array(
        z.enum([
          "Apple",
          "Google",
          "iCal",
          "Microsoft365",
          "MicrosoftTeams",
          "Outlook.com",
          "Yahoo",
        ]),
      ),
    ])
    .optional(),
  iCalFileName: z.string().optional(),
  listStyle: z
    .enum(["overlay", "modal", "dropdown", "dropdown-static", "dropup-static"])
    .optional(),
  buttonStyle: z
    .enum([
      "default",
      "3d",
      "flat",
      "round",
      "neumorphism",
      "text",
      "date",
      "custom",
      "none",
    ])
    .optional(),
  trigger: z.enum(["hover", "click"]).optional(),
  inline: z.union([z.string(), z.boolean()]).optional(),
  buttonsList: z.union([z.string(), z.boolean()]).optional(),
  hideIconButton: z.union([z.string(), z.boolean()]).optional(),
  hideIconList: z.union([z.string(), z.boolean()]).optional(),
  hideIconModal: z.union([z.string(), z.boolean()]).optional(),
  hideTextLabelButton: z.union([z.string(), z.boolean()]).optional(),
  hideTextLabelList: z.union([z.string(), z.boolean()]).optional(),
  hideBackground: z.union([z.string(), z.boolean()]).optional(),
  hideCheckmark: z.union([z.string(), z.boolean()]).optional(),
  hideBranding: z.union([z.string(), z.boolean()]).optional(),
  hideButton: z.union([z.string(), z.boolean()]).optional(),
  size: z.string().optional(),
  label: z.string().optional(),
  inlineRsvp: z.string().optional(),
  customLabels: z.any().optional(), // Replace with a more specific schema if available
  customCss: z.string().optional(),
  lightMode: z.enum(["system", "dark", "light", "bodyScheme"]).optional(),
  language: z
    .enum([
      "en",
      "de",
      "nl",
      "fa",
      "fr",
      "es",
      "et",
      "pt",
      "tr",
      "zh",
      "ar",
      "hi",
      "pl",
      "ro",
      "id",
      "no",
      "fi",
      "sv",
      "cs",
      "ja",
      "it",
      "ko",
      "vi",
    ])
    .optional(),
  hideRichData: z.union([z.string(), z.boolean()]).optional(),
  ty: z.any().optional(), // Replace with a more specific schema if available
  rsvp: z.any().optional(), // Replace with a more specific schema if available
  bypassWebViewCheck: z.union([z.string(), z.boolean()]).optional(),
  debug: z.union([z.string(), z.boolean()]).optional(),
  cspnonce: z.string().optional(),
  blockInteraction: z.union([z.string(), z.boolean()]).optional(),
  styleLight: z.string().optional(),
  styleDark: z.string().optional(),
  disabled: z.union([z.string(), z.boolean()]).optional(),
  hidden: z.union([z.string(), z.boolean()]).optional(),
  pastDateHandling: z.string().optional(),
  proxy: z.union([z.string(), z.boolean()]).optional(),
  forceOverlay: z.union([z.string(), z.boolean()]).optional(),
});
