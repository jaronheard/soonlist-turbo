"use client";

import type { SubmitHandler } from "react-hook-form";
import type { z } from "zod";
import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { zodResolver } from "@hookform/resolvers/zod";
import { ChevronLeft, X } from "lucide-react";
import { useForm } from "react-hook-form";

import type { List } from "@soonlist/db/types";
import { Button } from "@soonlist/ui/button";

import { Logo } from "~/components/Logo";
import { organizeFormSchema } from "~/components/YourDetails";
import { useNewEventContext } from "~/context/NewEventContext";
import {
  Status,
  useNewEventProgressContext,
} from "~/context/NewEventProgressContext";
import { cn } from "~/lib/utils";
import { ImageCropperSmall } from "./ImageCropperSmall";
import { NewEventFooterButtons } from "./NewEventFooterButtons";
import { Organize } from "./Organize";

function ProgressStagesWrapper({
  filePath,
  children,
  onClickNextOrganize,
}: {
  filePath?: string;
  children: JSX.Element;
  onClickNextOrganize?: () => void;
}) {
  const router = useRouter();
  const { status, goToPreviousStatus } = useNewEventProgressContext();
  const [showCropActions, setShowCropActions] = useState(false);
  return (
    <div className="flex w-full flex-col items-center">
      {/* <YourDetails lists={lists || undefined} /> */}
      {/* <ImageUpload filePath={searchParams.filePath} /> */}
      <header className="fixed inset-x-0 top-2 z-10 flex flex-col items-center justify-center">
        <Button
          asChild
          className="absolute -top-2 right-0"
          variant={"ghost"}
          size={"icon"}
        >
          <Link href={status === Status.Organize ? "/" : "/new"}>
            <X />
          </Link>
        </Button>
        {status !== Status.Organize && (
          <Button
            onClick={goToPreviousStatus}
            className="absolute -top-2 left-0"
            variant={"ghost"}
            size={"icon"}
          >
            <ChevronLeft />
          </Button>
        )}
        {status === Status.Organize && (
          <Button
            onClick={() => router.back()}
            className="absolute -top-2 left-0"
            variant={"ghost"}
            size={"icon"}
          >
            <ChevronLeft />
          </Button>
        )}
        <button
          className={cn("relative z-30 origin-top", {
            "scale-50 hover:opacity-60": !showCropActions,
            "-mt-2 rounded-b-2xl bg-secondary px-4 pb-4 pt-2": showCropActions,
          })}
          onClick={() => {
            !showCropActions && setShowCropActions(true);
          }}
        >
          <ImageCropperSmall
            filePath={filePath}
            showActions={showCropActions}
            setShowActions={setShowCropActions}
          />
        </button>
        <div className="absolute top-24 z-20 flex gap-4">
          <Logo className="origin-top scale-50" />
        </div>
      </header>
      <div className="p-14"></div>
      {children}
      <NewEventFooterButtons onClickNextOrganize={onClickNextOrganize} />
    </div>
  );
}

export function ProgressStages({
  filePath,
  lists,
  Preview,
}: {
  filePath?: string;
  lists?: List[];
  Preview: JSX.Element;
}) {
  const { status, goToNextStatus } = useNewEventProgressContext();
  const { organizeData, setOrganizeData, eventData } = useNewEventContext();
  const { notes, visibility, lists: eventLists } = organizeData;

  const form = useForm<z.infer<typeof organizeFormSchema>>({
    resolver: zodResolver(organizeFormSchema),
    defaultValues: {
      notes: notes || "",
      visibility: visibility || "public",
      lists: eventLists,
    },
  });

  const onSubmit: SubmitHandler<z.infer<typeof organizeFormSchema>> = (
    data,
  ) => {
    setOrganizeData(data);
    goToNextStatus();
  };

  if (status === Status.Organize) {
    return (
      <ProgressStagesWrapper
        filePath={filePath}
        onClickNextOrganize={form.handleSubmit(onSubmit)}
      >
        <>
          <Organize lists={lists || []} form={form} />
          {/* This ensures that the event starts being processed by the LLM immediately */}
          <div className="hidden">{Preview}</div>
        </>
      </ProgressStagesWrapper>
    );
  }

  if (status === Status.Preview) {
    return (
      <ProgressStagesWrapper filePath={filePath}>
        {Preview}
      </ProgressStagesWrapper>
    );
  }

  if (status === Status.Publish) {
    return (
      <ProgressStagesWrapper filePath={filePath}>
        <>
          <>{JSON.stringify(eventData, null, 2)}</>
          <>{JSON.stringify(organizeData, null, 2)}</>
        </>
      </ProgressStagesWrapper>
    );
  }
}
