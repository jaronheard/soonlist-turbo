import { Suspense } from "react";
import { currentUser } from "@clerk/nextjs/server";
import Link from "next/link";
import { X } from "lucide-react";
import { ProgressStages } from "./ProgressStages";
import { EventsFromRawText } from "./EventsFromRawText";
import { EventsFromImage } from "./EventsFromImage";
import { EventsFromSaved } from "./EventsFromSaved";
import { ImageUpload } from "@/components/ImageUpload";
import { YourDetails } from "@/components/YourDetails";
import { AddEvent } from "@/app/(base)/AddEvent";
import { api } from "@/trpc/server";
import { Button } from "@/components/ui/button";
import { Logo } from "@/components/Logo";

export const maxDuration = 60;

type Props = {
  searchParams: {
    rawText?: string;
    saveIntent?: boolean;
    filePath?: string;
    timezone?: string;
    edit?: boolean;
  };
};

export default async function Page({ searchParams }: Props) {
  const user = await currentUser();
  const username = user?.username;
  const lists =
    username &&
    (await api.list.getAllForUser.query({
      userName: username,
    }));
  const timezone = searchParams.timezone || "America/Los_Angeles";

  // saved event
  if (searchParams.saveIntent) {
    return (
      <Suspense>
        <div className="flex w-full flex-col items-center gap-8">
          <YourDetails lists={lists || undefined} />
          <ImageUpload filePath={searchParams.filePath} />
          <EventsFromSaved />
        </div>
      </Suspense>
    );
  }

  // image only
  if (searchParams.filePath && !searchParams.rawText) {
    return (
      <ProgressStages
        filePath={searchParams.filePath}
        lists={lists || undefined}
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
        lists={lists || undefined}
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
