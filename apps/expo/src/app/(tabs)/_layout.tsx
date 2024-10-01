import { Redirect, Tabs } from "expo-router";
import { useAuth } from "@clerk/clerk-expo";
import { CalendarHeart, Globe2 } from "lucide-react-native";

export default function TabLayout() {
  const { isSignedIn } = useAuth();

  if (!isSignedIn) {
    return <Redirect href="/" />;
  }

  return (
    <Tabs
      screenOptions={{
        tabBarActiveTintColor: "#5A32FB",
        tabBarInactiveTintColor: "#28344d",
        tabBarStyle: {
          backgroundColor: "#F4F1FF",
        },
      }}
    >
      <Tabs.Screen
        name="feed"
        options={{
          title: "My Feed",
          tabBarLabel: "My Feed",
          tabBarLabelStyle: {
            fontSize: 12,
            fontWeight: "500",
          },
          tabBarIcon: ({ color }) => <CalendarHeart color={color} />,
          headerShown: true,
          headerStyle: {
            backgroundColor: "#5A32FB",
          },
          headerTintColor: "#fff",
          headerTitleStyle: {
            fontWeight: "bold",
          },
        }}
      />
      <Tabs.Screen
        name="discover"
        options={{
          title: "Discover",
          tabBarLabel: "Discover",
          tabBarLabelStyle: {
            fontSize: 12,
            fontWeight: "500",
          },
          tabBarIcon: ({ color }) => <Globe2 color={color} />,
          headerShown: true,
          headerStyle: {
            backgroundColor: "#5A32FB",
          },
          headerTintColor: "#fff",
          headerTitleStyle: {
            fontWeight: "bold",
          },
        }}
      />
    </Tabs>
  );
}
