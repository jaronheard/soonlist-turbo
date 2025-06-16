"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { SignedIn } from "@clerk/nextjs";
import { useMutation } from "convex/react";
import { Heart, Loader2 } from "lucide-react";
import { toast } from "sonner";

import { api } from "@soonlist/backend/convex/_generated/api";
import { Button } from "@soonlist/ui/button";

import { DropdownMenuItem } from "./DropdownMenu";

export function FollowEventDropdownButton({
  eventId,
  following,
}: {
  eventId: string;
  following?: boolean;
}) {
  const router = useRouter();
  const follow = useMutation(api.events.follow);
  const unfollow = useMutation(api.events.unfollow);
  const [isLoading, setIsLoading] = useState(false);

  return (
    <SignedIn>
      <DropdownMenuItem
        onSelect={async () => {
          setIsLoading(true);
          try {
            if (following) {
              await unfollow({ id: eventId });
              toast.success("Event unsaved.");
            } else {
              await follow({ id: eventId });
              toast.success("Event saved.");
            }
            router.refresh();
          } catch (error) {
            toast.error(
              following
                ? "Event not unsaved. Please try again."
                : "Event not saved. Please try again.",
            );
          } finally {
            setIsLoading(false);
          }
        }}
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
  const follow = useMutation(api.events.follow);
  const unfollow = useMutation(api.events.unfollow);
  const [isLoading, setIsLoading] = useState(false);

  const handleFollowToggle = async () => {
    setIsLoading(true);
    try {
      if (following) {
        await unfollow({ id: eventId });
        toast.success("Event unsaved.");
      } else {
        await follow({ id: eventId });
        toast.success("Event saved.");
      }
      router.refresh();
    } catch (error) {
      toast.error(
        following
          ? "Event not unsaved. Please try again."
          : "Event not saved. Please try again.",
      );
    } finally {
      setIsLoading(false);
    }
  };

  if (type === "icon") {
    return (
      <SignedIn>
        <Button
          onClick={handleFollowToggle}
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
        onClick={handleFollowToggle}
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
