import React, { useCallback, useEffect } from "react";
import { Animated, Pressable, StyleSheet, Text, View } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { useColorScheme } from "nativewind";

interface InlineBannerProps {
  visible: boolean;
  message: string;
  type: "success" | "error";
  onDismiss: () => void;
  autoDismiss?: boolean;
  dismissTimeout?: number;
}

export function InlineBanner({
  visible,
  message,
  type,
  onDismiss,
  autoDismiss = true,
  dismissTimeout = 5000,
}: InlineBannerProps) {
  const { colorScheme } = useColorScheme();
  const opacity = React.useRef(new Animated.Value(0)).current;

  const handleDismiss = useCallback(() => {
    Animated.timing(opacity, {
      toValue: 0,
      duration: 300,
      useNativeDriver: true,
    }).start(() => {
      onDismiss();
    });
  }, [opacity, onDismiss]);

  useEffect(() => {
    if (visible) {
      Animated.timing(opacity, {
        toValue: 1,
        duration: 300,
        useNativeDriver: true,
      }).start();

      if (autoDismiss) {
        const timer = setTimeout(() => {
          handleDismiss();
        }, dismissTimeout);

        return () => clearTimeout(timer);
      }
    } else {
      Animated.timing(opacity, {
        toValue: 0,
        duration: 300,
        useNativeDriver: true,
      }).start();
    }
  }, [autoDismiss, dismissTimeout, handleDismiss, opacity, visible]);

  if (!visible) return null;

  const iconName = type === "success" ? "checkmark-circle" : "alert-circle";
  const iconColor = type === "success" ? "#10B981" : "#EF4444";
  const backgroundColor = colorScheme === "dark" ? "#1F2937" : "#F9FAFB";
  const textColor = colorScheme === "dark" ? "#F9FAFB" : "#1F2937";

  return (
    <Animated.View
      style={[
        styles.container,
        { opacity, backgroundColor },
        colorScheme === "dark" ? styles.shadowDark : styles.shadowLight,
      ]}
    >
      <View style={styles.content}>
        <Ionicons
          name={iconName}
          size={20}
          color={iconColor}
          style={styles.icon}
        />
        <View style={styles.textContainer}>
          <Text style={{ color: textColor, fontSize: 14 }}>{message}</Text>
        </View>
        <Pressable onPress={handleDismiss} style={styles.closeButton}>
          <Ionicons
            name="close"
            size={20}
            color={colorScheme === "dark" ? "#9CA3AF" : "#6B7280"}
          />
        </Pressable>
      </View>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  container: {
    position: "absolute",
    top: 20,
    left: 20,
    right: 20,
    borderRadius: 8,
    padding: 12,
    zIndex: 1000,
  },
  shadowLight: {
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  shadowDark: {
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.2,
    shadowRadius: 4,
    elevation: 3,
  },
  content: {
    flexDirection: "row",
    alignItems: "center",
  },
  icon: {
    marginRight: 8,
  },
  textContainer: {
    flex: 1,
  },
  closeButton: {
    padding: 4,
  },
});
