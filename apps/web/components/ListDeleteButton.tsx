"use client";

import { SignedIn, useUser } from "@clerk/nextjs";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { Loader2, Trash } from "lucide-react";
import { Button } from "./ui/button";
import { api } from "@/trpc/react";

type ListDeleteButtonProps = {
  listUserId: string;
  listId: string;
};

export function ListDeleteButton(props: ListDeleteButtonProps) {
  const router = useRouter();
  const { user } = useUser();
  const deleteList = api.list.delete.useMutation({
    onError: () => {
      toast.error("Your list was not deleted. Please try again.");
    },
    onSuccess: () => {
      toast.success("List deleted.");
      router.refresh();
      router.push(`/${user?.username}/events`);
    },
  });

  const roles = user?.unsafeMetadata.roles as string[] | undefined;
  const isOwner =
    user?.id === props.listUserId ||
    user?.externalId === props.listUserId ||
    roles?.includes("admin");

  if (!isOwner) return null;

  return (
    <SignedIn>
      {deleteList.isLoading && (
        <Button variant={"destructive"} disabled>
          <Loader2 className="mr-2 size-4 animate-spin" />
          Please wait
        </Button>
      )}
      {!deleteList.isLoading && (
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
