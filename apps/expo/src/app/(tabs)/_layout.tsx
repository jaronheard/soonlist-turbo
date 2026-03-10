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

const tabHeaderConfig = {
  feed: { title: "Upcoming", active: "upcoming" },
  following: { title: "Following", active: "following" },
  past: { title: "Past", active: "past" },
} as const;

type TabRouteName = keyof typeof tabHeaderConfig;

export default function TabsLayout() {
  return (
    <Tabs
      screenOptions={({ route }) => {
        const config = tabHeaderConfig[route.name as TabRouteName];
        return {
          headerTransparent: true,
          headerBackground: () => <LiquidGlassHeader />,
          headerTintColor: "#fff",
          headerTitleStyle: {
            fontWeight: "bold",
          },
          tabBarStyle: {
            display: "none", // Hide the default tab bar
          },
          headerLeftContainerStyle: { paddingLeft: 16 },
          headerRightContainerStyle: { paddingRight: 16 },
          headerTitleAlign: "center",
          headerLeft: () => <HeaderLogo />,
          headerRight: () => <ProfileMenu />,
          ...(config
            ? {
                title: config.title,
                headerTitle: () => <NavigationMenu active={config.active} />,
              }
            : null),
        };
      }}
    >
      <Tabs.Screen name="feed" />
      <Tabs.Screen name="following" />
      <Tabs.Screen name="past" />
    </Tabs>
  );
}
