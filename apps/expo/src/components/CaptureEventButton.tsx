import React from "react";
import { Text, TouchableOpacity } from "react-native";

import type { ImageSource } from "~/utils/images";
import { Sparkles } from "~/components/icons";
import { cn } from "~/utils/cn";

interface CaptureEventButtonProps {
  handleCreateEvent: () => void;
  input: string;
  imagePreview: string | ImageSource | null;
  linkPreview: string | null;
}

export function CaptureEventButton({
  handleCreateEvent,
  input,
  imagePreview,
  linkPreview,
}: CaptureEventButtonProps) {
  const isDisabled = !input.trim() && !imagePreview && !linkPreview;

  return (
    <TouchableOpacity
      onPress={handleCreateEvent}
      disabled={isDisabled}
      className={cn(
        "w-full flex-row items-center justify-center rounded-full px-3 py-3.5 shadow-lg",
        isDisabled ? "bg-neutral-3" : "bg-white",
      )}
    >
      <Sparkles size={20} color={isDisabled ? "#627496" : "#5A32FB"} />
      <Text
        className={cn(
          "ml-2 text-2xl font-bold",
          isDisabled ? "text-neutral-2" : "text-[#5A32FB]",
        )}
      >
        Capture event
      </Text>
    </TouchableOpacity>
  );
}
