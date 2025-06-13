"use client";

import type { AddToCalendarButtonType } from "add-to-calendar-button-react";
import { useRouter } from "next/navigation";
import React from "react";
import { SignInButton } from "@clerk/nextjs";
import { Authenticated, Unauthenticated } from "convex/react";
import { Loader2, Save } from "lucide-react";
import { toast } from "sonner";

import type { EventMetadataLoose } from "@soonlist/cal";
import { Button } from "@soonlist/ui/button";

import { useCroppedImageContext } from "~/context/CroppedImageContext";
import { useNewEventContext } from "~/context/NewEventContext";
import { api } from "@soonlist/backend/convex/_generated/api";
import { useMutation } from "convex/react";

interface UpdateButtonProps {
  event: AddToCalendarButtonType;
  eventMetadata?: EventMetadataLoose;
  id: string;
  update?: boolean;
  notes?: string;
  visibility: "public" | "private";
  lists: Record<string, string>[];
}

export function UpdateButton(props: UpdateButtonProps) {
  const router = useRouter();
  const { setCroppedImagesUrls } = useCroppedImageContext();
  const { setOrganizeData } = useNewEventContext();
  const updateEvent = useMutation(api.events.update);
  const [isUpdating, setIsUpdating] = React.useState(false);

  async function handleUpdate() {
    setIsUpdating(true);
    try {
      const { id } = await updateEvent({
        id: props.id,
        event: props.event,
        eventMetadata: props.eventMetadata,
        comment: props.notes,
        visibility: props.visibility,
        lists: props.lists,
      });
      toast.success("Event updated.");
      setCroppedImagesUrls({});
      setOrganizeData({ notes: "", visibility: "public", lists: [] });
      router.push(`/event/${id}`);
      router.refresh();
    } catch {
      toast.error("Your event was not saved. Please try again.");
    } finally {
      setIsUpdating(false);
    }
  }

  return (
    <>
      <Authenticated>
        {isUpdating && (
          <Button disabled>
            <Loader2 className="mr-2 size-4 animate-spin" />
            Please wait
          </Button>
        )}
        {!isUpdating && (
          <Button
            onClick={() => void handleUpdate()}
          >
            <Save className="mr-2 size-4" /> Update
          </Button>
        )}
      </Authenticated>
      <Unauthenticated>
        {/* TODO: Does this show up anywhere? */}
        <SignInButton>
          <Button>Sign in to update</Button>
        </SignInButton>
      </Unauthenticated>
    </>
  );
}
