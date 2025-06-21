"use client";

import type { AddToCalendarButtonType } from "add-to-calendar-button-react";
import { useState } from "react";
import { useRouter } from "next/navigation";
import { SignedIn, SignedOut, SignInButton } from "@clerk/nextjs";
import { useMutation } from "convex/react";
import { Loader2, Save } from "lucide-react";
import { toast } from "sonner";

import type { EventMetadataLoose } from "@soonlist/cal";
import { api } from "@soonlist/backend/convex/_generated/api";
import { Button } from "@soonlist/ui/button";

import { useCroppedImageContext } from "~/context/CroppedImageContext";
import { useNewEventContext } from "~/context/NewEventContext";

interface UpdateButtonProps {
  event: AddToCalendarButtonType;
  eventMetadata?: EventMetadataLoose;
  id: string;
  update?: boolean;
  notes?: string;
  visibility: "public" | "private";
  lists: Record<string, string>[];
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

// Transform lists array format
function transformLists(lists: Record<string, string>[]) {
  return lists.map((list) => {
    const value = Object.values(list)[0];
    return { value: value || "" };
  });
}

export function UpdateButton(props: UpdateButtonProps) {
  const router = useRouter();
  const { setCroppedImagesUrls } = useCroppedImageContext();
  const { setOrganizeData } = useNewEventContext();
  const updateEvent = useMutation(api.events.update);
  const [isUpdating, setIsUpdating] = useState(false);

  const handleUpdate = async () => {
    setIsUpdating(true);
    try {
      const result = await updateEvent({
        id: props.id,
        event: transformEventData(props.event),
        eventMetadata: props.eventMetadata,
        comment: props.notes,
        visibility: props.visibility,
        lists: transformLists(props.lists),
      });
      toast.success("Event updated.");
      // Clear context state
      setCroppedImagesUrls({});
      setOrganizeData({
        notes: "",
        visibility: "public",
        lists: [],
      });
      router.push(`/event/${result.id}`);
      router.refresh();
    } catch {
      toast.error("Your event was not saved. Please try again.");
    } finally {
      setIsUpdating(false);
    }
  };

  return (
    <>
      <SignedIn>
        {isUpdating && (
          <Button disabled>
            <Loader2 className="mr-2 size-4 animate-spin" />
            Please wait
          </Button>
        )}
        {!isUpdating && (
          <Button onClick={handleUpdate}>
            <Save className="mr-2 size-4" /> Update
          </Button>
        )}
      </SignedIn>
      <SignedOut>
        {/* TODO: Does this show up anywhere? */}
        <SignInButton>
          <Button>Sign in to update</Button>
        </SignInButton>
      </SignedOut>
    </>
  );
}
