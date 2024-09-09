import React, { useCallback, useMemo, useState } from "react";
import { Image, Switch, Text, TouchableOpacity, View } from "react-native";
// import * as ImagePicker from "expo-image-picker";
import { useUser } from "@clerk/clerk-expo";
import {
  BottomSheetBackdrop,
  BottomSheetModal,
  BottomSheetTextInput,
} from "@discord/bottom-sheet";
import { Image as ImageIcon, Sparkles, X } from "lucide-react-native";

import { useNotification } from "~/providers/NotificationProvider";
import { api } from "~/utils/api";

interface CustomBottomSheetModalProps {
  children?: React.ReactNode;
}

const CustomBottomSheetModal = React.forwardRef<
  BottomSheetModal,
  CustomBottomSheetModalProps
>((props, ref) => {
  const snapPoints = useMemo(() => ["25%", "40%"], []);
  const [input, setInput] = useState("");
  const [imagePreview, setImagePreview] = useState<string | null>(null);
  const [visibility, setVisibility] = useState("private");
  const [isCreating, setIsCreating] = useState(false);
  const [isPublic, setIsPublic] = useState(false);
  const { expoPushToken } = useNotification();
  const utils = api.useUtils();
  const eventFromRawTextAndNotification =
    api.ai.eventFromRawTextThenCreateThenNotification.useMutation({
      onSettled: () => void utils.event.invalidate(),
    });
  const { user } = useUser();

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

  const handleImageUpload = async () => {
    // const result = await ImagePicker.launchImageLibraryAsync({
    //   mediaTypes: ImagePicker.MediaTypeOptions.Images,
    //   allowsEditing: true,
    //   aspect: [4, 3],
    //   quality: 1,
    // });
    // if (!result.canceled) {
    //   setImagePreview(result.assets[0].uri);
    //   setInput(result.assets[0].uri.split("/").pop() || "");
    // }
  };

  const clearImage = () => {
    setImagePreview(null);
    setInput("");
  };

  const handleCreateEvent = () => {
    if (!input.trim() && !imagePreview) return;
    setIsCreating(true);

    eventFromRawTextAndNotification.mutate(
      {
        rawText: input,
        timezone: "America/Los_Angeles",
        expoPushToken,
        lists: [],
        userId: user?.id || "",
        username: user?.username || "",
        visibility: isPublic ? "public" : "private",
        // Remove the imageUrl property if it's not expected in the mutation input
        // imageUrl: imagePreview,
      },
      {
        onSuccess: () => {
          setIsCreating(false);
          setInput("");
          setImagePreview(null);
          (ref as React.RefObject<BottomSheetModal>).current?.dismiss();
        },
        onError: (error) => {
          console.error("Failed to create event:", error);
          setIsCreating(false);
        },
      },
    );
  };

  return (
    <BottomSheetModal
      ref={ref}
      index={1}
      snapPoints={snapPoints}
      onChange={handleSheetChanges}
      backdropComponent={renderBackdrop}
      keyboardBehavior="interactive"
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
                <Text className="ml-2">
                  {imagePreview ? "Change Image" : "Upload Image"}
                </Text>
              </View>
            </TouchableOpacity>
          </View>
          {imagePreview ? (
            <View className="relative mb-4">
              <Image
                source={{ uri: imagePreview }}
                style={{ width: "100%", height: 150 }}
                className="rounded-md"
              />
              <TouchableOpacity
                onPress={clearImage}
                className="absolute right-2 top-2 rounded-full bg-neutral-200 p-1"
              >
                <X size={16} color="black" />
              </TouchableOpacity>
            </View>
          ) : (
            <View className="mb-4 h-24 w-full overflow-hidden rounded-md border border-neutral-300 px-3 py-2">
              <BottomSheetTextInput
                className="h-full w-full"
                placeholder="Enter event details or paste a URL"
                value={input}
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
      </View>
    </BottomSheetModal>
  );
});

export default CustomBottomSheetModal;
