import React, { useState } from "react";
import { Text, View } from "react-native";
import {
  Menu,
  MenuOption,
  MenuOptions,
  MenuTrigger,
} from "react-native-popup-menu";
import { useRouter } from "expo-router";

// You may need to match your actual "ProfileMenu" styling imports
// e.g. from "react-native-popup-menu" or a custom styling approach

interface NavigationMenuProps {
  active?: "upcoming" | "past" | "discover";
}

const routes = [
  { label: "Upcoming", path: "/feed" },
  { label: "Past", path: "/past" },
  { label: "Discover", path: "/discover" },
];

export function NavigationMenu({ active }: NavigationMenuProps) {
  const router = useRouter();
  const [visible, setVisible] = useState(false);
  const currentRoute =
    routes.find((r) => r.path.includes(active ?? ""))?.label ?? "Select Route";

  return (
    <Menu opened={visible} onBackdropPress={() => setVisible(false)}>
      <MenuTrigger onPress={() => setVisible(!visible)}>
        {/* Trigger button styled similarly to ProfileMenu */}
        <View className="flex-row items-center">
          <Text className="mr-2 text-lg font-semibold">{currentRoute}</Text>
          {/* Possibly a chevron or caret icon here */}
        </View>
      </MenuTrigger>
      <MenuOptions
        customStyles={{
          optionsContainer: {
            overflow: "hidden",
            marginTop: 8,
            marginHorizontal: 8,
            borderRadius: 14,
            borderWidth: 1,
            borderColor: "#C7C7C7",
            minWidth: 200, // Adjust as needed
          },
        }}
      >
        {routes.map((route) => (
          <MenuOption
            key={route.path}
            onSelect={() => {
              setVisible(false);
              router.push(route.path as never);
            }}
          >
            <Text
              className={`px-4 py-2 ${
                active === route.path.replace("/", "") ? "font-bold" : ""
              }`}
            >
              {route.label}
            </Text>
          </MenuOption>
        ))}
      </MenuOptions>
    </Menu>
  );
}
