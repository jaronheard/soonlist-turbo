import React from "react";
import { View } from "react-native";
import { router } from "expo-router";

import { TimezoneSelectNative } from "~/components/TimezoneSelectNative";
import { useAppStore } from "~/store";

export default function TimezoneScreen() {
  const userTimezone = useAppStore((s) => s.userTimezone);
  const setUserTimezone = useAppStore((s) => s.setUserTimezone);

  const handleClose = React.useCallback(() => {
    if (router.canGoBack()) {
      router.back();
    } else {
      router.replace("/settings/account");
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
