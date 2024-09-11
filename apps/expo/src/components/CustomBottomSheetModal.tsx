import type { BottomSheetDefaultFooterProps } from "@discord/bottom-sheet/src/components/bottomSheetFooter/types";
import React, {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import {
  ActivityIndicator,
  Image,
  Switch,
  Text,
  TouchableOpacity,
  View,
} from "react-native";
import * as FileSystem from "expo-file-system";
import * as ImagePicker from "expo-image-picker";
import { useUser } from "@clerk/clerk-expo";
import {
  BottomSheetBackdrop,
  BottomSheetFooter,
  BottomSheetModal,
  BottomSheetTextInput,
} from "@discord/bottom-sheet";
import { Image as ImageIcon, Sparkles, X } from "lucide-react-native";

import { useIntentHandler } from "~/hooks/useIntentHandler";
import { useNotification } from "~/providers/NotificationProvider";
import { api } from "~/utils/api";

interface CustomBottomSheetModalProps {
  children?: React.ReactNode;
  initialParams?: {
    text?: string;
    imageUri?: string;
  } | null;
}

const CustomBottomSheetModal = React.forwardRef<
  BottomSheetModal,
  CustomBottomSheetModalProps
>(({ initialParams }, ref) => {
  const snapPoints = useMemo(() => [388], []);
  const [input, setInput] = useState("");
  const [imagePreview, setImagePreview] = useState<string | null>(null);
  const [isCreating, setIsCreating] = useState(false);
  const [isPublic, setIsPublic] = useState(false);
  const { expoPushToken } = useNotification();
  const utils = api.useUtils();
  const eventFromRawTextAndNotification =
    api.ai.eventFromRawTextThenCreateThenNotification.useMutation({
      onSettled: () => void utils.event.invalidate(),
    });
  const eventFromImageThenCreateThenNotification =
    api.ai.eventFromImageThenCreateThenNotification.useMutation({
      onSettled: () => void utils.event.invalidate(),
    });
  const { user } = useUser();

  // Use the intent handler
  useIntentHandler();

  const [isImageLoading, setIsImageLoading] = useState(false);
  const [isImageUploading, setIsImageUploading] = useState(false);
  const uploadedImageUrlRef = useRef<string | null>(null);
  const uploadPromiseRef = useRef<Promise<string> | null>(null);

  const handleImageUploadFromUri = useCallback(async (uri: string) => {
    setIsImageLoading(true);
    setIsImageUploading(true);
    const uploadImage = async (imageUri: string): Promise<string> => {
      try {
        const response = await FileSystem.uploadAsync(
          "https://api.bytescale.com/v2/accounts/12a1yek/uploads/binary",
          imageUri,
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
      uploadedImageUrlRef.current = uploadedImageUrl;
    } catch (error) {
      console.error("Error processing image:", error);
      setImagePreview(null);
      uploadedImageUrlRef.current = null;
    } finally {
      setIsImageLoading(false);
      setIsImageUploading(false);
      uploadPromiseRef.current = null;
    }
  }, []);

  useEffect(() => {
    if (initialParams) {
      if (initialParams.text) {
        setInput(initialParams.text);
      } else if (initialParams.imageUri) {
        const [uri, width, height] = initialParams.imageUri.split("|");
        if (uri) {
          void handleImageUploadFromUri(uri);
        }
        setInput(`Image: ${width ?? "unknown"}x${height ?? "unknown"}`);
      }
    }
  }, [handleImageUploadFromUri, initialParams]);

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

  const clearImage = () => {
    setImagePreview(null);
    setInput("");
  };

  const handleSuccess = useCallback(() => {
    setIsCreating(false);
    setInput("");
    setImagePreview(null);
    (ref as React.RefObject<BottomSheetModal>).current?.dismiss();
  }, [ref]);

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
    [ref],
  );

  const handleCreateEvent = useCallback(() => {
    if (!input.trim() && !imagePreview) return;
    setIsCreating(true);

    const createEvent = async () => {
      let finalImageUrl = uploadedImageUrlRef.current;
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
    };

    void createEvent();
  }, [
    input,
    imagePreview,
    isPublic,
    expoPushToken,
    user,
    eventFromImageThenCreateThenNotification,
    eventFromRawTextAndNotification,
    handleSuccess,
    handleError,
    isImageUploading,
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
        <View className="px-4 pb-4">
          <TouchableOpacity
            className="w-full flex-row items-center justify-center rounded-full bg-interactive-1 px-3 py-2"
            onPress={handleCreateEvent}
            disabled={isCreating || (!input.trim() && !imagePreview)}
          >
            {isCreating ? (
              <Text className="text-xl font-bold text-white">Creating...</Text>
            ) : (
              <>
                <Sparkles size={16} color="white" />
                <Text className="ml-2 text-xl font-bold text-white">
                  Create Event
                </Text>
              </>
            )}
          </TouchableOpacity>
          {isImageUploading && (
            <Text className="mt-2 text-center text-sm text-gray-500">
              Image upload in progress...
            </Text>
          )}
        </View>
      </BottomSheetFooter>
    );
  }, [handleCreateEvent, isCreating, isImageUploading, input, imagePreview]);

  return (
    <BottomSheetModal
      ref={ref}
      index={0}
      snapPoints={snapPoints}
      onChange={handleSheetChanges}
      backdropComponent={renderBackdrop}
      keyboardBehavior="interactive"
      renderFooter={renderFooter}
      onDismiss={handleDismiss}
    >
      <View className="flex-1 p-4">
        <Text className="mb-4 text-2xl font-semibold">Add New Event</Text>
        <View className="mb-4">
          <View className="mb-2 flex flex-row items-center justify-between">
            <Text className="text-base font-medium">Event Details</Text>
            <TouchableOpacity
              onPress={handleImageUpload}
              className="rounded-md bg-neutral-200 px-3 py-2"
            >
              <View className="flex-row items-center">
                <ImageIcon size={16} color="black" />
                <Text className="ml-2 font-medium">
                  {imagePreview ? "Change Image" : "Upload Image"}
                </Text>
              </View>
            </TouchableOpacity>
          </View>
          {imagePreview ? (
            <View className="relative">
              <Image
                source={{ uri: imagePreview }}
                style={{ width: "100%", height: 124 }}
                className="rounded-md"
              />
              <TouchableOpacity
                onPress={clearImage}
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
          ) : (
            <View className="mb-4 h-32 w-full overflow-hidden rounded-md border border-neutral-300 px-3 py-2">
              <BottomSheetTextInput
                className="h-full w-full"
                placeholder="Enter event details or paste a URL"
                defaultValue={input}
                onChangeText={setInput}
                multiline
                textAlignVertical="top"
              />
            </View>
          )}
        </View>
        <View className="mb-4 flex-row items-center justify-between">
          <Text className="text-base font-medium">Show on Discover</Text>
          <Switch value={isPublic} onValueChange={setIsPublic} />
        </View>
      </View>
    </BottomSheetModal>
  );
});

export default CustomBottomSheetModal;
