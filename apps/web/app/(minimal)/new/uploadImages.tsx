"use client";

import { useContext } from "react";
import { useRouter } from "next/navigation";
import { useMutation, useQuery } from "convex/react";
import { UploadButton, UploadDropzone } from "@bytescale/upload-widget-react";
import { Camera, Upload } from "lucide-react";

import { api } from "@soonlist/backend/convex/_generated/api";
import { Button } from "@soonlist/ui/button";

import { buildDefaultUrl, bytescaleWidgetOptions } from "~/components/ImageUpload";
import { useWorkflowStore } from "~/hooks/useWorkflowStore";
import { optimizeImageToBase64 } from "~/lib/imageOptimization";
import { TimezoneContext } from "~/context/TimezoneContext";

const widgetOptions = {
  ...bytescaleWidgetOptions,
  editor: {
    images: {
      crop: false,
      preview: false,
    },
  },
};

export const UploadImageForProcessingDropzone = () => {
  const router = useRouter();
  const currentUser = useQuery(api.users.getCurrentUser);
  const { timezone } = useContext(TimezoneContext);
  const { addWorkflowId } = useWorkflowStore();
  const createEventFromImage = useMutation(
    api.ai.eventFromImageBase64ThenCreate,
  );

  const handleImageUpload = async (filePath: string) => {
    if (!currentUser) return;
    
    try {
      // Convert image URL to optimized base64
      const imageUrl = buildDefaultUrl(filePath);
      let base64Image: string;
      
      try {
        base64Image = await optimizeImageToBase64(imageUrl, 640, 0.5);
      } catch (optimizeError) {
        console.warn("Failed to optimize image, using fallback:", optimizeError);
        const { imageUrlToBase64 } = await import("~/lib/imageOptimization");
        base64Image = await imageUrlToBase64(imageUrl);
      }
      
      // Start the workflow
      const result = await createEventFromImage({
        base64Image,
        timezone,
        userId: currentUser.id,
        username: currentUser.username || currentUser.id,
        sendNotification: false,
        visibility: "public",
        lists: [],
      });
      
      if (result.workflowId) {
        addWorkflowId(result.workflowId);
        // Navigate directly to upcoming page
        router.push(`/${currentUser.username || currentUser.id}/upcoming`);
      }
    } catch (error) {
      console.error("Error creating event from image:", error);
    }
  };

  return (
    <div className="relative">
      <Camera
        className="pointer-events-none absolute inset-0 z-50 m-auto size-14 text-primary"
        strokeWidth={1.5}
      />
      <UploadDropzone
        className="[&>div>div>div>div>label]:upload-label max-h-48 [&>div>div>div>div>label]:!mb-0 [&>div>div>div>div>label]:!inline-flex [&>div>div>div>div>label]:!h-11 [&>div>div>div>div>label]:!items-center [&>div>div>div>div>label]:!justify-center [&>div>div>div>div>label]:!whitespace-nowrap [&>div>div>div>div>label]:!rounded-lg [&>div>div>div>div>label]:!border-0 [&>div>div>div>div>label]:!bg-transparent [&>div>div>div>div>label]:!px-8 [&>div>div>div>div>label]:!text-lg [&>div>div>div>div>label]:!font-medium [&>div>div>div>div>label]:!leading-none [&>div>div>div>div>label]:!text-transparent [&>div>div>div>div>label]:!ring-offset-background [&>div>div>div>div>label]:!transition-colors [&>div>div>div>div>label]:hover:!bg-transparent [&>div>div>div>div>label]:focus-visible:!outline-none [&>div>div>div>div>label]:focus-visible:!ring-2 [&>div>div>div>div>label]:focus-visible:!ring-transparent [&>div>div>div>div>label]:focus-visible:!ring-offset-2 [&>div>div>div>div>label]:disabled:!pointer-events-none [&>div>div>div>div>label]:disabled:!opacity-50 [&>div>div>div>div>p]:!hidden [&>div>div>div>div]:!rounded-sm [&>div>div>div>div]:!bg-interactive-3 [&>div>div>div]:!inset-0 [&>div>div>div]:!rounded-sm [&>div>div>div]:!border [&>div>div>div]:!border-interactive-2"
        options={widgetOptions}
        onUpdate={({ uploadedFiles }) => {
          if (uploadedFiles.length > 0) {
            const filePath = uploadedFiles[0]?.filePath;
            if (filePath) {
              void handleImageUpload(filePath);
            }
          }
        }}
      />
    </div>
  );
};

export const UploadImageForProcessingButton = () => {
  const router = useRouter();
  const currentUser = useQuery(api.users.getCurrentUser);
  const { timezone } = useContext(TimezoneContext);
  const { addWorkflowId } = useWorkflowStore();
  const createEventFromImage = useMutation(
    api.ai.eventFromImageBase64ThenCreate,
  );

  const handleImageUpload = async (filePath: string) => {
    if (!currentUser) return;
    
    try {
      // Convert image URL to optimized base64
      const imageUrl = buildDefaultUrl(filePath);
      let base64Image: string;
      
      try {
        base64Image = await optimizeImageToBase64(imageUrl, 640, 0.5);
      } catch (optimizeError) {
        console.warn("Failed to optimize image, using fallback:", optimizeError);
        const { imageUrlToBase64 } = await import("~/lib/imageOptimization");
        base64Image = await imageUrlToBase64(imageUrl);
      }
      
      // Start the workflow
      const result = await createEventFromImage({
        base64Image,
        timezone,
        userId: currentUser.id,
        username: currentUser.username || currentUser.id,
        sendNotification: false,
        visibility: "public",
        lists: [],
      });
      
      if (result.workflowId) {
        addWorkflowId(result.workflowId);
        // Navigate directly to upcoming page
        router.push(`/${currentUser.username || currentUser.id}/upcoming`);
      }
    } catch (error) {
      console.error("Error creating event from image:", error);
    }
  };

  return (
    <UploadButton
      options={widgetOptions}
      onComplete={(files) => {
        if (files.length > 0) {
          const filePath = files[0]?.filePath;
          if (filePath) {
            void handleImageUpload(filePath);
          }
        }
      }}
    >
      {({ onClick }) => (
        <Button
          onClick={onClick}
          variant="default"
          className="flex w-full items-center gap-2"
        >
          <Upload className="size-4" />
          Upload an image
        </Button>
      )}
    </UploadButton>
  );
};
