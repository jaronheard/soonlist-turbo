import React, { useCallback, useMemo, useState } from "react";
import {
  FlatList,
  Modal,
  Pressable,
  Text,
  TouchableOpacity,
  View,
} from "react-native";

import { Check, ChevronDown } from "~/components/icons";

interface PlatformSelectNativeProps {
  value?: string;
  onValueChange?: (value: string) => void;
  placeholder?: string;
  error?: string;
  className?: string;
}

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

export function PlatformSelectNative({
  value,
  onValueChange,
  placeholder = "Select platform",
  error,
  className = "",
}: PlatformSelectNativeProps) {
  const [isModalVisible, setIsModalVisible] = useState(false);

  const selectedItem = useMemo(
    () => PLATFORMS.find((item) => item.value === value),
    [value],
  );

  const showModal = useCallback(() => {
    setIsModalVisible(true);
  }, []);

  const hideModal = useCallback(() => {
    setIsModalVisible(false);
  }, []);

  const handleSelect = useCallback(
    (item: PlatformItem) => {
      onValueChange?.(item.value);
      hideModal();
    },
    [onValueChange, hideModal],
  );

  const renderItem = useCallback(
    ({ item }: { item: PlatformItem }) => {
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
    },
    [value, handleSelect],
  );

  const keyExtractor = useCallback((item: PlatformItem) => item.value, []);

  return (
    <>
      <TouchableOpacity
        className={`flex-row items-center justify-between rounded-md border px-3 py-2 ${
          error ? "border-red-500" : "border-neutral-300"
        } ${className}`}
        onPress={showModal}
      >
        <Text className={selectedItem ? "text-gray-900" : "text-gray-500"}>
          {selectedItem?.label || placeholder}
        </Text>
        <ChevronDown size={20} color="#666" />
      </TouchableOpacity>

      {isModalVisible && (
        <Modal
          transparent={true}
          animationType="fade"
          statusBarTranslucent
          onRequestClose={hideModal}
          presentationStyle="overFullScreen"
        >
          <Pressable
            onPress={hideModal}
            className="flex-1 items-center justify-center bg-black/70 p-4"
          >
            <Pressable
              onPress={(e) => e.stopPropagation()}
              className="w-full max-w-sm overflow-hidden rounded-xl bg-white shadow-lg"
            >
              <View className="flex-row items-center justify-between border-b border-gray-200 bg-gray-50 px-4 py-3">
                <Text className="text-lg font-semibold text-gray-900">
                  Select Platform
                </Text>
                <TouchableOpacity onPress={hideModal} className="p-2">
                  <Text className="text-base font-semibold text-blue-600">
                    Done
                  </Text>
                </TouchableOpacity>
              </View>

              <FlatList
                data={PLATFORMS}
                renderItem={renderItem}
                keyExtractor={keyExtractor}
                showsVerticalScrollIndicator={false}
              />
            </Pressable>
          </Pressable>
        </Modal>
      )}
    </>
  );
}
