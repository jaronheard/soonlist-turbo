import React, { useCallback, useEffect } from "react";
import { Linking, View } from "react-native";
import Animated from "react-native-reanimated";
import * as ImagePicker from "expo-image-picker";
import { router, Stack } from "expo-router";
import { useUser } from "@clerk/clerk-expo";
import { toast } from "sonner-native";

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

/**
 * This screen is used for manually adding an event from inside the app.
 * It includes the photo grid, "describe" toggles, camera usage, etc.
 */

const OFFSET_VALUE = 32;

export default function AddEventModal() {
  const { style: keyboardStyle } = useKeyboardHeight(OFFSET_VALUE);
  const { expoPushToken, hasNotificationPermission } = useNotification();
  const { user } = useUser();
  const { createEvent } = useCreateEvent();

  // All store-based states and actions
  const {
    addEventState: {
      input,
      imagePreview,
      linkPreview,
      isImageLoading,
      activeInput,
    },
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

  // Reset state when modal is closed
  useEffect(() => {
    return () => {
      resetAddEventState();
    };
  }, [resetAddEventState]);

  // Refresh media library on mount
  useMediaLibrary();

  /**
   * Link detection from typed input
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

  /**
   * Preview an image in the store so user can confirm
   */
  const handleImagePreview = useCallback(
    (uri: string) => {
      setImagePreview(uri, "add");
      setInput(uri.split("/").pop() || "", "add");
    },
    [setImagePreview, setInput],
  );

  /**
   * Handle picking an image from the device library
   */
  const handleMorePhotosPress = useCallback(async () => {
    try {
      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ImagePicker.MediaTypeOptions.Images,
        quality: 0.8,
      });

      if (!result.canceled && result.assets[0]) {
        handleImagePreview(result.assets[0].uri);
      }
    } catch (error) {
      console.error("Error picking image:", error);
      toast.error("Failed to pick image");
    }
  }, [handleImagePreview]);

  /**
   * Handle camera capture
   */
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
      const imageUri = result.assets[0].uri;
      setInput(imageUri.split("/").pop() || "", "add");
      setImagePreview(imageUri, "add");
    }
  }, [setImagePreview, setInput]);

  /**
   * Clear the preview state
   */
  const handleClearPreview = useCallback(() => {
    setImagePreview(null, "add");
    setLinkPreview(null, "add");
    setInput("", "add");
    resetAddEventState();
  }, [setImagePreview, setLinkPreview, setInput, resetAddEventState]);

  /**
   * Clear text in the preview
   */
  const handleClearText = useCallback(() => {
    setInput("", "add");
  }, [setInput]);

  /**
   * Actually create the event
   */
  const handleCreateEvent = async () => {
    if (!input.trim() && !imagePreview && !linkPreview) return;
    if (!user?.id || !user.username) return;

    router.canGoBack() ? router.back() : router.navigate("/feed");
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
   * Show or hide the "describe" input
   */
  const handleDescribePress = useCallback(() => {
    if (activeInput === "describe") {
      handleClearPreview();
      setActiveInput("upload");
      setIsOptionSelected(true);
    } else {
      handleClearPreview();
      setActiveInput("describe");
      setIsOptionSelected(true);
    }
  }, [activeInput, handleClearPreview, setActiveInput, setIsOptionSelected]);

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
              // The user toggles "describe" vs default
              isFromIntent={false} // Not a share-intent
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
              {/* Event preview at top */}
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

              {/* Photo grid below preview (only if not describing) */}
              {activeInput !== "describe" && (
                <View className="h-full flex-1 px-4">
                  <PhotoGrid
                    hasMediaPermission={hasMediaPermission}
                    hasFullPhotoAccess={hasFullPhotoAccess}
                    recentPhotos={recentPhotos}
                    onPhotoSelect={(uri) => handleImagePreview(uri as string)}
                    onCameraPress={() => void handleCameraCapture()}
                    onMorePhotos={() => void handleMorePhotosPress()}
                    selectedUri={imagePreview}
                  />
                </View>
              )}
            </View>
          )}
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
