"use client";

import type { JSX } from "react";
import type { z } from "zod";
import { useContext, useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { SignedIn, SignedOut, useUser } from "@clerk/nextjs";
import { zodResolver } from "@hookform/resolvers/zod";
import { useMutation, useQuery } from "convex/react";
import { Camera, EyeOff, Globe2, LinkIcon, Sparkles, Text } from "lucide-react";
import { useForm } from "react-hook-form";

import type { List } from "@soonlist/db/types";
import { api } from "@soonlist/backend/convex/_generated/api";
import { Button } from "@soonlist/ui/button";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@soonlist/ui/form";
import { Input } from "@soonlist/ui/input";
import { Label } from "@soonlist/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@soonlist/ui/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@soonlist/ui/tabs";
import { Textarea } from "@soonlist/ui/textarea";

import { ImageUpload } from "~/components/ImageUpload";
import { Logo } from "~/components/Logo";
import { SaveButton } from "~/components/SaveButton";
import { organizeFormSchema } from "~/components/YourDetails";
import { useCroppedImageContext } from "~/context/CroppedImageContext";
import { useNewEventContext } from "~/context/NewEventContext";
import {
  Status,
  UploadOptionsSchema,
  useNewEventProgressContext,
} from "~/context/NewEventProgressContext";
import { TimezoneContext } from "~/context/TimezoneContext";
import { useWorkflowStore } from "~/hooks/useWorkflowStore";
import {
  UploadImageForProcessingButton,
  UploadImageForProcessingDropzone,
} from "./uploadImages";

function ProgressStagesWrapper({
  children,
}: {
  filePath?: string;
  children: JSX.Element;
}) {
  const { user } = useUser();

  return (
    <>
      <header className="fixed inset-x-0 top-0 z-10 flex h-12 flex-col items-center justify-center bg-interactive-3">
        <SignedIn>
          <Link href={`/${user?.username}/upcoming`}>
            <Logo className="scale-[0.6]" />
          </Link>
        </SignedIn>
        <SignedOut>
          <Link href="/">
            <Logo className="scale-[0.6]" />
          </Link>
        </SignedOut>
      </header>
      <div className="mx-auto flex w-full max-w-80 flex-col items-center gap-11 sm:max-w-96">
        <div className="flex flex-col items-center gap-4">
          <h1 className="text-xl font-semibold text-neutral-2">
            Create an event
          </h1>
        </div>
        {children}
        {/* Footer should be included in children */}
      </div>
    </>
  );
}

export function ProgressStages({
  showUpload,
  filePath,
  Preview,
}: {
  showUpload?: boolean;
  filePath?: string;
  lists?: List[];
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
  const { notes, visibility, lists: eventLists } = organizeData;
  const { croppedImagesUrls } = useCroppedImageContext();

  useEffect(() => {
    if (!showUpload && !isShortcut) {
      setIsShortcut(true);
      // Skip directly to Preview when we have a filePath
      if (filePath) {
        setStatus(Status.Preview);
      }
    }
  }, [showUpload, setIsShortcut, setMode, filePath, setStatus]);

  const hasFilePath = croppedImagesUrls.filePath;
  const hasAllAspectRatios =
    croppedImagesUrls.cropped &&
    croppedImagesUrls.square &&
    croppedImagesUrls.fourThree &&
    croppedImagesUrls.sixteenNine;
  const validImagesFromContext = hasFilePath && hasAllAspectRatios;

  const imagesFromContext = validImagesFromContext
    ? [
        croppedImagesUrls.square ?? "",
        croppedImagesUrls.fourThree ?? "",
        croppedImagesUrls.sixteenNine ?? "",
        croppedImagesUrls.cropped ?? "",
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

  const form = useForm<z.infer<typeof organizeFormSchema>>({
    resolver: zodResolver(organizeFormSchema),
    defaultValues: {
      notes: notes || "",
      visibility: visibility || "public",
      lists: eventLists,
    },
  });

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
          <SaveButton
            event={{ ...eventData, images }}
            eventMetadata={eventData.eventMetadata}
            notes={organizeData.notes}
            visibility={organizeData.visibility}
            lists={organizeData.lists}
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
              Add your event
            </h2>
            <p className="text-base font-medium leading-5 text-neutral-2">
              Upload an image, enter text, or add a link.
            </p>
          </div>
          <AddEvent />
        </>
      </ProgressStagesWrapper>
    );
  }

  if (status === Status.Organize) {
    return (
      <ProgressStagesWrapper filePath={filePath}>
        <>
          <div className="flex flex-col items-center gap-3 text-center">
            <h2 className="text-2xl font-bold text-neutral-1">
              Organize your event
            </h2>
            <p className="text-base font-medium leading-5 text-neutral-2">
              Set visibility, and add your notes.
            </p>
          </div>
          <Organize form={form} filePath={filePath} />
        </>
      </ProgressStagesWrapper>
    );
  }

  if (status === Status.Preview || status === Status.Publish) {
    return (
      <ProgressStagesWrapper filePath={filePath}>
        <>
          <div className="flex flex-col items-center gap-3 text-center">
            <h2 className="text-2xl font-bold text-neutral-1">
              {status === Status.Preview
                ? "Review your event"
                : "Publishing event"}
            </h2>
            <p className="text-base font-medium leading-5 text-neutral-2">
              {status === Status.Preview
                ? "Check your event information. Once confirmed, save your event."
                : "Your event is being saved..."}
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

function Organize({
  form,
  filePath,
}: {
  form: ReturnType<typeof useForm<z.infer<typeof organizeFormSchema>>>;
  filePath?: string;
}) {
  const { setOrganizeData } = useNewEventContext();
  const { goToNextStatus } = useNewEventProgressContext();

  const onSubmit = (values: z.infer<typeof organizeFormSchema>) => {
    setOrganizeData(values);
    goToNextStatus();
  };

  return (
    <Form {...form}>
      <form
        onSubmit={form.handleSubmit(onSubmit)}
        className="flex w-full flex-col gap-6"
      >
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
                  <SelectItem value="public">
                    <Globe2 className="mr-2 inline size-4" />
                    Discoverable
                  </SelectItem>
                  <SelectItem value="private">
                    <EyeOff className="mr-2 inline size-4" />
                    Not discoverable
                  </SelectItem>
                </SelectContent>
              </Select>
              <FormMessage />
            </FormItem>
          )}
        />
        <FormField
          control={form.control}
          name="notes"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Notes</FormLabel>
              <FormControl>
                <Textarea
                  placeholder="Optional: Anything you want to add..."
                  defaultValue={field.value}
                  onChange={field.onChange}
                  rows={5}
                />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />
        <ImageUpload filePath={filePath} />
        <ProgressStagesFooter>
          <Button size="lg" className="w-full" type="submit">
            Next
          </Button>
        </ProgressStagesFooter>
      </form>
    </Form>
  );
}

function AddEvent() {
  const router = useRouter();
  const currentUser = useQuery(api.users.getCurrentUser);
  const { addWorkflowId } = useWorkflowStore();

  // State variables
  const [input, setInput] = useState("");
  const [isProcessing, setIsProcessing] = useState(false);
  const { uploadOption, setUploadOption } = useNewEventProgressContext();

  // Context variables
  const { timezone } = useContext(TimezoneContext);

  // Mutations
  const createEventFromText = useMutation(api.ai.eventFromTextThenCreate);
  const createEventFromUrl = useMutation(api.ai.eventFromUrlThenCreate);

  const onSubmitText = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();

    if (!currentUser || isProcessing) return;

    setIsProcessing(true);

    try {
      const result = await createEventFromText({
        rawText: input,
        timezone,
        userId: currentUser.id,
        username: currentUser.username || currentUser.id,
        sendNotification: false,
        visibility: "public",
        lists: [],
      });

      if (result.workflowId) {
        addWorkflowId(result.workflowId);
        router.push(`/${currentUser.username || currentUser.id}/upcoming`);
      }
    } catch (error) {
      console.error("Error creating event from text:", error);
      setIsProcessing(false);
    }
  };

  const onSubmitUrl = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();

    if (!currentUser || isProcessing) return;

    setIsProcessing(true);

    try {
      const result = await createEventFromUrl({
        url: input,
        timezone,
        userId: currentUser.id,
        username: currentUser.username || currentUser.id,
        sendNotification: false,
        visibility: "public",
        lists: [],
      });

      if (result.workflowId) {
        addWorkflowId(result.workflowId);
        router.push(`/${currentUser.username || currentUser.id}/upcoming`);
      } else {
        throw new Error("No workflow ID returned");
      }
    } catch (error) {
      console.error("Error creating event from URL:", error);
      setIsProcessing(false);
    }
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
          <TabsTrigger value="text">
            <Text className="mr-3 size-6" />
            Text
          </TabsTrigger>
          <TabsTrigger value="link">
            <LinkIcon className="mr-3 size-6" />
            Link
          </TabsTrigger>
        </TabsList>
        <TabsContent value="image" className="mt-11">
          <UploadImageForProcessingDropzone />
          <ProgressStagesFooter>
            <UploadImageForProcessingButton />
          </ProgressStagesFooter>
        </TabsContent>
        <TabsContent value="text" className="mt-11">
          <TextEventForm
            input={input}
            onSubmit={onSubmitText}
            isProcessing={isProcessing}
            onInputChange={setInput}
          />
        </TabsContent>
        <TabsContent value="link" className="mt-11">
          <UrlEventForm
            input={input}
            onSubmit={onSubmitUrl}
            isProcessing={isProcessing}
            onInputChange={setInput}
          />
        </TabsContent>
      </Tabs>
    </div>
  );
}

