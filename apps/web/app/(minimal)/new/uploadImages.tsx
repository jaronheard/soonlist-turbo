"use client";

import { useContext, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { useMutation, useQuery } from "convex/react";
import { Camera, Upload } from "lucide-react";

import { api } from "@soonlist/backend/convex/_generated/api";
import { Button } from "@soonlist/ui/button";

import { TimezoneContext } from "~/context/TimezoneContext";
import { usePasteImage } from "~/hooks/usePasteImage";
import { useWorkflowStore } from "~/hooks/useWorkflowStore";
import { optimizeFileToBase64 } from "~/lib/imageOptimization";

export const UploadImageForProcessingDropzone = () => {
  const router = useRouter();
  const currentUser = useQuery(api.users.getCurrentUser);
  const { timezone } = useContext(TimezoneContext);
  const { addWorkflowId } = useWorkflowStore();
  const [isProcessing, setIsProcessing] = useState(false);
  const createEventFromImage = useMutation(
    api.ai.eventFromImageBase64ThenCreate,
  );
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleFileSelect = async (file: File) => {
    if (!currentUser) {
      setIsProcessing(false);
      return;
    }

    setIsProcessing(true);

    try {
      // Process image directly from file (matching Expo app approach)
      const base64Image = await optimizeFileToBase64(file, 640, 0.5);

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
      setIsProcessing(false);
    }
  };

  // Add paste functionality
  const { elementRef } = usePasteImage({
    onImagePaste: handleFileSelect,
    enabled: !isProcessing,
  });

  return (
    <div ref={elementRef} className="relative">
      <input
        ref={fileInputRef}
        type="file"
        accept="image/*"
        onChange={(e) => {
          const file = e.target.files?.[0];
          if (file) {
            void handleFileSelect(file);
          }
        }}
        className="hidden"
      />
      {isProcessing ? (
        <div className="absolute inset-0 z-50 flex items-center justify-center rounded-sm bg-white/80">
          <div className="flex flex-col items-center gap-2">
            <div className="size-8 animate-spin rounded-full border-4 border-primary border-t-transparent" />
            <p className="text-sm font-medium">Processing...</p>
          </div>
        </div>
      ) : (
        <Camera
          className="pointer-events-none absolute inset-0 z-50 m-auto size-14 text-primary"
          strokeWidth={1.5}
        />
      )}
      <div
        onClick={() => fileInputRef.current?.click()}
        onDrop={(e) => {
          e.preventDefault();
          e.stopPropagation();
          const file = e.dataTransfer.files[0];
          if (file?.type.startsWith("image/")) {
            void handleFileSelect(file);
          }
        }}
        onDragOver={(e) => {
          e.preventDefault();
          e.stopPropagation();
        }}
        className="flex h-48 cursor-pointer items-center justify-center rounded-sm border border-interactive-2 bg-interactive-3 transition-colors hover:bg-interactive-2"
      >
        <div className="text-center">
          <p className="text-lg font-medium text-primary">Tap to upload</p>
          <p className="text-sm text-muted-foreground">
            drag and drop, or paste an image
          </p>
        </div>
      </div>
    </div>
  );
};

export const UploadImageForProcessingButton = () => {
  const router = useRouter();
  const currentUser = useQuery(api.users.getCurrentUser);
  const { timezone } = useContext(TimezoneContext);
  const { addWorkflowId } = useWorkflowStore();
  const [isProcessing, setIsProcessing] = useState(false);
  const createEventFromImage = useMutation(
    api.ai.eventFromImageBase64ThenCreate,
  );
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleFileSelect = async (file: File) => {
    if (!currentUser) return;

    setIsProcessing(true);

    try {
      // Process image directly from file (matching Expo app approach)
      const base64Image = await optimizeFileToBase64(file, 640, 0.5);

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
      setIsProcessing(false);
    }
  };

  return (
    <>
      <input
        ref={fileInputRef}
        type="file"
        accept="image/*"
        onChange={(e) => {
          const file = e.target.files?.[0];
          if (file) {
            void handleFileSelect(file);
          }
        }}
        className="hidden"
      />
      <Button
        onClick={() => fileInputRef.current?.click()}
        variant="default"
        className="flex w-full items-center gap-2"
        disabled={isProcessing}
      >
        {isProcessing ? (
          <>
            <div className="size-4 animate-spin rounded-full border-2 border-current border-t-transparent" />
            Processing...
          </>
        ) : (
          <>
            <Upload className="size-4" />
            Upload an image
          </>
        )}
      </Button>
    </>
  );
};
