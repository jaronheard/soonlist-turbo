"use client";

import { useSearchParams } from "next/navigation";
import { SignedIn } from "@clerk/nextjs";

import { AddListCard } from "~/components/AddListCard";

export default function Page() {
  const searchParams = useSearchParams();
  const afterSuccess = searchParams.get("afterSuccess") || "";
  return (
    <SignedIn>
      <AddListCard
        name=""
        description=""
        visibility="public"
        afterSuccess={afterSuccess}
      />
    </SignedIn>
  );
}
