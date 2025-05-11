import React, { forwardRef } from "react";
import {
  Modal,
  Platform,
  Pressable,
  ScrollView,
  StatusBar,
  TouchableWithoutFeedback,
  View,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { useColorScheme } from "nativewind";

import { cn } from "../lib/utils";
import { useUploadQueueStore } from "../store/useUploadQueueStore";

interface UploadStatusSheetProps {
  isOpen: boolean;
  onClose: () => void;
}

export const UploadStatusSheet = forwardRef<
  Record<string, unknown>,
  UploadStatusSheetProps
>(({ isOpen, onClose }, _ref) => {
  const { colorScheme } = useColorScheme();

  const {
    queue,
    getActiveItems,
    getCompletedItems,
    getFailedItems,
    retryItem,
    removeFromQueue,
  } = useUploadQueueStore();

  const activeItems = getActiveItems();
  const completedItems = getCompletedItems();
  const failedItems = getFailedItems();

  const handleRetry = (id: string) => {
    retryItem(id);
  };

  const handleCancel = (id: string) => {
    removeFromQueue(id);
  };

  const getDisplayName = (uri: string) => {
    try {
      const parts = uri.split("/");
      const fileName = parts.pop() || "Uploaded File";
      return decodeURIComponent(fileName);
    } catch (e) {
      return "Uploaded File";
    }
  };

  return (
    <Modal
      transparent
      visible={isOpen}
      animationType="slide"
      onRequestClose={onClose}
    >
      <TouchableWithoutFeedback onPress={onClose}>
        <View className="flex-1 justify-end bg-black/50"></View>
      </TouchableWithoutFeedback>

      <TouchableWithoutFeedback>
        <View
          style={{
            maxHeight: "75%",
            paddingTop: Platform.OS === "android" ? StatusBar.currentHeight : 0,
          }}
          className={cn(
            "w-full rounded-t-xl bg-white p-4 shadow-lg dark:bg-neutral-800",
            colorScheme === "dark" ? "border-t border-neutral-700" : "",
          )}
        >
          <View className="mb-4 flex-row items-center justify-between">
            <View className="text-lg font-semibold dark:text-white">
              Upload Status
            </View>
            <Pressable onPress={onClose}>
              <Ionicons
                name="close"
                size={24}
                color={colorScheme === "dark" ? "#E5E7EB" : "#4B5563"}
              />
            </Pressable>
          </View>

          <ScrollView className="flex-shrink">
            {activeItems.length > 0 && (
              <View className="mb-4">
                <View className="mb-2 text-sm font-medium text-neutral-500 dark:text-neutral-400">
                  Uploading ({activeItems.length})
                </View>
                {activeItems.map((item) => (
                  <View
                    key={item.id}
                    className={cn(
                      "mb-2 flex-row items-center rounded-lg p-3",
                      colorScheme === "dark"
                        ? "bg-neutral-700"
                        : "bg-neutral-100",
                    )}
                  >
                    <View className="mr-3 h-12 w-12 rounded-md bg-neutral-300 dark:bg-neutral-600" />
                    <View className="flex-1">
                      <View className="mb-1 text-sm dark:text-white">
                        {getDisplayName(item.imageUri)}
                      </View>
                      <View className="h-1 w-full overflow-hidden rounded-full bg-neutral-300 dark:bg-neutral-500">
                        <View
                          className="h-full bg-primary"
                          style={{ width: `${(item.progress || 0) * 100}%` }}
                        />
                      </View>
                      <View className="mt-1 text-xs text-neutral-500 dark:text-neutral-400">
                        {Math.round((item.progress || 0) * 100)}%
                      </View>
                    </View>
                    <Pressable
                      onPress={() => handleCancel(item.id)}
                      className="ml-2 p-2"
                    >
                      <Ionicons
                        name="close-circle"
                        size={20}
                        color={colorScheme === "dark" ? "#9CA3AF" : "#6B7280"}
                      />
                    </Pressable>
                  </View>
                ))}
              </View>
            )}

            {failedItems.length > 0 && (
              <View className="mb-4">
                <View className="mb-2 text-sm font-medium text-red-500">
                  Failed ({failedItems.length})
                </View>
                {failedItems.map((item) => (
                  <View
                    key={item.id}
                    className={cn(
                      "mb-2 flex-row items-center rounded-lg p-3",
                      colorScheme === "dark"
                        ? "bg-neutral-700"
                        : "bg-neutral-100",
                    )}
                  >
                    <View className="mr-3 h-12 w-12 rounded-md bg-neutral-300 dark:bg-neutral-600" />
                    <View className="flex-1">
                      <View className="mb-1 text-sm dark:text-white">
                        {getDisplayName(item.imageUri)}
                      </View>
                      <View className="text-xs text-red-500">
                        {item.error || "Upload failed"}
                      </View>
                    </View>
                    <View className="flex-row">
                      <Pressable
                        onPress={() => handleRetry(item.id)}
                        className="ml-2 p-2"
                      >
                        <Ionicons
                          name="refresh"
                          size={20}
                          color={colorScheme === "dark" ? "#3B82F6" : "#2563EB"}
                        />
                      </Pressable>
                      <Pressable
                        onPress={() => handleCancel(item.id)}
                        className="ml-2 p-2"
                      >
                        <Ionicons
                          name="trash"
                          size={20}
                          color={colorScheme === "dark" ? "#EF4444" : "#DC2626"}
                        />
                      </Pressable>
                    </View>
                  </View>
                ))}
              </View>
            )}

            {completedItems.length > 0 && (
              <View className="mb-4">
                <View className="mb-2 text-sm font-medium text-green-500">
                  Completed ({completedItems.length})
                </View>
                {completedItems.map((item) => (
                  <View
                    key={item.id}
                    className={cn(
                      "mb-2 flex-row items-center rounded-lg p-3",
                      colorScheme === "dark"
                        ? "bg-neutral-700"
                        : "bg-neutral-100",
                    )}
                  >
                    <View className="mr-3 h-12 w-12 rounded-md bg-neutral-300 dark:bg-neutral-600" />
                    <View className="flex-1">
                      <View className="mb-1 text-sm dark:text-white">
                        {getDisplayName(item.imageUri)}
                      </View>
                      <View className="text-xs text-green-500">
                        Upload complete
                      </View>
                    </View>
                    <Ionicons
                      name="checkmark-circle"
                      size={20}
                      color={colorScheme === "dark" ? "#10B981" : "#059669"}
                    />
                  </View>
                ))}
              </View>
            )}

            {queue.length === 0 && (
              <View className="items-center justify-center py-8">
                <Ionicons
                  name="cloud-upload"
                  size={48}
                  color={colorScheme === "dark" ? "#6B7280" : "#9CA3AF"}
                />
                <View className="mt-4 text-center text-neutral-500 dark:text-neutral-400">
                  No uploads in progress
                </View>
              </View>
            )}
          </ScrollView>
        </View>
      </TouchableWithoutFeedback>
    </Modal>
  );
});
