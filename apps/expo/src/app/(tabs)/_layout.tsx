import { useRef } from "react";
import { useRouter } from "expo-router";
import { NativeTabs } from "expo-router/unstable-native-tabs";

import { useAddEventFlow } from "~/hooks/useAddEventFlow";
import { useAppStore } from "~/store";

// Export Expo Router's error boundary
export { ErrorBoundary } from "expo-router";

export const unstable_settings = {
  initialRouteName: "feed",
};

export default function TabsLayout() {
  const router = useRouter();
  const { triggerAddEventFlow } = useAddEventFlow();
  const pickerActiveRef = useRef(false);

  const myListBadgeCount = useAppStore((s) => s.myListBadgeCount);
  const communityBadgeCount = useAppStore((s) => s.communityBadgeCount);

  return (
    <NativeTabs
      tintColor="#5A32FB"
      minimizeBehavior="onScrollDown"
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
      {/* Add tab in search position (top-right on iOS Liquid Glass) */}
      <NativeTabs.Trigger
        name="add"
        role="search"
        listeners={{
          tabPress: () => {
            if (pickerActiveRef.current) return;
            pickerActiveRef.current = true;
            void triggerAddEventFlow().finally(() => {
              pickerActiveRef.current = false;
              setTimeout(() => router.navigate("/feed"), 100);
            });
          },
        }}
      >
        <NativeTabs.Trigger.Label>Capture</NativeTabs.Trigger.Label>
        <NativeTabs.Trigger.Icon
          // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment, @typescript-eslint/no-require-imports
          src={require("../../assets/capture-tab.png")}
          renderingMode="original"
        />
      </NativeTabs.Trigger>
    </NativeTabs>
  );
}
