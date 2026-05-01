import { View } from "react-native";
import { Stack } from "expo-router";

import { HEADER_BLUR_EFFECT } from "~/utils/headerOptions";

export default function AddTabScreen() {
  return (
    <View className="flex-1 bg-interactive-2">
      <Stack.Screen
        options={{
          title: "Add",
          headerLargeTitle: true,
          headerLargeTitleInline: true,
          headerLargeTitleStyle: { color: "#5A32FB" },
          headerTintColor: "#5A32FB",
          headerShadowVisible: false,
          headerTransparent: true,
          headerBlurEffect: HEADER_BLUR_EFFECT,
        }}
      />
    </View>
  );
}

export { ErrorBoundary } from "expo-router";
