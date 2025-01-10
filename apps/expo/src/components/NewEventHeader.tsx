import React from "react";
import { Pressable, Text, View } from "react-native";
import { Image, LinkIcon, Type } from "lucide-react-native";

interface NewEventHeaderProps {
  isFromIntent: boolean;
  linkPreview: string | null;
  imagePreview: string | null;
  activeInput: string | null;
  handleDescribePress: () => void;
  containerClassName?: string;
}

export function NewEventHeader({
  isFromIntent,
  linkPreview,
  imagePreview,
  activeInput,
  handleDescribePress,
  containerClassName,
}: NewEventHeaderProps) {
  if (isFromIntent) {
    if (linkPreview) {
      return (
        <View
          className={`flex-row items-center gap-2 ${containerClassName || ""}`}
        >
          <LinkIcon size={16} color="#fff" />
          <Text className="text-lg font-bold text-white">Selected link</Text>
        </View>
      );
    }
    if (imagePreview) {
      return (
        <View
          className={`flex-row items-center gap-1 ${containerClassName || ""}`}
        >
          <Image size={16} color="#fff" />
          <Text className="text-lg font-bold text-white">Selected image</Text>
        </View>
      );
    }
    return (
      <View
        className={`flex-row items-center gap-2 ${containerClassName || ""}`}
      >
        <Type size={16} color="#fff" />
        <Text className="text-lg font-bold text-white">Describe event</Text>
      </View>
    );
  }

  return (
    <View className={`flex-row items-center ${containerClassName || ""}`}>
      <Pressable
        onPress={() => {
          if (activeInput === "describe") {
            handleDescribePress();
          }
        }}
        className={`${
          activeInput !== "describe"
            ? "border-b-2 border-interactive-3"
            : "border-b-2 border-transparent"
        }`}
      >
        <View className="flex-row items-center gap-2">
          <Image
            size={16}
            color={
              activeInput !== "describe" ? "#fff" : "rgba(255, 255, 255, 0.6)"
            }
          />
          <Text
            className={`text-lg font-bold ${
              activeInput !== "describe" ? "text-white" : "text-white/60"
            }`}
          >
            Select image
          </Text>
        </View>
      </Pressable>

      <Text className="border-b-2 border-transparent px-3 text-lg font-semibold text-white/60">
        or
      </Text>

      <Pressable
        onPress={() => {
          if (activeInput !== "describe") {
            handleDescribePress();
          }
        }}
        className={`${
          activeInput === "describe"
            ? "border-b-2 border-interactive-3"
            : "border-b-2 border-transparent"
        }`}
      >
        <View className="flex-row items-center gap-2">
          <Type
            size={16}
            color={
              activeInput === "describe" ? "#fff" : "rgba(255, 255, 255, 0.6)"
            }
          />
          <Text
            className={`text-lg font-bold ${
              activeInput === "describe" ? "text-white" : "text-white/60"
            }`}
          >
            Describe event
          </Text>
        </View>
      </Pressable>
    </View>
  );
}
