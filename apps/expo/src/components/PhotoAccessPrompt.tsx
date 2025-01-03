import React from "react";
import { Linking, Pressable, Text, View } from "react-native";
import { X } from "lucide-react-native";

interface PhotoAccessPromptProps {
  onClose?: () => void;
  showCloseButton?: boolean;
}

export function PhotoAccessPrompt({
  onClose,
  showCloseButton,
}: PhotoAccessPromptProps) {
  const handleEnableAccess = () => {
    void Linking.openSettings();
  };

  return (
    <View className="relative flex-1 items-center justify-center bg-black px-8">
      {showCloseButton && (
        <Pressable
          onPress={onClose}
          className="absolute left-4 top-4 rounded-full"
        >
          <X size={24} color="#fff" />
        </Pressable>
      )}

      <View className="items-center">
        <Text className="mb-4 text-2xl font-semibold text-white">
          Please allow access to your photos
        </Text>
        <Text className="mb-8 text-center text-base text-neutral-400">
          This allows Soonlist to share photos from your library and save photos
          to your camera roll.
        </Text>
        <Pressable
          onPress={handleEnableAccess}
          className="rounded-full bg-interactive-1 px-8 py-3"
        >
          <Text className="text-xl font-semibold text-white">
            Enable library access
          </Text>
        </Pressable>
      </View>
    </View>
  );
}
