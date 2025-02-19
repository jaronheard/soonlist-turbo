// src/app/add.tsx
import React, { useCallback, useEffect } from "react";
import { Linking, View } from "react-native";
import Animated from "react-native-reanimated";
import * as ImagePicker from "expo-image-picker";
import { router, Stack, useFocusEffect } from "expo-router";
import { useUser } from "@clerk/clerk-expo";
import { toast } from "sonner-native";

import type { ImageSource } from "~/components/demoData";
import { CaptureEventButton } from "~/components/CaptureEventButton";
import { EventPreview } from "~/components/EventPreview";
import { NewEventHeader } from "~/components/NewEventHeader";
import { PhotoAccessPrompt } from "~/components/PhotoAccessPrompt";
import { PhotoGrid } from "~/components/PhotoGrid";
import { useCreateEvent } from "~/hooks/useCreateEvent";
import { useKeyboardHeight } from "~/hooks/useKeyboardHeight";
import { useMediaLibrary } from "~/hooks/useMediaLibrary";
import { useNotification } from "~/providers/NotificationProvider";
import { useAppStore } from "~/store";

const OFFSET_VALUE = 32;

export default function AddEventModal() {
  const { style: keyboardStyle } = useKeyboardHeight(OFFSET_VALUE);
  const { expoPushToken, hasNotificationPermission } = useNotification();
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
    recentPhotos,
    hasMediaPermission,
    hasFullPhotoAccess,
  } = useAppStore();

  useMediaLibrary();

  /**
   * 1) Reset the state whenever this modal unmounts (on close).
   */
  useEffect(() => {
    return () => {
      resetAddEventState();
    };
  }, [resetAddEventState]);

  /**
   * 2) Whenever the /add screen is focused, pick the most recent photo
   *    if we have permission, photos, and no image selected yet.
   */
  useFocusEffect(
    React.useCallback(() => {
      if (
        hasMediaPermission &&
        !addEventState.imagePreview &&
        recentPhotos.length > 0 &&
        addEventState.activeInput === "upload"
      ) {
        const mostRecent = recentPhotos[0];
        if (mostRecent) {
          const uri =
            typeof mostRecent.uri === "string"
              ? mostRecent.uri
              : typeof mostRecent.uri === "number"
                ? String(mostRecent.uri)
                : mostRecent.uri.uri;
          setImagePreview(uri, "add");
          const filename = uri.split("/").pop();
          setInput(filename || "", "add");
        }
      }
    }, [
      hasMediaPermission,
      addEventState.imagePreview,
      addEventState.activeInput,
      recentPhotos,
      setImagePreview,
      setInput,
    ]),
  );

  /**
   * Detect URLs in typed text and set a linkPreview if found.
   */
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
    (uri: string | ImageSource) => {
      const imageUri =
        typeof uri === "string"
          ? uri
          : typeof uri === "number"
            ? String(uri)
            : uri.uri;
      setImagePreview(imageUri, "add");
      const filename = imageUri.split("/").pop();
      setInput(filename || "", "add");
    },
    [setImagePreview, setInput],
  );

  /**
   * Handle picking images or taking a photo.
   */
  const handleMorePhotosPress = useCallback(async () => {
    try {
      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ImagePicker.MediaTypeOptions.Images,
        quality: 0.8,
      });

      if (!result.canceled && result.assets[0]) {
        handleImagePreview(result.assets[0]);
      }
    } catch (error) {
      console.error("Error picking image:", error);
      toast.error("Failed to pick image");
    }
  }, [handleImagePreview]);

  const handleCameraCapture = useCallback(async () => {
    const { status } = await ImagePicker.requestCameraPermissionsAsync();
    if (status !== ImagePicker.PermissionStatus.GRANTED) {
      toast.error("Camera permission required", {
        action: {
          label: "Settings",
          onClick: () => {
            void Linking.openSettings();
          },
        },
      });
      return;
    }

    const result = await ImagePicker.launchCameraAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      quality: 0.8,
    });

    if (!result.canceled && result.assets[0]) {
      handleImagePreview(result.assets[0]);
    }
  }, [handleImagePreview]);

  /**
   * Clear all event input state (image, text, link).
   */
  const handleClearPreview = useCallback(() => {
    resetAddEventState();
  }, [resetAddEventState]);

  /**
   * Clear just the text in the input
   */
  const handleClearText = useCallback(() => {
    setInput("", "add");
  }, [setInput]);

  /**
   * Actually create the event, then reset state and close.
   */
  const handleCreateEvent = async () => {
    const { input, imagePreview, linkPreview } = addEventState;
    if (!input.trim() && !imagePreview && !linkPreview) return;
    if (!user?.id || !user.username) return;

    // Immediately close the modal
    router.canGoBack() ? router.back() : router.replace("/feed");
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

  /**
   * Toggle the "describe" vs. "upload" mode.
   */
  const handleDescribePress = useCallback(() => {
    if (addEventState.activeInput === "describe") {
      // Switching from describe to upload mode
      setActiveInput("upload");
      setIsOptionSelected(true);
      // Keep the image preview if there is one
    } else {
      // Switching to describe mode - clear image preview
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
          {!hasMediaPermission && activeInput !== "describe" ? (
            <PhotoAccessPrompt />
          ) : (
            <View className="flex-1">
              <View className="px-4 pt-2">
                <EventPreview
                  containerClassName="rounded-xl overflow-hidden"
                  imagePreview={imagePreview}
                  linkPreview={linkPreview}
                  input={input}
                  handleTextChange={handleTextChange}
                  clearPreview={handleClearPreview}
                  clearText={handleClearText}
                  activeInput={activeInput}
                  isImageLoading={isImageLoading}
                  handleMorePhotos={handleMorePhotosPress}
                  previewContainerStyle={
                    activeInput === "describe" ? "compact" : "square"
                  }
                />
              </View>
              {activeInput !== "describe" && (
                <View className="h-full flex-1 px-4">
                  <PhotoGrid
                    hasMediaPermission={hasMediaPermission}
                    hasFullPhotoAccess={hasFullPhotoAccess}
                    recentPhotos={recentPhotos}
                    onPhotoSelect={handleImagePreview}
                    onCameraPress={handleCameraCapture}
                    onMorePhotos={handleMorePhotosPress}
                    selectedUri={imagePreview}
                  />
                </View>
              )}
            </View>
          )}
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
