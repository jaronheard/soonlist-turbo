"use client";

import { useRouter } from "next/navigation";
import { SignedIn, useUser } from "@clerk/nextjs";
import { Trash } from "lucide-react";
import { toast } from "sonner";

import { Button } from "@soonlist/ui/button";

import { api } from "~/trpc/react";
import { DropdownMenuItem } from "./DropdownMenu";

export interface DeleteButtonProps {
  userId: string;
  id: string;
  type: "icon" | "button" | "dropdown";
}

export function DeleteButton(props: DeleteButtonProps) {
  const { user } = useUser();
  const router = useRouter();
  const deleteEvent = api.event.delete.useMutation({
    onError: () => {
      toast.error("Your event was not deleted. Please try again.");
    },
    onSuccess: () => {
      toast.success("Event deleted.");
      router.push(`/${user?.username}/upcoming`);
      router.refresh();
    },
  });

  const roles = user?.unsafeMetadata.roles as string[] | undefined;
  const isOwner = user?.id === props.userId || roles?.includes("admin");

  if (!isOwner) {
    return null;
  }

  if (props.type === "icon") {
    return (
      <SignedIn>
        <Button
          size={"icon"}
          variant={"destructive"}
          onClick={() => {
            deleteEvent.mutate({ id: props.id });
          }}
        >
          <Trash className="size-6" />
        </Button>
      </SignedIn>
    );
  }

  return (
    <SignedIn>
      <DropdownMenuItem
        onSelect={() => {
          deleteEvent.mutate({ id: props.id });
        }}
        disabled={deleteEvent.isPending}
        className="text-red-600"
      >
        <Trash className="mr-2 size-4" />
        Delete
      </DropdownMenuItem>
    </SignedIn>
  );
}
