import { DynamicColorIOS } from "react-native";
import { NativeTabs } from "expo-router/unstable-native-tabs";

import { useAppStore } from "~/store";

// Export Expo Router's error boundary
export { ErrorBoundary } from "expo-router";

export const unstable_settings = {
  initialRouteName: "feed",
};

const tintColor = DynamicColorIOS({
  light: "#5A32FB",
  dark: "#8B6FFF",
});

export default function TabsLayout() {
  const myListBadgeCount = useAppStore((s) => s.myListBadgeCount);
  const communityBadgeCount = useAppStore((s) => s.communityBadgeCount);

  return (
    <NativeTabs tintColor={tintColor} minimizeBehavior="onScrollDown">
      <NativeTabs.Trigger name="feed">
        <NativeTabs.Trigger.Label>My List</NativeTabs.Trigger.Label>
        <NativeTabs.Trigger.Icon
          sf={{ default: "list.bullet", selected: "list.bullet" }}
          md="list"
        />
        {myListBadgeCount > 0 ? (
          <NativeTabs.Trigger.Badge>
            {String(myListBadgeCount)}
          </NativeTabs.Trigger.Badge>
        ) : (
          <NativeTabs.Trigger.Badge hidden />
        )}
      </NativeTabs.Trigger>
      <NativeTabs.Trigger name="following">
        <NativeTabs.Trigger.Label>Board</NativeTabs.Trigger.Label>
        <NativeTabs.Trigger.Icon
          sf={{ default: "person.2", selected: "person.2.fill" }}
          md="groups"
        />
        {communityBadgeCount > 0 ? (
          <NativeTabs.Trigger.Badge>
            {String(communityBadgeCount)}
          </NativeTabs.Trigger.Badge>
        ) : (
          <NativeTabs.Trigger.Badge hidden />
        )}
      </NativeTabs.Trigger>
      {/* Discover tab hidden - still functional for deep links */}
      <NativeTabs.Trigger name="discover" hidden>
        <NativeTabs.Trigger.Label hidden />
        <NativeTabs.Trigger.Icon
          sf={{ default: "binoculars", selected: "binoculars.fill" }}
          md="travel_explore"
        />
      </NativeTabs.Trigger>
      {/* Capture button in search position (top-right on iOS Liquid Glass) */}
      <NativeTabs.Trigger name="add" role="search">
        <NativeTabs.Trigger.Label>Capture</NativeTabs.Trigger.Label>
        <NativeTabs.Trigger.Icon
          sf={{ default: "plus.viewfinder", selected: "plus.viewfinder" }}
          md="add_a_photo"
        />
      </NativeTabs.Trigger>
    </NativeTabs>
  );
}
