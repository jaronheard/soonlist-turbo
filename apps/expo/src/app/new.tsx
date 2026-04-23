import React, { useCallback, useEffect, useState } from "react";
import { InteractionManager, Pressable, View } from "react-native";
import Animated from "react-native-reanimated";
import { router, Stack, useLocalSearchParams } from "expo-router";
import { useUser } from "@clerk/clerk-expo";

import { CaptureEventButton } from "~/components/CaptureEventButton";
import { EventPreview } from "~/components/EventPreview";
import { X } from "~/components/icons";
import { NewEventHeader } from "~/components/NewEventHeader";
import { useCreateEvent } from "~/hooks/useCreateEvent";
import { useInitializeInput } from "~/hooks/useInitializeInput";
import { useKeyboardHeight } from "~/hooks/useKeyboardHeight";
import { useAppStore } from "~/store";
import { toast } from "~/utils/feedback";
import { logError } from "../utils/errorLogging";

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

  const { text, imageUri } = useLocalSearchParams<{
    text?: string;
    imageUri?: string;
  }>();

  const { initialized } = useInitializeInput(
    {
      text,
      imageUri,
      recentPhotos: [], // We skip recent photos for share extension
      route: "new",
    },
    `${text || ""}-${imageUri || ""}`,
  );

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

  const { newEventState } = useAppStore();

  const handleCreateEvent = async () => {
    const { input, imagePreview, linkPreview } = newEventState;
    if (!input.trim() && !imagePreview && !linkPreview) return;
    if (!user?.id || !user.username) return;

    const eventData = {
      rawText: input,
      linkPreview: linkPreview ?? undefined,
      imageUri: imagePreview ?? undefined,
      userId: user.id,
      username: user.username,
    };

    if (router.canGoBack()) {
      router.back();
    } else {
      router.replace("/feed");
    }

    void InteractionManager.runAfterInteractions(() => {
      resetNewEventState();
      void createEvent(eventData).catch((error) => {
        logError("Error creating event in background", error);
        toast.error("Failed to save event");
      });
    });
  };

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

export { ErrorBoundary } from "expo-router";
