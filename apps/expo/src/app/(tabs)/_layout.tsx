import { Badge, Icon, Label, NativeTabs } from "expo-router/unstable-native-tabs";

import { useAppStore } from "~/store";

// Export Expo Router's error boundary
export { ErrorBoundary } from "expo-router";

export const unstable_settings = {
  initialRouteName: "feed",
};

export default function TabsLayout() {
  const myListBadgeCount = useAppStore((s) => s.myListBadgeCount);
  const communityBadgeCount = useAppStore((s) => s.communityBadgeCount);

  return (
    <NativeTabs
      tintColor="#5A32FB"
      minimizeBehavior="onScrollDown"
      blurEffect="systemChromeMaterialLight" /* interactive-1 */
    >
      <NativeTabs.Trigger name="feed">
        <Label>My List</Label>
        <Icon sf={{ default: "list.bullet", selected: "list.bullet" }} />
        {myListBadgeCount > 0 ? <Badge>{String(myListBadgeCount)}</Badge> : <Badge hidden />}
      </NativeTabs.Trigger>
      <NativeTabs.Trigger name="following">
        <Label>Board</Label>
        <Icon sf={{ default: "person.2", selected: "person.2.fill" }} />
        {communityBadgeCount > 0 ? <Badge>{String(communityBadgeCount)}</Badge> : <Badge hidden />}
      </NativeTabs.Trigger>
      {/* Discover tab hidden */}
      <NativeTabs.Trigger name="discover" hidden>
        <Label hidden />
        <Icon sf={{ default: "binoculars", selected: "binoculars.fill" }} />
      </NativeTabs.Trigger>
      {/* Add tab in search position (top-right on iOS Liquid Glass) */}
      <NativeTabs.Trigger name="add" role="search">
        <Label>Capture</Label>
        <Icon
          sf={{ default: "plus.viewfinder", selected: "plus.viewfinder" }}
        />
      </NativeTabs.Trigger>
    </NativeTabs>
  );
}
