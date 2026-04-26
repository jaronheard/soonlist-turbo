// src/app/add.tsx
import React, { useCallback } from "react";
import { View } from "react-native";
import Animated from "react-native-reanimated";
import * as ImagePicker from "expo-image-picker";
import { router, Stack } from "expo-router";
import { useUser } from "@clerk/clerk-expo";

import type { ExifOrientation, ImageSource } from "~/utils/images";
import { CaptureEventButton } from "~/components/CaptureEventButton";
import { EventPreview } from "~/components/EventPreview";
import { NewEventHeader } from "~/components/NewEventHeader";
import { useCreateEvent } from "~/hooks/useCreateEvent";
import { useKeyboardHeight } from "~/hooks/useKeyboardHeight";
import { useOneSignal } from "~/providers/OneSignalProvider";
import { useAppStore } from "~/store";
import { toast } from "~/utils/feedback";
import { getExifOrientation } from "~/utils/images";
import { logError } from "../utils/errorLogging";

export default function AddEventModal() {
  const { style: keyboardStyle } = useKeyboardHeight(32);
  useOneSignal();
  const { user } = useUser();
  const { createEvent } = useCreateEvent();
  const {
    addEventState,
    setInput,
    setImagePreview,
    setLinkPreview,
    resetAddEventState,
    setIsOptionSelected,
    setActiveInput,
  } = useAppStore();

  const handleTextChange = useCallback(
    (text: string) => {
      setInput(text, "add");
      const urlRegex = /(https?:\/\/[^\s]+)/g;
      const urls = text.match(urlRegex);
      if (urls && urls.length > 0) {
        setLinkPreview(urls[0], "add");
      } else {
        setLinkPreview(null, "add");
      }
    },
    [setInput, setLinkPreview],
  );

  const handleImagePreview = useCallback(
    (uri: string | ImageSource, orientation?: ExifOrientation) => {
      const imageUri =
        typeof uri === "string"
          ? uri
          : typeof uri === "number"
            ? String(uri)
            : uri.uri;
      setImagePreview(imageUri, "add", orientation ?? null);
      const filename = imageUri.split("/").pop() || "";
      setInput(filename, "add");
    },
    [setImagePreview, setInput],
  );

  const handleMorePhotosPress = useCallback(async () => {
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      quality: 0.8,
      exif: true,
    });
    if (!result.canceled && result.assets[0]) {
      const asset = result.assets[0];
      handleImagePreview(asset.uri, getExifOrientation(asset.exif));
    }
  }, [handleImagePreview]);

  const handleClearPreview = useCallback(() => {
    resetAddEventState();
  }, [resetAddEventState]);

  const handleCreateEvent = async () => {
    const { input, imagePreview, imagePreviewOrientation, linkPreview } =
      addEventState;
    if (!input.trim() && !imagePreview && !linkPreview) return;
    if (!user?.id || !user.username) return;

    // Store values needed for event creation before resetting state
    const eventData = {
      rawText: input,
      linkPreview: linkPreview ?? undefined,
      imageUri: imagePreview ?? undefined,
      imageOrientation: imagePreviewOrientation ?? undefined,
      userId: user.id,
      username: user.username,
    };

    if (router.canGoBack()) {
      router.back();
    } else {
      router.replace("/feed");
    }

    // Reset state immediately for better UX
    resetAddEventState();

    try {
      await createEvent(eventData);
      // Success notification is handled via push notifications or EventCaptureBanner
    } catch (error) {
      logError("Error creating event", error);
      toast.error("Failed to create event", "Please try again");
    }
  };

  const handleDescribePress = useCallback(() => {
    if (addEventState.activeInput === "describe") {
      setActiveInput("upload");
      setIsOptionSelected(true);
    } else {
      setActiveInput("describe");
      setIsOptionSelected(true);
      setImagePreview(null, "add");
      setInput("", "add");
    }
  }, [
    addEventState.activeInput,
    setActiveInput,
    setIsOptionSelected,
    setImagePreview,
    setInput,
  ]);

  const { input, imagePreview, linkPreview, activeInput, isImageLoading } =
    addEventState;

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
              isFromIntent={false}
              linkPreview={linkPreview}
              imagePreview={imagePreview}
              activeInput={activeInput}
              handleDescribePress={handleDescribePress}
            />
          ),
        }}
      />

      <View className="h-full flex-1 overflow-hidden rounded-t-3xl bg-interactive-1">
        <View className="flex-1">
          <View className="px-4 pt-2">
            <EventPreview
              containerClassName="rounded-xl overflow-hidden"
              imagePreview={imagePreview}
              linkPreview={linkPreview}
              input={input}
              handleTextChange={handleTextChange}
              clearPreview={handleClearPreview}
              clearText={() => setInput("", "add")}
              activeInput={activeInput}
              isImageLoading={isImageLoading}
              handleMorePhotos={handleMorePhotosPress}
              previewContainerStyle="square"
            />
          </View>
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

// Export Expo Router's error boundary
export { ErrorBoundary } from "expo-router";
