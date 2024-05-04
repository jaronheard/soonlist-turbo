"use client";

import type { AddToCalendarButtonType } from "add-to-calendar-button-react";
import { useRouter } from "next/navigation";
import { SignedIn, SignedOut, SignInButton } from "@clerk/nextjs";
import { Loader2, Save } from "lucide-react";
import { toast } from "sonner";

import type { EventMetadataLoose } from "@soonlist/cal";
import { Button } from "@soonlist/ui/button";

import { useCroppedImageContext } from "~/context/CroppedImageContext";
import { useNewEventContext } from "~/context/NewEventContext";
import { api } from "~/trpc/react";

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
  const updateEvent = api.event.update.useMutation({
    onError: () => {
      toast.error("Your event was not saved. Please try again.");
    },
    onSuccess: ({ id }) => {
      toast.success("Event updated.");
      // Clear context state
      setCroppedImagesUrls({});
      setOrganizeData({
        notes: "",
        visibility: "public",
        lists: [],
      });
      router.push(`/event/${id}`);
      router.refresh();
    },
  });

  return (
    <>
      <SignedIn>
        {updateEvent.isPending && (
          <Button disabled>
            <Loader2 className="mr-2 size-4 animate-spin" />
            Please wait
          </Button>
        )}
        {!updateEvent.isPending && (
          <Button
            onClick={() =>
              updateEvent.mutate({
                id: props.id,
                event: props.event,
                eventMetadata: props.eventMetadata,
                comment: props.notes,
                visibility: props.visibility,
                lists: props.lists,
              })
            }
          >
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
