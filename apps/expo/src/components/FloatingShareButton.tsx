import React from "react";
import { Text, TouchableOpacity, View } from "react-native";

import { ShareIcon } from "~/components/icons";

interface FloatingShareButtonProps {
  onPress: () => void;
  label?: string;
  accessibilityLabel?: string;
}

export function FloatingShareButton({
  onPress,
  label = "Share",
  accessibilityLabel,
}: FloatingShareButtonProps) {
  return (
    <View
      className="absolute bottom-8 flex-row items-center justify-center gap-4 self-center"
      style={{
        shadowColor: "#5A32FB",
        shadowOffset: { width: 0, height: 3 },
        shadowOpacity: 0.3,
        shadowRadius: 6,
        elevation: 8,
      }}
    >
      <TouchableOpacity
        onPress={onPress}
        accessibilityLabel={accessibilityLabel ?? label}
        accessibilityRole="button"
        activeOpacity={0.8}
      >
        <View className="flex-row items-center gap-4 rounded-full bg-interactive-1 px-8 py-5">
          <ShareIcon size={28} color="#FFFFFF" />
          <Text className="text-xl font-bold text-white">{label}</Text>
        </View>
      </TouchableOpacity>
    </View>
  );
}
