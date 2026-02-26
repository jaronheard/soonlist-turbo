import { NativeTabs } from "expo-router/unstable-native-tabs";

import type { BoardIcon, MyListIcon } from "~/store";
import { useAppStore } from "~/store";

// Export Expo Router's error boundary
export { ErrorBoundary } from "expo-router";

export const unstable_settings = {
  initialRouteName: "feed",
};

const myListIconPairs = {
  "list.bullet": { default: "list.bullet", selected: "list.bullet" },
  clock: { default: "clock", selected: "clock.fill" },
  calendar: { default: "calendar", selected: "calendar" },
  star: { default: "star", selected: "star.fill" },
  bookmark: { default: "bookmark", selected: "bookmark.fill" },
  heart: { default: "heart", selected: "heart.fill" },
} as const satisfies Record<MyListIcon, { default: string; selected: string }>;

const boardIconPairs = {
  "person.2": { default: "person.2", selected: "person.2.fill" },
  "person.3": { default: "person.3", selected: "person.3.fill" },
  "dot.radiowaves.left.and.right": {
    default: "dot.radiowaves.left.and.right",
    selected: "dot.radiowaves.left.and.right",
  },
  theatermasks: { default: "theatermasks", selected: "theatermasks.fill" },
  globe: { default: "globe", selected: "globe" },
  sparkles: { default: "sparkles", selected: "sparkles" },
} as const satisfies Record<BoardIcon, { default: string; selected: string }>;

export default function TabsLayout() {
  const myListBadgeCount = useAppStore((s) => s.myListBadgeCount);
  const communityBadgeCount = useAppStore((s) => s.communityBadgeCount);
  const myListLabel = useAppStore((s) => s.myListLabel);
  const boardLabel = useAppStore((s) => s.boardLabel);
  const myListIcon = useAppStore((s) => s.myListIcon);
  const boardIcon = useAppStore((s) => s.boardIcon);
  const shortenMyListTab = useAppStore((s) => s.shortenMyListTab);

  // Shorten tab labels when configured
  const myListTabLabel = shortenMyListTab
    ? myListLabel.replace("Soonlist", "List").replace("Events", "Events")
    : myListLabel;
  // For "Community Board", show just "Board" in the tab bar
  const boardTabLabel = boardLabel === "Community Board" ? "Board" : boardLabel;

  return (
    <NativeTabs
      tintColor="#5A32FB"
      minimizeBehavior="onScrollDown"
      blurEffect="systemChromeMaterialLight" /* interactive-1 */
    >
      <NativeTabs.Trigger name="feed">
        <NativeTabs.Trigger.Label>{myListTabLabel}</NativeTabs.Trigger.Label>
        <NativeTabs.Trigger.Icon sf={myListIconPairs[myListIcon]} />
        {myListBadgeCount > 0 ? (
          <NativeTabs.Trigger.Badge>
            {String(myListBadgeCount)}
          </NativeTabs.Trigger.Badge>
        ) : (
          <NativeTabs.Trigger.Badge hidden />
        )}
      </NativeTabs.Trigger>
      <NativeTabs.Trigger name="following">
        <NativeTabs.Trigger.Label>{boardTabLabel}</NativeTabs.Trigger.Label>
        <NativeTabs.Trigger.Icon sf={boardIconPairs[boardIcon]} />
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
      {/* Add tab in search position (top-right on iOS Liquid Glass) */}
      <NativeTabs.Trigger name="add" role="search">
        <NativeTabs.Trigger.Label>Capture</NativeTabs.Trigger.Label>
        <NativeTabs.Trigger.Icon
          sf={{ default: "plus.viewfinder", selected: "plus.viewfinder" }}
        />
      </NativeTabs.Trigger>
    </NativeTabs>
  );
}
