"use client";

import { Share } from "lucide-react";
import { toast } from "sonner";

import type { AddToCalendarButtonProps } from "@soonlist/cal/types";
import { Button } from "@soonlist/ui/button";

import { env } from "~/env";
import { DropdownMenuItem } from "./DropdownMenu";

export interface ShareButtonProps {
  id: string;
  event: AddToCalendarButtonProps;
  type: "button" | "dropdown" | "icon";
}

export function ShareButton(props: ShareButtonProps) {
  // TODO: Add support for all day events
  const isAllDay = props.event.startTime && props.event.endTime ? false : true;
  const shareText = isAllDay
    ? `(${props.event.startDate}, ${props.event.location}) ${props.event.description}`
    : `(${props.event.startDate} ${props.event.startTime}-${props.event.endTime}, ${props.event.location}) ${props.event.description}`;

  const handleShareClick = async () => {
    if (navigator.share) {
      try {
        await navigator.share({
          title: `${props.event.name} | Soonlist`,
          text: shareText,
          url: `https://${env.NEXT_PUBLIC_VERCEL_PROJECT_PRODUCTION_URL}/event/${props.id}`,
        });
        console.log("Event shared successfully");
      } catch (error) {
        console.error("Error sharing:", error);
      }
    } else {
      // Fallback for browsers that do not support the Share API
      void navigator.clipboard.writeText(
        `https://${env.NEXT_PUBLIC_VERCEL_PROJECT_PRODUCTION_URL}/event/${props.id}`,
      );
      toast("Event URL copied to clipboard!");
    }
  };

  if (props.type === "button") {
    return (
      <Button onClick={handleShareClick}>
        <Share className="mr-2 size-4" />
        Share
      </Button>
    );
  }
  if (props.type === "dropdown") {
    return (
      <DropdownMenuItem onSelect={handleShareClick}>
        <Share className="mr-2 size-4" />
        Share
      </DropdownMenuItem>
    );
  }
  if (props.type === "icon") {
    return (
      <Button onClick={handleShareClick} size={"icon"}>
        <Share className="size-6" />
      </Button>
    );
  }
}
