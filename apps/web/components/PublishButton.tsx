"use client";

import type { AddToCalendarButtonType } from "add-to-calendar-button-react";
import { useRouter } from "next/navigation";
import { SignedIn, SignedOut, SignInButton } from "@clerk/nextjs";
import { useMutation } from "convex/react";
import { Loader2, UploadCloud } from "lucide-react";
import { toast } from "sonner";

import type { EventMetadataLoose } from "@soonlist/cal";
import { api } from "@soonlist/backend/convex/_generated/api";
import { Button } from "@soonlist/ui/button";

interface PublishButtonProps {
  event: AddToCalendarButtonType;
  eventMetadata?: EventMetadataLoose;
  notes?: string;
  visibility: "public" | "private";
  lists: Record<string, string>[];
  onClick?: () => void;
  loading?: boolean;
}

// Transform AddToCalendarButtonType to Convex event format
function transformEventData(event: AddToCalendarButtonType) {
  return {
    name: event.name || "",
    startDate: event.startDate || "",
    endDate: event.endDate || event.startDate || "",
    startTime: event.startTime,
    endTime: event.endTime,
    timeZone: event.timeZone,
    location: event.location,
    description: event.description,
    images: Array.isArray(event.images)
      ? event.images
      : event.images
        ? [event.images]
        : undefined,
  };
}

function transformLists(lists: Record<string, string>[]) {
  return lists.map((list) => {
    const value = Object.values(list)[0];
    return { value: value || "" };
  });
}

export function PublishButton(props: PublishButtonProps) {
  const router = useRouter();
  const createEvent = useMutation(api.events.create);

  return (
    <>
      <SignedIn>
        {props.loading && (
          <Button disabled>
            <Loader2 className="mr-2 size-4 animate-spin" />
            Publishing...
          </Button>
        )}
        {!props.loading && (
          <Button
            onClick={async () => {
              props.onClick?.();
              try {
                const eventId = await createEvent({
                  event: transformEventData(props.event),
                  eventMetadata: props.eventMetadata,
                  comment: props.notes,
                  visibility: props.visibility,
                  lists: transformLists(props.lists),
                });
                toast.success("Event published.");
                localStorage.removeItem("updatedProps");
                router.push(`/event/${eventId.id}`);
              } catch {
                toast.error("Your event was not published. Please try again.");
              }
            }}
          >
            <UploadCloud className="mr-2 size-4" /> Publish
          </Button>
        )}
      </SignedIn>
      <SignedOut>
        <SignInButton>
          <Button
            onClick={() => {
              localStorage.setItem("updatedProps", JSON.stringify(props));
            }}
          >
            Sign in to publish
          </Button>
        </SignInButton>
      </SignedOut>
    </>
  );
}
