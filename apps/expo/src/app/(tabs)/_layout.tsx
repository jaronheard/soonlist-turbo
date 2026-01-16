import { Tabs } from "expo-router";

import { HeaderLogo } from "~/components/HeaderLogo";
import { LiquidGlassHeader } from "~/components/LiquidGlassHeader";
import { NavigationMenu } from "~/components/NavigationMenu";
import { ProfileMenu } from "~/components/ProfileMenu";

// Export Expo Router's error boundary
export { ErrorBoundary } from "expo-router";

export const unstable_settings = {
  initialRouteName: "feed",
};

export default function TabsLayout() {
  return (
    <Tabs
      screenOptions={{
        headerTransparent: true,
        headerBackground: () => <LiquidGlassHeader />,
        headerTintColor: "#fff",
        headerTitleStyle: {
          fontWeight: "bold",
        },
        headerTitleAlign: "center",
        headerLeft: () => <HeaderLogo />,
        headerRight: () => <ProfileMenu />,
        tabBarStyle: {
          display: "none", // Hide the default tab bar
        },
        headerLeftContainerStyle: { paddingLeft: 16 },
        headerRightContainerStyle: { paddingRight: 16 },
      }}
    >
      <Tabs.Screen
        name="feed"
        options={{
          title: "Upcoming",
          headerTitle: () => <NavigationMenu active="upcoming" />,
        }}
      />
      <Tabs.Screen
        name="following"
        options={{
          title: "Following",
          headerTitle: () => <NavigationMenu active="following" />,
        }}
      />
      <Tabs.Screen
        name="past"
        options={{
          title: "Past",
          headerTitle: () => <NavigationMenu active="past" />,
        }}
      />
      <Tabs.Screen
        name="discover"
        options={{
          title: "Discover",
          headerTitle: () => <NavigationMenu active="discover" />,
        }}
      />
    </Tabs>
  );
}
