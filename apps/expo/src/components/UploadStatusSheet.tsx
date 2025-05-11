import React, { forwardRef, useImperativeHandle } from "react";
import { View, StyleSheet, Pressable } from "react-native";
import { BottomSheetModal, BottomSheetFlatList } from "@gorhom/bottom-sheet";
import { useColorScheme } from "nativewind";
import { Ionicons } from "@expo/vector-icons";
import { useUploadQueueStore } from "../store/useUploadQueueStore";
import { useHaptics } from "../hooks/useHaptics";
import { cn } from "../lib/utils";
import { colors } from "../lib/colors";

interface UploadStatusSheetProps {
  isOpen: boolean;
  onClose: () => void;
}

export const UploadStatusSheet = forwardRef<
  { snapToIndex: (index: number) => void },
  UploadStatusSheetProps
>(({ isOpen, onClose }, ref) => {
  const { colorScheme } = useColorScheme();
  const { triggerHaptic } = useHaptics();
  const bottomSheetRef = React.useRef<BottomSheetModal>(null);
  const snapPoints = React.useMemo(() => ["50%"], []);

  // Expose methods to parent component
  useImperativeHandle(ref, () => ({
    snapToIndex: (index: number) => {
      bottomSheetRef.current?.snapToIndex(index);
    },
  }));

  // Get queue data from store
  const {
    queue,
    removeFromQueue,
    retryItem,
    getActiveItems,
    getCompletedItems,
    getFailedItems,
    clearCompletedItems,
  } = useUploadQueueStore();

  const activeItems = getActiveItems();
  const failedItems = getFailedItems();
  const completedItems = getCompletedItems();
  const hasActiveUploads = activeItems.length > 0;
  const hasFailedUploads = failedItems.length > 0;
  const hasCompletedUploads = completedItems.length > 0;

  // Handle retry for failed uploads
  const handleRetry = React.useCallback(
    (id: string) => {
      void triggerHaptic("light");
      retryItem(id);
    },
    [retryItem, triggerHaptic],
  );

  // Handle cancel for active uploads
  const handleCancel = React.useCallback(
    (id: string) => {
      void triggerHaptic("light");
      removeFromQueue(id);
    },
    [removeFromQueue, triggerHaptic],
  );

  // Handle clear all completed uploads
  const handleClearCompleted = React.useCallback(() => {
    void triggerHaptic("light");
    clearCompletedItems();
  }, [clearCompletedItems, triggerHaptic]);

  // Effect to open/close the sheet
  React.useEffect(() => {
    if (isOpen) {
      bottomSheetRef.current?.present();
    } else {
      bottomSheetRef.current?.dismiss();
    }
  }, [isOpen]);

  // Render item for the flat list
  const renderItem = React.useCallback(
    ({ item }: { item: (typeof queue)[0] }) => {
      const isActive = item.status === "active";
      const isFailed = item.status === "failed";
      const isCompleted = item.status === "completed";

      return (
        <View
          className={cn(
            "flex-row items-center justify-between p-4 mb-2 rounded-lg",
            colorScheme === "dark"
              ? "bg-neutral-800"
              : "bg-neutral-100",
          )}
        >
          <View className="flex-row items-center flex-1">
            <View className="w-12 h-12 rounded-md overflow-hidden mr-3">
              {item.imageUri ? (
                <View
                  className="w-full h-full bg-neutral-300"
                  style={{ backgroundImage: `url(${item.imageUri})` }}
                />
              ) : (
                <View
                  className={cn(
                    "w-full h-full items-center justify-center",
                    colorScheme === "dark"
                      ? "bg-neutral-700"
                      : "bg-neutral-300",
                  )}
                >
                  <Ionicons
                    name="image-outline"
                    size={24}
                    color={colorScheme === "dark" ? "white" : "black"}
                  />
                </View>
              )}
            </View>
            <View className="flex-1">
              <View
                className={cn(
                  "text-sm font-medium",
                  colorScheme === "dark" ? "text-white" : "text-black",
                )}
              >
                {isActive
                  ? "Uploading..."
                  : isCompleted
                  ? "Upload complete"
                  : "Upload failed"}
              </View>
              {isFailed && item.error && (
                <View
                  className={cn(
                    "text-xs mt-1",
                    colorScheme === "dark"
                      ? "text-neutral-400"
                      : "text-neutral-600",
                  )}
                >
                  {item.error}
                </View>
              )}
              {isActive && (
                <View className="mt-1 w-full h-1 bg-neutral-300 rounded-full overflow-hidden">
                  <View
                    className="h-full bg-primary"
                    style={{
                      width: `${(item.progress || 0) * 100}%`,
                    }}
                  />
                </View>
              )}
            </View>
          </View>
          <View className="ml-2">
            {isActive && (
              <Pressable
                onPress={() => handleCancel(item.id)}
                className={cn(
                  "p-2 rounded-full",
                  colorScheme === "dark"
                    ? "bg-neutral-700"
                    : "bg-neutral-200",
                )}
              >
                <Ionicons
                  name="close"
                  size={16}
                  color={colorScheme === "dark" ? "white" : "black"}
                />
              </Pressable>
            )}
            {isFailed && (
              <Pressable
                onPress={() => handleRetry(item.id)}
                className="p-2 rounded-full bg-primary"
              >
                <Ionicons name="refresh" size={16} color="white" />
              </Pressable>
            )}
          </View>
        </View>
      );
    },
    [colorScheme, handleCancel, handleRetry],
  );

  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  const isSheetVisible = isOpen && (hasActiveUploads || hasFailedUploads || hasCompletedUploads);

  return (
    <BottomSheetModal
      ref={bottomSheetRef}
      index={0}
      snapPoints={snapPoints}
      onDismiss={onClose}
      handleIndicatorStyle={{
        backgroundColor: colorScheme === "dark" ? "#666" : "#999",
      }}
      backgroundStyle={{
        backgroundColor: colorScheme === "dark" ? "#1c1c1c" : "#f5f5f5",
      }}
    >
      <View className="flex-1 px-4">
        <View className="flex-row justify-between items-center mb-4">
          <View
            className={cn(
              "text-lg font-bold",
              colorScheme === "dark" ? "text-white" : "text-black",
            )}
          >
            Upload Status
          </View>
          {hasCompletedUploads && (
            <Pressable
              onPress={handleClearCompleted}
              className={cn(
                "py-1 px-3 rounded-full",
                colorScheme === "dark" ? "bg-neutral-800" : "bg-neutral-200",
              )}
            >
              <View
                className={cn(
                  "text-xs",
                  colorScheme === "dark" ? "text-white" : "text-black",
                )}
              >
                Clear completed
              </View>
            </Pressable>
          )}
        </View>
        <BottomSheetFlatList
          data={queue}
          keyExtractor={(item) => item.id}
          renderItem={renderItem}
          contentContainerStyle={styles.listContent}
        />
      </View>
    </BottomSheetModal>
  );
});

UploadStatusSheet.displayName = "UploadStatusSheet";

const styles = StyleSheet.create({
  listContent: {
    paddingBottom: 20,
  },
});

