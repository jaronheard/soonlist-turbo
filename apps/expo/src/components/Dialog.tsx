import React from "react";
import { Modal, Pressable, Text, View } from "react-native";

interface DialogProps {
  isVisible: boolean;
  onDismiss: () => void;
  title: string;
  children: React.ReactNode;
  confirmText: string;
  cancelText: string;
  onConfirm: () => void;
  icon?: React.ReactNode;
}

export function Dialog({
  isVisible,
  onDismiss,
  title,
  children,
  confirmText,
  cancelText,
  onConfirm,
  icon,
}: DialogProps) {
  return (
    <Modal
      visible={isVisible}
      transparent={true}
      animationType="fade"
      onRequestClose={onDismiss}
    >
      <View className="flex-1 items-center justify-center bg-black/50 p-4">
        <View className="w-full max-w-[320px] rounded-lg bg-white p-6">
          {icon && <View className="mb-2 items-center">{icon}</View>}
          <Text className="mb-4 text-center text-xl font-bold">{title}</Text>
          <View className="mb-6">{children}</View>
          <View className="flex-row justify-end gap-3">
            <Pressable
              onPress={onDismiss}
              className="rounded-lg border border-gray-300 px-4 py-2"
            >
              <Text className="text-gray-600">{cancelText}</Text>
            </Pressable>
            <Pressable
              onPress={onConfirm}
              className="rounded-lg bg-interactive-1 px-4 py-2"
            >
              <Text className="font-medium text-white">{confirmText}</Text>
            </Pressable>
          </View>
        </View>
      </View>
    </Modal>
  );
}
