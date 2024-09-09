import React, { useCallback, useMemo, useRef, useState } from "react";
import { Text, TextInput, TouchableOpacity, View } from "react-native";
import { useUser } from "@clerk/clerk-expo";
import { BottomSheetBackdrop, BottomSheetModal } from "@gorhom/bottom-sheet";
import { Sparkles } from "lucide-react-native";

import { useNotification } from "~/providers/NotificationProvider";
import { api } from "~/utils/api";

interface CustomBottomSheetModalProps {
  children?: React.ReactNode;
}

const CustomBottomSheetModal = React.forwardRef<
  BottomSheetModal,
  CustomBottomSheetModalProps
>((props, ref) => {
  const snapPoints = useMemo(() => ["33%", "66%"], []);
  const [text, setText] = useState("");
  const textInputRef = useRef<TextInput>(null);
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
    (props: any) => (
      <BottomSheetBackdrop
        {...props}
        disappearsOnIndex={-1}
        appearsOnIndex={0}
      />
    ),
    [],
  );

  const handleAdd = () => {
    console.log("handleAdd", text);
    if (!text.trim()) return;
    eventFromRawTextAndNotification.mutate({
      rawText: text,
      timezone: "America/Los_Angeles",
      expoPushToken,
      lists: [],
      userId: user?.id || "",
      username: user?.username || "",
    });
    setText("");
    (ref as React.RefObject<BottomSheetModal>).current?.dismiss();
  };

  return (
    <BottomSheetModal
      ref={ref}
      index={1}
      snapPoints={snapPoints}
      onChange={handleSheetChanges}
      backdropComponent={renderBackdrop}
    >
      <View className="flex-1 p-4">
        <Text className="mb-4 text-2xl font-semibold">Add Event</Text>
        <TextInput
          ref={textInputRef}
          className="mb-4 h-24 w-full rounded-md border border-neutral-3 p-2"
          placeholder="Describe your event"
          defaultValue={text}
          onChangeText={setText}
          multiline
          numberOfLines={4}
          onSubmitEditing={handleAdd}
        />
        <TouchableOpacity
          className="w-full flex-row items-center justify-center rounded-full bg-interactive-1 px-3 py-2"
          onPress={handleAdd}
        >
          <Sparkles size={16} color="white" />
          <Text className="ml-2 text-2xl font-bold text-white">Add Event</Text>
        </TouchableOpacity>
        <Text className="mt-2 text-center text-xs text-neutral-2">
          <Text className="font-bold">Pro tip:</Text> Use our share extension to
          instantly add images and text to Soonlist from anywhere!
        </Text>
      </View>
    </BottomSheetModal>
  );
});

export default CustomBottomSheetModal;
