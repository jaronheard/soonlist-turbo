"use client";

import { useRouter } from "next/navigation";
import { SignedIn, SignedOut, SignInButton } from "@clerk/nextjs";
import { Loader2 } from "lucide-react";
import { toast } from "sonner";

import { api } from "~/trpc/react";
import { Button } from "./ui/button";
import { CardDescription } from "./ui/card";

interface ListUpdateButtonProps {
  id: string;
  name: string;
  description: string;
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
      router.refresh();
      router.push(`/list/${id}`);
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
            })
          }
          disabled={updateList.isLoading}
        >
          {updateList.isLoading ? (
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
