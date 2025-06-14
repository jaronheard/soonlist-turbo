"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { SignedIn, useUser } from "@clerk/nextjs";
import { useMutation } from "convex/react";
import { Trash } from "lucide-react";
import { toast } from "sonner";

import { api } from "@soonlist/backend/convex/_generated/api";
import { Button } from "@soonlist/ui/button";

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
  const [isDeleting, setIsDeleting] = useState(false);

  const handleDelete = async () => {
    setIsDeleting(true);
    try {
      await deleteEvent({ id: props.id });
      toast.success("Event deleted.");
      router.push(`/${user?.username}/upcoming`);
      router.refresh();
    } catch (error) {
      toast.error("Your event was not deleted. Please try again.");
    } finally {
      setIsDeleting(false);
    }
  };

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
          onClick={handleDelete}
          disabled={isDeleting}
        >
          <Trash className="size-6" />
        </Button>
      </SignedIn>
    );
  }

  return (
    <SignedIn>
      <DropdownMenuItem
        onSelect={handleDelete}
        disabled={isDeleting}
        className="text-red-600"
      >
        <Trash className="mr-2 size-4" />
        Delete
      </DropdownMenuItem>
    </SignedIn>
  );
}
