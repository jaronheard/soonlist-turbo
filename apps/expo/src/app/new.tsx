import React, { useCallback, useEffect } from "react";
import {
  ActionSheetIOS,
  ActivityIndicator,
  Dimensions,
  FlatList,
  KeyboardAvoidingView,
  Linking,
  Platform,
  Pressable,
  StyleSheet,
  Text,
  TextInput,
  View,
} from "react-native";
import * as FileSystem from "expo-file-system";
import { Image as ExpoImage } from "expo-image";
import * as ImageManipulator from "expo-image-manipulator";
import * as ImagePicker from "expo-image-picker";
import * as MediaLibrary from "expo-media-library";
import { Stack, useLocalSearchParams, useRouter } from "expo-router";
import { useUser } from "@clerk/clerk-expo";
import { useFocusEffect } from "@react-navigation/native";
import {
  Camera,
  ChevronRight,
  Image,
  Link as LinkIcon,
  Plus,
  Sparkles,
  Type,
  X,
} from "lucide-react-native";
import { toast } from "sonner-native";

import type { RecentPhoto } from "~/store";
import { PhotoAccessPrompt } from "~/components/PhotoAccessPrompt";
import { useNotification } from "~/providers/NotificationProvider";
import { useAppStore } from "~/store";
import { api } from "~/utils/api";

const VALID_IMAGE_REGEX = /^[\w.:\-_/]+\|\d+(\.\d+)?\|\d+(\.\d+)?$/;

const styles = StyleSheet.create({
  previewContainer: {
    width: Dimensions.get("window").width - 32,
    aspectRatio: 1,
  },
  previewContainerFull: {
    width: Dimensions.get("window").width - 32,
    flex: 1,
  },
  photoGridContainer: {
    height: ((Dimensions.get("window").width - 32) / 4) * 3 + 4,
  },
});

const PhotoGrid = React.memo(
  ({
    recentPhotos,
    onPhotoSelect,
    onCameraPress,
    onMorePhotos,
    hasMediaPermission,
    hasFullPhotoAccess,
  }: {
    hasMediaPermission: boolean;
    hasFullPhotoAccess: boolean;
    recentPhotos: RecentPhoto[];
    onPhotoSelect: (uri: string) => void;
    onCameraPress: () => void;
    onMorePhotos: () => void;
  }) => {
    const windowWidth = Dimensions.get("window").width;
    const padding = 32;
    const spacing = 2;
    const columns = 4;
    const availableWidth = windowWidth - padding;
    const imageSize = (availableWidth - (columns - 1) * spacing) / columns;

    const handleManagePress = () => {
      void Linking.openSettings();
    };

    // Only show the plus button if we have media permission
    const gridData = hasMediaPermission
      ? [{ id: "plus-button", uri: "" }, ...recentPhotos]
      : [];

    return (
      <View className="flex-1">
        <View className="mb-1 flex-row items-center justify-between">
          <Pressable
            className="flex-row items-center gap-0.5"
            onPress={onMorePhotos}
          >
            <Text className="text-xl font-bold text-white">Recents</Text>
            <ChevronRight size={20} color="#fff" />
          </Pressable>
          <View className="flex-row gap-2">
            <Pressable
              onPress={onCameraPress}
              className="rounded-full bg-interactive-3 p-2"
            >
              <Camera size={20} color="#5A32FB" />
            </Pressable>
          </View>
        </View>

        {hasMediaPermission && !hasFullPhotoAccess && (
          <Pressable
            onPress={handleManagePress}
            className="my-2 flex-row items-center justify-between rounded-md py-1"
          >
            <Text className="flex-1 text-sm text-neutral-3">
              You've given Soonlist access to a select number of photos.
            </Text>
            <View className="ml-4 rounded-sm px-2 py-1">
              <Text className="text-base font-semibold text-white">Manage</Text>
            </View>
          </Pressable>
        )}

        <View className="flex-1 bg-transparent">
          <FlatList
            data={gridData}
            renderItem={({ item }) => {
              if (item.id === "plus-button") {
                return (
                  <Pressable
                    onPress={() => {
                      if (hasMediaPermission && !hasFullPhotoAccess) {
                        // Show action sheet for partial access
                        ActionSheetIOS.showActionSheetWithOptions(
                          {
                            options: [
                              "Select More Photos",
                              "Change Settings",
                              "Cancel",
                            ],
                            cancelButtonIndex: 2,
                          },
                          (buttonIndex) => {
                            if (buttonIndex === 0) {
                              void MediaLibrary.presentPermissionsPickerAsync();
                            } else if (buttonIndex === 1) {
                              void Linking.openSettings();
                            }
                          },
                        );
                      } else {
                        onMorePhotos();
                      }
                    }}
                    style={{
                      width: imageSize,
                      height: imageSize,
                      margin: spacing / 2,
                    }}
                    className="items-center justify-center rounded-md bg-white"
                  >
                    <Plus size={20} color="#5A32FB" />
                  </Pressable>
                );
              }

              return (
                <Pressable
                  onPress={() => onPhotoSelect(item.uri)}
                  style={{
                    width: imageSize,
                    height: imageSize,
                    margin: spacing / 2,
                  }}
                >
                  <ExpoImage
                    source={{ uri: item.uri }}
                    style={{
                      width: "100%",
                      height: "100%",
                      borderRadius: 4,
                    }}
                    contentFit="cover"
                    contentPosition="center"
                    transition={100}
                    cachePolicy="memory"
                  />
                </Pressable>
              );
            }}
            numColumns={4}
            showsVerticalScrollIndicator={false}
            contentContainerStyle={{
              padding: spacing / 2,
            }}
            keyExtractor={(item) => item.id}
            horizontal={false}
          />
        </View>
      </View>
    );
  },
);

