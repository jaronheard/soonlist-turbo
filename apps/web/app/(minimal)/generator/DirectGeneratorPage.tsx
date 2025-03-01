"use client";

import { useEffect, useRef } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Camera } from "lucide-react";

import { Tabs, TabsContent, TabsList, TabsTrigger } from "@soonlist/ui/tabs";
import { toast } from "sonner";

import { Logo } from "~/components/Logo";
import { useCroppedImageContext } from "~/context/CroppedImageContext";
import { useNewEventContext } from "~/context/NewEventContext";
import { api } from "~/trpc/react";

import { BenefitsHighlights } from "./BenefitsHighlights";
import {
  GeneratorUploadImageButton,
  GeneratorUploadImageDropzone,
} from "./uploadImages";

function PageWrapper({ children }: { children: React.ReactNode }) {
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
        </div>
        {children}
      </div>
    </>
  );
}

export function DirectGeneratorPage({
  _showUpload,
  filePath,
  LoadingComponent,
}: {
  _showUpload?: boolean;
  filePath?: string;
  LoadingComponent?: React.ComponentType<{ className?: string }>;
}) {
  const { organizeData, eventData } = useNewEventContext();
  const { croppedImagesUrls } = useCroppedImageContext();

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
        : Array.isArray(eventData?.images)
          ? eventData.images
          : []) ||
      [];

  useEffect(() => {
    // Auto-publish when event data is available and images are ready
    if (eventData && !updateEventTriggered.current && images.length > 0) {
      console.log("Auto-publishing with images:", images);
      updateEventTriggered.current = true;
      // Small delay to ensure UI updates first
      setTimeout(() => {
        handleAutoPublish();
      }, 1000); // Increased delay to ensure images are fully processed
    } else if (eventData && !updateEventTriggered.current) {
      console.log("Event data available but no images yet:", eventData);
    }
  }, [eventData, images]);

  // Function to handle auto-publishing
  const handleAutoPublish = () => {
    if (eventData) {
      const environment =
        process.env.NODE_ENV === "development" ? "development" : "production";

      // Initialize with empty array as requested by Jaron
      let formattedImages: string[] = [];

      // Filter out any undefined values and ensure we have only strings
      const validImages = images.filter(
        (img): img is string => typeof img === "string" && img.length > 0,
      );

      // Only proceed if we have valid images
      if (validImages.length > 0) {
        // Get the first valid image - we know it exists because array length > 0
        // Use non-null assertion since we've already checked length > 0
        const firstImage = validImages[0]!;

        // If we have only one valid image, duplicate it 4 times
        if (validImages.length === 1) {
          formattedImages = [firstImage, firstImage, firstImage, firstImage];
        } else {
          // Start with all valid images
          formattedImages = [...validImages];

          // Duplicate the first image until we have 4
          while (formattedImages.length < 4) {
            formattedImages.push(firstImage);
          }
        }
      }

      // Create a clean event object with images properly set
      const eventWithImages = {
        ...eventData,
        images: formattedImages,
      };

      // Log for debugging
      console.log("Images array:", formattedImages);
      console.log("Event data with images:", eventWithImages);

      // The userId is set in the backend based on the environment
      updateEvent.mutate({
        event: eventWithImages,
        eventMetadata: eventData.eventMetadata,
        comment: organizeData.notes,
        visibility: "public",
        lists: organizeData.lists || [],
        environment,
      });
    }
  };

  // Images are already filtered in the useEffect hook

  if (filePath) {
    return (
      <PageWrapper>
        <div className="flex flex-col items-center gap-3 text-center">
          <h2 className="text-2xl font-bold text-neutral-1">
            Processing your event
          </h2>
          <p className="text-base font-medium leading-5 text-neutral-2">
            Your event is being created...
          </p>
        </div>
        {LoadingComponent ? <LoadingComponent className="h-64" /> : null}
      </PageWrapper>
    );
  }

  return (
    <PageWrapper>
      <div className="flex flex-col items-center gap-3 text-center">
        <h2 className="text-2xl font-bold text-neutral-1">Upload your event</h2>
        <p className="text-base font-medium leading-5 text-neutral-2">
          Add your event by uploading an image.
        </p>
      </div>
      <div className="min-h-[60vh]">
        <BenefitsHighlights />
        <div className="mt-8">
          <Tabs value="image" className="w-80 sm:w-96">
            <TabsList className="grid w-full grid-cols-1">
              <TabsTrigger value="image">
                <Camera className="mr-3 size-6" />
                Image
              </TabsTrigger>
            </TabsList>
            <TabsContent value="image" className="mt-11">
              <GeneratorUploadImageDropzone />
              <footer className="fixed inset-x-0 bottom-0 z-50 border-t border-neutral-3 bg-white p-5">
                <div className="mx-auto flex max-w-80 items-center justify-center gap-4 sm:max-w-96">
                  <GeneratorUploadImageButton />
                </div>
              </footer>
            </TabsContent>
          </Tabs>
        </div>
      </div>
    </PageWrapper>
  );
}
