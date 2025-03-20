import { View } from "react-native";
import { Stack } from "expo-router";

import { ResetAuthButton } from "~/components/auth/ResetAuthButton";

export default function AuthRoutesLayout() {
  return (
    <View style={{ flex: 1 }}>
      <Stack />
      <View
        style={{
          position: "absolute",
          bottom: 16,
          width: "100%",
          alignItems: "center",
        }}
      >
        <ResetAuthButton />
      </View>
    </View>
  );
}
