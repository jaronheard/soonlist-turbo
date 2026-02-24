import { Platform } from "react-native";
import { NativeTabs } from "expo-router/unstable-native-tabs";

import { useAppStore } from "~/store";

// Export Expo Router's error boundary
export { ErrorBoundary } from "expo-router";

export const unstable_settings = {
  anchor: "feed",
};

export default function TabsLayout() {
  const myListBadgeCount = useAppStore((s) => s.myListBadgeCount);
  const boardBadgeCount = useAppStore((s) => s.boardBadgeCount);

  // Use platform-appropriate tint color
  const tintColor = Platform.OS === "ios" ? "#5A32FB" : "#5A32FB";

  return (
    <NativeTabs tintColor={tintColor} minimizeBehavior="onScrollDown">
      <NativeTabs.Trigger name="feed">
        <NativeTabs.Trigger.Icon
          sf={{ default: "list.bullet", selected: "list.bullet" }}
          md="list"
        />
        <NativeTabs.Trigger.Label>My List</NativeTabs.Trigger.Label>
        {myListBadgeCount > 0 && (
          <NativeTabs.Trigger.Badge>
            {String(myListBadgeCount)}
          </NativeTabs.Trigger.Badge>
        )}
      </NativeTabs.Trigger>

      <NativeTabs.Trigger name="following">
        <NativeTabs.Trigger.Icon
          sf={{ default: "person.2", selected: "person.2.fill" }}
          md="group"
        />
        <NativeTabs.Trigger.Label>Board</NativeTabs.Trigger.Label>
        {boardBadgeCount > 0 && (
          <NativeTabs.Trigger.Badge>
            {String(boardBadgeCount)}
          </NativeTabs.Trigger.Badge>
        )}
      </NativeTabs.Trigger>

      <NativeTabs.Trigger name="discover" hidden>
        <NativeTabs.Trigger.Icon sf="globe" md="explore" />
        <NativeTabs.Trigger.Label>Discover</NativeTabs.Trigger.Label>
      </NativeTabs.Trigger>

      <NativeTabs.Trigger name="add" role="search">
        <NativeTabs.Trigger.Icon sf="plus.viewfinder" md="add_a_photo" />
        <NativeTabs.Trigger.Label>Capture</NativeTabs.Trigger.Label>
      </NativeTabs.Trigger>
    </NativeTabs>
  );
}
