import React, { useCallback, useEffect, useState } from "react";
import { Pressable, View } from "react-native";
import Animated from "react-native-reanimated";
import { router, Stack, useLocalSearchParams } from "expo-router";
import { useUser } from "@clerk/clerk-expo";
import { X } from "lucide-react-native";
import { toast } from "sonner-native";

import { CaptureEventButton } from "~/components/CaptureEventButton";
import { EventPreview } from "~/components/EventPreview";
import { NewEventHeader } from "~/components/NewEventHeader";
import { useCreateEvent } from "~/hooks/useCreateEvent";
import { useInitializeInput } from "~/hooks/useInitializeInput";
import { useKeyboardHeight } from "~/hooks/useKeyboardHeight";
import { useOneSignal } from "~/providers/OneSignalProvider";
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
  const { hasNotificationPermission } = useOneSignal();
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
   */
  const { initialized } = useInitializeInput({
    text,
    imageUri,
    recentPhotos: [], // We skip recent photos for share extension
    route: "new",
  });

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
  const handleCreateEvent = async () => {
    if (!input.trim() && !imagePreview && !linkPreview) return;
    if (!user?.id || !user.username) return;

    // Immediately navigate away
    router.canGoBack() ? router.back() : router.push("/feed");
    toast.info("Capturing in background. Add another?", {
      duration: 5000,
    });

    try {
      const eventId = await createEvent({
        rawText: input,
        linkPreview: linkPreview ?? undefined,
        imageUri: imagePreview ?? undefined,
        userId: user.id,
        username: user.username,
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
      resetNewEventState();
    }
  };

  // Set activeInput to "describe" when text is passed
  useEffect(() => {
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
