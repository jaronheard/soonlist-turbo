"use client";

import { SignInButton, SignedIn, SignedOut } from "@clerk/nextjs";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { Loader2 } from "lucide-react";
import { Button } from "./ui/button";
import { CardDescription } from "./ui/card";
import { api } from "@/trpc/react";

type ListUpdateButtonProps = {
  id: string;
  name: string;
  description: string;
  afterSuccess?: string;
};

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
        <SignInButton
          afterSignInUrl={`${process.env.NEXT_PUBLIC_URL}/`}
          afterSignUpUrl={`${process.env.NEXT_PUBLIC_URL}/get-started`}
        >
          <Button>Sign in to update</Button>
        </SignInButton>
        <CardDescription className="italic">
          *TODO: Will not save your progress
        </CardDescription>
      </SignedOut>
    </>
  );
}
