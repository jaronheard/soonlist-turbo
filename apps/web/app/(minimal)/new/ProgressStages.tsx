"use client";

import type { SubmitHandler } from "react-hook-form";
import type { z } from "zod";
import { useContext, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { SignedIn } from "@clerk/nextjs";
import { zodResolver } from "@hookform/resolvers/zod";
import { Camera, ChevronLeft, LinkIcon, ListIcon, Plus, X } from "lucide-react";
import { useForm } from "react-hook-form";

import type { List } from "@soonlist/db/types";
import { Button } from "@soonlist/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@soonlist/ui/card";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@soonlist/ui/dialog";
import {
  Form,
  FormControl,
  FormDescription,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@soonlist/ui/form";
import { MultiSelect } from "@soonlist/ui/multiselect";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@soonlist/ui/select";
import { Stepper, StepStatus } from "@soonlist/ui/stepper";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@soonlist/ui/tabs";
import { Textarea } from "@soonlist/ui/textarea";

import { AddListCard } from "~/components/AddListCard";
import { Logo } from "~/components/Logo";
import { SaveButton } from "~/components/SaveButton";
import { TextEventForm } from "~/components/TextEventForm";
import { UrlEventForm } from "~/components/UrlEventForm";
import { organizeFormSchema } from "~/components/YourDetails";
import { useCroppedImageContext } from "~/context/CroppedImageContext";
import { useNewEventContext } from "~/context/NewEventContext";
import {
  Mode,
  Status,
  UploadOptionsSchema,
  useNewEventProgressContext,
} from "~/context/NewEventProgressContext";
import { TimezoneContext } from "~/context/TimezoneContext";
import { cn } from "~/lib/utils";
import { ImageCropperSmall } from "./ImageCropperSmall";
import { UploadImageForProcessingButton, UploadImageForProcessingDropzone } from "./uploadImages";

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
      name: "Organize",
      href: "#",
      onClick: () => goToStatus(Status.Organize),
      status: StepStatus.Upcoming,
    },
    {
      name: "Review",
      href: "#",
      onClick: () => goToStatus(Status.Preview),
      status: StepStatus.Upcoming,
    },
  ];
  const stepsOrganize = [
    {
      name: "Upload",
      href: "#",
      onClick: () => goToStatus(Status.Upload),
      status: StepStatus.Complete,
    },
    {
      name: "Organize",
      href: "#",
      onClick: () => goToStatus(Status.Organize),
      status: StepStatus.Current,
    },
    {
      name: "Review",
      href: "#",
      onClick: () => goToStatus(Status.Preview),
      status: StepStatus.Upcoming,
    },
  ];
  const stepsPreview = [
    {
      name: "Upload",
      href: "#",
      onClick: () => goToStatus(Status.Upload),
      status: StepStatus.Complete,
    },
    {
      name: "Organize",
      href: "#",
      onClick: () => goToStatus(Status.Organize),
      status: StepStatus.Complete,
    },
    {
      name: "Review",
      href: "#",
      onClick: () => goToStatus(Status.Preview),
      status: StepStatus.Current,
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
      name: "Organize",
      href: "#",
      onClick: () => goToStatus(Status.Organize),
      status: StepStatus.Complete,
    },
    {
      name: "Review",
      href: "#",
      onClick: () => goToStatus(Status.Preview),
      status: StepStatus.Complete,
    },
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

function NewEventFooterButtons({
  onClickNextOrganize,
}: {
  onClickNextOrganize?: () => void;
  onClickNextPublish?: () => void;
}) {
  const { mode, setMode, status, goToNextStatus } =
    useNewEventProgressContext();
  const { organizeData, eventData } = useNewEventContext();
  const { croppedImagesUrls } = useCroppedImageContext();
  const otherMode = mode === Mode.Edit ? Mode.View : Mode.Edit;

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
    : imagesFromContext || eventData?.images || [];

  return (
    <footer className="fixed inset-x-0 bottom-0 z-50 flex items-center justify-center gap-4 border-t border-neutral-3 bg-white p-5">
      {status === Status.Upload && <UploadImageForProcessingButton />}
      {status === Status.Preview && (
        <>
          <Button
            size="lg"
            variant="secondary"
            onClick={() => setMode(otherMode)}
            className="capitalize"
          >
            {otherMode}
          </Button>
          {eventData && (
            <SaveButton
              event={{ ...eventData, images }}
              eventMetadata={eventData.eventMetadata}
              notes={organizeData.notes}
              visibility={organizeData.visibility}
              lists={organizeData.lists}
              onClick={goToNextStatus}
            />
          )}
        </>
      )}
      {status === Status.Organize && (
        <Button size="lg" onClick={onClickNextOrganize} className="w-full">
          Next
        </Button>
      )}
    </footer>
  );
}

export function Organize({
  form,
  lists,
}: {
  form: ReturnType<typeof useForm<z.infer<typeof organizeFormSchema>>>;
  lists?: List[];
}) {
  const listOptions = lists
    ?.map((list) => ({
      label: list.name,
      value: list.id,
    }))
    .sort((a, b) => a.label.localeCompare(b.label));

  return (
    <SignedIn>
      <Card className="max-w-screen w-full sm:max-w-xl">
        <CardHeader>
          <CardTitle className="flex items-center">
            <ListIcon className="mr-2 size-6" />
            Save to List
          </CardTitle>
        </CardHeader>
        <CardContent>
          <Form {...form}>
            <form className="flex flex-col gap-6">
              <FormField
                control={form.control}
                name="notes"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Your Note (Optional)</FormLabel>
                    <FormControl>
                      <Textarea
                        placeholder="Example: My friend Sarah hosts this dance party every year and its so fun!"
                        defaultValue={field.value}
                        onChange={field.onChange}
                        rows={5}
                      />
                    </FormControl>
                    <FormDescription>
                      Write something personal about this event
                    </FormDescription>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="lists"
                render={({ field: { ...field } }) => (
                  <FormItem>
                    <FormLabel>Choose a list</FormLabel>
                    <MultiSelect
                      AdditionalPopoverAction={() => (
                        <Dialog>
                          <DialogTrigger className="w-full p-1">
                            <Button size="sm" className="w-full rounded-sm">
                              <Plus className="-ml-2 mr-2 size-4" />
                              New List
                            </Button>
                          </DialogTrigger>
                          <DialogContent>
                            <DialogHeader>
                              <DialogTitle>Add a new list</DialogTitle>
                              <DialogDescription>
                                <AddListCard
                                  name=""
                                  description=""
                                  visibility="public"
                                  afterSuccessFunction={() => null}
                                />
                              </DialogDescription>
                            </DialogHeader>
                          </DialogContent>
                        </Dialog>
                      )}
                      selected={field.value}
                      options={listOptions || []}
                      placeholder="All Events"
                      {...field}
                    />
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="visibility"
                render={({ field }) => (
                  <FormItem className="">
                    <FormLabel>Visibility</FormLabel>
                    <Select
                      onValueChange={field.onChange}
                      value={field.value}
                      defaultValue={field.value}
                    >
                      <FormControl>
                        <SelectTrigger>
                          <SelectValue placeholder="Public" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        <SelectItem value="public">Public</SelectItem>
                        <SelectItem value="private">Unlisted</SelectItem>
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </form>
          </Form>
        </CardContent>
      </Card>
    </SignedIn>
  );
}

function SampleEventLink() {
  return (
    <div className="mt-4 text-center">
      <span className="text-muted-foreground">
        Or look at a sample{" "}
        <a
          href="/event/cloqaw5z80001l8086s39cxk3"
          className="font-bold text-interactive-1"
        >
          event
        </a>{" "}
        or{" "}
        <Link
          href="/jaronheard/events"
          className="font-bold text-interactive-1"
        >
          list
        </Link>
        .
      </span>
    </div>
  );
}

export function AddEvent() {
  const router = useRouter();

  // State variables
  const [input, setInput] = useState("");
  const { goToNextStatus, uploadOption, setUploadOption } =
    useNewEventProgressContext();

  // Context variables
  const { timezone } = useContext(TimezoneContext);

  // Helpers
  const handleInputChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    setInput(e.target.value);
  };
  const onSubmitText = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault(); // Prevent the default form submission behavior
    goToNextStatus();
    router.push(`/new?rawText=${input}&timezone=${timezone}`);
  };
  const onSubmitUrl = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault(); // Prevent the default form submission behavior
    goToNextStatus();
    router.push(`/new?url=${input}&timezone=${timezone}`);
  };

  return (
    <div className="min-h-[60vh] ">
      <Tabs
        value={uploadOption}
        onValueChange={(value: string) => {
          const parsedValue = UploadOptionsSchema.parse(value);
          setUploadOption(parsedValue);
        }}
        className="w-80 sm:w-96"
      >
        <TabsList className="grid w-full grid-cols-3">
          <TabsTrigger value="image">
            <Camera className="mr-3 size-6" />
            Image
          </TabsTrigger>
          <TabsTrigger value="text">Text</TabsTrigger>
          <TabsTrigger value="link">
            <LinkIcon className="mr-3 size-6" />
            Link
          </TabsTrigger>
        </TabsList>
        <TabsContent value="image" className="mt-11">
          <UploadImageForProcessingDropzone />
        </TabsContent>
        <TabsContent value="text">
          <Card>
            <CardHeader>
              <CardTitle>Text</CardTitle>
              <CardDescription>
                Add an event from text. Copy/paste, or use your own words.
              </CardDescription>
            </CardHeader>
            <CardContent>
              <TextEventForm
                handleInputChange={handleInputChange}
                input={input}
                onSubmit={onSubmitText}
              />
              <SampleEventLink />
            </CardContent>
          </Card>
        </TabsContent>
        <TabsContent value="link">
          <Card>
            <CardHeader>
              <CardTitle>Link</CardTitle>
              <CardDescription>Add an event from a link.</CardDescription>
            </CardHeader>
            <CardContent>
              <UrlEventForm
                handleInputChange={handleInputChange}
                input={input}
                onSubmit={onSubmitUrl}
              />
              <SampleEventLink />
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}