function TextEventForm({
  input,
  onSubmit,
  isProcessing,
  onInputChange,
}: {
  input: string;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  onSubmit: (e: any) => void;
  isProcessing: boolean;
  onInputChange: (value: string) => void;
}) {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const handleKeyDown = (event: any) => {
    // eslint-disable-next-line @typescript-eslint/no-unsafe-member-access
    if ((event.metaKey || event.ctrlKey) && event.key === "Enter") {
      onSubmit(event);
    }
  };

  const handleInputChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    onInputChange(e.target.value);
  };

  return (
    <form className="grid w-full max-w-xl gap-1.5" onSubmit={onSubmit}>
      <Textarea
        id="input"
        onKeyDown={handleKeyDown}
        value={input}
        onChange={handleInputChange}
        rows={8}
        placeholder={"Paste or type event info..."}
      />
      <ProgressStagesFooter>
        <Button type="submit" disabled={!input || isProcessing}>
          {isProcessing ? (
            <>
              <div className="mr-2 size-4 animate-spin rounded-full border-2 border-current border-t-transparent" />
              Processing...
            </>
          ) : (
            <>
              <Sparkles className="mr-2 size-4" />
              Generate from text
            </>
          )}
        </Button>
      </ProgressStagesFooter>
    </form>
  );
}

