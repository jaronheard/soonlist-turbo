import { View } from "react-native";
import { Tabs } from "expo-router";

import { HeaderLogo } from "~/components/HeaderLogo";
import { NavigationMenu } from "~/components/NavigationMenu";
import { ProfileMenu } from "~/components/ProfileMenu";

// Export Expo Router's error boundary
export { ErrorBoundary } from "expo-router";

export const unstable_settings = {
  initialRouteName: "feed",
};

export default function TabsLayout() {
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
                <NavigationMenu active="upcoming" />
              </View>
            ),
            headerTitleAlign: "center",
            headerLeft: () => <HeaderLogo />,
            headerRight: () => <ProfileMenu />,
          }}
        />
        <Tabs.Screen
          name="following"
          options={{
            title: "Following",
            headerTitle: () => (
              <View className="flex-1 items-center justify-center">
                <NavigationMenu active="following" />
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
                <NavigationMenu active="past" />
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
                <NavigationMenu active="discover" />
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
