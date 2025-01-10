import React from "react";
import { Pressable, Text, View } from "react-native";
import { Sparkles } from "lucide-react-native";

interface CaptureEventButtonProps {
  handleCreateEvent: () => void;
  input: string;
  imagePreview: string | null;
  linkPreview: string | null;
  containerClassName?: string;
}

export function CaptureEventButton({
  handleCreateEvent,
  input,
  imagePreview,
  linkPreview,
  containerClassName,
}: CaptureEventButtonProps) {
  const isDisabled = !input.trim() && !imagePreview && !linkPreview;

  return (
    <View className={containerClassName || ""}>
      <Pressable
        onPress={handleCreateEvent}
        disabled={isDisabled}
        className={`w-full flex-row items-center justify-center rounded-full px-3 py-3 shadow-lg ${
          isDisabled ? "bg-neutral-3" : "bg-white"
        }`}
      >
        <Sparkles size={16} color={isDisabled ? "#627496" : "#5A32FB"} />
        <Text
          className={`ml-2 text-xl font-bold ${
            isDisabled ? "text-neutral-2" : "text-[#5A32FB]"
          }`}
        >
          Capture event
        </Text>
      </Pressable>
    </View>
  );
}
