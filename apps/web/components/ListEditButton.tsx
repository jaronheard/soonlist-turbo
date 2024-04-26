"use client";

import { SignedIn, useUser } from "@clerk/nextjs";
import Link from "next/link";
import { Edit } from "lucide-react";
import { buttonVariants } from "./ui/button";

type ListEditButtonProps = {
  listUserId: string;
  listId: string;
};

export function ListEditButton(props: ListEditButtonProps) {
  const { user } = useUser();

  const roles = user?.unsafeMetadata.roles as string[] | undefined;
  const isOwner =
    user?.id === props.listUserId ||
    user?.externalId === props.listUserId ||
    roles?.includes("admin");
  if (!isOwner) return null;

  return (
    <SignedIn>
      <Link href={`/list/${props.listId}/edit`} className={buttonVariants()}>
        <Edit className="mr-2 size-4" /> Edit
      </Link>
    </SignedIn>
  );
}
