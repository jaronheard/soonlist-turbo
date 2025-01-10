import React, { useCallback, useEffect, useState } from "react";
import { Keyboard, Linking, Platform, SafeAreaView, View } from "react-native";
import * as FileSystem from "expo-file-system";
import * as ImageManipulator from "expo-image-manipulator";
import * as ImagePicker from "expo-image-picker";
import * as MediaLibrary from "expo-media-library";
import {
  router,
  Stack,
  useFocusEffect,
  useLocalSearchParams,
} from "expo-router";
import { useUser } from "@clerk/clerk-expo";
import { toast } from "sonner-native";

import type { RecentPhoto } from "~/store";
import { CaptureEventButton } from "~/components/CaptureEventButton";
import { EventPreview } from "~/components/EventPreview";
import { NewEventHeader } from "~/components/NewEventHeader";
import { PhotoAccessPrompt } from "~/components/PhotoAccessPrompt";
import { PhotoGrid } from "~/components/PhotoGrid";
import { useNotification } from "~/providers/NotificationProvider";
import { useAppStore } from "~/store";
import { api } from "~/utils/api";
import { cn } from "~/utils/cn";

// Adjust this regex if needed
const VALID_IMAGE_REGEX = /^[\w.:\-_/]+\|\d+(\.\d+)?\|\d+(\.\d+)?$/;

interface EventResponse {
  success: boolean;
  eventId?: string;
}
function isSuccessResponse(
  result: EventResponse,
): result is EventResponse & { eventId: string } {
  return result.success;
}

