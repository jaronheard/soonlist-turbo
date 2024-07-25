"use client";

import { useRouter } from "next/navigation";
import { SignedIn } from "@clerk/nextjs";
import { Check, Loader2, Plus } from "lucide-react";
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
            <Check className="mr-2 size-4" />
            Event Saved
          </>
        )}
        {!isLoading && !following && (
          <>
            <Plus className="mr-2 size-4" />
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
        >
          {isLoading && <Loader2 className="size-4 animate-spin" />}
          {!isLoading && following && <Check className="size-4" />}
          {!isLoading && !following && <Plus className="size-4" />}
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
        variant="ghost"
      >
        {isLoading && (
          <>
            <Loader2 className="mr-2 size-4 animate-spin" />
            Please wait
          </>
        )}
        {!isLoading && following && (
          <>
            <Check className="mr-2 size-4" />
            Event Saved
          </>
        )}
        {!isLoading && !following && (
          <>
            <Plus className="mr-2 size-4" />
            Save Event
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
  const follow = api.user.follow.useMutation({
    onError: () => {
      toast.error("User not followed. Please try again.");
    },
    onSuccess: () => {
      toast.success("Followed user.");
      router.refresh();
    },
  });
  const unfollow = api.user.unfollow.useMutation({
    onError: () => {
      toast.error("User not unfollowed. Please try again.");
    },
    onSuccess: () => {
      toast.success("User unfollowed.");
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
        <Button disabled size="sm">
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
