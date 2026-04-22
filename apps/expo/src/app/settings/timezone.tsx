import React from "react";
import { View } from "react-native";
import { router } from "expo-router";

import { TimezoneSelectNative } from "~/components/TimezoneSelectNative";
import { useAppStore } from "~/store";

export default function TimezoneScreen() {
  const { userTimezone, setUserTimezone } = useAppStore();

  const handleClose = React.useCallback(() => {
    if (router.canGoBack()) {
      router.back();
    }
  }, []);

  return (
    <View style={{ flex: 1, backgroundColor: "#F2F2F7" }}>
      <TimezoneSelectNative
        value={userTimezone}
        onValueChange={setUserTimezone}
        autoOpen
        onClose={handleClose}
      />
    </View>
  );
}
