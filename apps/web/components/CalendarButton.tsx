"use client";

import { atcb_action } from "add-to-calendar-button-react";
import { CalendarPlus } from "lucide-react";

import type { ATCBActionEventConfig } from "@soonlist/cal/types";
import { isEventInPast } from "@soonlist/cal";
import { Button } from "@soonlist/ui/button";

import { env } from "~/env";
import { DropdownMenuItem } from "./DropdownMenu";

interface CalendarButtonProps {
  event: ATCBActionEventConfig;
  id?: string;
  username?: string;
  userDisplayName?: string;
  type: "button" | "dropdown" | "icon";
}

export function CalendarButton(props: CalendarButtonProps) {
  const eventForCalendar = { ...props.event };
  const displayName =
    props.userDisplayName || (props.username ? `@${props.username}` : "");
  const baseUrl = env.NEXT_PUBLIC_VERCEL_PROJECT_PRODUCTION_URL;
  const eventIsPast = isEventInPast(
    props.event.endDate,
    props.event.endTime,
    props.event.timeZone,
  );
  const linkUrl =
    props.username && props.id
      ? eventIsPast
        ? `${baseUrl}/event/${props.id}`
        : `${baseUrl}/${props.username}/upcoming`
      : baseUrl;
  const additionalText =
    props.username && props.id
      ? `Captured by ${displayName} on [url]${linkUrl}|Soonlist[/url]`
      : `Captured on [url]${linkUrl}|Soonlist[/url]`;
  eventForCalendar.description = `${props.event.description}[br][br]${additionalText}`;
  eventForCalendar.options = [
    "Apple",
    "Google",
    "iCal",
    "Microsoft365",
    "MicrosoftTeams",
    "Outlook.com",
    "Yahoo",
  ];

  if (props.type === "dropdown") {
    return (
      <DropdownMenuItem onSelect={() => atcb_action(eventForCalendar)}>
        <CalendarPlus className="mr-2 size-4" />
        Add to calendar
      </DropdownMenuItem>
    );
  }

  if (props.type === "button") {
    return (
      <Button
        className="flex items-center"
        onClick={() => atcb_action(eventForCalendar)}
        variant={"secondary"}
      >
        <CalendarPlus className="mr-2 size-4" />
        <span className="hidden sm:inline">Add to calendar</span>
        <span className="inline sm:hidden">Calendar</span>
      </Button>
    );
  }

  if (props.type === "icon") {
    return (
      <Button
        onClick={() => atcb_action(eventForCalendar)}
        variant={"ghost"}
        size={"icon"}
        aria-label="Add to calendar"
      >
        <CalendarPlus
          className="size-4 text-interactive-1"
          aria-hidden="true"
        />
      </Button>
    );
  }
}
