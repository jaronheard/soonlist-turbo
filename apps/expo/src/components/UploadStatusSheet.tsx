import React, { forwardRef, useImperativeHandle, useMemo } from "react";
import { View, StyleSheet, Pressable, ScrollView } from "react-native";
import { useColorScheme } from "nativewind";
import { Ionicons } from "@expo/vector-icons";
import BottomSheet from "@gorhom/bottom-sheet";
import { useUploadQueueStore } from "../store/useUploadQueueStore";
import { cn } from "../lib/utils";

interface UploadStatusSheetProps {
  isOpen: boolean;
  onClose: () => void;
}

export const UploadStatusSheet = forwardRef<
  { snapToIndex: (index: number) => void },
  UploadStatusSheetProps
>(({ isOpen, onClose }, ref) => {
  const { colorScheme } = useColorScheme();
  const bottomSheetRef = React.useRef<BottomSheet>(null);
  const snapPoints = useMemo(() => ["50%", "75%"], []);

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

  useImperativeHandle(ref, () => ({
    snapToIndex: (index: number) => {
      bottomSheetRef.current?.snapToIndex(index);
    },
  }));

  const handleSheetChanges = (index: number) => {
    if (index === -1) {
      onClose();
    }
  };

  const handleRetry = (id: string) => {
    retryItem(id);
  };

  const handleCancel = (id: string) => {
    removeFromQueue(id);
  };

  return (
    <BottomSheet
      ref={bottomSheetRef}
      index={isOpen ? 0 : -1}
      snapPoints={snapPoints}
      onChange={handleSheetChanges}
      enablePanDownToClose
      backgroundStyle={{
        backgroundColor: colorScheme === "dark" ? "#1F2937" : "#FFFFFF",
      }}
      handleIndicatorStyle={{
        backgroundColor: colorScheme === "dark" ? "#6B7280" : "#9CA3AF",
      }}
    >
      <View className="flex-1 px-4">
        <View className="flex-row justify-between items-center mb-4">
          <View className="text-lg font-semibold">Upload Status</View>
          <Pressable onPress={onClose}>
            <Ionicons
              name="close"
              size={24}
              color={colorScheme === "dark" ? "#E5E7EB" : "#4B5563"}
            />
          </Pressable>
        </View>

        <ScrollView className="flex-1">
          {/* Active Uploads */}
          {activeItems.length > 0 && (
            <View className="mb-4">
              <View className="text-sm font-medium mb-2 text-neutral-500">
                Uploading ({activeItems.length})
              </View>
              {activeItems.map((item) => (
                <View
                  key={item.id}
                  className={cn(
                    "flex-row items-center p-3 rounded-lg mb-2",
                    colorScheme === "dark" ? "bg-neutral-800" : "bg-neutral-100"
                  )}
                >
                  <View className="w-12 h-12 rounded-md bg-neutral-300 mr-3" />
                  <View className="flex-1">
                    <View className="text-sm mb-1">
                      {item.fileName || "Photo"}
                    </View>
                    <View className="w-full h-1 bg-neutral-300 rounded-full overflow-hidden">
                      <View
                        className="h-full bg-primary"
                        style={{ width: `${(item.progress || 0) * 100}%` }}
                      />
                    </View>
                    <View className="text-xs text-neutral-500 mt-1">
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

          {/* Failed Uploads */}
          {failedItems.length > 0 && (
            <View className="mb-4">
              <View className="text-sm font-medium mb-2 text-red-500">
                Failed ({failedItems.length})
              </View>
              {failedItems.map((item) => (
                <View
                  key={item.id}
                  className={cn(
                    "flex-row items-center p-3 rounded-lg mb-2",
                    colorScheme === "dark" ? "bg-neutral-800" : "bg-neutral-100"
                  )}
                >
                  <View className="w-12 h-12 rounded-md bg-neutral-300 mr-3" />
                  <View className="flex-1">
                    <View className="text-sm mb-1">
                      {item.fileName || "Photo"}
                    </View>
                    <View className="text-xs text-red-500">
                      {item.errorMessage || "Upload failed"}
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

          {/* Completed Uploads */}
          {completedItems.length > 0 && (
            <View className="mb-4">
              <View className="text-sm font-medium mb-2 text-green-500">
                Completed ({completedItems.length})
              </View>
              {completedItems.map((item) => (
                <View
                  key={item.id}
                  className={cn(
                    "flex-row items-center p-3 rounded-lg mb-2",
                    colorScheme === "dark" ? "bg-neutral-800" : "bg-neutral-100"
                  )}
                >
                  <View className="w-12 h-12 rounded-md bg-neutral-300 mr-3" />
                  <View className="flex-1">
                    <View className="text-sm mb-1">
                      {item.fileName || "Photo"}
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
              <View className="text-center mt-4 text-neutral-500">
                No uploads in progress
              </View>
            </View>
          )}
        </ScrollView>
      </View>
    </BottomSheet>
  );
});

