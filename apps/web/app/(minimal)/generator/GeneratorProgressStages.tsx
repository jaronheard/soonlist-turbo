"use client";

import { useEffect, useRef } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Camera } from "lucide-react";

import { Button } from "@soonlist/ui/button";
import { Stepper, StepStatus } from "@soonlist/ui/stepper";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@soonlist/ui/tabs";
import { toast } from "sonner";

import { Logo } from "~/components/Logo";
import { PublicSaveButton } from "~/components/PublicSaveButton";
import { useCroppedImageContext } from "~/context/CroppedImageContext";
import { useNewEventContext } from "~/context/NewEventContext";
import {
  Status,
  UploadOptionsSchema,
  useNewEventProgressContext,
} from "~/context/NewEventProgressContext";
import { api } from "~/trpc/react";

import { BenefitsHighlights } from "./BenefitsHighlights";
import {
  GeneratorUploadImageButton,
  GeneratorUploadImageDropzone,
} from "./uploadImages";

function ProgressStagesStepper({ status }: { status: Status }) {
  const { goToStatus } = useNewEventProgressContext();

  const stepsUpload = [
    {
      name: "Upload",
      href: "#",
      onClick: () => goToStatus(Status.Upload),
      status: StepStatus.Current,
    },
    {
      name: "Publish",
      href: "#",
      onClick: () => goToStatus(Status.Publish),
      status: StepStatus.Upcoming,
      disabled: true,
    },
  ];

  const stepsPublish = [
    {
      name: "Upload",
      href: "#",
      onClick: () => goToStatus(Status.Upload),
      status: StepStatus.Complete,
    },
    {
      name: "Publish",
      href: "#",
      onClick: () => goToStatus(Status.Publish),
      status: StepStatus.Current,
    },
  ];

  function getSteps() {
    if (status === Status.Upload) {
      return stepsUpload;
    }
    return stepsPublish;
  }

  const steps = getSteps();
  return <Stepper steps={steps} />;
}

function ProgressStagesWrapper({
  children,
}: {
  filePath?: string;
  children: JSX.Element;
}) {
  const { status } = useNewEventProgressContext();

  return (
    <>
      <header className="fixed inset-x-0 top-0 z-10 flex h-12 flex-col items-center justify-center bg-interactive-3">
        <Link href="/">
          <Logo className="scale-[0.6]" />
        </Link>
      </header>
      <div className="mx-auto flex w-full max-w-80 flex-col items-center gap-11 sm:max-w-96">
        <div className="flex flex-col items-center gap-4">
          <h1 className="text-xl font-semibold text-neutral-2">
            Create an event
          </h1>
          <ProgressStagesStepper status={status} />
        </div>
        {children}
      </div>
    </>
  );
}

