import { NativeTabs } from "expo-router/unstable-native-tabs";

import { useAppStore } from "~/store";

// Export Expo Router's error boundary
export { ErrorBoundary } from "expo-router";

export const unstable_settings = {
  initialRouteName: "feed",
};

const { Trigger } = NativeTabs;

export default function TabsLayout() {
  const myListBadgeCount = useAppStore((s) => s.myListBadgeCount);
  const communityBadgeCount = useAppStore((s) => s.communityBadgeCount);

  return (
    <NativeTabs
      tintColor="#5A32FB"
      minimizeBehavior="onScrollDown"
      blurEffect="systemChromeMaterialLight"
    >
      <Trigger name="feed">
        <Trigger.Label>My List</Trigger.Label>
        <Trigger.Icon
          sf={{ default: "list.bullet", selected: "list.bullet" }}
        />
        {myListBadgeCount > 0 ? (
          <Trigger.Badge>{String(myListBadgeCount)}</Trigger.Badge>
        ) : (
          <Trigger.Badge hidden />
        )}
      </Trigger>
      <Trigger name="following">
        <Trigger.Label>Board</Trigger.Label>
        <Trigger.Icon sf={{ default: "person.2", selected: "person.2.fill" }} />
        {communityBadgeCount > 0 ? (
          <Trigger.Badge>{String(communityBadgeCount)}</Trigger.Badge>
        ) : (
          <Trigger.Badge hidden />
        )}
      </Trigger>
      <Trigger name="discover" hidden>
        <Trigger.Label hidden />
        <Trigger.Icon
          sf={{ default: "binoculars", selected: "binoculars.fill" }}
        />
      </Trigger>
      <Trigger name="add" role="search">
        <Trigger.Label>Capture</Trigger.Label>
        <Trigger.Icon
          sf={{ default: "plus.viewfinder", selected: "plus.viewfinder" }}
        />
      </Trigger>
    </NativeTabs>
  );
}
