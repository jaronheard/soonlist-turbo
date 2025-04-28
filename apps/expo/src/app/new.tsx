import React, { useCallback, useEffect } from "react";
import { View } from "react-native";
import Animated from "react-native-reanimated";
import { router, Stack, useLocalSearchParams } from "expo-router";
import { useUser } from "@clerk/clerk-expo";
import { toast } from "sonner-native";

import { CaptureEventButton } from "~/components/CaptureEventButton";
import { EventPreview } from "~/components/EventPreview";
import { NewEventHeader } from "~/components/NewEventHeader";
import { PhotoGrid } from "~/components/PhotoGrid";
import { useCreateEvent } from "~/hooks/useCreateEvent";
import { useInitializeInput } from "~/hooks/useInitializeInput";
import { useKeyboardHeight } from "~/hooks/useKeyboardHeight";
import { useRecentPhotos } from "~/hooks/useMediaLibrary";
import { useAppStore } from "~/store";
import { logError } from "~/utils/errorLogging";

export default function NewEventModal() {
  const { style: keyboardStyle } = useKeyboardHeight(32);
  const { user } = useUser();
  const { createEvent } = useCreateEvent();
  const {
    newEventState,
    setInput,
    setImagePreview,
    setLinkPreview,
    resetNewEventState,
    setIsOptionSelected,
    setActiveInput,
    hasMediaPermission,
    hasFullPhotoAccess,
  } = useAppStore();

  const { 
    data: recentPhotos, 
    isLoadingMore, 
    hasNextPage, 
    loadMorePhotos 
  } = useRecentPhotos();

  const params = useLocalSearchParams<{
    text?: string;
    imageUri?: string;
  }>();

  useInitializeInput({
    text: params.text,
    imageUri: params.imageUri,
    recentPhotos: [], // We skip recent photos for share extension
    route: "new",
  });

  const handleTextChange = useCallback(
    (text: string) => {
      setInput(text, "new");
      const urlRegex = /(https?:\/\/[^\s]+)/g;
      const urls = text.match(urlRegex);
      if (urls && urls.length > 0) {
        setLinkPreview(urls[0], "new");
      } else {
        setLinkPreview(null, "new");
      }
    },
    [setInput, setLinkPreview],
  );

  const handleImagePreview = useCallback(
    (uri: string) => {
      setImagePreview(uri, "new");
      const filename = uri.split("/").pop() || "";
      setInput(filename, "new");
    },
    [setImagePreview, setInput],
  );

  const handleClearPreview = useCallback(() => {
    resetNewEventState();
  }, [resetNewEventState]);

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

    router.replace("../");

    try {
      await createEvent(eventData);
      toast.success("Event captured successfully!");
    } catch (error) {
      logError("Error creating event", error);
      toast.error("Failed to create event. Please try again.");
    }
  };

  const handleDescribePress = useCallback(() => {
    if (newEventState.activeInput === "describe") {
      setActiveInput("upload");
      setIsOptionSelected(true);
    } else {
      setActiveInput("describe");
      setIsOptionSelected(true);
      setImagePreview(null, "new");
      setInput("", "new");
    }
  }, [
    newEventState.activeInput,
    setActiveInput,
    setIsOptionSelected,
    setImagePreview,
    setInput,
  ]);

  const { input, imagePreview, linkPreview, activeInput, isImageLoading } =
    newEventState;

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
              handleDescribePress={handleDescribePress}
            />
          ),
        }}
      />

      <View className="h-full flex-1 overflow-hidden rounded-t-3xl bg-interactive-1">
        <View className="flex-1">
          <View className="flex-1">
            <View className="px-4 pt-2">
              <EventPreview
                containerClassName="rounded-xl overflow-hidden"
                imagePreview={imagePreview}
                linkPreview={linkPreview}
                input={input}
                handleTextChange={handleTextChange}
                clearPreview={handleClearPreview}
                clearText={() => setInput("", "new")}
                activeInput={activeInput}
                isImageLoading={isImageLoading}
                handleMorePhotos={() => null}
                previewContainerStyle="square"
              />
            </View>

            {activeInput !== "describe" && hasMediaPermission && (
              <View className="h-full flex-1 px-4">
                <PhotoGrid
                  hasMediaPermission={hasMediaPermission}
                  hasFullPhotoAccess={hasFullPhotoAccess}
                  recentPhotos={recentPhotos}
                  onPhotoSelect={handleImagePreview}
                  onCameraPress={() => null}
                  onMorePhotos={() => null}
                  selectedUri={imagePreview}
                  isLoadingMore={isLoadingMore}
                  hasNextPage={hasNextPage}
                  onEndReached={loadMorePhotos}
                />
              </View>
            )}
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
