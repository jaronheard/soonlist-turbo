"use client";

import Link from "next/link";
import { SignedIn, useUser } from "@clerk/nextjs";
import { Pencil } from "lucide-react";

import { Button } from "@soonlist/ui/button";

import { DropdownMenuItem } from "./DropdownMenu";

export interface EditButtonProps {
  userId: string;
  id: string;
  type: "icon" | "button" | "dropdown";
}

export function EditButton(props: EditButtonProps) {
  const { user } = useUser();
  const roles = user?.unsafeMetadata.roles as string[] | undefined;
  const isOwner = user?.id === props.userId || roles?.includes("admin");

  if (!isOwner) {
    return null;
  }

  if (props.type === "icon") {
    return (
      <SignedIn>
        <Button size={"icon"} asChild variant={"ghost"}>
          <Link href={`/event/${props.id}/edit`}>
            <Pencil className="size-4 text-interactive-1" />
          </Link>
        </Button>
      </SignedIn>
    );
  }

  return (
    <SignedIn>
      <DropdownMenuItem asChild>
        <Link href={`/event/${props.id}/edit`}>
          <Pencil className="mr-2 size-4 text-interactive-1" />
          Edit
        </Link>
      </DropdownMenuItem>
    </SignedIn>
  );
}