export default function NewEventModal() {
  const router = useRouter();
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
      onSettled: () => {
        void utils.event.getEventsForUser.invalidate();
        void utils.event.getStats.invalidate();
      },
    });
  const eventFromImageThenCreateThenNotification =
    api.ai.eventFromImageThenCreateThenNotification.useMutation({
      onSettled: () => {
        void utils.event.getEventsForUser.invalidate();
        void utils.event.getStats.invalidate();
      },
    });
  const eventFromUrlThenCreateThenNotification =
    api.ai.eventFromUrlThenCreateThenNotification.useMutation({
      onSettled: () => {
        void utils.event.getEventsForUser.invalidate();
        void utils.event.getStats.invalidate();
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
      toast.error("Camera permission is required to take a photo");
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

    router.canGoBack() ? router.back() : router.navigate("feed");
    useAppStore.getState().setIsAddingEvent(true);

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
        eventId = result.eventId;
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
          eventId = result.eventId;
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
        eventId = result.eventId;
      }

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
      useAppStore.getState().setIsAddingEvent(false);
    }
  }, [
    input,
    imagePreview,
    linkPreview,
    expoPushToken,
    hasNotificationPermission,
    user,
    router,
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
                    ? {
                        id: asset.id,
                        uri: assetInfo.localUri,
                      }
                    : null;
                } catch (e) {
                  return null;
                }
              }),
            );

            // Filter out null results and set photos
            const photos: RecentPhoto[] = accessibleAssets.filter(
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
          console.log("loadRecentPhotos: No media permission, skipping load");
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
      const mostRecentPhoto = recentPhotos[0] as RecentPhoto | undefined;
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

  const isFromIntent = Boolean(text || imageUri);

  return (
    <KeyboardAvoidingView
      behavior={Platform.OS === "ios" ? "padding" : "height"}
      className="flex-1 bg-interactive-1"
    >
      <Stack.Screen
        options={{
          title: "",
          headerShown: true,
          headerShadowVisible: false,
          headerStyle: {
            backgroundColor: "#5A32FB",
          },
          headerTintColor: "#fff",
          headerTitle: () => {
            if (isFromIntent) {
              if (linkPreview) {
                return (
                  <View className="flex-row items-center gap-2">
                    <LinkIcon size={16} color="#fff" />
                    <Text className="text-lg font-bold text-white">
                      Selected link
                    </Text>
                  </View>
                );
              }
              if (imagePreview) {
                return (
                  <View className="flex-row items-center gap-1">
                    <Image size={16} color="#fff" />
                    <Text className="text-lg font-bold text-white">
                      Selected image
                    </Text>
                  </View>
                );
              }
              return (
                <View className="flex-row items-center gap-2">
                  <Type size={16} color="#fff" />
                  <Text className="text-lg font-bold text-white">
                    Describe event
                  </Text>
                </View>
              );
            }

            return (
              <View className="flex-row items-center rounded-md bg-interactive-3/20 p-0.5">
                <Pressable
                  onPress={() => {
                    if (activeInput === "describe") {
                      handleDescribePress();
                    }
                  }}
                  className={`rounded-l-md px-3 py-1.5 ${
                    activeInput !== "describe" ? "bg-interactive-1" : ""
                  }`}
                >
                  <View className="flex-row items-center gap-2">
                    <Image
                      size={16}
                      color={
                        activeInput !== "describe"
                          ? "#fff"
                          : "rgba(255, 255, 255, 0.6)"
                      }
                    />
                    <Text
                      className={`text-lg font-bold ${
                        activeInput !== "describe"
                          ? "text-white"
                          : "text-white/60"
                      }`}
                    >
                      Select image
                    </Text>
                  </View>
                </Pressable>

                <Pressable
                  onPress={() => {
                    if (activeInput !== "describe") {
                      handleDescribePress();
                    }
                  }}
                  className={`rounded-r-md px-3 py-1.5 ${
                    activeInput === "describe" ? "bg-interactive-1" : ""
                  }`}
                >
                  <View className="flex-row items-center gap-2">
                    <Type
                      size={16}
                      color={
                        activeInput === "describe"
                          ? "#fff"
                          : "rgba(255, 255, 255, 0.6)"
                      }
                    />
                    <Text
                      className={`text-lg font-bold ${
                        activeInput === "describe"
                          ? "text-white"
                          : "text-white/60"
                      }`}
                    >
                      Describe event
                    </Text>
                  </View>
                </Pressable>
              </View>
            );
          },
        }}
      />

      {!hasMediaPermission && !isFromIntent && activeInput !== "describe" ? (
        <PhotoAccessPrompt />
      ) : (
        <View className="flex-1 bg-interactive-1">
          <View className="flex-1 px-4">
            <View
              className={`${
                isFromIntent ? "flex-1" : "mb-4"
              } overflow-hidden rounded-md bg-interactive-2`}
              style={
                isFromIntent
                  ? styles.previewContainerFull
                  : styles.previewContainer
              }
            >
              {imagePreview ? (
                <View className="relative h-full w-full">
                  <ExpoImage
                    source={{ uri: imagePreview }}
                    style={{ width: "100%", height: "100%" }}
                    contentFit="contain"
                    contentPosition="center"
                  />
                  <Pressable
                    onPress={clearPreview}
                    className="absolute right-2 top-2 rounded-full bg-interactive-3 p-1"
                  >
                    <X size={20} color="#5A32FB" />
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
                <View className="relative h-full border border-neutral-300 px-3 py-2">
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
                  <Pressable
                    onPress={clearPreview}
                    className="absolute right-2 top-2 rounded-full bg-neutral-200 p-1"
                  >
                    <X size={16} color="black" />
                  </Pressable>
                </View>
              ) : (
                <Pressable
                  onPress={() => void handleMorePhotos()}
                  className="h-full w-full items-center justify-center border border-neutral-300 bg-neutral-50"
                >
                  <Text className="text-base text-neutral-500">Select...</Text>
                </Pressable>
              )}
            </View>

            {!isFromIntent && (
              <View style={styles.photoGridContainer}>
                <PhotoGrid
                  hasMediaPermission={hasMediaPermission}
                  hasFullPhotoAccess={hasFullPhotoAccess}
                  recentPhotos={recentPhotos}
                  onPhotoSelect={(uri) => handleImagePreview(uri)}
                  onCameraPress={() => void handleCameraCapture()}
                  onMorePhotos={() => void handleMorePhotos()}
                />
              </View>
            )}
          </View>

          <View className="shadow-top bg-interactive-1 px-4 pb-8 pt-4">
            <Pressable
              onPress={handleCreateEvent}
              disabled={!input.trim() && !imagePreview && !linkPreview}
              className={`w-full flex-row items-center justify-center rounded-full px-3 py-3 ${
                !input.trim() && !imagePreview && !linkPreview
                  ? "bg-neutral-200"
                  : "bg-white"
              }`}
            >
              <Sparkles size={16} color="#5A32FB" />
              <Text className="ml-2 text-xl font-bold text-[#5A32FB]">
                Capture event
              </Text>
            </Pressable>
          </View>
        </View>
      )}
    </KeyboardAvoidingView>
  );
}
