import React, { useCallback, useEffect, useState } from "react";
import {
  ActivityIndicator,
  Dimensions,
  KeyboardAvoidingView,
  Platform,
  Pressable,
  StyleSheet,
  Text,
  TextInput,
  View,
} from "react-native";
import * as FileSystem from "expo-file-system";
import { Image } from "expo-image";
import * as ImageManipulator from "expo-image-manipulator";
import * as ImagePicker from "expo-image-picker";
import { Stack, useLocalSearchParams, useRouter } from "expo-router";
import { useUser } from "@clerk/clerk-expo";
import { FlashList } from "@shopify/flash-list";
import { Camera, Link as LinkIcon, Sparkles, X } from "lucide-react-native";

import { useNotification } from "~/providers/NotificationProvider";
import { useAppStore } from "~/store";
import { api } from "~/utils/api";
import { showToast } from "~/utils/toast";

const VALID_IMAGE_REGEX = /^[\w.:\-_/]+\|\d+(\.\d+)?\|\d+(\.\d+)?$/;

const styles = StyleSheet.create({
  previewContainer: {
    width: Dimensions.get("window").width - 32,
    height: Dimensions.get("window").width - 32,
  },
});

interface RecentPhoto {
  id: string;
  uri: string;
}

const PhotoGrid = React.memo(
  ({
    hasMediaPermission,
    recentPhotos,
    onPhotoSelect,
    onCameraPress,
  }: {
    hasMediaPermission: boolean;
    recentPhotos: RecentPhoto[];
    onPhotoSelect: (uri: string) => void;
    onCameraPress: () => void;
  }) => {
    const windowWidth = Dimensions.get("window").width;
    const padding = 32;
    const spacing = 2;
    const columns = 4;
    const availableWidth = windowWidth - padding;
    const imageSize = (availableWidth - (columns - 1) * spacing) / columns;

    if (!hasMediaPermission || recentPhotos.length === 0) return null;

    return (
      <View className="" style={{ height: imageSize * 3 + spacing * 2 }}>
        <View className="mb-2 flex-row items-center justify-between">
          <Text className="text-sm font-medium text-gray-700">Recents</Text>
          <Pressable
            onPress={onCameraPress}
            className="rounded-md bg-interactive-3 px-2 py-2"
          >
            <Camera size={16} color="#5A32FB" />
          </Pressable>
        </View>
        <View className="flex-1 bg-transparent">
          <FlashList
            data={recentPhotos}
            renderItem={({ item }) => (
              <Pressable
                onPress={() => onPhotoSelect(item.uri)}
                style={{
                  width: imageSize,
                  height: imageSize,
                  padding: spacing / 2,
                }}
              >
                <Image
                  source={{ uri: item.uri }}
                  style={{
                    width: "100%",
                    height: "100%",
                  }}
                  contentFit="cover"
                  contentPosition="center"
                  transition={100}
                  cachePolicy="memory"
                />
              </Pressable>
            )}
            numColumns={4}
            estimatedItemSize={imageSize}
            showsVerticalScrollIndicator={true}
            contentContainerStyle={{ padding: spacing / 2 }}
            estimatedListSize={{
              height: imageSize * 3 + spacing * 2,
              width: windowWidth - padding,
            }}
            keyExtractor={(item) => item.id}
          />
        </View>
      </View>
    );
  },
);

