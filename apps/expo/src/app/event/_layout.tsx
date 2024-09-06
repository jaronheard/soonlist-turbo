import { Stack } from "expo-router";

export default function DetailLayout() {
  return (
    <Stack
      screenOptions={{
        headerShown: true,
        headerBackTitle: "Back",
        headerBackVisible: true,
      }}
    >
      <Stack.Screen
        name="[id]"
        options={{
          title: "Event Details",
          headerTitle: "Event Details",
          headerLeft: undefined, // This allows the default back button to show
        }}
      />
    </Stack>
  );
}
