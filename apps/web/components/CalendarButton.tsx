"use client";

import { atcb_action } from "add-to-calendar-button-react";
import { CalendarPlus } from "lucide-react";

import type { ATCBActionEventConfig } from "@soonlist/cal/types";
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
  const additionalText =
    props.username && props.id
      ? `Captured by [url]${env.NEXT_PUBLIC_VERCEL_PROJECT_PRODUCTION_URL}/${props.username}/events|${displayName}[/url] on [url]${env.NEXT_PUBLIC_VERCEL_PROJECT_PRODUCTION_URL}/event/${props.id}|Soonlist[/url]`
      : `Captured on [url]${env.NEXT_PUBLIC_VERCEL_PROJECT_PRODUCTION_URL}|Soonlist[/url]`;
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
      >
        <CalendarPlus className="size-4 text-interactive-1" />
      </Button>
    );
  }
}
