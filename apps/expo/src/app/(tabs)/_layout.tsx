import { View } from "react-native";
import { Tabs } from "expo-router";
import { useUser } from "@clerk/clerk-expo";

import { HeaderLogo } from "~/components/HeaderLogo";
import { NavigationMenu } from "~/components/NavigationMenu";
import { ProfileMenu } from "~/components/ProfileMenu";
import { getPlanStatusFromUser } from "~/utils/plan";

// Export Expo Router's error boundary
export { ErrorBoundary } from "expo-router";

export const unstable_settings = {
  initialRouteName: "feed",
};

export default function TabsLayout() {
  const { user } = useUser();
  const showDiscover = user ? getPlanStatusFromUser(user).showDiscover : false;
  const headerKey = showDiscover ? "menu-enabled" : "menu-disabled";
  return (
    <>
      <Tabs
        screenOptions={{
          headerStyle: {
            backgroundColor: "#5A32FB",
          },
          headerTintColor: "#fff",
          headerTitleStyle: {
            fontWeight: "bold",
          },
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
            headerTitle: () => (
              <View className="flex-1 items-center justify-center">
                <NavigationMenu key={headerKey} active="upcoming" />
              </View>
            ),
            headerTitleAlign: "center",
            headerLeft: () => <HeaderLogo />,
            headerRight: () => <ProfileMenu />,
          }}
        />
        <Tabs.Screen
          name="past"
          options={{
            title: "Past",
            headerTitle: () => (
              <View className="flex-1 items-center justify-center">
                <NavigationMenu key={headerKey} active="past" />
              </View>
            ),
            headerTitleAlign: "center",
            headerLeft: () => <HeaderLogo />,
            headerRight: () => <ProfileMenu />,
          }}
        />
        <Tabs.Screen
          name="discover"
          options={{
            title: "Discover",
            headerTitle: () => (
              <View className="flex-1 items-center justify-center">
                <NavigationMenu key={headerKey} active="discover" />
              </View>
            ),
            headerTitleAlign: "center",
            headerLeft: () => <HeaderLogo />,
            headerRight: () => <ProfileMenu />,
          }}
        />
      </Tabs>
    </>
  );
}
