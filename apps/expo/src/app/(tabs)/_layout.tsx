import { Icon, Label, NativeTabs } from "expo-router/unstable-native-tabs";

// Export Expo Router's error boundary
export { ErrorBoundary } from "expo-router";

export const unstable_settings = {
  initialRouteName: "feed",
};

export default function TabsLayout() {
  return (
    <NativeTabs
      tintColor="#5A32FB"
      minimizeBehavior="onScrollDown"
      blurEffect="systemChromeMaterialLight" /* interactive-1 */
    >
      <NativeTabs.Trigger name="feed">
        <Label>My Events</Label>
        <Icon sf={{ default: "calendar", selected: "calendar" }} />
      </NativeTabs.Trigger>
      <NativeTabs.Trigger name="following">
        <Label>Following</Label>
        <Icon sf={{ default: "person.2", selected: "person.2.fill" }} />
      </NativeTabs.Trigger>
      {/* Discover tab hidden */}
      <NativeTabs.Trigger name="discover" hidden>
        <Label hidden />
        <Icon sf={{ default: "binoculars", selected: "binoculars.fill" }} />
      </NativeTabs.Trigger>
      {/* Add tab is hidden - using GlassToolbar instead */}
      <NativeTabs.Trigger name="add" hidden>
        <Label hidden />
        <Icon
          sf={{ default: "plus.circle.fill", selected: "plus.circle.fill" }}
        />
      </NativeTabs.Trigger>
    </NativeTabs>
  );
}