export default function NewEventModal() {
  // --- NEW: local state for keyboard height
  const [keyboardHeight, setKeyboardHeight] = useState(0);

  // Subscribe/unsubscribe to keyboard events
  useEffect(() => {
    const showSub = Keyboard.addListener("keyboardDidShow", (e) => {
      setKeyboardHeight(e.endCoordinates.height);
    });
    const hideSub = Keyboard.addListener("keyboardDidHide", () => {
      setKeyboardHeight(0);
    });

    return () => {
      showSub.remove();
      hideSub.remove();
    };
  }, []);
  // --- END NEW

  const { expoPushToken, hasNotificationPermission } = useNotification();
  const utils = api.useUtils();
  const { user } = useUser();

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
    shouldRefreshMediaLibrary,
    setShouldRefreshMediaLibrary,
    setRecentPhotos,
    hasFullPhotoAccess,
  } = useAppStore();

  const eventFromRawTextAndNotification =
    api.ai.eventFromRawTextThenCreateThenNotification.useMutation({
      onSuccess: () => {
        return Promise.all([
          utils.event.getEventsForUser.invalidate(),
          utils.event.getStats.invalidate(),
        ]);
      },
    });
  const eventFromImageThenCreateThenNotification =
    api.ai.eventFromImageThenCreateThenNotification.useMutation({
      onSuccess: () => {
        return Promise.all([
          utils.event.getEventsForUser.invalidate(),
          utils.event.getStats.invalidate(),
        ]);
      },
    });
  const eventFromUrlThenCreateThenNotification =
    api.ai.eventFromUrlThenCreateThenNotification.useMutation({
      onSuccess: () => {
        return Promise.all([
          utils.event.getEventsForUser.invalidate(),
          utils.event.getStats.invalidate(),
        ]);
      },
    });

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

    router.canGoBack() ? router.back() : router.navigate("/feed");

    toast.info("Processing details. Add another?", {
      duration: 5000,
    });

    try {
      let eventId: string | undefined;

      if (linkPreview) {
        const result = await eventFromUrlThenCreateThenNotification.mutateAsync(
          {
            url: linkPreview,
            timezone: "America/Los_Angeles",
            expoPushToken,
            lists: [],
            userId: user?.id || "",
            username: user?.username || "",
            visibility: "private",
          },
        );
        if (isSuccessResponse(result)) {
          eventId = result.eventId;
        }
      } else if (imagePreview) {
        setIsImageLoading(true);
        try {
          const manipulatedImage = await ImageManipulator.manipulateAsync(
            imagePreview,
            [{ resize: { width: 1284 } }],
            { compress: 0.8, format: ImageManipulator.SaveFormat.JPEG },
          );

          const response = await FileSystem.uploadAsync(
            "https://api.bytescale.com/v2/accounts/12a1yek/uploads/binary",
            manipulatedImage.uri,
            {
              uploadType: FileSystem.FileSystemUploadType.BINARY_CONTENT,
              httpMethod: "POST",
              headers: {
                "Content-Type": "image/jpeg",
                Authorization: "Bearer public_12a1yekATNiLj4VVnREZ8c7LM8V8",
              },
            },
          );

          if (response.status !== 200) {
            throw new Error(`Upload failed with status ${response.status}`);
          }

          const { fileUrl } = JSON.parse(response.body) as { fileUrl: string };

          const result =
            await eventFromImageThenCreateThenNotification.mutateAsync({
              imageUrl: fileUrl,
              timezone: "America/Los_Angeles",
              expoPushToken,
              lists: [],
              userId: user?.id || "",
              username: user?.username || "",
              visibility: "private",
            });
          if (isSuccessResponse(result)) {
            eventId = result.eventId;
          }
        } finally {
          setIsImageLoading(false);
        }
      } else {
        const result = await eventFromRawTextAndNotification.mutateAsync({
          rawText: input,
          timezone: "America/Los_Angeles",
          expoPushToken,
          lists: [],
          userId: user?.id || "",
          username: user?.username || "",
          visibility: "private",
        });
        if (isSuccessResponse(result)) {
          eventId = result.eventId;
        }
      }

      // Example success toast if no push notification permission
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
    eventFromUrlThenCreateThenNotification,
    eventFromImageThenCreateThenNotification,
    eventFromRawTextAndNotification,
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

  const loadRecentPhotos = useCallback(async () => {
    try {
      const { assets } = await MediaLibrary.getAssetsAsync({
        first: 15,
        sortBy: MediaLibrary.SortBy.creationTime,
        mediaType: [MediaLibrary.MediaType.photo],
      });
      const photos = assets.map((asset) => ({
        id: asset.id,
        uri: asset.uri,
      }));
      setRecentPhotos(photos);
    } catch (error) {
      console.error("Error loading recent photos:", error);
    }
  }, [setRecentPhotos]);

  useFocusEffect(
    useCallback(() => {
      let subscription: MediaLibrary.Subscription | undefined;

      async function checkPermissionsAndLoadPhotos() {
        const { status, accessPrivileges } =
          await MediaLibrary.getPermissionsAsync();
        const isGranted = status === MediaLibrary.PermissionStatus.GRANTED;
        const hasFullAccess = accessPrivileges === "all";

        useAppStore.setState({
          hasMediaPermission: isGranted,
          hasFullPhotoAccess: hasFullAccess,
        });

        if (isGranted) {
          try {
            const { assets } = await MediaLibrary.getAssetsAsync({
              first: 15,
              sortBy: MediaLibrary.SortBy.creationTime,
              mediaType: [MediaLibrary.MediaType.photo],
            });

            // Verify each asset is accessible
            const accessibleAssets = await Promise.all(
              assets.map(async (asset) => {
                try {
                  const assetInfo = await MediaLibrary.getAssetInfoAsync(asset);
                  return assetInfo.localUri
                    ? { id: asset.id, uri: assetInfo.localUri }
                    : null;
                } catch (e) {
                  return null;
                }
              }),
            );
            const photos = accessibleAssets.filter(
              (asset): asset is RecentPhoto => asset !== null,
            );
            setRecentPhotos(photos);

            subscription = MediaLibrary.addListener(
              ({ hasIncrementalChanges, insertedAssets }) => {
                if (
                  hasIncrementalChanges &&
                  insertedAssets &&
                  insertedAssets.length > 0
                ) {
                  useAppStore.setState({ shouldRefreshMediaLibrary: true });
                }
              },
            );
          } catch (error) {
            console.error("Error loading recent photos:", error);
          }
        } else {
          console.log("No media permission, skipping load");
        }
      }

      void checkPermissionsAndLoadPhotos();

      return () => {
        if (subscription) {
          subscription.remove();
        }
      };
    }, [setRecentPhotos]),
  );

  useEffect(() => {
    if (shouldRefreshMediaLibrary) {
      console.log("Refreshing media library");
      clearPreview();
      setShouldRefreshMediaLibrary(false);
      // The photos will be reloaded by the focus effect
    }
  }, [shouldRefreshMediaLibrary, clearPreview, setShouldRefreshMediaLibrary]);

  const [initialized, setInitialized] = useState(false);

  // On mount, decide the initial active state
  useEffect(() => {
    setInput("");
    setImagePreview(null);
    setLinkPreview(null);

    if (text) {
      handleTextChange(text);
      setActiveInput("describe");
      setIsOptionSelected(true);
    } else if (imageUri) {
      if (VALID_IMAGE_REGEX.test(imageUri)) {
        const [uri, width, height] = imageUri.split("|");
        if (uri) {
          if (uri.startsWith("http")) {
            handleLinkPreview(uri);
            setActiveInput("url");
          } else {
            void handleImagePreview(uri);
            setActiveInput("upload");
          }
        }
        setInput(`Image: ${width ?? "unknown"}x${height ?? "unknown"}`);
        setIsOptionSelected(true);
      } else {
        console.warn("Invalid image URI format:", imageUri);
        setActiveInput("describe");
        setIsOptionSelected(false);
      }
    } else {
      // if no text or image passed, maybe show the newest photo
      const mostRecentPhoto = recentPhotos[0];
      console.log("Initializing with most recent photo:", mostRecentPhoto);
      if (mostRecentPhoto?.uri) {
        setActiveInput("upload");
        setIsOptionSelected(true);
        void handleImagePreview(mostRecentPhoto.uri);
      } else {
        setActiveInput("describe");
        setIsOptionSelected(false);
      }
    }

    setInitialized(true);
  }, [
    text,
    imageUri,
    handleImagePreview,
    handleLinkPreview,
    handleTextChange,
    recentPhotos,
    setActiveInput,
    setImagePreview,
    setInput,
    setIsOptionSelected,
    setLinkPreview,
  ]);

  useEffect(() => {
    if (hasMediaPermission && recentPhotos.length === 0) {
      void loadRecentPhotos();
    }
  }, [hasMediaPermission, recentPhotos.length, loadRecentPhotos]);

  useEffect(() => {
    if (shouldRefreshMediaLibrary) {
      clearPreview();
      void loadRecentPhotos();
      setShouldRefreshMediaLibrary(false);
    }
  }, [
    shouldRefreshMediaLibrary,
    setShouldRefreshMediaLibrary,
    clearPreview,
    setRecentPhotos,
    loadRecentPhotos,
  ]);

  const isFromIntent = Boolean(text || imageUri);

  // Clears just the text
  const clearText = useCallback(() => {
    setInput("");
  }, [setInput]);

  // until initial states are set
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

      {/* Main content area */}
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
                isFromIntent={isFromIntent}
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

            {/* If not from a share intent and not describing, show photo grid */}
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

          {/* Bottom container.  Use marginBottom to avoid being hidden by the keyboard. */}
          <View
            className={cn("px-4")}
            style={{
              marginBottom: keyboardHeight + 64,
              // Remove absolute positioning, transforms, etc.
            }}
          >
            <CaptureEventButton
              handleCreateEvent={handleCreateEvent}
              input={input}
              imagePreview={imagePreview}
              linkPreview={linkPreview}
            />
          </View>
        </View>
      )}
    </SafeAreaView>
  );
}
