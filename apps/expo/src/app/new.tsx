import React, { useCallback, useEffect } from "react";
import { View } from "react-native";
import Animated from "react-native-reanimated";
import { router, Stack, useLocalSearchParams } from "expo-router";
import { useUser } from "@clerk/clerk-expo";
import { toast } from "sonner-native";

import { CaptureEventButton } from "~/components/CaptureEventButton";
import { EventPreview } from "~/components/EventPreview";
import { useCreateEvent } from "~/hooks/useCreateEvent";
import { useInitializeInput } from "~/hooks/useInitializeInput";
import { useKeyboardHeight } from "~/hooks/useKeyboardHeight";
import { useNotification } from "~/providers/NotificationProvider";
import { useAppStore } from "~/store";

/**
 * This screen is specifically for share-extension usage:
 * - It's simpler than add.tsx
 * - No photo grid.
 * - Takes `text` or `imageUri` from the deep link or store's `intentParams`.
 */

const OFFSET_VALUE = 32;

export default function NewShareScreen() {
  const { style: keyboardStyle } = useKeyboardHeight(OFFSET_VALUE);
  const { expoPushToken, hasNotificationPermission } = useNotification();
  const { user } = useUser();
  const { createEvent } = useCreateEvent();

  const {
    input,
    imagePreview,
    linkPreview,
    isImageLoading,
    setInput,
    setImagePreview,
    setLinkPreview,
    resetAddEventState,
  } = useAppStore();

  // Grab "text" or "imageUri" from the share extension
  const { text, imageUri } = useLocalSearchParams<{
    text?: string;
    imageUri?: string;
  }>();

  /**
   * Use same initialization logic from old new.tsx
   */
  const { initialized } = useInitializeInput({
    text,
    imageUri,
    recentPhotos: [], // we do not auto-fetch photos here
  });

  /**
   * Link detection from typed input (if user modifies text).
   */
  const handleTextChange = useCallback(
    (newText: string) => {
      setInput(newText);

      const urlRegex = /(https?:\/\/[^\s]+)/g;
      const urls = newText.match(urlRegex);
      if (urls && urls.length > 0) {
        setLinkPreview(urls[0]);
      } else {
        setLinkPreview(null);
      }
    },
    [setInput, setLinkPreview],
  );

  /**
   * Clear the preview state
   */
  const handleClearPreview = useCallback(() => {
    setImagePreview(null);
    setLinkPreview(null);
    setInput("");
    resetAddEventState();
  }, [setImagePreview, setLinkPreview, setInput, resetAddEventState]);

  /**
   * Actually create the event
   */
  const handleCreateEvent = async () => {
    if (!input.trim() && !imagePreview && !linkPreview) return;
    if (!user?.id || !user.username) return;

    // Immediately navigate away
    router.canGoBack() ? router.back() : router.push("/feed");
    toast.info("Processing details. Add another?", {
      duration: 5000,
    });

    try {
      const eventId = await createEvent({
        rawText: input,
        linkPreview: linkPreview ?? undefined,
        imageUri: imagePreview ?? undefined,
        userId: user.id,
        username: user.username,
        expoPushToken: expoPushToken || "NOT_SET",
      });

      if (!hasNotificationPermission && eventId) {
        toast.success("Captured successfully!", {
          action: {
            label: "View event",
            onClick: () => {
              toast.dismiss();
              router.push(`/event/${eventId}`);
            },
          },
        });
      }
    } catch (error) {
      console.error("Error creating event:", error);
      toast.error("Failed to create event. Please try again.");
    } finally {
      resetAddEventState();
    }
  };

  useEffect(() => {
    // If user modifies text (like removing or editing), keep store in sync
    // This is just for clarity. Usually you'd do this in a text input's onChange
    if (typeof text === "string") {
      handleTextChange(text);
    }
  }, [handleTextChange, text]);

  if (!initialized) {
    return null;
  }

  return (
    <View className="h-full flex-1 bg-[#5A32FB]">
      <Stack.Screen
        options={{
          title: "",
          headerShown: true,
          headerShadowVisible: false,
          headerStyle: { backgroundColor: "#5A32FB" },
          headerTintColor: "#fff",
          contentStyle: { backgroundColor: "#5A32FB" },
          headerTitle: "Share Extension",
        }}
      />

      <View className="h-full flex-1 overflow-hidden rounded-t-3xl bg-interactive-1">
        <View className="flex-1 px-4 pt-2">
          <EventPreview
            containerClassName="rounded-xl overflow-hidden"
            imagePreview={imagePreview}
            linkPreview={linkPreview}
            input={input}
            handleTextChange={handleTextChange}
            clearPreview={handleClearPreview}
            clearText={() => setInput("")}
            activeInput={null} // Not using advanced input states here
            isImageLoading={isImageLoading}
            handleMorePhotos={() => null} // share extension does not show a grid
            previewContainerStyle="full"
          />
        </View>

        {/* Capture button at bottom */}
        <Animated.View className="px-4" style={keyboardStyle}>
          <CaptureEventButton
            handleCreateEvent={handleCreateEvent}
            input={input}
            imagePreview={imagePreview}
            linkPreview={linkPreview}
          />
        </Animated.View>
      </View>
    </View>
  );
}
