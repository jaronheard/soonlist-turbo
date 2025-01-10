import React from "react";
import { Pressable, Text, View } from "react-native";
import { Sparkles } from "lucide-react-native";

import { cn } from "~/utils/cn";

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
    <View className={containerClassName}>
      <View className="overflow-hidden rounded-full bg-white/10 p-[1px] shadow-lg">
        <Pressable
          onPress={handleCreateEvent}
          disabled={isDisabled}
          className={cn(
            "w-full flex-row items-center justify-center rounded-full px-3 py-3.5",
            isDisabled ? "bg-neutral-3" : "bg-white",
          )}
        >
          <Sparkles size={16} color={isDisabled ? "#627496" : "#5A32FB"} />
          <Text
            className={cn(
              "ml-2 text-xl font-bold",
              isDisabled ? "text-neutral-2" : "text-[#5A32FB]",
            )}
          >
            Capture event
          </Text>
        </Pressable>
      </View>
    </View>
  );
}
