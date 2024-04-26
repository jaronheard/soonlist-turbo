"use client";

import { SignInButton, SignedIn, SignedOut } from "@clerk/nextjs";
import { type AddToCalendarButtonType } from "add-to-calendar-button-react";
import { useRouter, useSearchParams } from "next/navigation";
import { toast } from "sonner";
import { Loader2, UploadCloud } from "lucide-react";
import { Button } from "./ui/button";
import { api } from "@/trpc/react";
import { type EventMetadataLoose } from "@/lib/prompts";

type SaveButtonProps = {
  event: AddToCalendarButtonType;
  eventMetadata?: EventMetadataLoose;
  notes?: string;
  visibility: "public" | "private";
  lists: Record<string, string>[];
};

export function SaveButton(props: SaveButtonProps) {
  const router = useRouter();
  const params = useSearchParams();
  const filePath = params.get("filePath") || "";
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
        <SignInButton
          afterSignInUrl={`${process.env.NEXT_PUBLIC_URL}/new?saveIntent=true&filePath=${filePath}`}
          afterSignUpUrl={`${process.env.NEXT_PUBLIC_URL}/new?saveIntent=true&filePath=${filePath}`}
        >
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
