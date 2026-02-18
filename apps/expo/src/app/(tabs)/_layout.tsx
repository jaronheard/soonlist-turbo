import React from "react";
import { DynamicColorIOS } from "react-native";
import { Icon, Label, NativeTabs } from "expo-router/unstable-native-tabs";

export { ErrorBoundary } from "expo-router";

export const unstable_settings = {
  initialRouteName: "feed",
};

export default function TabsLayout() {
  return (
    <NativeTabs
      tintColor={DynamicColorIOS({ light: "#5A32FB", dark: "#B39DFF" })}
      iconColor={DynamicColorIOS({ light: "#8E8E93", dark: "#A1A1AA" })}
      blurEffect="systemChromeMaterial"
    >
      <NativeTabs.Trigger name="feed">
        <Icon sf={{ default: "list.bullet", selected: "list.bullet" }} />
        <Label>My List</Label>
      </NativeTabs.Trigger>

      <NativeTabs.Trigger name="following">
        <Icon sf={{ default: "person.2", selected: "person.2.fill" }} />
        <Label>Board</Label>
      </NativeTabs.Trigger>

      <NativeTabs.Trigger name="add" role="search">
        <Icon
          sf={{ default: "plus.viewfinder", selected: "plus.viewfinder" }}
        />
        <Label hidden>Add</Label>
      </NativeTabs.Trigger>

      <NativeTabs.Trigger name="discover" hidden>
        <Icon sf="globe" />
        <Label>Discover</Label>
      </NativeTabs.Trigger>
    </NativeTabs>
  );
}