export function UrlEventForm({
  input,
  onSubmit,
  isProcessing,
  onInputChange,
}: {
  input: string;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  onSubmit: (e: any) => void;
  isProcessing: boolean;
  onInputChange: (value: string) => void;
}) {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const handleKeyDown = (event: any) => {
    // eslint-disable-next-line @typescript-eslint/no-unsafe-member-access
    if ((event.metaKey || event.ctrlKey) && event.key === "Enter") {
      onSubmit(event);
    }
  };

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    onInputChange(e.target.value);
  };

  return (
    <form className="grid w-full max-w-xl gap-1.5" onSubmit={onSubmit}>
      <Label className="hidden" htmlFor="input">
        Enter url with event info
      </Label>
      <Input
        type="url"
        id="input"
        onKeyDown={handleKeyDown}
        value={input}
        onChange={handleInputChange}
        placeholder={"Enter event URL..."}
      />
      <ProgressStagesFooter>
        <Button type="submit" disabled={!input || isProcessing}>
          {isProcessing ? (
            <>
              <div className="mr-2 size-4 animate-spin rounded-full border-2 border-current border-t-transparent" />
              Processing...
            </>
          ) : (
            <>
              <Sparkles className="mr-2 size-4" />
              Generate from link
            </>
          )}
        </Button>
      </ProgressStagesFooter>
    </form>
  );
}
