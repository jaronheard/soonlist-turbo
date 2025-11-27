import { Linking, Pressable, Text, View } from "react-native";

import { APP_STORE_URL } from "~/hooks/useForceUpdate";

export function ForceUpdateScreen() {
  return (
    <View className="flex-1 items-center justify-center bg-interactive-1 px-6">
      <Text className="mb-4 text-center text-2xl font-bold text-white">
        Update Required
      </Text>
      <Text className="mb-8 text-center text-base text-white/80">
        Please update Soonlist to continue using the app.
      </Text>
      <Pressable
        onPress={() => Linking.openURL(APP_STORE_URL)}
        className="rounded-2xl bg-white px-8 py-4"
      >
        <Text className="text-lg font-semibold text-interactive-1">Update</Text>
      </Pressable>
    </View>
  );
}

