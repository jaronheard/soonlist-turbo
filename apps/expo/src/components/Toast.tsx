import React, { useEffect, useState } from "react";
import { Animated, SafeAreaView, Text, View } from "react-native";
import { Check, X } from "lucide-react-native";

import type { ToastMessage } from "~/utils/toast";
import { cn } from "~/utils/cn";
import { toastSubject } from "~/utils/toast";

export function Toast() {
  const [toast, setToast] = useState<ToastMessage | null>(null);
  const [fadeAnim] = useState(new Animated.Value(0));

  useEffect(() => {
    const subscription = toastSubject.subscribe((message) => {
      setToast(message);
      Animated.sequence([
        Animated.timing(fadeAnim, {
          toValue: 1,
          duration: 300,
          useNativeDriver: true,
        }),
        Animated.delay(1500),
        Animated.timing(fadeAnim, {
          toValue: 0,
          duration: 300,
          useNativeDriver: true,
        }),
      ]).start(() => setToast(null));
    });

    return () => subscription.unsubscribe();
  }, [fadeAnim]);

  if (!toast) return null;

  return (
    <SafeAreaView className="absolute inset-x-4 top-0 z-50">
      <Animated.View
        className="mx-4 mt-4"
        style={{
          opacity: fadeAnim,
          transform: [
            {
              translateY: fadeAnim.interpolate({
                inputRange: [0, 1],
                outputRange: [-20, 0],
              }),
            },
          ],
        }}
      >
        <View
          className={cn(
            "flex-row items-center justify-between rounded-lg bg-white px-4 py-3 shadow-lg",
            toast.type === "success" ? "bg-white" : "bg-white",
          )}
        >
          <View className="mr-3">
            {toast.type === "success" ? (
              <Check className="text-success" size={20} />
            ) : (
              <X className="text-destructive" size={20} />
            )}
          </View>
          <Text
            className={cn(
              "flex-1 text-sm font-medium",
              toast.type === "success" ? "text-neutral-1" : "text-neutral-1",
            )}
          >
            {toast.message}
          </Text>
        </View>
      </Animated.View>
    </SafeAreaView>
  );
}
