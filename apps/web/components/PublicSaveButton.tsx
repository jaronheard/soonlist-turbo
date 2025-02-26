"use client";

import type { AddToCalendarButtonType } from "add-to-calendar-button-react";
import { useRouter } from "next/navigation";
import { Loader2, UploadCloud } from "lucide-react";
import React from "react";
import { toast } from "sonner";

import type { EventMetadataLoose } from "@soonlist/cal";
import { Button } from "@soonlist/ui/button";

import { api } from "~/trpc/react";

interface PublicSaveButtonProps {
  event: AddToCalendarButtonType;
  eventMetadata?: EventMetadataLoose;
  notes?: string;
  lists: Record<string, string>[];
  onClick?: () => void;
  loading?: boolean;
}

export function PublicSaveButton(props: PublicSaveButtonProps) {
  const router = useRouter();
  const updateEvent = api.publicEvent.create.useMutation({
    onError: () => {
      toast.error("Your event was not saved. Please try again.");
    },
    onSuccess: ({ id }) => {
      toast.success("Event saved.");
      router.push(`/event/${id}`);
    },
  });

  return (
    <>
      {(updateEvent.isPending || props.loading) && (
        <Button disabled>
          <Loader2 className="mr-2 size-4 animate-spin" />
          Saving
        </Button>
      )}
      {!(updateEvent.isPending || props.loading) && (
        <Button
          onClick={() => {
            props.onClick?.();
            updateEvent.mutate({
              event: props.event,
              eventMetadata: props.eventMetadata,
              comment: props.notes,
              visibility: "public",
              lists: props.lists,
              environment:
                process.env.NODE_ENV === "development"
                  ? "development"
                  : "production",
            });
          }}
        >
          <UploadCloud className="mr-2 size-4" /> Publish
        </Button>
      )}
    </>
  );
}

