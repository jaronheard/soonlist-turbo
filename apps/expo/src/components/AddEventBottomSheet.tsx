import type { BottomSheetDefaultFooterProps } from "@discord/bottom-sheet/src/components/bottomSheetFooter/types";
import React, {
  useCallback,
  useEffect,
  useImperativeHandle,
  useMemo,
  useRef,
} from "react";
import {
  ActivityIndicator,
  Switch,
  Text,
  TouchableOpacity,
  useWindowDimensions,
  View,
} from "react-native";
import * as FileSystem from "expo-file-system";
import { Image } from "expo-image";
import * as ImageManipulator from "expo-image-manipulator";
import * as ImagePicker from "expo-image-picker";
import { useUser } from "@clerk/clerk-expo";
import {
  BottomSheetBackdrop,
  BottomSheetFooter,
  BottomSheetModal,
  BottomSheetTextInput,
} from "@discord/bottom-sheet";
import {
  Camera as CameraIcon,
  Globe2,
  Image as ImageIcon,
  Link as LinkIcon,
  Sparkles,
  X,
} from "lucide-react-native";

import { useIntentHandler } from "~/hooks/useIntentHandler";
import { useNotification } from "~/providers/NotificationProvider";
import { useAppStore } from "~/store";
import { api } from "~/utils/api";
import { showToast } from "~/utils/toast";

interface AddEventBottomSheetProps {
  children?: React.ReactNode;
  onMount?: () => void;
}

const AddEventBottomSheet = React.forwardRef<
  BottomSheetModal,
  AddEventBottomSheetProps
