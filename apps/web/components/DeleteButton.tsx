"use client";

import React from "react";
import { useRouter } from "next/navigation";
import { useUser } from "@clerk/nextjs";
import { Authenticated } from "convex/react";
import { Trash } from "lucide-react";
import { toast } from "sonner";

import { Button } from "@soonlist/ui/button";

import { api } from "@soonlist/backend/convex/_generated/api";
import { useMutation } from "convex/react";
import { DropdownMenuItem } from "./DropdownMenu";

export interface DeleteButtonProps {
  userId: string;
  id: string;
  type: "icon" | "button" | "dropdown";
}

export function DeleteButton(props: DeleteButtonProps) {
  const { user } = useUser();
  const router = useRouter();
  const deleteEvent = useMutation(api.events.deleteEvent);
  const [isDeleting, setIsDeleting] = React.useState(false);

  async function handleDelete() {
    setIsDeleting(true);
    try {
      await deleteEvent({ id: props.id });
      toast.success("Event deleted.");
      router.push(`/${user?.username}/upcoming`);
      router.refresh();
    } catch {
      toast.error("Your event was not deleted. Please try again.");
    } finally {
      setIsDeleting(false);
    }
  }

  const roles = user?.unsafeMetadata.roles as string[] | undefined;
  const isOwner = user?.id === props.userId || roles?.includes("admin");

  if (!isOwner) {
    return null;
  }

  if (props.type === "icon") {
    return (
      <Authenticated>
        <Button
          size={"icon"}
          variant={"destructive"}
          onClick={() => void handleDelete()}
        >
          <Trash className="size-6" />
        </Button>
      </Authenticated>
    );
  }

  return (
    <Authenticated>
      <DropdownMenuItem
        onSelect={() => void handleDelete()}
        disabled={isDeleting}
        className="text-red-600"
      >
        <Trash className="mr-2 size-4" />
        Delete
      </DropdownMenuItem>
    </Authenticated>
  );
}
