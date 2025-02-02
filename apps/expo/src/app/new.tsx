import React, { useCallback } from "react";
import { Linking, View } from "react-native";
import Animated from "react-native-reanimated";
import { SafeAreaView } from "react-native-safe-area-context";
import * as ImagePicker from "expo-image-picker";
import { router, Stack, useLocalSearchParams } from "expo-router";
import { useUser } from "@clerk/clerk-expo";
import { toast } from "sonner-native";

import type { ImageSource } from "~/components/demoData";
import { CaptureEventButton } from "~/components/CaptureEventButton";
import { EventPreview } from "~/components/EventPreview";
import { NewEventHeader } from "~/components/NewEventHeader";
import { PhotoAccessPrompt } from "~/components/PhotoAccessPrompt";
import { PhotoGrid } from "~/components/PhotoGrid";
import { useCreateEvent } from "~/hooks/useCreateEvent";
import { useInitializeInput } from "~/hooks/useInitializeInput";
import { useKeyboardHeight } from "~/hooks/useKeyboardHeight";
import { useMediaLibrary } from "~/hooks/useMediaLibrary";
import { useNotification } from "~/providers/NotificationProvider";
import { useAppStore } from "~/store";

const OFFSET_VALUE = 64;

export default function NewEventModal() {
  const { style: keyboardStyle } = useKeyboardHeight(OFFSET_VALUE);
  const { expoPushToken, hasNotificationPermission } = useNotification();
  const { user } = useUser();
  const { createEvent } = useCreateEvent();
  useMediaLibrary();

  const {
    input,
    imagePreview,
    linkPreview,
    isImageLoading,
    setInput,
    setImagePreview,
    setLinkPreview,
    resetAddEventState,
    activeInput,
    setIsOptionSelected,
    setActiveInput,
    recentPhotos,
    hasMediaPermission,
    hasFullPhotoAccess,
  } = useAppStore();

  const { text, imageUri } = useLocalSearchParams<{
    text?: string;
    imageUri?: string;
  }>();

  const finalText = text;
  const finalImageUri = imageUri;

  // 1. Initialize the input
  const { initialized } = useInitializeInput({
    text: finalText,
    imageUri: finalImageUri,
    recentPhotos,
  });

  const isFromIntent = Boolean(finalText || finalImageUri);

  // Handlers
  const handleImagePreview = useCallback(
    (uri: string | ImageSource) => {
      if (typeof uri === "string") {
        setImagePreview(uri);
        setInput(uri.split("/").pop() || "");
      } else if (typeof uri === "number") {
        // Handle ImageRequireSource (local image require)
        setImagePreview(String(uri));
        setInput(`local_image_${uri}`);
      } else {
        // Handle RemoteImageSource
        setImagePreview(uri.uri);
        setInput(uri.uri.split("/").pop() || "");
      }
    },
    [setImagePreview, setInput],
  );

  const handleLinkPreview = useCallback(
    (url: string) => {
      setLinkPreview(url);
      setInput(url);
    },
    [setLinkPreview, setInput],
  );

  const handleTextChange = useCallback(
    (text: string) => {
      setInput(text);
      const urlRegex = /(https?:\/\/[^\s]+)/g;
      const urls = text.match(urlRegex);
      if (urls && urls.length > 0) {
        handleLinkPreview(urls[0]);
      } else {
        setLinkPreview(null);
      }
    },
    [handleLinkPreview, setInput, setLinkPreview],
  );

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
      setInput(imageUri.split("/").pop() || "");
      handleImagePreview(imageUri);
    }
  }, [handleImagePreview, setInput]);

  const handleClearPreview = useCallback(() => {
    setImagePreview(null);
    setLinkPreview(null);
    setInput("");
    setIsOptionSelected(false);
    resetAddEventState();
  }, [
    setImagePreview,
    setLinkPreview,
    setInput,
    setIsOptionSelected,
    resetAddEventState,
  ]);

  const handleCreateEvent = async () => {
    if (!input.trim() && !imagePreview && !linkPreview) return;
    if (!user?.id || !user.username || !expoPushToken) return;

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
        expoPushToken,
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
  }, [handleClearPreview, setActiveInput, setIsOptionSelected, activeInput]);

  const handleClearText = useCallback(() => {
    setInput("");
  }, [setInput]);

  if (!initialized) {
    return null;
  }

  return (
    <SafeAreaView className="flex-1 bg-[#5A32FB]">
      {/* Wrap everything in a "card" that has rounded top corners, 
          hiding anything behind it so no black gap appears */}
      <View className="flex-1 overflow-hidden rounded-t-3xl bg-interactive-1">
        <View className="flex-1">
          {/* Screen header */}
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
                  isFromIntent={isFromIntent}
                  linkPreview={linkPreview}
                  imagePreview={imagePreview}
                  activeInput={activeInput}
                  handleDescribePress={handleDescribePress}
                />
              ),
            }}
          />

          {!hasMediaPermission &&
          !isFromIntent &&
          activeInput !== "describe" ? (
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
                    activeInput === "describe"
                      ? "compact"
                      : isFromIntent
                        ? "full"
                        : "square"
                  }
                />
              </View>

              {/* Photo grid below preview (only if not describing) */}
              {!isFromIntent && activeInput !== "describe" && (
                <View className="flex-1 px-4">
                  <PhotoGrid
                    hasMediaPermission={hasMediaPermission}
                    hasFullPhotoAccess={hasFullPhotoAccess}
                    recentPhotos={recentPhotos}
                    onPhotoSelect={(uri: string | ImageSource) =>
                      handleImagePreview(uri)
                    }
                    onCameraPress={() => void handleCameraCapture()}
                    onMorePhotos={() => void handleMorePhotosPress()}
                    selectedUri={imagePreview}
                  />
                </View>
              )}
            </View>
          )}
        </View>

        {/* The capture button sits at the bottom, with optional animated margin 
            so it can float above the keyboard smoothly. */}
        <Animated.View className="px-4 pb-4" style={keyboardStyle}>
          <CaptureEventButton
            handleCreateEvent={handleCreateEvent}
            input={input}
            imagePreview={imagePreview}
            linkPreview={linkPreview}
          />
        </Animated.View>
      </View>
    </SafeAreaView>
  );
}
