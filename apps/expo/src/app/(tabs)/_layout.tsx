import { Tabs } from "expo-router";
import { CalendarHeart, Globe2 } from "lucide-react-native";

export default function TabLayout() {
  return (
    <Tabs
      screenOptions={{
        tabBarActiveTintColor: "#5A32FB",
      }}
    >
      <Tabs.Screen
        name="feed"
        options={{
          title: "My Feed",
          tabBarIcon: ({ color }) => <CalendarHeart color={color} />,
        }}
      />
      <Tabs.Screen
        name="discover"
        options={{
          title: "Discover",
          tabBarIcon: ({ color }) => <Globe2 color={color} />,
        }}
      />
    </Tabs>
  );
}
