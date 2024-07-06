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
import { Stepper, StepStatus } from "@soonlist/ui/stepper";

import { AddEvent } from "~/app/(base)/AddEvent";
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

function ProgressStagesStepper({ status }: { status: Status }) {
  const stepsUpload = [
    { name: "Upload", href: "#", status: StepStatus.Current },
    { name: "Organize", href: "#", status: StepStatus.Upcoming },
    { name: "Review", href: "#", status: StepStatus.Upcoming },
  ];
  const stepsOrganize = [
    { name: "Upload", href: "#", status: StepStatus.Complete },
    { name: "Organize", href: "#", status: StepStatus.Current },
    { name: "Review", href: "#", status: StepStatus.Upcoming },
  ];
  const stepsPreview = [
    { name: "Upload", href: "#", status: StepStatus.Complete },
    { name: "Organize", href: "#", status: StepStatus.Complete },
    { name: "Review", href: "#", status: StepStatus.Current },
  ];
  const stepsPublish = [
    { name: "Upload", href: "#", status: StepStatus.Complete },
    { name: "Organize", href: "#", status: StepStatus.Complete },
    { name: "Review", href: "#", status: StepStatus.Complete },
  ];
  function getSteps() {
    if (status === Status.Upload) {
      return stepsUpload;
    }
    if (status === Status.Organize) {
      return stepsOrganize;
    }
    if (status === Status.Preview) {
      return stepsPreview;
    }
    return stepsPublish;
  }
  const steps = getSteps();
  return <Stepper steps={steps} />;
}

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
    <>
      <header className="fixed inset-x-0 top-0 z-10 flex flex-col items-center justify-center bg-interactive-3">
        <Logo className="scale-50" />
      </header>
      <div className="flex w-full flex-col items-center gap-11 p-6 pt-10">
        <div className="flex flex-col items-center gap-4">
          <h1 className="text-xl font-semibold text-neutral-2">
            Create an event
          </h1>
          <ProgressStagesStepper status={status} />
        </div>
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
              "-mt-2 rounded-b-2xl bg-secondary px-4 pb-4 pt-2":
                showCropActions,
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
        </header>
        {children}
        <NewEventFooterButtons onClickNextOrganize={onClickNextOrganize} />
      </div>
    </>
  );
}

export function ProgressStages({
  filePath,
  lists,
  Preview,
}: {
  filePath?: string;
  lists?: List[];
  Preview?: JSX.Element;
}) {
  const { status, goToNextStatus } = useNewEventProgressContext();
  const { organizeData, setOrganizeData } = useNewEventContext();
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

  if (status === Status.Upload) {
    return (
      <ProgressStagesWrapper>
        <>
          <div className="flex flex-col items-center gap-3 text-center">
            <h2 className="text-2xl font-bold text-neutral-1">
              Upload your event
            </h2>
            <p className="text-base font-medium leading-5 text-neutral-2">
              Add your event info. Upload an image, enter text, or add a link.
            </p>
          </div>
          <AddEvent />
        </>
      </ProgressStagesWrapper>
    );
  }

  if (status === Status.Organize) {
    return (
      <ProgressStagesWrapper
        filePath={filePath}
        onClickNextOrganize={form.handleSubmit(onSubmit)}
      >
        <>
          <div className="flex flex-col items-center gap-3 text-center">
            <h2 className="text-2xl font-bold text-neutral-1">
              Organize your event
            </h2>
            <p className="text-base font-medium leading-5 text-neutral-2">
              Choose lists, set visibility, and add your notes.
            </p>
          </div>
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
        <>
          <div className="flex flex-col items-center gap-3 text-center">
            <h2 className="text-2xl font-bold text-neutral-1">
              Review your event
            </h2>
            <p className="text-base font-medium leading-5 text-neutral-2">
              Check your event information. Once confirmed, save your event.
            </p>
          </div>
          {Preview || <></>}
        </>
      </ProgressStagesWrapper>
    );
  }
  return (
    <ProgressStagesWrapper filePath={filePath}>
      {Preview || <></>}
    </ProgressStagesWrapper>
  );
}