>(({ onMount }, ref) => {
  const { fontScale } = useWindowDimensions();

  const snapPoints = useMemo(() => {
    const baseHeight = 388;
    const additionalHeight = Math.round(baseHeight * (fontScale - 1) * 0.25);
    const scaledHeight = baseHeight + additionalHeight;
    return [scaledHeight];
  }, [fontScale]);

  const { expoPushToken } = useNotification();
  const utils = api.useUtils();
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
  const { user } = useUser();

  const {
    input,
    imagePreview,
    linkPreview,
    isCreating,
    isPublic,
    isImageLoading,
    isImageUploading,
    uploadedImageUrl,
    setInput,
    setImagePreview,
    setLinkPreview,
    setIsCreating,
    setIsPublic,
    setIsImageLoading,
    setIsImageUploading,
    setUploadedImageUrl,
    resetAddEventState,
    intentParams,
    resetIntentParams,
  } = useAppStore();

  // Use the intent handler
  useIntentHandler();

  const uploadPromiseRef = useRef<Promise<string> | null>(null);

  const handleImageUploadFromUri = useCallback(
    async (uri: string) => {
      setIsImageLoading(true);
      setIsImageUploading(true);
      const uploadImage = async (imageUri: string): Promise<string> => {
        try {
          // Resize and compress the image
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
        setImagePreview(uri);
        uploadPromiseRef.current = uploadImage(uri);
        const uploadedImageUrl = await uploadPromiseRef.current;
        setImagePreview(uploadedImageUrl);
        setUploadedImageUrl(uploadedImageUrl);
      } catch (error) {
        console.error("Error processing image:", error);
        setImagePreview(null);
        setUploadedImageUrl(null);
      } finally {
        setIsImageLoading(false);
        setIsImageUploading(false);
        uploadPromiseRef.current = null;
      }
    },
    [
      setImagePreview,
      setIsImageLoading,
      setIsImageUploading,
      setUploadedImageUrl,
    ],
  );

  const handleLinkPreview = useCallback(
    async (url: string) => {
      // Here you would typically fetch the link preview data
      // For this example, we'll just set the URL as the preview
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
        void handleLinkPreview(urls[0]);
      } else {
        setLinkPreview(null);
      }
    },
    [handleLinkPreview, setInput, setLinkPreview],
  );

  const bottomSheetRef = useRef<BottomSheetModal | null>(null);

  // Assign the forwarded ref to our local ref
  useImperativeHandle(ref, () => bottomSheetRef.current!);

  const handleInitialParams = useCallback(() => {
    if (intentParams) {
      // Clear existing content
      setInput("");
      setImagePreview(null);
      setLinkPreview(null);
      setUploadedImageUrl(null);

      if (intentParams.text) {
        handleTextChange(intentParams.text);
      } else if (intentParams.imageUri) {
        const [uri, width, height] = intentParams.imageUri.split("|");
        if (uri) {
          if (uri.startsWith("http")) {
            void handleLinkPreview(uri);
          } else {
            void handleImageUploadFromUri(uri);
          }
        }
        setInput(`Image: ${width ?? "unknown"}x${height ?? "unknown"}`);
      }
      resetIntentParams();

      // Present the bottom sheet
      bottomSheetRef.current?.present();
    }
  }, [
    handleImageUploadFromUri,
    handleLinkPreview,
    handleTextChange,
    intentParams,
    resetIntentParams,
    setInput,
    setImagePreview,
    setLinkPreview,
    setUploadedImageUrl,
  ]);

  useEffect(() => {
    handleInitialParams();
  }, [handleInitialParams]);

  const handleSheetChanges = useCallback((index: number) => {
    console.log("handleSheetChanges", index);
  }, []);

  const renderBackdrop = useCallback(
    (props: React.ComponentProps<typeof BottomSheetBackdrop>) => (
      <BottomSheetBackdrop
        {...props}
        disappearsOnIndex={-1}
        appearsOnIndex={0}
      />
    ),
    [],
  );

  const handleImageUpload = useCallback(async () => {
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      quality: 0.8,
    });

    if (!result.canceled && result.assets[0]) {
      const imageUri = result.assets[0].uri;
      setInput(imageUri.split("/").pop() || "");
      await handleImageUploadFromUri(imageUri);
    }
  }, [handleImageUploadFromUri, setInput]);

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

  const clearPreview = () => {
    setImagePreview(null);
    setLinkPreview(null);
    setInput("");
  };

  const handleSuccess = useCallback(() => {
    setIsCreating(false);
    setInput("");
    setImagePreview(null);
    setLinkPreview(null);
    (ref as React.RefObject<BottomSheetModal>).current?.dismiss();
  }, [ref, setIsCreating, setInput, setImagePreview, setLinkPreview]);

  const handleError = useCallback(
    (error: unknown) => {
      console.error("Failed to create event:", error);
      setIsCreating(false);

      if (
        error instanceof Error &&
        error.message.includes(
          "Must use physical device for push notifications",
        )
      ) {
        (ref as React.RefObject<BottomSheetModal>).current?.dismiss();
      }
    },
    [ref, setIsCreating],
  );

  const handleCreateEvent = useCallback(() => {
    if (!input.trim() && !imagePreview && !linkPreview) return;
    setIsCreating(true);

    // Clear the modal state
    resetAddEventState();

    // Dismiss the modal immediately
    (ref as React.RefObject<BottomSheetModal>).current?.dismiss();

    // Notify user and encourage app exit
    showToast("Got it. Notification soon!", "success");

    const createEvent = async () => {
      if (linkPreview) {
        eventFromUrlThenCreateThenNotification.mutate(
          {
            url: linkPreview,
            timezone: "America/Los_Angeles",
            expoPushToken,
            lists: [],
            userId: user?.id || "",
            username: user?.username || "",
            visibility: isPublic ? "public" : "private",
          },
          {
            onSuccess: handleSuccess,
            onError: handleError,
          },
        );
      } else {
        let finalImageUrl = uploadedImageUrl;
        if (isImageUploading && uploadPromiseRef.current) {
          try {
            finalImageUrl = await uploadPromiseRef.current;
          } catch (error) {
            console.error("Error waiting for image upload:", error);
            setIsCreating(false);
            return;
          }
        }

        if (finalImageUrl) {
          eventFromImageThenCreateThenNotification.mutate(
            {
              imageUrl: finalImageUrl,
              timezone: "America/Los_Angeles",
              expoPushToken,
              lists: [],
              userId: user?.id || "",
              username: user?.username || "",
              visibility: isPublic ? "public" : "private",
            },
            {
              onSuccess: handleSuccess,
              onError: handleError,
            },
          );
        } else {
          eventFromRawTextAndNotification.mutate(
            {
              rawText: input,
              timezone: "America/Los_Angeles",
              expoPushToken,
              lists: [],
              userId: user?.id || "",
              username: user?.username || "",
              visibility: isPublic ? "public" : "private",
            },
            {
              onSuccess: handleSuccess,
              onError: handleError,
            },
          );
        }
      }
    };

    void createEvent();
  }, [
    input,
    imagePreview,
    linkPreview,
    isPublic,
    expoPushToken,
    user,
    eventFromUrlThenCreateThenNotification,
    eventFromImageThenCreateThenNotification,
    eventFromRawTextAndNotification,
    handleSuccess,
    handleError,
    isImageUploading,
    uploadedImageUrl,
    ref,
    resetAddEventState,
    setIsCreating,
  ]);

  const handleDismiss = useCallback(() => {
    // Allow the modal to be dismissed, but don't cancel the upload
    (ref as React.RefObject<BottomSheetModal>).current?.dismiss();
  }, [ref]);

  const renderFooter = useMemo(() => {
    return (
      props: React.JSX.IntrinsicAttributes & BottomSheetDefaultFooterProps,
    ) => (
      <BottomSheetFooter {...props} bottomInset={24}>
        <View className={`px-4 pb-4 ${fontScale > 1.3 ? "pt-4" : ""}`}>
          <TouchableOpacity
            className="w-full flex-row items-center justify-center rounded-full bg-interactive-1 px-3 py-2"
            onPress={handleCreateEvent}
            disabled={
              isCreating || (!input.trim() && !imagePreview && !linkPreview)
            }
          >
            {isCreating ? (
              <Text className="text-xl font-bold text-white">Creating...</Text>
            ) : (
              <>
                <Sparkles size={16} color="white" />
                <Text className="ml-2 text-xl font-bold text-white">
                  Create event
                </Text>
              </>
            )}
          </TouchableOpacity>
        </View>
      </BottomSheetFooter>
    );
  }, [
    handleCreateEvent,
    isCreating,
    input,
    imagePreview,
    linkPreview,
    fontScale,
  ]);

  const inputRef = useRef<React.ElementRef<typeof BottomSheetTextInput>>(null);

  useEffect(() => {
    if (onMount) {
      onMount();
    }
  }, [onMount]);

  return (
    <BottomSheetModal
      ref={bottomSheetRef}
      index={0}
      snapPoints={snapPoints}
      onChange={handleSheetChanges}
      backdropComponent={renderBackdrop}
      keyboardBehavior="interactive"
      renderFooter={renderFooter}
      onDismiss={handleDismiss}
    >
      <View className="flex-1 p-4">
        <Text className="mb-4 text-2xl font-semibold">Add event</Text>
        <View className="mb-4">
          <View className="mb-2 flex flex-row items-center justify-between">
            <Text className="text-base font-medium">Event details</Text>
            <View className="flex-row">
              <TouchableOpacity
                onPress={handleCameraCapture}
                className="mr-2 rounded-md bg-neutral-200 px-3 py-2"
              >
                <View className="flex-row items-center">
                  <CameraIcon size={16} color="black" />
                  <Text className="ml-2 font-medium">Camera</Text>
                </View>
              </TouchableOpacity>
              <TouchableOpacity
                onPress={handleImageUpload}
                className="rounded-md bg-neutral-200 px-3 py-2"
              >
                <View className="flex-row items-center">
                  <ImageIcon size={16} color="black" />
                  <Text className="ml-2 font-medium">
                    {imagePreview || linkPreview ? "Change" : "Upload"}
                  </Text>
                </View>
              </TouchableOpacity>
            </View>
          </View>
          {imagePreview ? (
            <View className="relative">
              <Image
                source={{ uri: imagePreview }}
                style={{ width: "100%", height: 124 }}
                contentFit="cover"
              />
              <TouchableOpacity
                onPress={clearPreview}
                className="absolute right-2 top-2 rounded-full bg-neutral-200 p-1"
              >
                <X size={16} color="black" />
              </TouchableOpacity>
              {isImageLoading && (
                <View className="absolute bottom-2 right-2">
                  <ActivityIndicator size="small" color="#DCE0E8" />
                </View>
              )}
            </View>
          ) : linkPreview ? (
            <View className="relative">
              <View className="h-[124px] w-full items-center justify-center rounded-md bg-neutral-200">
                <LinkIcon size={32} color="black" />
                <Text
                  className="mt-2 text-sm font-medium"
                  numberOfLines={2}
                  ellipsizeMode="middle"
                >
                  {linkPreview}
                </Text>
              </View>
              <TouchableOpacity
                onPress={clearPreview}
                className="absolute right-2 top-2 rounded-full bg-neutral-200 p-1"
              >
                <X size={16} color="black" />
              </TouchableOpacity>
            </View>
          ) : (
            <View className="mb-4 h-32 w-full overflow-hidden rounded-md border border-neutral-300 px-3 py-2">
              <BottomSheetTextInput
                ref={inputRef}
                // className prop doesn't work properly here, so we use style
                style={{
                  height: "100%",
                  width: "100%",
                  textAlignVertical: "top",
                }}
                placeholder="Enter event details or paste a URL"
                defaultValue={input}
                onChangeText={handleTextChange}
                multiline
              />
            </View>
          )}
        </View>
        <View
          className={`mb-4 flex-row items-center justify-between ${fontScale > 1.3 ? "pb-4" : ""}`}
        >
          <View className="flex-row items-center gap-2">
            <Globe2 size={20} color="black" />
            <Text className="text-base font-medium">Make discoverable</Text>
          </View>
          <Switch value={isPublic} onValueChange={setIsPublic} />
        </View>
      </View>
    </BottomSheetModal>
  );
});

export default AddEventBottomSheet;
