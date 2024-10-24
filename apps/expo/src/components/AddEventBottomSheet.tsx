import type { BottomSheetDefaultFooterProps } from "@discord/bottom-sheet/src/components/bottomSheetFooter/types";
import type { MotiTransition } from "moti";
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
  EditIcon,
  Globe2,
  Image as ImageIcon,
  Link as LinkIcon,
  Sparkles,
  X,
} from "lucide-react-native";
import { MotiView } from "moti";

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
  const { height: windowHeight, fontScale } = useWindowDimensions();

  const snapPoints = useMemo(() => {
    const baseHeight = 388;
    const maxHeight = windowHeight * 0.9; // 90% of screen height
    const scaledHeight = Math.min(
      Math.round(baseHeight * fontScale),
      maxHeight,
    );
    return [scaledHeight];
  }, [windowHeight, fontScale]);

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
    isPublic,
    isImageLoading,
    isImageUploading,
    uploadedImageUrl,
    setInput,
    setImagePreview,
    setLinkPreview,
    setIsPublic,
    setIsImageLoading,
    setIsImageUploading,
    setUploadedImageUrl,
    resetAddEventState,
    intentParams,
    resetIntentParams,
    isOptionSelected,
    activeInput,
    setIsOptionSelected,
    setActiveInput,
    resetEventStateOnNewSelection,
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
        setActiveInput("describe");
      } else if (intentParams.imageUri) {
        const [uri, width, height] = intentParams.imageUri.split("|");
        if (uri) {
          if (uri.startsWith("http")) {
            void handleLinkPreview(uri);
            setActiveInput("url");
          } else {
            void handleImageUploadFromUri(uri);
            setActiveInput("upload");
          }
        }
        setInput(`Image: ${width ?? "unknown"}x${height ?? "unknown"}`);
      }
      setIsOptionSelected(true);
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
    setActiveInput,
    setIsOptionSelected,
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

  const handleSuccess = useCallback(() => {
    if (!expoPushToken) {
      showToast("Event created successfully!", "success");
      return;
    }
  }, [expoPushToken]);

  const handleError = useCallback((error: unknown) => {
    if (
      error instanceof Error &&
      error.message.includes("Must use physical device for push notifications")
    ) {
      console.log(
        "Event created successfully, but push notification couldn't be sent on simulator",
      );
      showToast("Event created successfully!", "success");
    } else {
      console.error("Failed to create event:", error);
      showToast("Failed to create event. Please try again.", "error");
    }
  }, []);

  const handleCreateEvent = useCallback(() => {
    if (!input.trim() && !imagePreview && !linkPreview) return;

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
  ]);

  const handleDismiss = useCallback(() => {
    // Reset the AddEventBottomSheet context
    resetAddEventState();

    // Allow the modal to be dismissed
    (ref as React.RefObject<BottomSheetModal>).current?.dismiss();
  }, [ref, resetAddEventState]);

  const isCreateButtonDisabled = useMemo(() => {
    return !input.trim() && !imagePreview && !linkPreview;
  }, [input, imagePreview, linkPreview]);

  const renderFooter = useMemo(() => {
    return (
      props: React.JSX.IntrinsicAttributes & BottomSheetDefaultFooterProps,
    ) => (
      <BottomSheetFooter {...props} bottomInset={24}>
        <View className={`px-4 pb-4 ${fontScale > 1.3 ? "pt-4" : ""}`}>
          <TouchableOpacity
            className={`w-full flex-row items-center justify-center rounded-full bg-interactive-1 px-3 py-2 ${
              isCreateButtonDisabled ? "opacity-50" : ""
            }`}
            onPress={handleCreateEvent}
            disabled={isCreateButtonDisabled}
          >
            <Sparkles size={16} color="white" />
            <Text className="ml-2 text-xl font-bold text-white">
              Capture event
            </Text>
          </TouchableOpacity>
        </View>
      </BottomSheetFooter>
    );
  }, [handleCreateEvent, isCreateButtonDisabled, fontScale]);

  useEffect(() => {
    if (onMount) {
      onMount();
    }
  }, [onMount]);

  // eslint-disable-next-line @typescript-eslint/consistent-type-assertions
  const transition = {
    type: "timing",
    duration: 200,
  } as MotiTransition;

  const handleOptionSelect = useCallback(
    (option: "camera" | "upload" | "url" | "describe") => {
      if (activeInput === option) {
        // Reset to the 2x2 grid if the same option is tapped again
        setIsOptionSelected(false);
        setActiveInput(null);
        resetAddEventState();
      } else {
        // Reset the event state before selecting the new option
        resetEventStateOnNewSelection();
        setIsOptionSelected(true);
        setActiveInput(option);

        switch (option) {
          case "camera":
            void handleCameraCapture();
            break;
          case "upload":
            void handleImageUpload();
            break;
          case "url":
          case "describe":
            // These options will show their respective input fields
            break;
        }
      }
    },
    [
      activeInput,
      setIsOptionSelected,
      setActiveInput,
      resetAddEventState,
      resetEventStateOnNewSelection,
      handleCameraCapture,
      handleImageUpload,
    ],
  );

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
        <Text className="mb-4 text-2xl font-semibold">Add event info</Text>

        <MotiView
          animate={{
            height: isOptionSelected ? 50 : "auto",
            marginBottom: 16,
          }}
          transition={transition}
        >
          <View
            className={`flex-row ${
              isOptionSelected ? "justify-between" : "flex-wrap"
            }`}
          >
            {["camera", "upload", "url", "describe"].map((option) => (
              <MotiView
                key={option}
                animate={{
                  width: isOptionSelected ? "22%" : "48%",
                  margin: isOptionSelected ? 0 : "1%",
                }}
                transition={transition}
              >
                <TouchableOpacity
                  onPress={() =>
                    handleOptionSelect(
                      option as "camera" | "upload" | "url" | "describe",
                    )
                  }
                  className={`rounded-md px-2 py-2 ${
                    isOptionSelected && activeInput !== option
                      ? "bg-interactive-2"
                      : "bg-interactive-3"
                  }`}
                >
                  <View className="items-center">
                    {option === "camera" && (
                      <CameraIcon
                        size={isOptionSelected ? 16 : 24}
                        color="#5A32FB" // interactive-1 color
                      />
                    )}
                    {option === "upload" && (
                      <ImageIcon
                        size={isOptionSelected ? 16 : 24}
                        color="#5A32FB" // interactive-1 color
                      />
                    )}
                    {option === "url" && (
                      <LinkIcon
                        size={isOptionSelected ? 16 : 24}
                        color="#5A32FB" // interactive-1 color
                      />
                    )}
                    {option === "describe" && (
                      <EditIcon
                        size={isOptionSelected ? 16 : 24}
                        color="#5A32FB" // interactive-1 color
                      />
                    )}
                    {!isOptionSelected && (
                      <Text className="mt-2 font-medium text-interactive-1">
                        {option.charAt(0).toUpperCase() + option.slice(1)}
                      </Text>
                    )}
                  </View>
                </TouchableOpacity>
              </MotiView>
            ))}
          </View>
        </MotiView>

        <View className="mb-4 h-32">
          {imagePreview ? (
            <View className="relative h-full w-full rounded-md">
              <Image
                source={{ uri: imagePreview }}
                style={{ width: "100%", height: "100%", borderRadius: 5 }}
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
            <View className="relative h-full w-full rounded-md bg-neutral-200">
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
              <TouchableOpacity
                onPress={clearPreview}
                className="absolute right-2 top-2 rounded-full bg-white p-1"
              >
                <X size={16} color="black" />
              </TouchableOpacity>
            </View>
          ) : activeInput === "url" ? (
            <View className="h-full rounded-md border border-neutral-300 px-3 py-2">
              <BottomSheetTextInput
                placeholder="Paste URL"
                defaultValue={input}
                onChangeText={handleTextChange}
                multiline
                textAlignVertical="top"
                autoFocus={true}
                style={{ height: "100%" }}
              />
            </View>
          ) : activeInput === "describe" ? (
            <View className="h-full rounded-md border border-neutral-300 px-3 py-2">
              <BottomSheetTextInput
                placeholder="Describe your event"
                defaultValue={input}
                onChangeText={handleTextChange}
                multiline
                textAlignVertical="top"
                autoFocus={true}
                style={{ height: "100%" }}
              />
            </View>
          ) : null}
        </View>

        {isOptionSelected && (
          <View className="mt-2">
            <View className="flex-row items-center justify-between">
              <View className="flex-row items-center gap-2">
                <Globe2 size={20} color="black" />
                <Text className="text-base font-medium">Make discoverable</Text>
              </View>
              <Switch value={isPublic} onValueChange={setIsPublic} />
            </View>
          </View>
        )}
      </View>
    </BottomSheetModal>
  );
});

export default AddEventBottomSheet;