export default function NewEventModal() {
  const router = useRouter();
  const { expoPushToken } = useNotification();
  const utils = api.useUtils();
  const { user } = useUser();
  const {
    input,
    imagePreview,
    linkPreview,
    isImageLoading,
    uploadedImageUrl,
    setInput,
    setImagePreview,
    setLinkPreview,
    setIsImageLoading,
    setUploadedImageUrl,
    resetAddEventState,
    activeInput,
    setIsOptionSelected,
    setActiveInput,
    recentPhotos,
    hasMediaPermission,
  } = useAppStore();

  const [isSubmitting, setIsSubmitting] = useState(false);

  const eventFromRawTextAndNotification =
    api.ai.eventFromRawTextThenCreateThenNotification.useMutation({
      onSettled: () => void utils.event.getEventsForUser.invalidate(),
    });
  const eventFromImageThenCreateThenNotification =
    api.ai.eventFromImageThenCreateThenNotification.useMutation({
      onSettled: () => void utils.event.getEventsForUser.invalidate(),
    });
  const eventFromUrlThenCreateThenNotification =
    api.ai.eventFromUrlThenCreateThenNotification.useMutation({
      onSettled: () => void utils.event.getEventsForUser.invalidate(),
    });

  const handleImageUploadFromUri = useCallback(
    async (uri: string) => {
      setIsImageLoading(true);
      setImagePreview(uri);

      const uploadImage = async (imageUri: string): Promise<string> => {
        try {
          const manipulatedImage = await ImageManipulator.manipulateAsync(
            imageUri,
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

          const data = JSON.parse(response.body) as { fileUrl: string };
          return data.fileUrl;
        } catch (error) {
          console.error("Error uploading image:", error);
          throw error;
        }
      };

      try {
        const uploadedUrl = await uploadImage(uri);
        setImagePreview(uploadedUrl);
        setUploadedImageUrl(uploadedUrl);
      } catch (error) {
        console.error("Error processing image:", error);
        setImagePreview(null);
        setUploadedImageUrl(null);
      } finally {
        setIsImageLoading(false);
      }
    },
    [setImagePreview, setIsImageLoading, setUploadedImageUrl],
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

  const handleCameraCapture = useCallback(async () => {
    const { status } = await ImagePicker.requestCameraPermissionsAsync();
    if (status !== ImagePicker.PermissionStatus.GRANTED) {
      showToast("Camera permission is required to take a photo", "error");
      return;
    }

    const result = await ImagePicker.launchCameraAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      quality: 0.8,
    });

    if (!result.canceled && result.assets[0]) {
      const imageUri = result.assets[0].uri;
      setInput(imageUri.split("/").pop() || "");
      await handleImageUploadFromUri(imageUri);
    }
  }, [handleImageUploadFromUri, setInput]);

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

    setIsSubmitting(true);
    try {
      if (linkPreview) {
        await eventFromUrlThenCreateThenNotification.mutateAsync({
          url: linkPreview,
          timezone: "America/Los_Angeles",
          expoPushToken,
          lists: [],
          userId: user?.id || "",
          username: user?.username || "",
          visibility: "private",
        });
      } else if (uploadedImageUrl) {
        await eventFromImageThenCreateThenNotification.mutateAsync({
          imageUrl: uploadedImageUrl,
          timezone: "America/Los_Angeles",
          expoPushToken,
          lists: [],
          userId: user?.id || "",
          username: user?.username || "",
          visibility: "private",
        });
      } else {
        await eventFromRawTextAndNotification.mutateAsync({
          rawText: input,
          timezone: "America/Los_Angeles",
          expoPushToken,
          lists: [],
          userId: user?.id || "",
          username: user?.username || "",
          visibility: "private",
        });
      }

      showToast("Got it. Notification soon!", "success");
      router.back();
    } catch (error) {
      console.error("Error creating event:", error);
      showToast("Failed to create event. Please try again.", "error");
    } finally {
      setIsSubmitting(false);
      resetAddEventState();
    }
  }, [
    input,
    imagePreview,
    linkPreview,
    uploadedImageUrl,
    expoPushToken,
    user,
    router,
    eventFromUrlThenCreateThenNotification,
    eventFromImageThenCreateThenNotification,
    eventFromRawTextAndNotification,
    resetAddEventState,
  ]);

  const { text, imageUri } = useLocalSearchParams<{
    text?: string;
    imageUri?: string;
  }>();

  useEffect(() => {
    setInput("");
    setImagePreview(null);
    setLinkPreview(null);
    setUploadedImageUrl(null);

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
            void handleImageUploadFromUri(uri);
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
      const mostRecentPhoto = recentPhotos[0];
      if (mostRecentPhoto?.uri) {
        setActiveInput("upload");
        setIsOptionSelected(true);
        void handleImageUploadFromUri(mostRecentPhoto.uri);
      } else {
        setActiveInput("describe");
        setIsOptionSelected(false);
      }
    }
  }, [
    text,
    imageUri,
    handleImageUploadFromUri,
    handleLinkPreview,
    handleTextChange,
    recentPhotos,
    setActiveInput,
    setImagePreview,
    setInput,
    setIsOptionSelected,
    setLinkPreview,
    setUploadedImageUrl,
  ]);

  return (
    <KeyboardAvoidingView
      behavior={Platform.OS === "ios" ? "padding" : "height"}
      className="flex-1"
    >
      <Stack.Screen
        options={{
          title: "Add event info",
          headerShown: true,
          headerTitleStyle: {
            fontSize: 17,
            color: "#000",
          },
          headerShadowVisible: false,
          headerStyle: {
            backgroundColor: "#fff",
          },
        }}
      />
      <View className="flex-1 bg-white">
        <View className="px-4">
          <View
            className="mb-4 overflow-hidden rounded-md"
            style={styles.previewContainer}
          >
            {/* Preview content - same as before */}
            {imagePreview ? (
              <View className="relative h-full w-full">
                <Image
                  source={{ uri: imagePreview }}
                  style={{ width: "100%", height: "100%" }}
                  contentFit="cover"
                />
                <Pressable
                  onPress={clearPreview}
                  className="absolute right-2 top-2 rounded-full bg-neutral-200 p-1"
                >
                  <X size={16} color="black" />
                </Pressable>
                {isImageLoading && (
                  <View className="absolute bottom-2 right-2">
                    <ActivityIndicator size="small" color="#DCE0E8" />
                  </View>
                )}
              </View>
            ) : linkPreview ? (
              <View className="relative h-full w-full bg-neutral-200">
                <View className="h-full w-full items-center justify-center">
                  <LinkIcon size={24} color="black" />
                  <Text
                    className="mt-2 px-4 text-center text-sm font-medium"
                    numberOfLines={2}
                    ellipsizeMode="middle"
                  >
                    {linkPreview}
                  </Text>
                </View>
                <Pressable
                  onPress={clearPreview}
                  className="absolute right-2 top-2 rounded-full bg-white p-1"
                >
                  <X size={16} color="black" />
                </Pressable>
              </View>
            ) : activeInput === "url" ? (
              <View className="h-full border border-neutral-300 px-3 py-2">
                <TextInput
                  placeholder="Paste URL"
                  value={input}
                  onChangeText={handleTextChange}
                  multiline
                  style={[
                    { height: "100%" },
                    Platform.select({
                      android: { textAlignVertical: "top" },
                    }),
                  ]}
                  autoFocus={true}
                />
              </View>
            ) : activeInput === "describe" ? (
              <View className="h-full border border-neutral-300 px-3 py-2">
                <TextInput
                  placeholder="Describe your event"
                  value={input}
                  onChangeText={handleTextChange}
                  multiline
                  style={[
                    { height: "100%" },
                    Platform.select({
                      android: { textAlignVertical: "top" },
                    }),
                  ]}
                  autoFocus={true}
                />
              </View>
            ) : (
              <View className="h-full w-full items-center justify-center border border-neutral-300 bg-neutral-50">
                <Text className="text-base text-neutral-500">
                  Select a photo
                </Text>
              </View>
            )}
          </View>
        </View>

        <View className="flex-1 px-4">
          <PhotoGrid
            hasMediaPermission={hasMediaPermission}
            recentPhotos={recentPhotos}
            onPhotoSelect={(uri) => void handleImageUploadFromUri(uri)}
            onCameraPress={() => void handleCameraCapture()}
          />
        </View>

        <View className="shadow-top bg-white px-4 pb-8 pt-4">
          <Pressable
            onPress={handleCreateEvent}
            disabled={!input.trim() && !imagePreview && !linkPreview}
            className={`w-full flex-row items-center justify-center rounded-full px-3 py-3 ${
              !input.trim() && !imagePreview && !linkPreview
                ? "bg-interactive-2"
                : "bg-interactive-1"
            }`}
          >
            <Sparkles size={16} color="white" />
            <Text className="ml-2 text-xl font-bold text-white">
              {isSubmitting ? "Creating..." : "Capture event"}
            </Text>
          </Pressable>
        </View>
      </View>
    </KeyboardAvoidingView>
  );
}
