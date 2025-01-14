import React, { useCallback } from "react";
import { Animated, Linking, SafeAreaView, View } from "react-native";
import * as ImagePicker from "expo-image-picker";
import { router, Stack, useLocalSearchParams } from "expo-router";
import { useUser } from "@clerk/clerk-expo";
import { toast } from "sonner-native";

import { CaptureEventButton } from "~/components/CaptureEventButton";
import { EventPreview } from "~/components/EventPreview";
import { NewEventHeader } from "~/components/NewEventHeader";
import { PhotoAccessPrompt } from "~/components/PhotoAccessPrompt";
import { PhotoGrid } from "~/components/PhotoGrid";
import { useCreateEvent } from "~/hooks/useCreateEvent";
import { useInitializeInput } from "~/hooks/useInitializeInput";
import { useKeyboardHeight } from "~/hooks/useKeyboardHeight";
import { useNotification } from "~/providers/NotificationProvider";
import { useAppStore } from "~/store";
import { cn } from "~/utils/cn";

const OFFSET_VALUE = 64;

export default function NewEventModal() {
  const { marginBottomAnim } = useKeyboardHeight(OFFSET_VALUE);
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
    setIsImageLoading,
    resetAddEventState,
    activeInput,
    setIsOptionSelected,
    setActiveInput,
    recentPhotos,
    hasMediaPermission,
    hasFullPhotoAccess,
  } = useAppStore();

  const handleImagePreview = useCallback(
    (uri: string) => {
      setImagePreview(uri);
      setInput(uri.split("/").pop() || "");
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

  const handleMorePhotos = useCallback(async () => {
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

  const clearPreview = useCallback(() => {
    setImagePreview(null);
    setLinkPreview(null);
    setInput("");
    setIsOptionSelected(false);
    setActiveInput(null);
    resetAddEventState();
  }, [
    setImagePreview,
    setLinkPreview,
    setInput,
    setIsOptionSelected,
    setActiveInput,
    resetAddEventState,
  ]);

  const handleCreateEvent = useCallback(async () => {
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
  }, [
    input,
    imagePreview,
    linkPreview,
    expoPushToken,
    hasNotificationPermission,
    user,
    setIsImageLoading,
    createEvent,
    resetAddEventState,
  ]);

  const handleDescribePress = useCallback(() => {
    if (activeInput === "describe") {
      clearPreview();
      setActiveInput("upload");
      setIsOptionSelected(true);
    } else {
      clearPreview();
      setActiveInput("describe");
      setIsOptionSelected(true);
    }
  }, [clearPreview, setActiveInput, setIsOptionSelected, activeInput]);

  const { text, imageUri } = useLocalSearchParams<{
    text?: string;
    imageUri?: string;
  }>();

  const { initialized } = useInitializeInput({
    text,
    imageUri,
    recentPhotos,
  });

  const isFromIntent = Boolean(text || imageUri);

  const clearText = useCallback(() => {
    setInput("");
  }, [setInput]);

  if (!initialized) {
    return null;
  }

  return (
    <SafeAreaView className="flex-1 bg-interactive-1">
      <Stack.Screen
        options={{
          title: "",
          headerShown: true,
          headerShadowVisible: false,
          headerStyle: { backgroundColor: "#5A32FB" },
          headerTintColor: "#fff",
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

      {!hasMediaPermission && !isFromIntent && activeInput !== "describe" ? (
        <PhotoAccessPrompt />
      ) : (
        <View className="flex-1 bg-interactive-1">
          <View className="flex-1">
            <View className="px-4 pt-2">
              <EventPreview
                containerClassName="rounded-xl overflow-hidden"
                imagePreview={imagePreview}
                linkPreview={linkPreview}
                input={input}
                handleTextChange={handleTextChange}
                clearPreview={clearPreview}
                clearText={clearText}
                activeInput={activeInput}
                isImageLoading={isImageLoading}
                handleMorePhotos={handleMorePhotos}
                previewContainerStyle={
                  isFromIntent
                    ? "full"
                    : activeInput === "describe"
                      ? "compact"
                      : "square"
                }
              />
            </View>

            {!isFromIntent && activeInput !== "describe" ? (
              <View className="flex-1 px-4">
                <PhotoGrid
                  hasMediaPermission={hasMediaPermission}
                  hasFullPhotoAccess={hasFullPhotoAccess}
                  recentPhotos={recentPhotos}
                  onPhotoSelect={(uri) => handleImagePreview(uri)}
                  onCameraPress={() => void handleCameraCapture()}
                  onMorePhotos={() => void handleMorePhotos()}
                  selectedUri={imagePreview}
                />
              </View>
            ) : (
              <View className="flex-1" />
            )}
          </View>

          <Animated.View
            className={cn("px-4")}
            style={{ marginBottom: marginBottomAnim }}
          >
            <CaptureEventButton
              handleCreateEvent={handleCreateEvent}
              input={input}
              imagePreview={imagePreview}
              linkPreview={linkPreview}
            />
          </Animated.View>
        </View>
      )}
    </SafeAreaView>
  );
}
