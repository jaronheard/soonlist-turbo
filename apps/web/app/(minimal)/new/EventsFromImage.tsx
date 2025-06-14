"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { useUser } from "@clerk/nextjs";
import { useMutation } from "convex/react";
import { toast } from "sonner";

import { api } from "@soonlist/backend/convex/_generated/api";
import { blankEvent } from "@soonlist/cal";

import { AddToCalendarCard } from "~/components/AddToCalendarCard";
import { buildDefaultUrl } from "~/components/ImageUpload";
import { useWorkflowStore } from "~/hooks/useWorkflowStore";
import { EventPreviewLoadingSpinner } from "./EventPreviewLoadingSpinner";
import { EventsError } from "./EventsError";
import { NewEventPreview } from "./NewEventPreview";

// Convert image URL to base64
async function imageUrlToBase64(url: string): Promise<string> {
  try {
    const response = await fetch(url);
    const blob = await response.blob();
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onloadend = () => {
        if (typeof reader.result === "string") {
          // Remove the data URL prefix to get just the base64 string
          const base64 = reader.result.split(",")[1];
          resolve(base64 || "");
        } else {
          reject(new Error("Failed to convert to base64"));
        }
      };
      reader.onerror = reject;
      reader.readAsDataURL(blob);
    });
  } catch (error) {
    console.error("Error converting image to base64:", error);
    throw error;
  }
}

export function EventsFromImage({
  filePath,
  timezone,
}: {
  filePath: string;
  timezone: string;
}) {
  const router = useRouter();
  const { user } = useUser();
  const { addWorkflowId } = useWorkflowStore();
  const [isProcessing, setIsProcessing] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const createEventFromImage = useMutation(
    api.ai.eventFromImageBase64ThenCreate,
  );

  const handleCreateEvent = async () => {
    if (!user) {
      toast.error("Please sign in to create events");
      return;
    }

    setIsProcessing(true);
    setError(null);

    try {
      // Convert image URL to base64
      const imageUrl = buildDefaultUrl(filePath);
      const base64Image = await imageUrlToBase64(imageUrl);

      const result = await createEventFromImage({
        base64Image,
        timezone,
        userId: user.id,
        username: user.username || user.id,
        sendNotification: false, // Web doesn't have push notifications
        visibility: "public",
        lists: [],
      });

      if (result?.workflowId) {
        addWorkflowId(result.workflowId);
        toast.success("Processing event from image...");
        router.push("/"); // Navigate to home while processing
      }
    } catch (err) {
      console.error("Error creating event from image:", err);
      setError(err instanceof Error ? err.message : "Failed to create event");
      toast.error("Failed to process image");
    } finally {
      setIsProcessing(false);
    }
  };

  return (
    <div className="space-y-4">
      <div className="rounded-lg border bg-card p-6">
        <h3 className="mb-2 text-lg font-semibold">Create Event from Image</h3>
        <img
          src={buildDefaultUrl(filePath)}
          alt="Event preview"
          className="mb-4 max-h-64 w-full rounded-md object-contain"
        />
        {error && (
          <div className="mb-4 rounded-md bg-destructive/10 p-3 text-sm text-destructive">
            {error}
          </div>
        )}
        <button
          onClick={handleCreateEvent}
          disabled={isProcessing}
          className="w-full rounded-md bg-primary px-4 py-2 text-primary-foreground hover:bg-primary/90 disabled:opacity-50"
        >
          {isProcessing ? "Processing..." : "Create Event from Image"}
        </button>
      </div>

      {/* Show blank event card as preview */}
      <AddToCalendarCard {...blankEvent} hideFloatingActionButtons />
    </div>
  );
}
