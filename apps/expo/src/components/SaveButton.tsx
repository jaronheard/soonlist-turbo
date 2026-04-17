import React from "react";
import { Text, TouchableOpacity, useWindowDimensions } from "react-native";
import { useUser } from "@clerk/clerk-expo";

import { Heart } from "~/components/icons";
import { useEventSaveActions } from "~/hooks/useEventActions";

interface SaveButtonProps {
  eventId: string;
  isSaved: boolean;
  source: string;
}

export default function SaveButton({
  eventId,
  isSaved: initialIsSaved,
  source,
}: SaveButtonProps) {
  const { isLoaded } = useUser();
  const { fontScale } = useWindowDimensions();
  const iconSize = 16 * fontScale;

  const { isSaved, toggle } = useEventSaveActions(eventId, initialIsSaved, {
    source,
  });

  if (isSaved) {
    return (
      <TouchableOpacity
        onPress={toggle}
        disabled={!isLoaded}
        accessibilityLabel="Saved, double-tap to remove"
        accessibilityRole="button"
        hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
        className="-mb-0.5 -ml-2.5 flex-row items-center gap-2 px-4 py-2.5"
        style={{
          borderRadius: 16,
          backgroundColor: "rgba(120, 120, 128, 0.12)",
        }}
        activeOpacity={0.7}
      >
        <Text style={{ fontSize: iconSize * 1.1, color: "#1C1C1E" }}>✓</Text>
        <Text
          className="text-base font-bold"
          style={{ color: "#1C1C1E" }}
        >
          Saved
        </Text>
      </TouchableOpacity>
    );
  }

  return (
    <TouchableOpacity
      onPress={toggle}
      disabled={!isLoaded}
      accessibilityLabel="Save"
      accessibilityRole="button"
      hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
      className="-mb-0.5 -ml-2.5 flex-row items-center gap-2 bg-interactive-2 px-4 py-2.5"
      style={{ borderRadius: 16 }}
      activeOpacity={0.8}
    >
      <Heart color="#5A32FB" size={iconSize * 1.1} fill="white" />
      <Text className="text-base font-bold text-interactive-1">Save</Text>
    </TouchableOpacity>
  );
}
