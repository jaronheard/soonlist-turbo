export interface AddToCalendarButtonPropsBase {
  proKey?: string;
  name?: string;
  dates?:
    | {
        name?: string;
        description?: string;
        startDate?: string;
        startTime?: string;
        endDate?: string;
        endTime?: string;
        timeZone?: string;
        location?: string;
        status?: "TENTATIVE" | "CONFIRMED" | "CANCELLED";
        sequence?: number | string;
        uid?: string;
        organizer?: string;
        attendee?: string;
      }[]
    | string;
  description?: string;
  startDate?: string;
  startTime?: string;
  endDate?: string;
  endTime?: string;
  timeZone?: string;
  location?: string;
  status?: "TENTATIVE" | "CONFIRMED" | "CANCELLED";
  sequence?: number | string;
  uid?: string;
  organizer?: string;
  attendee?: string;
  icsFile?: string;
  images?: string[] | string;
  recurrence?: string;
  recurrence_interval?: number | string;
  recurrence_until?: string;
  recurrence_count?: number | string;
  recurrence_byDay?: string;
  recurrence_byMonth?: string;
  recurrence_byMonthDay?: string;
  recurrence_weekstart?: string;
  availability?: "busy" | "free";
  created?: string;
  updated?: string;
  identifier?: string;
  subscribe?: boolean | string;
  options?:
    | (
        | "Apple"
        | "Google"
        | "iCal"
        | "Microsoft365"
        | "MicrosoftTeams"
        | "Outlook.com"
        | "Yahoo"
      )[]
    | string;
  iCalFileName?: string;
  buttonStyle?:
    | "default"
    | "3d"
    | "flat"
    | "round"
    | "neumorphism"
    | "text"
    | "date"
    | "custom"
    | "none";
  trigger?: "hover" | "click";
  inline?: boolean | string;
  buttonsList?: boolean | string;
  hideIconButton?: boolean | string;
  hideIconList?: boolean | string;
  hideIconModal?: boolean | string;
  hideTextLabelButton?: boolean | string;
  hideTextLabelList?: boolean | string;
  hideBackground?: boolean | string;
  hideCheckmark?: boolean | string;
  hideBranding?: boolean | string;
  hideButton?: boolean | string;
  size?: string;
  label?: string;
  inlineRsvp?: string;
  customLabels?: CustomLabelsObjectType;
  customCss?: string;
  lightMode?: "system" | "dark" | "light" | "bodyScheme";
  language?:
    | "en"
    | "de"
    | "nl"
    | "fa"
    | "fr"
    | "es"
    | "et"
    | "pt"
    | "tr"
    | "zh"
    | "ar"
    | "hi"
    | "pl"
    | "ro"
    | "id"
    | "no"
    | "fi"
    | "sv"
    | "cs"
    | "ja"
    | "it"
    | "ko"
    | "vi";
  hideRichData?: boolean | string;
  ty?: object;
  rsvp?: object;
  bypassWebViewCheck?: boolean | string;
  debug?: boolean | string;
  cspnonce?: string;
  blockInteraction?: boolean | string;
  styleLight?: string;
  styleDark?: string;
  disabled?: boolean | string;
  hidden?: boolean | string;
  pastDateHandling?: string;
  proxy?: boolean | string;
  forceOverlay?: boolean | string;
}

export type AddToCalendarButtonProps = AddToCalendarButtonPropsBase & {
  listStyle?:
    | "overlay"
    | "modal"
    | "dropdown"
    | "dropdown-static"
    | "dropup-static";
};

export type AddToCalendarButtonPropsRestricted =
  AddToCalendarButtonPropsBase & {
    listStyle?: "overlay" | "modal";
  };
