import React, { useCallback, useState } from "react";
import { Pressable, View } from "react-native";
import React, { useCallback, useEffect, useState } from "react";
import { InteractionManager, Pressable, View } from "react-native";
import Animated from "react-native-reanimated";
import { router, Stack, useLocalSearchParams } from "expo-router";
import { useUser } from "@clerk/clerk-expo";
import { toast } from "sonner-native";

import { CaptureEventButton } from "~/components/CaptureEventButton";
import { EventPreview } from "~/components/EventPreview";
import { X } from "~/components/icons";
import { NewEventHeader } from "~/components/NewEventHeader";
import { useCreateEvent } from "~/hooks/useCreateEvent";
import { useInitializeInput } from "~/hooks/useInitializeInput";
import { useKeyboardHeight } from "~/hooks/useKeyboardHeight";
import { useAppStore } from "~/store";
import { logError } from "../utils/errorLogging";

/**
 * This screen is specifically for share-extension usage:
 * - It's simpler than add.tsx
 * - No photo grid.
 * - Takes `text` or `imageUri` from the deep link or store's `intentParams`.
 */

const OFFSET_VALUE = 32;

export default function NewShareScreen() {
  const { style: keyboardStyle } = useKeyboardHeight(OFFSET_VALUE);
  const { user } = useUser();
  const { createEvent } = useCreateEvent();
  const [activeInput, setActiveInput] = useState<string | null>(null);

  const {
    newEventState: { input, imagePreview, linkPreview, isImageLoading },
    setInput,
    setLinkPreview,
    resetNewEventState,
  } = useAppStore();

  // Grab "text" or "imageUri" from the share extension
  const { text, imageUri } = useLocalSearchParams<{
    text?: string;
    imageUri?: string;
  }>();

  /**
   * Use same initialization logic from old new.tsx
   * Use a key to force re-initialization when text or imageUri changes
   */
  const { initialized } = useInitializeInput(
    {
      text,
      imageUri,
      recentPhotos: [], // We skip recent photos for share extension
      route: "new",
    },
    `${text || ""}-${imageUri || ""}`,
  );

  /**
   * Link detection from typed input (if user modifies text).
   */
  const handleTextChange = useCallback(
    (newText: string) => {
      setInput(newText, "new");

      const urlRegex = /(https?:\/\/[^\s]+)/g;
      const urls = newText.match(urlRegex);
      if (urls && urls.length > 0) {
        setLinkPreview(urls[0], "new");
      } else {
        setLinkPreview(null, "new");
      }
    },
    [setInput, setLinkPreview],
  );

  /**
   * Actually create the event
   */
  const { newEventState } = useAppStore();

  const handleCreateEvent = async () => {
    const { input, imagePreview, linkPreview } = newEventState;
    if (!input.trim() && !imagePreview && !linkPreview) return;
    if (!user?.id || !user.username) return;

    // Store values needed for event creation before resetting state
    const eventData = {
      rawText: input,
      linkPreview: linkPreview ?? undefined,
      imageUri: imagePreview ?? undefined,
      userId: user.id,
      username: user.username,
    };

    // Navigate immediately
    router.canGoBack() ? router.back() : router.replace("/feed");

    // Reset state and fire the createEvent call after interactions/animations
    void InteractionManager.runAfterInteractions(() => {
      resetNewEventState(); // Reset state first
      void createEvent(eventData).catch((error) => {
        logError("Error creating event in background", error);
        // Notify user of background failure
        toast.error("Failed to save event in background.");
      });
    });
  };

  // Set activeInput to "describe" when text is passed
  React.useEffect(() => {
    if (text) {
      setActiveInput("describe");
    }
  }, [text]);

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
          headerTitle: () => (
            <NewEventHeader
              containerClassName="mt-2"
              isFromIntent={true}
              linkPreview={linkPreview}
              imagePreview={imagePreview}
              activeInput={activeInput}
              handleDescribePress={() => setActiveInput("describe")}
            />
          ),
          headerRight: () => (
            <Pressable
              onPress={() => router.back()}
              className="rounded-full bg-transparent py-4"
            >
              <X size={24} color="#fff" />
            </Pressable>
          ),
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
            activeInput={activeInput}
            isImageLoading={isImageLoading}
            handleMorePhotos={() => null}
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
