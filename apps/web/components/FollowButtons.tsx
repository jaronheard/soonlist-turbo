"use client";

import { useRouter } from "next/navigation";
import { SignedIn } from "@clerk/nextjs";
import { Check, Heart, Loader2, Plus } from "lucide-react";
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

export function FollowUserButton({
  userId,
  following,
  className,
}: {
  userId: string;
  following: boolean;
  className?: string;
}) {
  const router = useRouter();
  const utils = api.useUtils();
  const follow = api.user.follow.useMutation({
    onError: () => {
      toast.error("User not followed. Please try again.");
    },
    onSuccess: () => {
      toast.success("Followed user.");
      void utils.user.getFollowing.invalidate();
      void utils.user.getIfFollowing.invalidate();
      void utils.event.getFollowingForUser.invalidate();
      void utils.event.getFollowingUpcomingForUser.invalidate();
      void utils.event.getStats.invalidate();
      router.refresh();
    },
  });
  const unfollow = api.user.unfollow.useMutation({
    onError: () => {
      toast.error("User not unfollowed. Please try again.");
    },
    onSuccess: () => {
      toast.success("User unfollowed.");
      void utils.user.getFollowing.invalidate();
      void utils.user.getIfFollowing.invalidate();
      void utils.event.getFollowingForUser.invalidate();
      void utils.event.getFollowingUpcomingForUser.invalidate();
      void utils.event.getStats.invalidate();
      router.refresh();
    },
  });
  const isLoading = follow.isPending || unfollow.isPending;
  return (
    <SignedIn>
      {isLoading && (
        <Button disabled size="sm" className={className}>
          <Loader2 className="mr-2 size-4 animate-spin" />
          Please wait
        </Button>
      )}
      {!isLoading && (
        <Button
          onClick={() =>
            following
              ? unfollow.mutate({ followingId: userId })
              : follow.mutate({ followingId: userId })
          }
          size="sm"
          className={className}
        >
          {following && (
            <>
              <Check className="mr-2 size-4" />
              Following
            </>
          )}
          {!following && (
            <>
              <Plus className="mr-2 size-4" />
              Follow
            </>
          )}
        </Button>
      )}
    </SignedIn>
  );
}

export function FollowListButton({
  listId,
  following,
}: {
  listId: string;
  following: boolean;
}) {
  const router = useRouter();
  const follow = api.list.follow.useMutation({
    onError: () => {
      toast.error("List not saved. Please try again.");
    },
    onSuccess: () => {
      toast.success("List saved.");
      router.refresh();
    },
  });
  const unfollow = api.list.unfollow.useMutation({
    onError: () => {
      toast.error("List not unsaved. Please try again.");
    },
    onSuccess: () => {
      toast.success("List unsaved.");
      router.refresh();
    },
  });
  const isLoading = follow.isPending || unfollow.isPending;

  return (
    <SignedIn>
      {isLoading && (
        <Button
          disabled
          size="sm"
          className="bg-purple-100 hover:bg-purple-200"
        >
          <Loader2 className="mr-2 size-4 animate-spin" />
          Please wait
        </Button>
      )}
      {!isLoading && (
        <Button
          onClick={() =>
            following
              ? unfollow.mutate({ listId: listId })
              : follow.mutate({ listId: listId })
          }
          size="sm"
          className="bg-purple-100 text-purple-700 hover:bg-purple-200"
        >
          {following && (
            <>
              <Check className="mr-2 size-4" />
              Following List
            </>
          )}
          {!following && (
            <>
              <Plus className="mr-2 size-4" />
              Follow List
            </>
          )}
        </Button>
      )}
    </SignedIn>
  );
}