export function GeneratorProgressStages({
  showUpload,
  filePath,
  Preview,
}: {
  showUpload?: boolean;
  filePath?: string;
  Preview?: JSX.Element;
}) {
  const {
    status,
    goToNextStatus,
    setMode,
    inactiveMode,
    isShortcut,
    setIsShortcut,
    setStatus,
  } = useNewEventProgressContext();
  const { organizeData, eventData } = useNewEventContext();
  const { croppedImagesUrls } = useCroppedImageContext();

  useEffect(() => {
    if (!showUpload && !isShortcut) {
      setIsShortcut(true);
      setStatus(Status.Publish);
    }

    // Auto-publish when event data is available
    if (
      eventData &&
      status === Status.Publish &&
      !updateEventTriggered.current
    ) {
      updateEventTriggered.current = true;
      // Small delay to ensure UI updates first
      setTimeout(() => {
        handleAutoPublish();
      }, 500);
    }
  }, [showUpload, setIsShortcut, setStatus, isShortcut, eventData, status]);

  // Reference to track if we've triggered the auto-publish
  const updateEventTriggered = useRef(false);

  // Create mutation for auto-publishing
  const router = useRouter();
  const updateEvent = api.publicEvent.create.useMutation({
    onError: () => {
      toast.error("Your event was not saved. Please try again.");
    },
    onSuccess: ({ id }) => {
      toast.success("Event saved.");
      router.push(`/event/${id}`);
    },
  });

  // Function to handle auto-publishing
  const handleAutoPublish = () => {
    if (eventData) {
      // Use the PublicSaveButton's functionality but trigger it programmatically
      const environment =
        process.env.NODE_ENV === "development" ? "development" : "production";
      updateEvent.mutate({
        event: { ...eventData, images },
        eventMetadata: eventData.eventMetadata,
        comment: organizeData.notes,
        visibility: "public",
        lists: organizeData.lists || [],
        environment,
      });
    }
  };

  const hasFilePath = croppedImagesUrls.filePath;
  const hasAllAspectRatios =
    croppedImagesUrls.cropped &&
    croppedImagesUrls.square &&
    croppedImagesUrls.fourThree &&
    croppedImagesUrls.sixteenNine;
  const validImagesFromContext = hasFilePath && hasAllAspectRatios;

  const imagesFromContext = validImagesFromContext
    ? [
        croppedImagesUrls.square!,
        croppedImagesUrls.fourThree!,
        croppedImagesUrls.sixteenNine!,
        croppedImagesUrls.cropped!,
      ]
    : undefined;

  const removeImage = croppedImagesUrls.deleted;
  // use images from context or initial props
  const images = removeImage
    ? []
    : imagesFromContext ||
      (typeof eventData?.images === "string"
        ? [eventData.images]
        : eventData?.images) ||
      [];

  const renderPreview = () => (
    <>
      {Preview || <></>}
      <ProgressStagesFooter>
        <Button
          size="lg"
          variant="secondary"
          onClick={() => setMode(inactiveMode)}
          className="capitalize"
          disabled={status === Status.Publish}
        >
          {inactiveMode}
        </Button>
        {eventData && (
          <PublicSaveButton
            event={{ ...eventData, images }}
            eventMetadata={eventData.eventMetadata}
            notes={organizeData.notes}
            lists={organizeData.lists || []}
            onClick={goToNextStatus}
            loading={status === Status.Publish}
          />
        )}
      </ProgressStagesFooter>
    </>
  );

  if (status === Status.Upload) {
    return (
      <ProgressStagesWrapper>
        <>
          <div className="flex flex-col items-center gap-3 text-center">
            <h2 className="text-2xl font-bold text-neutral-1">
              Upload your event
            </h2>
            <p className="text-base font-medium leading-5 text-neutral-2">
              Add your event by uploading an image.
            </p>
          </div>
          <AddEvent />
        </>
      </ProgressStagesWrapper>
    );
  }

  if (status === Status.Publish) {
    return (
      <ProgressStagesWrapper filePath={filePath}>
        <>
          <div className="flex flex-col items-center gap-3 text-center">
            <h2 className="text-2xl font-bold text-neutral-1">
              {status === Status.Publish
                ? "Publishing event"
                : "Review your event"}
            </h2>
            <p className="text-base font-medium leading-5 text-neutral-2">
              {status === Status.Publish
                ? "Your event is being saved..."
                : "Check your event information. Once confirmed, save your event."}
            </p>
          </div>
          {renderPreview()}
        </>
      </ProgressStagesWrapper>
    );
  }

  return null;
}

function ProgressStagesFooter({ children }: { children: React.ReactNode }) {
  return (
    <footer className="fixed inset-x-0 bottom-0 z-50 border-t border-neutral-3 bg-white p-5">
      <div className="mx-auto flex max-w-80 items-center justify-center gap-4 sm:max-w-96">
        {children}
      </div>
    </footer>
  );
}

function AddEvent() {
  const { uploadOption, setUploadOption } = useNewEventProgressContext();

  return (
    <div className="min-h-[60vh]">
      <BenefitsHighlights />
      <div className="mt-8">
        <Tabs
          value={uploadOption}
          onValueChange={(value: string) => {
            const parsedValue = UploadOptionsSchema.parse(value);
            setUploadOption(parsedValue);
          }}
          className="w-80 sm:w-96"
        >
          <TabsList className="grid w-full grid-cols-1">
            <TabsTrigger value="image">
              <Camera className="mr-3 size-6" />
              Image
            </TabsTrigger>
          </TabsList>
          <TabsContent value="image" className="mt-11">
            <GeneratorUploadImageDropzone />
            <ProgressStagesFooter>
              <GeneratorUploadImageButton />
            </ProgressStagesFooter>
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
}

