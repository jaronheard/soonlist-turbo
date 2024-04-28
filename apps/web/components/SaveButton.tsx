"use client";

import type { AddToCalendarButtonType } from "add-to-calendar-button-react";
import { useRouter } from "next/navigation";
import { SignedIn, SignedOut, SignInButton } from "@clerk/nextjs";
import { Loader2, UploadCloud } from "lucide-react";
import { toast } from "sonner";

import type { EventMetadataLoose } from "~/lib/prompts";
import { api } from "~/trpc/react";
import { Button } from "./ui/button";

interface SaveButtonProps {
  event: AddToCalendarButtonType;
  eventMetadata?: EventMetadataLoose;
  notes?: string;
  visibility: "public" | "private";
  lists: Record<string, string>[];
}

export function SaveButton(props: SaveButtonProps) {
  const router = useRouter();
  const updateEvent = api.event.create.useMutation({
    onError: () => {
      toast.error("Your event was not saved. Please try again.");
    },
    onSuccess: ({ id }) => {
      toast.success("Event saved.");
      // router.refresh();
      router.push(`/event/${id}`);
      // context needs to be reset after saving, but done on next page
    },
  });

  return (
    <>
      <SignedIn>
        {updateEvent.isLoading && (
          <Button disabled>
            <Loader2 className="mr-2 size-4 animate-spin" />
            Please wait
          </Button>
        )}
        {!updateEvent.isLoading && (
          <Button
            onClick={() => {
              updateEvent.mutate({
                event: props.event,
                eventMetadata: props.eventMetadata,
                comment: props.notes,
                visibility: props.visibility,
                lists: props.lists,
              });
              localStorage.removeItem("updatedProps");
            }}
          >
            <UploadCloud className="mr-2 size-4" /> Publish
          </Button>
        )}
      </SignedIn>
      <SignedOut>
        {/* TODO: instead convert from the AddToCalendarButtonProps */}
        <SignInButton>
          <Button
            onClick={() => {
              console.log("props", props);
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
