import { NativeTabs } from "expo-router/unstable-native-tabs";
import { useQuery } from "convex/react";

import { api } from "@soonlist/backend/convex/_generated/api";

import { SUPPORTS_LIQUID_GLASS } from "~/hooks/useLiquidGlass";

// Export Expo Router's error boundary
export { ErrorBoundary } from "expo-router";

export const unstable_settings = {
  initialRouteName: "feed",
};

export default function TabsLayout() {
  // The query result IS state — no useEffect → zustand → useStore loop. The
  // count queries are backed by userFeedGroupsAggregate (O(log n)) and return
  // 0 when unauthenticated, so they're safe to call here unconditionally.
  // See https://react.dev/learn/you-might-not-need-an-effect.
  const myListBadgeCount = useQuery(api.feeds.getMyFeedGroupedBadgeCount) ?? 0;
  const communityBadgeCount =
    useQuery(api.feeds.getFollowedListsFeedGroupedBadgeCount) ?? 0;

  return (
    <NativeTabs
      tintColor="#5A32FB"
      {...(SUPPORTS_LIQUID_GLASS
        ? { minimizeBehavior: "onScrollDown" as const }
        : {})}
      blurEffect="systemChromeMaterialLight" /* interactive-1 */
    >
      <NativeTabs.Trigger name="feed">
        <NativeTabs.Trigger.Label>My Soonlist</NativeTabs.Trigger.Label>
        <NativeTabs.Trigger.Icon
          sf={{ default: "list.bullet", selected: "list.bullet" }}
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
        <NativeTabs.Trigger.Label>My Scene</NativeTabs.Trigger.Label>
        <NativeTabs.Trigger.Icon
          sf={{ default: "person.2", selected: "person.2.fill" }}
        />
        {communityBadgeCount > 0 ? (
          <NativeTabs.Trigger.Badge>
            {String(communityBadgeCount)}
          </NativeTabs.Trigger.Badge>
        ) : (
          <NativeTabs.Trigger.Badge hidden />
        )}
      </NativeTabs.Trigger>
      {/* Discover tab hidden */}
      <NativeTabs.Trigger name="discover" hidden>
        <NativeTabs.Trigger.Label hidden />
        <NativeTabs.Trigger.Icon
          sf={{ default: "binoculars", selected: "binoculars.fill" }}
        />
      </NativeTabs.Trigger>
    </NativeTabs>
  );
}
