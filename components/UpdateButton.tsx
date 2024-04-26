"use client";

import { SignInButton, SignedIn, SignedOut } from "@clerk/nextjs";
import { type AddToCalendarButtonType } from "add-to-calendar-button-react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { Loader2, Save } from "lucide-react";
import { Button } from "./ui/button";
import { useCroppedImageContext } from "@/context/CroppedImageContext";
import { useNewEventContext } from "@/context/NewEventContext";
import { api } from "@/trpc/react";
import { type EventMetadataLoose } from "@/lib/prompts";

type UpdateButtonProps = {
  event: AddToCalendarButtonType;
  eventMetadata?: EventMetadataLoose;
  id: string;
  update?: boolean;
  notes?: string;
  visibility: "public" | "private";
  lists: Record<string, string>[];
};

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
        {updateEvent.isLoading && (
          <Button disabled>
            <Loader2 className="mr-2 size-4 animate-spin" />
            Please wait
          </Button>
        )}
        {!updateEvent.isLoading && (
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
        <SignInButton
          afterSignInUrl={`${process.env.NEXT_PUBLIC_URL}/`}
          afterSignUpUrl={`${process.env.NEXT_PUBLIC_URL}/get-started`}
        >
          <Button>Sign in to update</Button>
        </SignInButton>
      </SignedOut>
    </>
  );
}
