import { Tabs } from "expo-router";
import { CalendarHeart, Globe2 } from "lucide-react-native";

export default function TabLayout() {
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
