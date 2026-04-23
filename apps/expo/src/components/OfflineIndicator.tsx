import { useEffect, useRef } from "react";
import { Animated, StyleSheet, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { CloudOff } from "~/components/icons";
import { useNetworkStatus } from "~/hooks/useNetworkStatus";

export function OfflineIndicator() {
  const isOnline = useNetworkStatus();
  const fadeAnim = useRef(new Animated.Value(0)).current;
  const insets = useSafeAreaInsets();

  useEffect(() => {
    if (isOnline) {
      Animated.timing(fadeAnim, {
        toValue: 0,
        duration: 300,
        useNativeDriver: true,
      }).start();
    } else {
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
          bottom: insets.bottom + 16,
          opacity: fadeAnim,
        },
      ]}
      pointerEvents="none"
    >
      <View className="rounded-full bg-neutral-1 p-2">
        <CloudOff size={16} color="#FFFFFF" strokeWidth={3} />
      </View>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  container: {
    position: "absolute",
    left: 16,
    zIndex: 1000,
  },
});
