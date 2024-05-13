"use client";

import { useRouter } from "next/navigation";
import { SignedIn, SignedOut, SignInButton } from "@clerk/nextjs";
import { Loader2, Save } from "lucide-react";
import { toast } from "sonner";

import { Button } from "@soonlist/ui/button";
import { CardDescription } from "@soonlist/ui/card";

import { api } from "~/trpc/react";

interface ListSaveButtonProps {
  name: string;
  description: string;
  visibility: "public" | "private";
  afterSuccess?: string;
  afterSuccessFunction?: () => void;
}

export function ListSaveButton(props: ListSaveButtonProps) {
  const router = useRouter();
  const createList = api.list.create.useMutation({
    onError: () => {
      toast.error("Your list was not saved. Please try again.");
    },
    onSuccess: ({ id }) => {
      toast.success("List saved.");
      router.refresh();
      props.afterSuccessFunction
        ? props.afterSuccessFunction()
        : router.push(`/list/${id}`);
    },
  });

  return (
    <>
      <SignedIn>
        {createList.isPending && (
          <Button disabled>
            <Loader2 className="mr-2 size-4 animate-spin" />
            Please wait
          </Button>
        )}
        {!createList.isPending && (
          <Button
            onClick={() =>
              createList.mutate({
                name: props.name,
                description: props.description,
                visibility: props.visibility,
              })
            }
          >
            <Save className="mr-2 size-4" /> Save
          </Button>
        )}
      </SignedIn>
      <SignedOut>
        {/* TODO: Redirect somewhere meaningful */}
        <SignInButton>
          <Button>Sign in to save</Button>
        </SignInButton>
        <CardDescription className="italic">
          *TODO: Will not save your progress
        </CardDescription>
      </SignedOut>
    </>
  );
}
