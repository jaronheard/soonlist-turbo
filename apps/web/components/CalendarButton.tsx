"use client";

import { atcb_action } from "add-to-calendar-button-react";
import { CalendarPlus } from "lucide-react";

import type { ATCBActionEventConfig } from "@soonlist/cal/types";
import { Button } from "@soonlist/ui/button";

import { DropdownMenuItem } from "./DropdownMenu";

interface CalendarButtonProps {
  event: ATCBActionEventConfig;
  id?: string;
  username?: string;
  type: "button" | "dropdown" | "icon";
}

export function CalendarButton(props: CalendarButtonProps) {
  const eventForCalendar = { ...props.event };
  const additionalText =
    props.username && props.id
      ? `Collected by [url]${process.env.NEXT_PUBLIC_VERCEL_PROJECT_PRODUCTION_URL}/${props.username}/events|@${props.username}[/url] on [url]${process.env.NEXT_PUBLIC_VERCEL_PROJECT_PRODUCTION_URL}/event/${props.id}|Soonlist[/url]`
      : `Collected on [url]${process.env.NEXT_PUBLIC_VERCEL_PROJECT_PRODUCTION_URL}|Soonlist[/url]`;
  eventForCalendar.description = `${props.event.description}[br][br]${additionalText}`;

  if (props.type === "dropdown") {
    return (
      <DropdownMenuItem onSelect={() => atcb_action(eventForCalendar)}>
        <CalendarPlus className="mr-2 size-4" />
        Add to Calendar
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
        variant={"secondary"}
        size={"icon"}
      >
        <CalendarPlus className="size-6" />
      </Button>
    );
  }
}
