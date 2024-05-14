"use client";

import { useRouter } from "next/navigation";
import { SignedIn, SignedOut, SignInButton } from "@clerk/nextjs";
import { Loader2 } from "lucide-react";
import { toast } from "sonner";

import { Button } from "@soonlist/ui/button";
import { CardDescription } from "@soonlist/ui/card";

import { api } from "~/trpc/react";

interface ListUpdateButtonProps {
  id: string;
  name: string;
  description: string;
  visibility: "public" | "private";
  afterSuccess?: string;
}

export function ListUpdateButton(props: ListUpdateButtonProps) {
  const router = useRouter();
  const updateList = api.list.update.useMutation({
    onError: () => {
      toast.error("Your list was not saved. Please try again.");
    },
    onSuccess: ({ id }) => {
      toast.success("List saved.");
      router.push(`/list/${id}`);
      router.refresh();
    },
  });

  return (
    <>
      <SignedIn>
        <Button
          onClick={() =>
            updateList.mutate({
              listId: props.id,
              name: props.name,
              description: props.description,
              visibility: props.visibility,
            })
          }
          disabled={updateList.isPending}
        >
          {updateList.isPending ? (
            <>
              <Loader2 className="mr-2 size-4 animate-spin" />
              Please wait
            </>
          ) : (
            "Update"
          )}
        </Button>
      </SignedIn>
      <SignedOut>
        {/* TODO: Redirect somewhere meaningful */}
        <SignInButton>
          <Button>Sign in to update</Button>
        </SignInButton>
        <CardDescription className="italic">
          *TODO: Will not save your progress
        </CardDescription>
      </SignedOut>
    </>
  );
}
