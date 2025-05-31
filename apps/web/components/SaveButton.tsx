"use client";

import type { AddToCalendarButtonType } from "add-to-calendar-button-react";
import { useRouter } from "next/navigation";
import React from "react";
import { SignInButton } from "@clerk/nextjs";
import { Authenticated, Unauthenticated } from "convex/react";
import { Loader2, UploadCloud } from "lucide-react";
import { toast } from "sonner";

import type { EventMetadataLoose } from "@soonlist/cal";
import { Button } from "@soonlist/ui/button";

import { api } from "@soonlist/backend/convex/_generated/api";
import { useMutation } from "convex/react";

interface SaveButtonProps {
  event: AddToCalendarButtonType;
  eventMetadata?: EventMetadataLoose;
  notes?: string;
  visibility: "public" | "private";
  lists: Record<string, string>[];
  onClick?: () => void;
  loading?: boolean;
}

export function SaveButton(props: SaveButtonProps) {
  const router = useRouter();
  const createEvent = useMutation(api.events.create);
  const [isSaving, setIsSaving] = React.useState(false);

  async function handleSave() {
    setIsSaving(true);
    try {
      const { id } = await createEvent({
        event: props.event,
        eventMetadata: props.eventMetadata,
        comment: props.notes,
        visibility: props.visibility,
        lists: props.lists,
      });
      toast.success("Event saved.");
      router.push(`/event/${id}`);
    } catch (error) {
      toast.error("Your event was not saved. Please try again.");
    } finally {
      setIsSaving(false);
      localStorage.removeItem("updatedProps");
    }
  }

  return (
    <>
      <Authenticated>
        {(isSaving || props.loading) && (
          <Button disabled>
            <Loader2 className="mr-2 size-4 animate-spin" />
            Saving
          </Button>
        )}
        {!isSaving && !props.loading && (
          <Button
            onClick={() => {
              props.onClick?.();
              void handleSave();
            }}
          >
            <UploadCloud className="mr-2 size-4" /> Publish
          </Button>
        )}
      </Authenticated>
      <Unauthenticated>
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
      </Unauthenticated>
    </>
  );
}
