import Link from "next/link";
import { auth, currentUser } from "@clerk/nextjs/server";
import { X } from "lucide-react";

import { Button } from "@soonlist/ui/button";

import { AddEvent } from "~/app/(base)/AddEvent";
import { Logo } from "~/components/Logo";
import { env } from "~/env";
import { api } from "~/trpc/server";
import { EventsFromImage } from "./EventsFromImage";
import { EventsFromRawText } from "./EventsFromRawText";
import { ProgressStages } from "./ProgressStages";

export const maxDuration = 60;

interface Props {
  searchParams: {
    rawText?: string;
    saveIntent?: boolean;
    filePath?: string;
    timezone?: string;
    edit?: boolean;
  };
}

export default async function Page({ searchParams }: Props) {
  const { userId } = auth().protect({
    unauthenticatedUrl: "/sign-up",
    unauthorizedUrl: "/",
  });
  // get externalId, but only in dev
  let externalId;
  if (env.NODE_ENV === "development") {
    const user = await currentUser();
    externalId = user?.externalId;
  }
  const lists = await api.list.getAllForUserId({
    userId: externalId || userId,
  });
  const timezone = searchParams.timezone || "America/Los_Angeles";
  // image only
  if (searchParams.filePath && !searchParams.rawText) {
    return (
      <ProgressStages
        filePath={searchParams.filePath}
        lists={lists}
        Preview={
          <EventsFromImage
            timezone={timezone}
            filePath={searchParams.filePath}
          />
        }
      ></ProgressStages>
    );
  }

  // text (with or without image)
  if (searchParams.rawText) {
    return (
      <ProgressStages
        filePath={searchParams.filePath}
        lists={lists}
        Preview={
          <EventsFromRawText
            timezone={timezone}
            rawText={searchParams.rawText}
          />
        }
      ></ProgressStages>
    );
  }

  // default
  return (
    <>
      <header className="fixed inset-x-0 top-2 z-10 flex flex-col items-center justify-center">
        <Button
          asChild
          className="absolute -top-2 right-0"
          variant={"ghost"}
          size={"icon"}
        >
          <Link href="/">
            <X />
          </Link>
        </Button>
        <div className="absolute top-0 z-20 flex flex-col items-center">
          <Logo className="origin-top scale-50" />
          <h1 className="-mt-2 hidden font-heading text-2.5xl font-bold leading-9 tracking-wide text-gray-700 lg:block">
            Add Event
          </h1>
        </div>
      </header>
      <div className="flex w-full flex-col items-center gap-8 pt-4">
        <AddEvent />
      </div>
    </>
  );
}
