import React, { useCallback } from "react";
import { FlatList, Text, TouchableOpacity, View } from "react-native";
import { router, Stack, useLocalSearchParams } from "expo-router";

import { Check } from "~/components/icons";
import { useSetPickerResult } from "~/store";

interface PlatformItem {
  value: string;
  label: string;
}

const PLATFORMS: PlatformItem[] = [
  { value: "instagram", label: "Instagram" },
  { value: "tiktok", label: "TikTok" },
  { value: "facebook", label: "Facebook" },
  { value: "twitter", label: "Twitter" },
  { value: "unknown", label: "Unknown" },
];

export default function PlatformPickerScreen() {
  const { value } = useLocalSearchParams<{ value?: string }>();
  const setPickerResult = useSetPickerResult();

  const handleSelect = useCallback(
    (item: PlatformItem) => {
      setPickerResult("platform", item.value);
      router.back();
    },
    [setPickerResult],
  );

  return (
    <View className="flex-1 bg-white">
      <Stack.Screen options={{ title: "Select Platform" }} />
      <FlatList
        data={PLATFORMS}
        keyExtractor={(item) => item.value}
        showsVerticalScrollIndicator={false}
        renderItem={({ item }) => {
          const isSelected = item.value === value;
          return (
            <TouchableOpacity
              className={`flex-row items-center justify-between px-4 py-3 ${
                isSelected ? "bg-blue-50" : ""
              }`}
              onPress={() => handleSelect(item)}
            >
              <Text
                className={`text-base ${
                  isSelected ? "font-medium text-blue-600" : "text-gray-800"
                }`}
              >
                {item.label}
              </Text>
              {isSelected && <Check size={20} color="#2563eb" />}
            </TouchableOpacity>
          );
        }}
      />
    </View>
  );
}
