import React, { useCallback, useEffect, useRef, useState } from "react";
import { Image } from "expo-image";
import { Pressable, Text, View } from "react-native";
import Modal from "react-native-modal";

import { QueueItem, useQueueCounts, useUploadQueueStore } from "~/store/useUploadQueueStore";
import { useCreateEvent } from "~/hooks/useCreateEvent";
import { useUser } from "@clerk/clerk-expo";
import { XIcon } from "./icons";

interface UploadStatusSheetProps {
  isVisible: boolean;
  onClose: () => void;
}

export function UploadStatusSheet({ isVisible, onClose }: UploadStatusSheetProps) {
  const items = useUploadQueueStore((state) => state.items);
  const { createEvent } = useCreateEvent();
  const { user } = useUser();
  
  // Close sheet if there are no items
  const { total } = useQueueCounts();
  useEffect(() => {
    if (total === 0 && isVisible) {
      onClose();
    }
  }, [total, isVisible, onClose]);

  // Handle retry for failed uploads
  const handleRetry = useCallback(async (item: QueueItem) => {
    if (!user?.username || !user?.id) return;
    
    try {
      await createEvent({
        imageUri: item.assetUri,
        userId: user.id,
        username: user.username,
        queueItemId: item.id,
      });
    } catch (error) {
      // Error handling is done in createEvent
    }
  }, [createEvent, user]);

  // Handle cancel for an item
  const handleCancel = useCallback((id: string) => {
    const items = useUploadQueueStore.getState().items;
    const newItems = items.filter(item => item.id !== id);
    useUploadQueueStore.setState({ items: newItems });
  }, []);

  return (
    <Modal
      isVisible={isVisible}
      onBackdropPress={onClose}
      onSwipeComplete={onClose}
      swipeDirection={["down"]}
      style={{ justifyContent: "flex-end", margin: 0 }}
      backdropOpacity={0.4}
      animationIn="slideInUp"
      animationOut="slideOutDown"
    >
      <View className="rounded-t-3xl bg-white pb-8">
        <View className="items-center py-2">
          <View className="h-1 w-16 rounded-full bg-gray-300" />
        </View>
        
        <View className="flex-row items-center justify-between px-4 pb-2">
          <Text className="text-xl font-bold">Upload Status</Text>
          <Pressable onPress={onClose} className="p-2">
            <XIcon size={20} color="#000" />
          </Pressable>
        </View>
        
        <View className="max-h-96">
          {items.map((item) => (
            <View 
              key={item.id} 
              className="flex-row items-center justify-between border-b border-gray-100 px-4 py-3"
            >
              <View className="flex-row items-center">
                <View className="h-14 w-14 overflow-hidden rounded-lg bg-gray-100">
                  <Image
                    source={{ uri: item.assetUri }}
                    style={{ width: "100%", height: "100%" }}
                    contentFit="cover"
                  />
                </View>
                
                <View className="ml-3">
                  <Text className="font-medium" numberOfLines={1} ellipsizeMode="middle">
                    {item.assetUri.split("/").pop()}
                  </Text>
                  
                  <View className="mt-1 flex-row items-center">
                    {item.status === "queued" && (
                      <View className="rounded-full bg-gray-200 px-2 py-0.5">
                        <Text className="text-xs text-gray-700">Queued</Text>
                      </View>
                    )}
                    
                    {item.status === "uploading" && (
                      <View className="rounded-full bg-interactive-1/20 px-2 py-0.5">
                        <Text className="text-xs text-interactive-1">
                          Uploading... {Math.round(item.progress * 100)}%
                        </Text>
                      </View>
                    )}
                    
                    {item.status === "success" && (
                      <View className="rounded-full bg-green-100 px-2 py-0.5">
                        <Text className="text-xs text-green-700">Success</Text>
                      </View>
                    )}
                    
                    {item.status === "failed" && (
                      <View className="rounded-full bg-red-100 px-2 py-0.5">
                        <Text className="text-xs text-red-700">Failed</Text>
                      </View>
                    )}
                  </View>
                </View>
              </View>
              
              <View className="flex-row items-center">
                {item.status === "failed" && (
                  <Pressable
                    onPress={() => handleRetry(item)}
                    className="rounded-full bg-interactive-1 px-3 py-1.5"
                  >
                    <Text className="text-xs font-medium text-white">Retry</Text>
                  </Pressable>
                )}
                
                {(item.status === "failed" || item.status === "queued") && (
                  <Pressable
                    onPress={() => handleCancel(item.id)}
                    className="ml-2 rounded-full bg-gray-200 px-3 py-1.5"
                  >
                    <Text className="text-xs font-medium text-gray-700">Cancel</Text>
                  </Pressable>
                )}
              </View>
            </View>
          ))}
        </View>
      </View>
    </Modal>
  );
}

// Global state for the sheet
let isSheetVisible = false;
let setSheetVisible: React.Dispatch<React.SetStateAction<boolean>> | null = null;

// Function to register the sheet setter
export function registerSheetSetter(
  setter: React.Dispatch<React.SetStateAction<boolean>>
) {
  setSheetVisible = setter;
}

// Function to open the sheet
export function openUploadStatusSheet() {
  if (setSheetVisible) {
    isSheetVisible = true;
    setSheetVisible(true);
  }
}

// Function to close the sheet
export function closeUploadStatusSheet() {
  if (setSheetVisible) {
    isSheetVisible = false;
    setSheetVisible(false);
  }
}

