"use client";

import { SignedIn, useUser } from "@clerk/nextjs";
import Link from "next/link";
import { Pencil } from "lucide-react";
import { DropdownMenuItem } from "./DropdownMenu";
import { Button } from "./ui/button";

export type EditButtonProps = {
  userId: string;
  id: string;
  type: "icon" | "button" | "dropdown";
};

export function EditButton(props: EditButtonProps) {
  const { user } = useUser();
  const roles = user?.unsafeMetadata.roles as string[] | undefined;
  const isOwner =
    user?.id === props.userId ||
    user?.externalId === props.userId ||
    roles?.includes("admin");

  if (!isOwner) {
    return null;
  }

  if (props.type === "icon") {
    return (
      <SignedIn>
        <Button size={"icon"} asChild variant={"secondary"}>
          <Link href={`/event/${props.id}/edit`}>
            <Pencil className="size-6" />
          </Link>
        </Button>
      </SignedIn>
    );
  }

  return (
    <SignedIn>
      <DropdownMenuItem asChild>
        <Link href={`/event/${props.id}/edit`}>
          <Pencil className="mr-2 size-4" />
          Edit
        </Link>
      </DropdownMenuItem>
    </SignedIn>
  );
}
