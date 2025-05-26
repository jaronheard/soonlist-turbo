"use client";

import { useRouter } from "next/navigation";
import { SignedIn } from "@clerk/nextjs";
import { Heart, Loader2 } from "lucide-react";
import { toast } from "sonner";

import { Button } from "@soonlist/ui/button";

import { api } from "~/trpc/react";
import { DropdownMenuItem } from "./DropdownMenu";

export function FollowEventDropdownButton({
  eventId,
  following,
}: {
  eventId: string;
  following?: boolean;
}) {
  const router = useRouter();
  const follow = api.event.follow.useMutation({
    onError: () => {
      toast.error("Event not saved. Please try again.");
    },
    onSuccess: () => {
      toast.success("Event saved.");
      router.refresh();
    },
  });
  const unfollow = api.event.unfollow.useMutation({
    onError: () => {
      toast.error("Event not unsaved. Please try again.");
    },
    onSuccess: () => {
      toast.success("Event unsaved.");
      router.refresh();
    },
  });
  const isLoading = follow.isPending || unfollow.isPending;

  return (
    <SignedIn>
      <DropdownMenuItem
        onSelect={() =>
          following
            ? unfollow.mutate({ id: eventId })
            : follow.mutate({ id: eventId })
        }
        disabled={isLoading}
      >
        {isLoading && (
          <>
            <Loader2 className="mr-2 size-4 animate-spin" />
            Please wait
          </>
        )}
        {!isLoading && following && (
          <>
            <Heart className="mr-2 size-4 fill-current" />
            Event Saved
          </>
        )}
        {!isLoading && !following && (
          <>
            <Heart className="mr-2 size-4" />
            Save Event
          </>
        )}
      </DropdownMenuItem>
    </SignedIn>
  );
}

export function FollowEventButton({
  eventId,
  following,
  type,
}: {
  eventId: string;
  following?: boolean;
  type?: "button" | "icon";
}) {
  const router = useRouter();
  const follow = api.event.follow.useMutation({
    onError: () => {
      toast.error("Event not saved. Please try again.");
    },
    onSuccess: () => {
      toast.success("Event saved.");
      router.refresh();
    },
  });
  const unfollow = api.event.unfollow.useMutation({
    onError: () => {
      toast.error("Event not unsaved. Please try again.");
    },
    onSuccess: () => {
      toast.success("Event unsaved.");
      router.refresh();
    },
  });
  const isLoading = follow.isPending || unfollow.isPending;

  if (type === "icon") {
    return (
      <SignedIn>
        <Button
          onClick={() =>
            following
              ? unfollow.mutate({ id: eventId })
              : follow.mutate({ id: eventId })
          }
          disabled={isLoading}
          variant="ghost"
          size="icon"
          className="bg-interactive-2 text-interactive-1 hover:bg-interactive-2"
        >
          {isLoading && <Loader2 className="size-4 animate-spin" />}
          {!isLoading && (
            <Heart className={`size-4 ${following ? "fill-current" : ""}`} />
          )}
        </Button>
      </SignedIn>
    );
  }

  return (
    <SignedIn>
      <Button
        onClick={() =>
          following
            ? unfollow.mutate({ id: eventId })
            : follow.mutate({ id: eventId })
        }
        disabled={isLoading}
        className="bg-interactive-3 text-interactive-1 hover:bg-interactive-3/90"
      >
        {isLoading && (
          <>
            <Loader2 className="mr-2 size-4 animate-spin" />
            Please wait
          </>
        )}
        {!isLoading && (
          <>
            <Heart
              className={`mr-2 size-4 ${following ? "fill-current" : ""}`}
            />
            {following ? "Event saved" : "Save event"}
          </>
        )}
      </Button>
    </SignedIn>
  );
}
