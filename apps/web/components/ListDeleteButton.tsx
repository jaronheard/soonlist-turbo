"use client";

import { useRouter } from "next/navigation";
import { SignedIn, useUser } from "@clerk/nextjs";
import { Loader2, Trash } from "lucide-react";
import { toast } from "sonner";

import { Button } from "@soonlist/ui/button";

import { api } from "~/trpc/react";

interface ListDeleteButtonProps {
  listUserId: string;
  listId: string;
}

export function ListDeleteButton(props: ListDeleteButtonProps) {
  const router = useRouter();
  const { user } = useUser();
  const deleteList = api.list.delete.useMutation({
    onError: () => {
      toast.error("Your list was not deleted. Please try again.");
    },
    onSuccess: () => {
      toast.success("List deleted.");
      router.push(`/${user?.username}/events`);
      router.refresh();
    },
  });

  const roles = user?.unsafeMetadata.roles as string[] | undefined;
  const isOwner = user?.id === props.listUserId || roles?.includes("admin");

  if (!isOwner) return null;

  return (
    <SignedIn>
      {deleteList.isPending && (
        <Button variant={"destructive"} disabled>
          <Loader2 className="mr-2 size-4 animate-spin" />
          Please wait
        </Button>
      )}
      {!deleteList.isPending && (
        <Button
          variant={"destructive"}
          onClick={() =>
            deleteList.mutate({
              listId: props.listId,
            })
          }
        >
          <Trash className="mr-2 size-4" /> Delete
        </Button>
      )}
    </SignedIn>
  );
}
