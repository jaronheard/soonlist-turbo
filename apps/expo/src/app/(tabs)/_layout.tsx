import { Icon, Label, NativeTabs } from "expo-router/unstable-native-tabs";
import { useUser } from "@clerk/clerk-expo";

import { useAppStore } from "~/store";
import { getPlanStatusFromUser } from "~/utils/plan";

// Export Expo Router's error boundary
export { ErrorBoundary } from "expo-router";

export const unstable_settings = {
  initialRouteName: "feed",
};

export default function TabsLayout() {
  const { user } = useUser();
  const discoverAccessOverride = useAppStore((s) => s.discoverAccessOverride);

  // Derive showDiscover explicitly so changes to discoverAccessOverride or user metadata trigger recompute
  const showDiscover =
    discoverAccessOverride ||
    (user ? getPlanStatusFromUser(user).showDiscover : false);

  return (
    <NativeTabs
      tintColor="#5A32FB"
      minimizeBehavior="onScrollDown"
      blurEffect="systemChromeMaterialLight" /* interactive-1 */
    >
      <NativeTabs.Trigger name="feed">
        <Label>Upcoming</Label>
        <Icon sf={{ default: "calendar", selected: "calendar" }} />
      </NativeTabs.Trigger>
      <NativeTabs.Trigger name="following">
        <Label>Following</Label>
        <Icon sf={{ default: "person.2", selected: "person.2.fill" }} />
      </NativeTabs.Trigger>
      <NativeTabs.Trigger name="past">
        <Label>Past</Label>
        <Icon
          sf={{
            default: "clock.arrow.circlepath",
            selected: "clock.arrow.circlepath",
          }}
        />
      </NativeTabs.Trigger>
      <NativeTabs.Trigger name="discover" hidden={!showDiscover}>
        <Label>Discover</Label>
        <Icon sf={{ default: "binoculars", selected: "binoculars.fill" }} />
      </NativeTabs.Trigger>
      {/* Add tab is hidden - using GlassToolbar instead */}
      <NativeTabs.Trigger name="add" hidden>
        <Label hidden />
        <Icon sf={{ default: "plus.circle.fill", selected: "plus.circle.fill" }} />
      </NativeTabs.Trigger>
    </NativeTabs>
  );
}
