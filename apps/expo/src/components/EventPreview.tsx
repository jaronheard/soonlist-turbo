import React from "react";
import {
  ActivityIndicator,
  Platform,
  Pressable,
  Text,
  TextInput,
  View,
} from "react-native";
import { Image as ExpoImage } from "expo-image";

import type { ImageSource } from "~/utils/images";
import { Image, Link as LinkIcon, X } from "~/components/icons";
import { cn } from "~/utils/cn";

interface EventPreviewProps {
  imagePreview: string | ImageSource | null;
  linkPreview: string | null;
  input: string;
  handleTextChange: (text: string) => void;
  clearPreview?: () => void;
  clearText?: () => void;
  activeInput: string | null;
  isImageLoading: boolean;
  handleMorePhotos: () => void;
  previewContainerStyle: "full" | "square" | "compact" | "default";
  containerClassName?: string;
}

export function EventPreview({
  imagePreview,
  linkPreview,
  input,
  handleTextChange,
  clearPreview,
  clearText,
  activeInput,
  isImageLoading,
  handleMorePhotos,
  previewContainerStyle,
  containerClassName,
}: EventPreviewProps) {
  return (
    <View
      className={cn(
        "overflow-hidden rounded-xl",
        containerClassName,
        activeInput === "describe"
          ? "min-h-[180px] bg-white"
          : "bg-interactive-2",
        previewContainerStyle === "full" && "aspect-[3/4]",
        previewContainerStyle === "square" && "aspect-square",
        previewContainerStyle === "compact" && "h-[180px]",
        previewContainerStyle === "default" && "h-[200px]",
      )}
    >
      {imagePreview && (
        <View className="relative h-full w-full">
          <ExpoImage
            source={
              typeof imagePreview === "number"
                ? imagePreview
                : typeof imagePreview === "string"
                  ? { uri: imagePreview }
                  : imagePreview
            }
            style={{ width: "100%", height: "100%" }}
            contentFit="contain"
            contentPosition="center"
            transition={200}
            cachePolicy="memory-disk"
            placeholder={null}
            placeholderContentFit="contain"
            className="bg-muted/10"
          />
          {clearPreview && (
            <Pressable
              onPress={clearPreview}
              className="absolute right-2 top-2 rounded-full bg-interactive-3 p-1"
            >
              <X size={20} color="#5A32FB" />
            </Pressable>
          )}
          {isImageLoading && (
            <View className="absolute bottom-2 right-2">
              <ActivityIndicator size="small" color="#DCE0E8" />
            </View>
          )}
        </View>
      )}

      {!imagePreview && linkPreview && (
        <View className="relative h-full w-full bg-neutral-200">
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
          {clearPreview && (
            <Pressable
              onPress={clearPreview}
              className="absolute right-2 top-2 rounded-full bg-white p-1"
            >
              <X size={16} color="black" />
            </Pressable>
          )}
        </View>
      )}

      {!imagePreview && !linkPreview && activeInput === "describe" && (
        <View className="relative h-full border border-neutral-300 bg-white px-3 py-2">
          <TextInput
            placeholder={
              "Describe event in natural language...\n\n" +
              "For example:\n" +
              "• House party at Alex's Friday night, wear red\n" +
              "• Nationale art opening next Saturday 2-4"
            }
            placeholderTextColor="#A1A1AA"
            value={input}
            onChangeText={handleTextChange}
            multiline
            style={[Platform.select({ android: { textAlignVertical: "top" } })]}
            autoFocus={true}
            className="h-full text-lg"
          />

          {input.length > 0 && clearText && (
            <Pressable
              onPress={clearText}
              className="absolute right-2 top-2 rounded-full bg-neutral-200 p-2"
            >
              <X size={16} color="black" />
            </Pressable>
          )}
        </View>
      )}

      {!imagePreview && !linkPreview && activeInput !== "describe" && (
        <Pressable
          onPress={() => void handleMorePhotos()}
          className="h-full w-full items-center justify-center bg-interactive-3"
        >
          <Image size={64} color="#5A32FB" />
        </Pressable>
      )}
    </View>
  );
}
