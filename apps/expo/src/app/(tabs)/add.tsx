import React from "react";
import { View } from "react-native";
import { useFocusEffect, useRouter } from "expo-router";

import { useAddEventFlow } from "~/hooks/useAddEventFlow";

export default function CaptureTab() {
  const router = useRouter();
  const { triggerAddEventFlow } = useAddEventFlow();

  useFocusEffect(
    React.useCallback(() => {
      void triggerAddEventFlow();
      const timeout = setTimeout(() => {
        router.replace("/feed");
      }, 0);

      return () => {
        clearTimeout(timeout);
      };
    }, [router, triggerAddEventFlow]),
  );

  return <View className="flex-1 bg-white" />;
}
