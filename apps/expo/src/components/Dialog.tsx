import React from "react";
import { Modal, Pressable, StyleSheet, Text, View } from "react-native";

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
      <View style={styles.overlay}>
        <View style={styles.container}>
          {icon && <View style={styles.iconContainer}>{icon}</View>}
          <Text style={styles.title}>{title}</Text>
          <View style={styles.content}>{children}</View>
          <View style={styles.buttonContainer}>
            <Pressable onPress={onDismiss} style={styles.cancelButton}>
              <Text style={styles.cancelButtonText}>{cancelText}</Text>
            </Pressable>
            <Pressable onPress={onConfirm} style={styles.confirmButton}>
              <Text style={styles.confirmButtonText}>{confirmText}</Text>
            </Pressable>
          </View>
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "rgba(0, 0, 0, 0.5)",
    padding: 16,
  },
  container: {
    width: "100%",
    maxWidth: 320,
    backgroundColor: "white",
    borderRadius: 8,
    padding: 24,
  },
  iconContainer: {
    alignItems: "center",
    marginBottom: 8,
  },
  title: {
    fontSize: 20,
    fontWeight: "bold",
    textAlign: "center",
    marginBottom: 16,
  },
  content: {
    marginBottom: 24,
  },
  buttonContainer: {
    flexDirection: "row",
    justifyContent: "flex-end",
    gap: 12,
  },
  cancelButton: {
    borderRadius: 8,
    borderWidth: 1,
    borderColor: "#D1D5DB",
    paddingHorizontal: 16,
    paddingVertical: 8,
  },
  cancelButtonText: {
    color: "#4B5563",
  },
  confirmButton: {
    backgroundColor: "#5A32FB", // interactive-1 color
    borderRadius: 8,
    paddingHorizontal: 16,
    paddingVertical: 8,
  },
  confirmButtonText: {
    color: "white",
    fontWeight: "500",
  },
});
