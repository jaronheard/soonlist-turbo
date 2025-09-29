import { useEffect, useRef } from "react";
import { Animated, StyleSheet, Text, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { useNetworkStatus } from "~/hooks/useNetworkStatus";

/**
 * Simple offline indicator that appears at the bottom of the screen
 * when the device loses internet connectivity
 */
export function OfflineIndicator() {
  const isOnline = useNetworkStatus();
  const fadeAnim = useRef(new Animated.Value(0)).current;
  const insets = useSafeAreaInsets();

  useEffect(() => {
    if (isOnline) {
      // Fade out when coming back online
      Animated.timing(fadeAnim, {
        toValue: 0,
        duration: 300,
        useNativeDriver: true,
      }).start();
    } else {
      // Fade in when going offline
      Animated.timing(fadeAnim, {
        toValue: 1,
        duration: 300,
        useNativeDriver: true,
      }).start();
    }
  }, [isOnline, fadeAnim]);

  return (
    <Animated.View
      style={[
        styles.container,
        {
          bottom: insets.bottom,
          opacity: fadeAnim,
        },
      ]}
      pointerEvents="none" // Allow touches to pass through
    >
      <View style={styles.indicator}>
        <Text style={styles.text}>📶 Offline</Text>
      </View>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  container: {
    position: "absolute",
    left: 0,
    right: 0,
    alignItems: "center",
    zIndex: 1000,
  },
  indicator: {
    backgroundColor: "#6B7280", // Subtle gray background
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 20,
    marginHorizontal: 20,
    marginBottom: 10,
    shadowColor: "#000",
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3, // Android shadow
  },
  text: {
    color: "#FFFFFF",
    fontSize: 14,
    fontWeight: "500",
    textAlign: "center",
  },
});
